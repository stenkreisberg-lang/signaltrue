import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import MetricsDaily from '../models/metricsDaily.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import Signal from '../models/signal.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import IntegrationConnection from '../models/integrationConnection.js';
import WeeklyBriefSnapshot from '../models/weeklyBriefSnapshot.js';
import ManagerAssignment from '../models/managerAssignment.js';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import { classifyEmployeeCandidate } from '../utils/employeeIdentity.js';
import { compareStoredWorkPatternMetrics } from './workPatternParityAudit.js';
import { validateTeamPermission } from './managerIntelligenceService.js';

const ADMIN_ROLES = ['master_admin', 'hr_admin', 'admin', 'org_admin', 'executive', 'compliance'];

function iso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function logTehnopolProductionDiagnostic() {
  try {
    const orgs = await Organization.find({
      $or: [{ name: /tehnopol/i }, { domain: /tehnopol/i }],
    }).lean();

    console.log('[TehnopolAudit] matches=' + orgs.length);

    for (const org of orgs) {
      const orgId = org._id;
      const [
        activeUsers,
        inactiveUsers,
        admins,
        activeHrAdmins,
        teams,
        totalEvents,
        recentEvents,
        latestEvent,
        metricRows,
        latestMetric,
        integrationMetricRows,
        latestIntegrationMetric,
        signals,
        latestSignal,
        ckSignals,
        latestCkSignal,
        connections,
        latestBrief,
        recentEventTotal,
        recentActorMapped,
        recentTeamMapped,
        rosterUsers,
      ] = await Promise.all([
        User.countDocuments({ orgId, accountStatus: { $ne: 'inactive' } }),
        User.countDocuments({ orgId, accountStatus: 'inactive' }),
        User.countDocuments({ orgId, role: { $in: ADMIN_ROLES }, accountStatus: { $ne: 'inactive' } }),
        User.countDocuments({ orgId, role: 'hr_admin', accountStatus: 'active' }),
        Team.find({ orgId, isActive: { $ne: false } })
          .select('_id name size memberCount structure isActive analyticsEnabled').lean(),
        WorkEvent.countDocuments({ orgId }),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        WorkEvent.findOne({ orgId }).sort({ timestamp: -1 }).select('timestamp source eventType teamId actorUserId').lean(),
        MetricsDaily.countDocuments({ orgId }),
        MetricsDaily.findOne({ orgId }).sort({ date: -1 }).select('date teamId').lean(),
        IntegrationMetricsDaily.countDocuments({ orgId }),
        IntegrationMetricsDaily.findOne({ orgId }).sort({ date: -1 }).select('date integration teamId').lean(),
        Signal.countDocuments({ orgId }),
        Signal.findOne({ orgId }).sort({ lastUpdated: -1, updatedAt: -1 }).select('createdAt updatedAt lastUpdated signalType severity teamId').lean(),
        CategoryKingSignal.countDocuments({ orgId }),
        CategoryKingSignal.findOne({ orgId }).sort({ updatedAt: -1, createdAt: -1 }).select('createdAt updatedAt signalType severity').lean(),
        IntegrationConnection.find({ orgId }).select('integrationType status sync.lastSyncAt sync.lastSuccessfulSyncAt').lean(),
        WeeklyBriefSnapshot.findOne({ orgId }).sort({ generatedAt: -1 }).select('generatedAt reportMode payload.status payload.coverage').lean(),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, actorUserId: { $ne: null } }),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, teamId: { $ne: null } }),
        User.find({ orgId, accountStatus: { $ne: 'inactive' } }).select('email name displayName role').lean(),
      ]);

      const [managerAssignments, dailyTeamSnapshots, latestTeamSnapshot, weeklyStrainCount, teamMetricCount] =
        await Promise.all([
          ManagerAssignment.aggregate([{ $match: { orgId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }]),
          EngagementTeamDaily.countDocuments({ orgId }),
          EngagementTeamDaily.findOne({ orgId }).sort({ date: -1 })
            .select('date activePeopleCount integrationCoverage measurementEvidence').lean(),
          EngagementStrainWeekly.countDocuments({ orgId }),
          IntegrationMetricsDaily.countDocuments({ orgId, teamId: { $ne: null }, userId: null }),
        ]);

      const microsoft = org.integrations?.microsoft || {};
      const employeeCandidates = rosterUsers.filter((u) =>
        classifyEmployeeCandidate({ email: u.email, name: u.name, displayName: u.displayName }, { orgDomain: org.domain }).ok
      );
      // A global mapping percentage can conceal a completely unmapped chat
      // source. Log aggregate counts only, never message bodies or identities.
      const recentChat = await WorkEvent.aggregate([
        {
          $match: {
            orgId,
            source: 'microsoft-teams',
            externalId: /^teams-chat-/,
            timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            actorMapped: { $sum: { $cond: [{ $ne: ['$actorUserId', null] }, 1, 0] } },
            teamMapped: { $sum: { $cond: [{ $ne: ['$teamId', null] }, 1, 0] } },
            hasSenderMicrosoftId: {
              $sum: {
                $cond: [
                  { $and: [
                    { $ne: ['$metadata.microsoftUserId', null] },
                    { $ne: ['$metadata.microsoftUserId', ''] },
                  ] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);
      const chat = recentChat[0] || { total: 0, actorMapped: 0, teamMapped: 0, hasSenderMicrosoftId: 0 };
      // Determine whether unmapped Teams-chat sender IDs match any known
      // internal directory identity. Do not emit IDs, addresses or messages.
      const unmatchedChatSenderIds = await WorkEvent.distinct('metadata.microsoftUserId', {
        orgId,
        source: 'microsoft-teams',
        externalId: /^teams-chat-/,
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        $or: [{ actorUserId: null }, { actorUserId: { $exists: false } }],
        'metadata.microsoftUserId': { $exists: true, $nin: ['', null] },
      });
      const directoryMatches = unmatchedChatSenderIds.length
        ? await User.find({
            orgId,
            'externalIds.microsoftUserId': { $in: unmatchedChatSenderIds },
          }).select('externalIds.microsoftUserId accountStatus teamId').lean()
        : [];
      const matchedIds = new Set(directoryMatches.map(user => String(user.externalIds?.microsoftUserId)));
      const unrecognizedSenderCount = unmatchedChatSenderIds.filter(userId => !matchedIds.has(String(userId))).length;
      const latestOrgMetric = await IntegrationMetricsDaily.findOne({ orgId, teamId: null, userId: null })
        .sort({ date: -1 })
        .select('date meetingDurationTotalHours7d meetingParticipantHours7d focusTimeAvailabilityHours messageCount7d afterHoursMessageRatio uniqueChannels7d meetingCount7d meetingInstanceCount7d')
        .lean();
      // Read-only source-to-snapshot reconciliation for the active customer tenant.
      // Never log source records, person identities, subjects or message content.
      let parity = { status: 'NOT_CHECKED', checks: [] };
      if (org.lifecycleStatus !== 'retired' && latestOrgMetric?.date) {
        const snapshotDay = new Date(latestOrgMetric.date);
        snapshotDay.setUTCHours(0, 0, 0, 0);
        const lookback = new Date(snapshotDay.getTime() - 6 * 86400000);
        const end = new Date(snapshotDay.getTime() + 86400000);
        // Report-wide snapshots include every stored eligible integration.
        // Querying only Outlook and Teams can manufacture a discrepancy when
        // older calendar or collaboration adapters contributed to the rollup.
        const query = { orgId, timestamp: { $gte: lookback, $lt: end } };
        const eventLimit = 15000;
        const eventTotal = await WorkEvent.countDocuments(query);
        if (eventTotal <= eventLimit) {
          const sourceRows = await WorkEvent.find(query)
            .select('source eventType actorUserId externalId timestamp metadata').lean();
          parity = compareStoredWorkPatternMetrics({
            events: sourceRows, snapshot: latestOrgMetric,
            workSchedule: {
              timezone: org.settings?.timezone || 'UTC',
              workdayStart: org.settings?.workdayStart || '09:00',
              workdayEnd: org.settings?.workdayEnd || '17:00',
            },
          });
        } else {
          parity = { status: 'UNVERIFIED_VOLUME_LIMIT', eventCount: eventTotal, checks: [] };
        }
      }

      const verifiedManagerTeams = teams.filter(team =>
        team.structure?.source === 'hr' &&
        team.structure?.verifiedAt && team.structure?.managerUserId);
      const approvedManagerIds = verifiedManagerTeams.map(team => team.structure.managerUserId);
      const managerUsers = approvedManagerIds.length
        ? await User.find({ orgId, _id: { $in: approvedManagerIds },
            accountStatus: 'active' }).select('_id orgId accountStatus').lean()
        : [];
      const managerUserMap = new Map(managerUsers.map(user => [String(user._id), user]));
      const managerAssignmentRows = await ManagerAssignment.find({ orgId })
        .select('managerUserId teamId status acceptedAt revokedAt expiresAt').lean();
      const assignmentMap = new Map(managerAssignmentRows.map(item =>
        [String(item.teamId) + ':' + String(item.managerUserId), item]));
      const scopedPermissionPasses = verifiedManagerTeams.filter(team => {
        const user = managerUserMap.get(String(team.structure.managerUserId));
        const assignment = assignmentMap.get(String(team._id) + ':' +
          String(team.structure.managerUserId));
        return validateTeamPermission({
          user, assignment, team, orgId, teamId: team._id,
        });
      }).length;

      const summary = {
        orgId: String(orgId),
        name: org.name,
        domain: org.domain || null,
        lifecycleStatus: org.lifecycleStatus || null,
        canonicalHint: {
          hasMicrosoftRefreshToken: Boolean(microsoft.refreshToken),
          microsoftTenantId: microsoft.tenantId || null,
          microsoftLastSync: iso(microsoft.lastSync || microsoft.lastSyncAt || microsoft.lastSuccessfulSync),
          weeklyBriefRecipientsApproved: Boolean(org.settings?.weeklyBriefRecipientsApprovedAt),
          weeklyBriefRecipientCount: Array.isArray(org.settings?.weeklyBriefRecipients)
            ? org.settings.weeklyBriefRecipients.length
            : 0,
        },
        reportingConfig: {
          timezone: org.settings?.timezone || null,
          timezoneFallback: !org.settings?.timezone,
          workdayStart: org.settings?.workdayStart || null,
          workdayEnd: org.settings?.workdayEnd || null,
          minTeamSize: org.settings?.minTeamSize ?? null,
        },
        roster: { activeUsers, inactiveUsers, adminUsers: admins, activeHrAdminRecipients: activeHrAdmins, realInternalEmployeeCandidates: employeeCandidates.length },
        teams: { activeCount: teams.length, names: teams.map((t) => t.name) },
        workEvents: {
          total: totalEvents,
          last24h: recentEvents,
          latestAt: iso(latestEvent?.timestamp),
          latestSource: latestEvent?.source || null,
          latestType: latestEvent?.eventType || null,
          latestMappedToTeam: Boolean(latestEvent?.teamId),
          latestMappedToActor: Boolean(latestEvent?.actorUserId),
          last7dTotal: recentEventTotal,
          last7dActorMappingPct: recentEventTotal ? Math.round((recentActorMapped / recentEventTotal) * 100) : 0,
          last7dTeamMappingPct: recentEventTotal ? Math.round((recentTeamMapped / recentEventTotal) * 100) : 0,
        },
        chatAttribution: {
          last7dMessages: chat.total,
          actorMapped: chat.actorMapped,
          teamMapped: chat.teamMapped,
          withMicrosoftSenderId: chat.hasSenderMicrosoftId,
          unmappedDistinctSenderIds: unmatchedChatSenderIds.length,
          unmappedKnownDirectoryIds: matchedIds.size,
          unmappedUnknownDirectoryIds: unrecognizedSenderCount,
          // An ID absent from our directory may be an external guest or a
          // missing roster identity. Do not classify it as external by default.
          unrecognizedClassification: 'unconfirmed_not_in_directory',
        },
        metrics: {
          latestOrgMetricDate: iso(latestOrgMetric?.date),
          latestOrgMessageCount7d: latestOrgMetric?.messageCount7d ?? null,
          latestOrgAfterHoursMessageRatio: latestOrgMetric?.afterHoursMessageRatio ?? null,
          latestOrgUniqueChannels7d: latestOrgMetric?.uniqueChannels7d ?? null,
          latestOrgMeetingInstanceCount7d: latestOrgMetric?.meetingInstanceCount7d ?? null,
          dailyRows: metricRows,
          latestDailyAt: iso(latestMetric?.date),
          latestDailyMappedToTeam: Boolean(latestMetric?.teamId),
          integrationRows: integrationMetricRows,
          latestIntegrationAt: iso(latestIntegrationMetric?.date),
          latestIntegration: latestIntegrationMetric?.integration || null,
        },
        signals: {
          signalRows: signals,
          latestSignalAt: iso(latestSignal?.lastUpdated || latestSignal?.updatedAt || latestSignal?.createdAt),
          latestSignalType: latestSignal?.signalType || null,
          latestSignalSeverity: latestSignal?.severity || null,
          ckRows: ckSignals,
          latestCkSignalAt: iso(latestCkSignal?.updatedAt || latestCkSignal?.createdAt),
          latestCkSignalType: latestCkSignal?.signalType || null,
        },
        latestBrief: latestBrief ? {
          generatedAt: iso(latestBrief.generatedAt),
          reportMode: latestBrief.reportMode || null,
          statusLabel: latestBrief.payload?.status?.label || null,
          coverageStatus: latestBrief.payload?.coverage?.status || null,
          mappingCoveragePct: latestBrief.payload?.coverage?.mappingCoveragePct ?? null,
          totalUsers: latestBrief.payload?.coverage?.totalUsers ?? null,
          mappedUsers: latestBrief.payload?.coverage?.mappedUsers ?? null,
        } : null,
        sourceToSnapshotParity: parity,
        managerReporting: {
          hrVerifiedManagerTeams: verifiedManagerTeams.length,
          currentVerifiedManagerAccounts: managerUsers.length,
          scopedPermissionPredicatePasses: scopedPermissionPasses,
          verifiedTeamsAwaitingAssignment: Math.max(0,
            verifiedManagerTeams.length - scopedPermissionPasses),
          assignmentStatuses: Object.fromEntries(managerAssignments.map(row => [row._id || 'unknown', row.count])),
          managerAccessValidatedInSession: false,
          teamDailySnapshotCount: dailyTeamSnapshots,
          latestTeamSnapshotDate: latestTeamSnapshot?.date || null,
          latestDailyCalendarObserved: Boolean(latestTeamSnapshot?.integrationCoverage?.hasCalendar &&
            latestTeamSnapshot?.measurementEvidence?.calendarEventCount > 0),
          latestDailyMessagingObserved: Boolean(latestTeamSnapshot?.integrationCoverage?.hasMessaging &&
            latestTeamSnapshot?.measurementEvidence?.messagingEventCount > 0),
          weeklyEngagementSnapshotCount: weeklyStrainCount,
          teamIntegrationMetricCount: teamMetricCount,
        },
        integrationConnections: connections.map((c) => ({
          provider: c.integrationType,
          status: c.status || null,
          lastSyncAt: iso(c.sync?.lastSuccessfulSyncAt || c.sync?.lastSyncAt),
        })),
      };

      console.log('[TehnopolAudit] ' + JSON.stringify(summary));
    }
  } catch (error) {
    console.error('[TehnopolAudit] failed:', error?.stack || error?.message || error);
  }
}
