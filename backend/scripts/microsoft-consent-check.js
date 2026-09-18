/**
 * Read-only Microsoft tenant consent diagnosis for one organization.
 *
 * Independently requests an app-only token, performs privacy-safe Graph probes,
 * and reports source, sync, coverage, and backfill state. Makes no changes —
 * use the verify endpoint/flow to record success.
 *
 *   node scripts/microsoft-consent-check.js <name-or-domain>
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';
import WorkEvent from '../models/workEvent.js';
import {
  inspectMicrosoftCompanyWideAccess,
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
} from '../services/microsoftAdminConsentService.js';

const target = process.argv.slice(2).find((v) => !v.startsWith('--'));
if (!target) throw new Error('Usage: microsoft-consent-check.js <name-or-domain>');
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

await mongoose.connect(process.env.MONGO_URI);
try {
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = await Organization.find({
    $or: [
      { name: { $regex: escapedTarget, $options: 'i' } },
      { domain: { $regex: escapedTarget, $options: 'i' } },
    ],
  });
  const normalizedTarget = target.trim().toLowerCase();
  const exactMatches = matches.filter(
    (organization) =>
      String(organization.name || '').trim().toLowerCase() === normalizedTarget ||
      String(organization.domain || '').trim().toLowerCase() === normalizedTarget
  );
  let org = exactMatches.length === 1 ? exactMatches[0] : matches.length === 1 ? matches[0] : null;
  if (matches.length > 1) {
    // Duplicate customer records occasionally exist after imports. Prefer the
    // single record with the strongest Microsoft activity evidence; never
    // guess when the leading records are tied.
    const eventCounts = await WorkEvent.aggregate([
      {
        $match: {
          orgId: { $in: matches.map((organization) => organization._id) },
          source: { $in: ['microsoft-outlook', 'microsoft-teams'] },
        },
      },
      { $group: { _id: '$orgId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    if (eventCounts[0]?.count > (eventCounts[1]?.count || 0)) {
      org = matches.find(
        (organization) => String(organization._id) === String(eventCounts[0]._id)
      );
    }
  }
  if (!org) {
    throw new Error(`Expected exactly one matching organization; found ${matches.length}`);
  }
  const ms = org.integrations?.microsoft || {};

  let assessment = null;
  let liveVerificationReason = ms.tenantId ? 'microsoft_live_verification_unavailable' : null;
  if (ms.tenantId) {
    try {
      assessment = await inspectMicrosoftCompanyWideAccess(org._id);
      liveVerificationReason = null;
    } catch (error) {
      assessment = null;
      const safeMessage = String(error?.message || '');
      liveVerificationReason = /invalid_client|AADSTS7000215|AADSTS7000222/i.test(safeMessage)
        ? 'application_credentials_rejected'
        : /different tenant/i.test(safeMessage)
          ? 'token_tenant_mismatch'
          : /different application/i.test(safeMessage)
            ? 'token_application_mismatch'
            : /credentials are not configured/i.test(safeMessage)
              ? 'application_credentials_not_configured'
              : 'app_only_token_or_live_verification_failed';
    }
  }

  const [connections, outlookEvents, teamsEvents] = await Promise.all([
    IntegrationConnection.find({
      orgId: org._id,
      integrationType: { $in: ['microsoft-outlook', 'microsoft-teams'] },
    }).lean(),
    WorkEvent.countDocuments({ orgId: org._id, source: 'microsoft-outlook' }),
    WorkEvent.countDocuments({ orgId: org._id, source: 'microsoft-teams' }),
  ]);
  const connectionByType = new Map(
    connections.map((connection) => [connection.integrationType, connection])
  );
  const outlookConnection = connectionByType.get('microsoft-outlook');
  const teamsConnection = connectionByType.get('microsoft-teams');
  const sourceConnections = [outlookConnection, teamsConnection].filter(Boolean);
  const backfillComplete =
    sourceConnections.length === 2 &&
    sourceConnections.every((connection) => connection.sync?.backfillComplete === true);
  const operationalSources = sourceConnections.filter(
    (connection) => connection.status === 'connected' && connection.sync?.enabled !== false
  ).length;
  const finalVerdict = !assessment
    ? 'error'
    : assessment.status === 'connected' && operationalSources === 2
      ? 'healthy'
      : assessment.status === 'connected' && operationalSources === 1
        ? 'partial'
        : assessment.status;

  const roleState = Object.fromEntries(
    REQUIRED_MICROSOFT_APPLICATION_ROLES.map((role) => [
      role,
      Boolean(assessment?.roles?.includes(role)),
    ])
  );

  console.log(
    JSON.stringify(
      {
        organization: { id: String(org._id), name: org.name },
        microsoftTenant: {
          identityLinked: Boolean(ms.delegatedConnectedAt || ms.accessToken),
          tenantIdPresent: Boolean(ms.tenantId),
          appOnlyTokenAcquired: Boolean(assessment),
        },
        applicationRoles: roleState,
        outlook: {
          directoryProbe: assessment?.sources?.outlook?.probes?.directory || 'not_run',
          calendarProbe: assessment?.sources?.outlook?.probes?.calendar || 'not_run',
          verificationState: assessment?.sources?.outlook?.status || 'error',
          reasonCode:
            assessment?.sources?.outlook?.reasonCode ||
            (assessment ? null : liveVerificationReason),
          connectionState: outlookConnection?.status || 'disconnected',
          lastSuccessfulSync: outlookConnection?.sync?.lastSuccessfulSyncAt || null,
          usersAttempted: outlookConnection?.coverage?.attemptedUsers || 0,
          usersSynced: outlookConnection?.coverage?.syncedUsers || 0,
          usersSkipped: outlookConnection?.coverage?.skippedUsers || 0,
          eventsCollected: outlookEvents,
          latestErrorCategories: outlookConnection?.coverage?.errorCategories || {},
        },
        teams: {
          directoryProbe: assessment?.sources?.teams?.probes?.directory || 'not_run',
          joinedTeamsProbe: assessment?.sources?.teams?.probes?.teams || 'not_run',
          channelsProbe: assessment?.sources?.teams?.probes?.channels || 'not_run',
          messagesProbe: assessment?.sources?.teams?.probes?.messages || 'not_run',
          verificationState: assessment?.sources?.teams?.status || 'error',
          reasonCode:
            assessment?.sources?.teams?.reasonCode ||
            (assessment ? null : liveVerificationReason),
          connectionState: teamsConnection?.status || 'disconnected',
          lastSuccessfulSync: teamsConnection?.sync?.lastSuccessfulSyncAt || null,
          usersAttempted: teamsConnection?.coverage?.attemptedUsers || 0,
          usersMapped: teamsConnection?.coverage?.mappedUsers || 0,
          usersSkipped: teamsConnection?.coverage?.skippedUsers || 0,
          teamsDiscovered: teamsConnection?.coverage?.teamsDiscovered || 0,
          teamsRead: teamsConnection?.coverage?.teamsRead || 0,
          eventsCollected: teamsEvents,
          latestErrorCategories: teamsConnection?.coverage?.errorCategories || {},
        },
        backfill: {
          status: backfillComplete
            ? 'completed'
            : sourceConnections.some((connection) => connection.sync?.backfillStartedAt)
              ? 'in_progress_or_incomplete'
              : 'not_started',
          startedAt:
            sourceConnections
              .map((connection) => connection.sync?.backfillStartedAt)
              .filter(Boolean)
              .sort((a, b) => new Date(a) - new Date(b))[0] || null,
          completedAt:
            sourceConnections
              .map((connection) => connection.sync?.backfillCompletedAt)
              .filter(Boolean)
              .sort((a, b) => new Date(b) - new Date(a))[0] || null,
          progress: sourceConnections.length
            ? Math.min(
                ...sourceConnections.map((connection) => connection.sync?.backfillProgress || 0)
              )
            : 0,
        },
        finalVerdict,
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
