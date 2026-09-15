import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import IntegrationConnection from '../models/integrationConnection.js';
import { getMicrosoftAppToken } from './tokenService.js';
import {
  MICROSOFT_OUTLOOK_APPLICATION_ROLES,
  MICROSOFT_TEAMS_APPLICATION_ROLES,
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
} from '../config/microsoftPermissions.js';

export { REQUIRED_MICROSOFT_APPLICATION_ROLES } from '../config/microsoftPermissions.js';

function decodeTokenPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Microsoft returned an invalid application token.');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

async function graphProbe(url, token, label) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: globalThis.AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    let code = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      code = body?.error?.code || code;
    } catch {
      // A stable status is enough for a safe, non-sensitive verification error.
    }
    throw new Error(`${label} verification failed (${code}).`);
  }
  return response.json();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourceAssessment(requiredRoles, roles, probeNames) {
  const missingRoles = requiredRoles.filter((role) => !roles.includes(role));
  return {
    verified: false,
    missingRoles,
    error:
      missingRoles.length > 0
        ? `Missing application permissions: ${missingRoles.join(', ')}.`
        : null,
    probes: Object.fromEntries(probeNames.map((name) => [name, 'not_run'])),
  };
}

/**
 * Read-only, live assessment of one tenant. Application-token role claims and
 * the relevant Microsoft Graph endpoints must both succeed. No organization or
 * connection state is changed by this function.
 */
export async function inspectMicrosoftCompanyWideAccess(orgId) {
  const organization = await Organization.findById(orgId).lean();
  if (!organization) throw new Error('Organization not found.');

  const tenantId = organization.integrations?.microsoft?.tenantId;
  if (!tenantId) throw new Error('Connect Microsoft identity access before verification.');

  const appToken = await getMicrosoftAppToken(tenantId);
  if (!appToken) throw new Error('Microsoft application credentials are not configured.');

  const claims = decodeTokenPayload(appToken);
  if (claims.tid && String(claims.tid) !== String(tenantId)) {
    throw new Error('Microsoft application token belongs to a different tenant.');
  }
  const tokenAppId = claims.appid || claims.azp;
  if (
    process.env.MS_APP_CLIENT_ID &&
    tokenAppId &&
    String(tokenAppId) !== String(process.env.MS_APP_CLIENT_ID)
  ) {
    throw new Error('Microsoft application token belongs to a different application.');
  }

  const roles = unique(Array.isArray(claims.roles) ? claims.roles : []).sort();
  const outlook = sourceAssessment(MICROSOFT_OUTLOOK_APPLICATION_ROLES, roles, [
    'directory',
    'calendar',
  ]);
  const teams = sourceAssessment(MICROSOFT_TEAMS_APPLICATION_ROLES, roles, [
    'directory',
    'teams',
    'channels',
    'messages',
  ]);

  let directory = null;
  let directoryError = null;
  if (roles.includes('User.Read.All')) {
    try {
      directory = await graphProbe(
        'https://graph.microsoft.com/v1.0/users?$top=10&$select=id',
        appToken,
        'Microsoft directory'
      );
      outlook.probes.directory = 'passed';
      teams.probes.directory = 'passed';
    } catch (error) {
      directoryError = error;
      outlook.probes.directory = 'failed';
      teams.probes.directory = 'failed';
    }
  }

  const mappedUsers = await User.find({
    orgId,
    'externalIds.microsoftUserId': { $exists: true, $ne: null },
    accountStatus: { $ne: 'inactive' },
  })
    .select('externalIds.microsoftUserId')
    .limit(10)
    .lean();
  const microsoftUserIds = unique([
    ...mappedUsers.map((user) => user.externalIds?.microsoftUserId),
    ...(directory?.value || []).map((user) => user.id),
  ]).slice(0, 10);

  if (outlook.missingRoles.length === 0) {
    if (directoryError) {
      outlook.error = directoryError.message;
    } else if (microsoftUserIds.length === 0) {
      outlook.error = 'Microsoft directory access works, but no employee account is available.';
    } else {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      let lastCalendarError = null;
      for (const microsoftUserId of microsoftUserIds) {
        try {
          await graphProbe(
            `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/calendarView?startDateTime=${encodeURIComponent(start.toISOString())}&endDateTime=${encodeURIComponent(end.toISOString())}&$top=1&$select=id`,
            appToken,
            'Company-wide calendar'
          );
          outlook.probes.calendar = 'passed';
          outlook.verified = true;
          outlook.error = null;
          break;
        } catch (error) {
          lastCalendarError = error;
        }
      }
      if (!outlook.verified) {
        outlook.probes.calendar = 'failed';
        outlook.error = lastCalendarError?.message || 'Company-wide calendar verification failed.';
      }
    }
  }

  if (teams.missingRoles.length === 0) {
    if (directoryError) {
      teams.error = directoryError.message;
    } else if (microsoftUserIds.length === 0) {
      teams.error = 'Microsoft directory access works, but no employee account is available.';
    } else {
      let probeTeam = null;
      let joinedTeamsError = null;
      for (const microsoftUserId of microsoftUserIds) {
        try {
          const joinedTeams = await graphProbe(
            `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/joinedTeams`,
            appToken,
            'Company-wide Teams'
          );
          teams.probes.teams = 'passed';
          probeTeam = joinedTeams.value?.[0] || null;
          if (probeTeam) break;
        } catch (error) {
          joinedTeamsError = error;
        }
      }

      if (!probeTeam) {
        if (joinedTeamsError && teams.probes.teams !== 'passed') teams.probes.teams = 'failed';
        teams.error =
          joinedTeamsError?.message ||
          'Teams directory access works, but no joined team is available for channel verification.';
      } else {
        try {
          const channels = await graphProbe(
            `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(probeTeam.id)}/channels?$top=10&$select=id`,
            appToken,
            'Company-wide Teams channels'
          );
          teams.probes.channels = 'passed';
          const probeChannel = channels.value?.[0];
          if (!probeChannel) {
            throw new Error(
              'Teams channel access works, but no channel is available for message verification.'
            );
          }
          await graphProbe(
            `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(probeTeam.id)}/channels/${encodeURIComponent(probeChannel.id)}/messages?$top=1`,
            appToken,
            'Company-wide Teams messages'
          );
          teams.probes.messages = 'passed';
          teams.verified = true;
          teams.error = null;
        } catch (error) {
          if (teams.probes.channels !== 'passed') teams.probes.channels = 'failed';
          else teams.probes.messages = 'failed';
          teams.error = error.message;
        }
      }
    }
  }

  return {
    tenantId,
    identityLinked: Boolean(
      organization.integrations?.microsoft?.delegatedConnectedAt ||
      organization.integrations?.microsoft?.accessToken
    ),
    identityLinkedAt: organization.integrations?.microsoft?.delegatedConnectedAt || null,
    roles,
    missingRoles: REQUIRED_MICROSOFT_APPLICATION_ROLES.filter((role) => !roles.includes(role)),
    sources: { outlook, teams },
    verified: outlook.verified && teams.verified,
  };
}

