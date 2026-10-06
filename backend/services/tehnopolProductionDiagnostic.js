import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import MetricsDaily from '../models/metricsDaily.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import Signal from '../models/signal.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import IntegrationConnection from '../models/integrationConnection.js';

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
        IntegrationConnection.find({ orgId }).select('provider status lastSyncAt lastSuccessfulSyncAt syncStatus').lean(),
      ]);

      const microsoft = org.integrations?.microsoft || {};
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
        roster: { activeUsers, inactiveUsers, adminUsers: admins },
        teams: { activeCount: teams.length, names: teams.map((t) => t.name) },
        workEvents: {
          total: totalEvents,
          last24h: recentEvents,
          latestAt: iso(latestEvent?.timestamp),
          latestSource: latestEvent?.source || null,
          latestType: latestEvent?.eventType || null,
          latestMappedToTeam: Boolean(latestEvent?.teamId),
          latestMappedToActor: Boolean(latestEvent?.actorUserId),
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
        integrationConnections: connections.map((c) => ({
          provider: c.provider,
          status: c.status || c.syncStatus || null,
          lastSyncAt: iso(c.lastSuccessfulSyncAt || c.lastSyncAt),
        })),
      };

      console.log('[TehnopolAudit] ' + JSON.stringify(summary));
    }
  } catch (error) {
    console.error('[TehnopolAudit] failed:', error?.stack || error?.message || error);
  }
}
