import IntegrationConnection from '../models/integrationConnection.js';
import Notification from '../models/notification.js';
import Organization, { ACTIVE_ORG_FILTER } from '../models/organizationModel.js';
import User from '../models/user.js';
import {
  deriveMicrosoftIntegrationStatus,
  getSafeMicrosoftTechnicalReason,
} from './microsoftIntegrationStatusService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function evaluateIntegrationHealth(connection, now = new Date(), context = {}) {
  if (!connection || connection.status === 'disconnected') return [];
  const issues = [];
  const source = connection.integrationType;
  const microsoftSourceName =
    source === 'microsoft-outlook' ? 'outlook' : source === 'microsoft-teams' ? 'teams' : null;
  if (connection.status === 'error' || connection.sync?.lastSyncStatus === 'failed') {
    let message =
      connection.statusMessage || connection.sync?.lastSyncMessage || 'The latest sync failed.';
    if (microsoftSourceName) {
      const sourceLabel = microsoftSourceName === 'outlook' ? 'Outlook' : 'Teams';
      const derivedMessage = context.microsoftSourceState?.statusMessage;
      const technicalReason = getSafeMicrosoftTechnicalReason(
        context.microsoftSourceRecord,
        connection,
        microsoftSourceName
      );
      message =
        connection.status === 'error'
          ? derivedMessage ||
            `Microsoft permissions are present, but SignalTrue could not verify ${sourceLabel}.${technicalReason ? ` ${technicalReason}` : ''}`
          : `The latest Microsoft ${sourceLabel} sync failed.`;
    }
    issues.push({
      key: `${source}:sync-failed`,
      source,
      severity: 'high',
      message,
    });
  }
  if (connection.status === 'needs_admin') {
    issues.push({
      key: `${source}:needs-admin`,
      source,
      severity: 'high',
      message: microsoftSourceName
        ? 'Microsoft tenant connected. Company-wide Application permissions still require administrator consent.'
        : connection.statusMessage || 'Administrator consent is required.',
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
  if ((connection.coverage?.unavailableUsers || 0) > 0) {
    issues.push({
      key: `${source}:mailboxes-unavailable`,
      source,
      severity: 'medium',
      message: `${connection.coverage.unavailableUsers} Microsoft accounts have no accessible Exchange Online mailbox and are excluded from calendar coverage.`,
    });
  }
  if ((connection.coverage?.failedUsers || 0) > 0) {
    issues.push({
      key: `${source}:mailbox-checks-failed`,
      source,
      severity: 'medium',
      message: `${connection.coverage.failedUsers} Microsoft mailbox checks failed during the latest synchronization.`,
    });
  }
  return issues;
}

export async function getOrganizationIntegrationHealth(orgId) {
  const [connections, organization] = await Promise.all([
    IntegrationConnection.find({ orgId }).lean(),
    Organization.findById(orgId).select('integrations.microsoft').lean(),
  ]);
  const microsoft = organization?.integrations?.microsoft || {};
  const microsoftState = deriveMicrosoftIntegrationStatus(microsoft, connections);
  return connections.flatMap((connection) => {
    const sourceName =
      connection.integrationType === 'microsoft-outlook'
        ? 'outlook'
        : connection.integrationType === 'microsoft-teams'
          ? 'teams'
          : null;
    return evaluateIntegrationHealth(connection, new Date(), {
      microsoftSourceState: sourceName ? microsoftState.sources[sourceName] : null,
      microsoftSourceRecord: sourceName ? microsoft.applicationConsentSources?.[sourceName] : null,
    });
  });
}

export async function runIntegrationHealthMonitor() {
  const orgs = await Organization.find(ACTIVE_ORG_FILTER).select('_id').lean();
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
