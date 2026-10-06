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
import { classifyEmployeeCandidate } from '../utils/employeeIdentity.js';

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
        Team.find({ orgId, isActive: { $ne: false } }).select('_id name size memberCount').lean(),
        WorkEvent.countDocuments({ orgId }),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
        WorkEvent.findOne({ orgId }).sort({ timestamp: -1 }).select('timestamp source eventType teamId actorUserId').lean(),
        MetricsDaily.countDocuments({ orgId }),
        MetricsDaily.findOne({ orgId }).sort({ date: -1 }).select('date teamId').lean(),
        IntegrationMetricsDaily.countDocuments({ orgId }),
        IntegrationMetricsDaily.findOne({ orgId }).sort({ date: -1 }).select('date integration teamId').lean(),
        Signal.countDocuments({ orgId }),
        Signal.findOne({ orgId }).sort({ createdAt: -1 }).select('createdAt signalType severity teamId').lean(),
        CategoryKingSignal.countDocuments({ orgId }),
        CategoryKingSignal.findOne({ orgId }).sort({ createdAt: -1 }).select('createdAt signalType severity').lean(),
        IntegrationConnection.find({ orgId }).select('integrationType status sync.lastSyncAt sync.lastSuccessfulSyncAt').lean(),
        WeeklyBriefSnapshot.findOne({ orgId }).sort({ generatedAt: -1 }).select('generatedAt reportMode payload.status payload.coverage').lean(),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, actorUserId: { $ne: null } }),
        WorkEvent.countDocuments({ orgId, timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, teamId: { $ne: null } }),
        User.find({ orgId, accountStatus: { $ne: 'inactive' } }).select('email name displayName role').lean(),
      ]);

      const microsoft = org.integrations?.microsoft || {};
      const employeeCandidates = rosterUsers.filter((u) =>
        classifyEmployeeCandidate({ email: u.email, name: u.name, displayName: u.displayName }, { orgDomain: org.domain }).ok
      );
      const summary = {
        orgId: String(orgId),
        name: org.name,
        domain: org.domain || null,
        lifecycleStatus: org.lifecycleStatus || null,
        canonicalHint: {
          hasMicrosoftRefreshToken: Boolean(microsoft.refreshToken),
          microsoftTenantId: microsoft.tenantId || null,
          microsoftLastSync: iso(microsoft.lastSync || microsoft.lastSyncAt || microsoft.lastSuccessfulSync),
          weeklyBriefRecipientCount: Array.isArray(org.settings?.weeklyBriefRecipients)
            ? org.settings.weeklyBriefRecipients.length
            : 0,
        },
        roster: { activeUsers, inactiveUsers, adminUsers: admins, realInternalEmployeeCandidates: employeeCandidates.length },
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
        metrics: {
          dailyRows: metricRows,
          latestDailyAt: iso(latestMetric?.date),
          latestDailyMappedToTeam: Boolean(latestMetric?.teamId),
          integrationRows: integrationMetricRows,
          latestIntegrationAt: iso(latestIntegrationMetric?.date),
          latestIntegration: latestIntegrationMetric?.integration || null,
        },
        signals: {
          signalRows: signals,
          latestSignalAt: iso(latestSignal?.createdAt),
          latestSignalType: latestSignal?.signalType || null,
          latestSignalSeverity: latestSignal?.severity || null,
          ckRows: ckSignals,
          latestCkSignalAt: iso(latestCkSignal?.createdAt),
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
