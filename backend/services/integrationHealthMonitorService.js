import IntegrationConnection from '../models/integrationConnection.js';
import Notification from '../models/notification.js';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function evaluateIntegrationHealth(connection, now = new Date()) {
  if (!connection || connection.status === 'disconnected') return [];
  const issues = [];
  const source = connection.integrationType;
  if (connection.status === 'error' || connection.sync?.lastSyncStatus === 'failed') {
    issues.push({
      key: `${source}:sync-failed`,
      source,
      severity: 'high',
      message:
        connection.statusMessage || connection.sync?.lastSyncMessage || 'The latest sync failed.',
    });
  }
  if (connection.status === 'needs_admin') {
    issues.push({
      key: `${source}:needs-admin`,
      source,
      severity: 'high',
      message: connection.statusMessage || 'Administrator consent is required.',
    });
  }
  const lastSync = connection.sync?.lastSuccessfulSyncAt || connection.sync?.lastSyncAt;
  if (lastSync && now - new Date(lastSync) > DAY_MS) {
    issues.push({
      key: `${source}:stale`,
      source,
      severity: 'high',
      message: 'No successful sync has completed in the last 24 hours.',
    });
  }
  if (
    connection.connectedAt &&
    !lastSync &&
    now - new Date(connection.connectedAt) > 6 * 60 * 60 * 1000
  ) {
    issues.push({
      key: `${source}:never-synced`,
      source,
      severity: 'high',
      message: 'The source was authorized but its first sync has not completed.',
    });
  }
  if ((connection.coverage?.totalUsers || 0) > 0 && (connection.coverage?.mappedUsers || 0) === 0) {
    issues.push({
      key: `${source}:unmapped`,
      source,
      severity: 'medium',
      message: 'Activity is not mapped to any employee accounts.',
    });
  }
  return issues;
}

export async function getOrganizationIntegrationHealth(orgId) {
  const connections = await IntegrationConnection.find({ orgId }).lean();
  return connections.flatMap((connection) => evaluateIntegrationHealth(connection));
}

export async function runIntegrationHealthMonitor() {
  const orgs = await Organization.find({}).select('_id').lean();
  let notificationsCreated = 0;
  for (const org of orgs) {
    const issues = await getOrganizationIntegrationHealth(org._id);
    if (!issues.length) continue;
    const admins = await User.find({
      orgId: org._id,
      role: { $in: ['admin', 'hr_admin', 'it_admin'] },
      accountStatus: { $ne: 'inactive' },
    })
      .select('_id')
      .lean();
    for (const issue of issues) {
      for (const admin of admins) {
        const duplicate = await Notification.exists({
          userId: admin._id,
          orgId: org._id,
          type: 'system',
          'data.metadata.problemKey': issue.key,
          createdAt: { $gt: new Date(Date.now() - DAY_MS) },
        });
        if (duplicate) continue;
        await Notification.create({
          userId: admin._id,
          orgId: org._id,
          type: 'system',
          priority: issue.severity === 'high' ? 'high' : 'normal',
          title: `Data source needs attention: ${issue.source}`,
          message: issue.message,
          data: {
            actionUrl: '/dashboard?setup=true',
            actionLabel: 'Review data sources',
            metadata: { problemKey: issue.key, source: issue.source },
          },
        });
        notificationsCreated++;
      }
    }
  }
  return { organizationsChecked: orgs.length, notificationsCreated };
}