function sourceStatusMessage(name, assessment) {
  if (assessment.verified) {
    return `Company-wide Microsoft ${name} application access verified by Graph probes`;
  }
  return assessment.error || `Microsoft ${name} company-wide access could not be verified.`;
}

async function persistSourceState(orgId, integrationType, sourceName, assessment, verifiedBy, now) {
  const status = assessment.verified
    ? 'connected'
    : assessment.missingRoles.length > 0
      ? 'needs_admin'
      : 'error';
  const update = {
    $set: {
      status,
      statusMessage: sourceStatusMessage(sourceName, assessment),
      statusUpdatedAt: now,
      measurementScope: assessment.verified
        ? 'organization-wide Microsoft metadata'
        : 'application access not verified',
      'sync.enabled': assessment.verified,
      ...(assessment.verified
        ? {
            connectedAt: now,
            connectedBy: verifiedBy || undefined,
          }
        : {}),
    },
  };
  if (!assessment.verified) {
    update.$set['sync.backfillComplete'] = false;
    update.$set['sync.backfillProgress'] = 0;
    update.$unset = {
      connectedAt: 1,
      connectedBy: 1,
      'sync.backfillStartedAt': 1,
      'sync.backfillCompletedAt': 1,
    };
  }
  const previous = await IntegrationConnection.findOneAndUpdate(
    { orgId, integrationType },
    update,
    { upsert: true, returnDocument: 'before' }
  );
  return assessment.verified && previous?.status !== 'connected';
}

export async function verifyMicrosoftCompanyWideAccess(orgId, verifiedBy = null) {
  const attemptedAt = new Date();
  let assessment;
  try {
    assessment = await inspectMicrosoftCompanyWideAccess(orgId);
  } catch (error) {
    const safeError = String(error.message).slice(0, 500);
    await Promise.all([
      Organization.findByIdAndUpdate(orgId, {
        $set: {
          'integrations.microsoft.applicationConsentLastCheckedAt': attemptedAt,
          'integrations.microsoft.applicationConsentLastError': safeError,
          'integrations.microsoft.sync.enabled': false,
          'integrations.microsoft.sync.lastStatus': 'error',
          'integrations.microsoft.sync.error': safeError,
        },
        $unset: { 'integrations.microsoft.applicationConsentVerifiedAt': 1 },
      }),
      IntegrationConnection.updateMany(
        { orgId, integrationType: { $in: ['microsoft-outlook', 'microsoft-teams'] } },
        {
          $set: {
            status: 'error',
            statusMessage: safeError,
            statusUpdatedAt: attemptedAt,
            'sync.enabled': false,
          },
          $unset: { connectedAt: 1, connectedBy: 1 },
        }
      ),
    ]);
    throw error;
  }

  const transitions = [];
  if (
    await persistSourceState(
      orgId,
      'microsoft-outlook',
      'Outlook',
      assessment.sources.outlook,
      verifiedBy,
      attemptedAt
    )
  ) {
    transitions.push('microsoft-outlook');
  }
  if (
    await persistSourceState(
      orgId,
      'microsoft-teams',
      'Teams',
      assessment.sources.teams,
      verifiedBy,
      attemptedAt
    )
  ) {
    transitions.push('microsoft-teams');
  }

  const errors = Object.entries(assessment.sources)
    .filter(([, source]) => !source.verified)
    .map(([name, source]) => `${name}: ${source.error}`);
  const organizationSet = {
    'integrations.microsoft.applicationConsentLastCheckedAt': attemptedAt,
    'integrations.microsoft.applicationConsentLastError': errors.length
      ? errors.join(' ').slice(0, 500)
      : null,
    'integrations.microsoft.applicationConsentRoles': assessment.roles,
    'integrations.microsoft.applicationConsentTenantId': assessment.tenantId,
    'integrations.microsoft.applicationConsentSources.outlook.lastCheckedAt': attemptedAt,
    'integrations.microsoft.applicationConsentSources.outlook.lastError':
      assessment.sources.outlook.error,
    'integrations.microsoft.applicationConsentSources.outlook.missingRoles':
      assessment.sources.outlook.missingRoles,
    'integrations.microsoft.applicationConsentSources.outlook.probes':
      assessment.sources.outlook.probes,
    'integrations.microsoft.applicationConsentSources.teams.lastCheckedAt': attemptedAt,
    'integrations.microsoft.applicationConsentSources.teams.lastError':
      assessment.sources.teams.error,
    'integrations.microsoft.applicationConsentSources.teams.missingRoles':
      assessment.sources.teams.missingRoles,
    'integrations.microsoft.applicationConsentSources.teams.probes':
      assessment.sources.teams.probes,
    'integrations.microsoft.sync.enabled':
      assessment.sources.outlook.verified || assessment.sources.teams.verified,
    'integrations.microsoft.sync.lastStatus': assessment.verified
      ? 'ok'
      : assessment.sources.outlook.verified || assessment.sources.teams.verified
        ? 'partial'
        : 'error',
    'integrations.microsoft.sync.error': errors.length ? errors.join(' ').slice(0, 500) : null,
  };
  if (assessment.identityLinked && !assessment.identityLinkedAt) {
    // Migrate legacy delegated connections to the explicit identity marker
    // before retiring their stored tokens. The data plane is app-only.
    organizationSet['integrations.microsoft.delegatedConnectedAt'] = attemptedAt;
  }
  const organizationUnset = {
    'integrations.microsoft.accessToken': 1,
    'integrations.microsoft.refreshToken': 1,
    'integrations.microsoft.expiry': 1,
  };

  for (const sourceName of ['outlook', 'teams']) {
    if (assessment.sources[sourceName].verified) {
      organizationSet[`integrations.microsoft.applicationConsentSources.${sourceName}.verifiedAt`] =
        attemptedAt;
    } else {
      organizationUnset[
        `integrations.microsoft.applicationConsentSources.${sourceName}.verifiedAt`
      ] = 1;
    }
  }
  if (assessment.verified) {
    organizationSet['integrations.microsoft.applicationConsentGrantedAt'] = attemptedAt;
    organizationSet['integrations.microsoft.applicationConsentVerifiedAt'] = attemptedAt;
  } else {
    organizationUnset['integrations.microsoft.applicationConsentVerifiedAt'] = 1;
  }

  await Organization.findByIdAndUpdate(orgId, {
    $set: organizationSet,
    ...(Object.keys(organizationUnset).length > 0 ? { $unset: organizationUnset } : {}),
  });

  const verification = {
    ...assessment,
    verifiedAt: assessment.verified ? attemptedAt : null,
    transitions,
  };
  if (!assessment.verified) {
    const error = new Error(
      errors.join(' ') || 'Microsoft company-wide application access could not be verified.'
    );
    error.verification = verification;
    throw error;
  }
  return verification;
}

/** The application roles a tenant has actually granted, without logging tokens. */
export async function getGrantedApplicationRoles(tenantId) {
  if (!tenantId) return [];
  const appToken = await getMicrosoftAppToken(tenantId);
  if (!appToken) return [];
  try {
    const claims = decodeTokenPayload(appToken);
    return unique(Array.isArray(claims.roles) ? claims.roles : []).sort();
  } catch {
    return [];
  }
}
