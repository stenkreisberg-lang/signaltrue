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
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    throw new Error('Microsoft returned an invalid application token.');
  }
}

function validateTokenIdentity(claims, tenantId) {
  if (!claims.tid || String(claims.tid) !== String(tenantId)) {
    throw new Error('Microsoft application token belongs to a different tenant.');
  }

  const expectedAppId = process.env.MS_APP_CLIENT_ID;
  const tokenAppId = claims.appid || claims.azp;
  if (expectedAppId && (!tokenAppId || String(tokenAppId) !== String(expectedAppId))) {
    throw new Error('Microsoft application token belongs to a different application.');
  }
}

async function graphProbe(url, token, label) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: globalThis.AbortSignal.timeout(15_000),
      });
    } catch {
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
        continue;
      }
      const error = new Error(`${label} verification failed (network error).`);
      error.graphCode = 'NetworkError';
      throw error;
    }
    if (response.ok) return response.json();

    let code = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      code = body?.error?.code || code;
    } catch {
      // A stable status is enough for a safe, non-sensitive verification error.
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < 2) {
      const retryAfterHeader = response.headers?.get?.('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
      const delayMs = Number.isFinite(retryAfterSeconds)
        ? Math.min(Math.max(retryAfterSeconds * 1000, 0), 2_000)
        : 100 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    const error = new Error(`${label} verification failed (${code}).`);
    error.graphCode = code;
    error.httpStatus = response.status;
    throw error;
  }

  throw new Error(`${label} verification failed.`);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function sourceAssessment(requiredRoles, roles, probeNames) {
  const missingRoles = requiredRoles.filter((role) => !roles.includes(role));
  return {
    verified: false,
    status: missingRoles.length > 0 ? 'needs_admin' : 'error',
    reasonCode: missingRoles.length > 0 ? 'missing_application_roles' : null,
    missingRoles,
    error:
      missingRoles.length > 0
        ? `Missing application permissions: ${missingRoles.join(', ')}.`
        : null,
    probes: Object.fromEntries(probeNames.map((name) => [name, 'not_run'])),
  };
}

function markSourceError(assessment, error, reasonCode, fallbackMessage) {
  assessment.verified = false;
  assessment.status = 'error';
  assessment.reasonCode = reasonCode;
  assessment.error = error?.message || fallbackMessage;
}

function markSourceVerified(assessment) {
  assessment.verified = true;
  assessment.status = 'connected';
  assessment.reasonCode = null;
  assessment.error = null;
}

function overallVerificationStatus(outlook, teams) {
  if (outlook.verified && teams.verified) return 'connected';
  if (outlook.verified || teams.verified) return 'partial';
  if (outlook.missingRoles.length > 0 || teams.missingRoles.length > 0) return 'needs_admin';
  return 'error';
}

const MAILBOX_UNAVAILABLE_CODES = new Set([
  'errormailboxnotenabledforrestapi',
  'mailboxnotenabledforrestapi',
  'errormailboxnotfound',
  'mailboxnotfound',
  'errorinvaliduser',
  'resourcenotfound',
]);

function isMailboxUnavailable(error) {
  return (
    error?.httpStatus === 404 ||
    MAILBOX_UNAVAILABLE_CODES.has(String(error?.graphCode || '').toLowerCase())
  );
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
  validateTokenIdentity(claims, tenantId);

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
    ...(directory?.value || []).map((user) => user.id),
    ...mappedUsers.map((user) => user.externalIds?.microsoftUserId),
  ]).slice(0, 20);

  if (outlook.missingRoles.length === 0) {
    if (directoryError) {
      markSourceError(
        outlook,
        directoryError,
        'directory_probe_failed',
        'Microsoft directory verification failed.'
      );
    } else if (microsoftUserIds.length === 0) {
      markSourceError(
        outlook,
        null,
        'permission_granted_but_no_verifiable_user',
        'Microsoft directory access works, but no employee account is available for calendar verification.'
      );
    } else {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      const calendarErrors = [];
      for (const microsoftUserId of microsoftUserIds) {
        try {
          await graphProbe(
            `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/calendarView?startDateTime=${encodeURIComponent(start.toISOString())}&endDateTime=${encodeURIComponent(end.toISOString())}&$top=1&$select=id`,
            appToken,
            'Company-wide calendar'
          );
          outlook.probes.calendar = 'passed';
          markSourceVerified(outlook);
          break;
        } catch (error) {
          calendarErrors.push(error);
        }
      }
      if (!outlook.verified) {
        const nonMailboxError = calendarErrors.find((error) => !isMailboxUnavailable(error));
        if (!nonMailboxError && calendarErrors.length > 0) {
          outlook.probes.calendar = 'not_verifiable';
          markSourceError(
            outlook,
            null,
            'permission_granted_but_no_verifiable_mailbox',
            'Microsoft calendar application access is granted, but none of the sampled users has a verifiable Exchange Online mailbox.'
          );
        } else {
          outlook.probes.calendar = 'failed';
          markSourceError(
            outlook,
            nonMailboxError || calendarErrors.at(-1),
            'calendar_probe_failed',
            'Company-wide calendar verification failed.'
          );
        }
      }
    }
  }

  if (teams.missingRoles.length === 0) {
    if (directoryError) {
      markSourceError(
        teams,
        directoryError,
        'directory_probe_failed',
        'Microsoft directory verification failed.'
      );
    } else if (microsoftUserIds.length === 0) {
      markSourceError(
        teams,
        null,
        'permission_granted_but_no_verifiable_user',
        'Microsoft directory access works, but no employee account is available for Teams verification.'
      );
    } else {
      const teamById = new Map();
      const joinedTeamsErrors = [];
      let successfulJoinedTeamsProbes = 0;
      for (const microsoftUserId of microsoftUserIds) {
        try {
          const joinedTeams = await graphProbe(
            `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/joinedTeams`,
            appToken,
            'Company-wide Teams'
          );
          successfulJoinedTeamsProbes += 1;
          teams.probes.teams = 'passed';
          for (const team of joinedTeams.value || []) {
            if (team?.id) teamById.set(team.id, team);
          }
        } catch (error) {
          joinedTeamsErrors.push(error);
        }
      }

      const probeTeams = [...teamById.values()].slice(0, 20);
      if (successfulJoinedTeamsProbes === 0) {
        teams.probes.teams = 'failed';
        markSourceError(
          teams,
          joinedTeamsErrors.at(-1),
          'joined_teams_probe_failed',
          'Company-wide Teams verification failed.'
        );
      } else if (probeTeams.length === 0) {
        markSourceError(
          teams,
          null,
          'permission_granted_but_no_verifiable_team',
          'Microsoft Teams application access is granted, but none of the sampled users belongs to a team that can be used for channel verification.'
        );
      } else {
        const channelErrors = [];
        const messageErrors = [];
        let successfulChannelProbes = 0;
        let verifiableChannels = 0;

        for (const probeTeam of probeTeams) {
          let channels;
          try {
            // List channels supports $select and $filter, but not $top.
            channels = await graphProbe(
              `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(probeTeam.id)}/channels?$select=id`,
              appToken,
              'Company-wide Teams channels'
            );
            successfulChannelProbes += 1;
            teams.probes.channels = 'passed';
          } catch (error) {
            channelErrors.push(error);
            continue;
          }

          const probeChannels = (channels.value || [])
            .filter((channel) => channel?.id)
            .slice(0, 10);
          verifiableChannels += probeChannels.length;
          for (const probeChannel of probeChannels) {
            try {
              await graphProbe(
                `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(probeTeam.id)}/channels/${encodeURIComponent(probeChannel.id)}/messages?$top=1`,
                appToken,
                'Company-wide Teams messages'
              );
              teams.probes.messages = 'passed';
              markSourceVerified(teams);
              break;
            } catch (error) {
              messageErrors.push(error);
            }
          }
          if (teams.verified) break;
        }

        if (!teams.verified && successfulChannelProbes === 0) {
          teams.probes.channels = 'failed';
          markSourceError(
            teams,
            channelErrors.at(-1),
            'channels_probe_failed',
            'Company-wide Teams channels verification failed.'
          );
        } else if (!teams.verified && verifiableChannels === 0) {
          markSourceError(
            teams,
            null,
            'permission_granted_but_no_verifiable_channel',
            'Microsoft Teams channel access is granted, but no channel is available for message verification.'
          );
        } else if (!teams.verified) {
          teams.probes.messages = 'failed';
          markSourceError(
            teams,
            messageErrors.at(-1),
            'messages_probe_failed',
            'Company-wide Teams messages verification failed.'
          );
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
    status: overallVerificationStatus(outlook, teams),
  };
}

function sourceStatusMessage(name, assessment) {
  if (assessment.verified) {
    return `Company-wide Microsoft ${name} application access verified by Graph probes`;
  }
  return assessment.error || `Microsoft ${name} company-wide access could not be verified.`;
}

async function persistSourceState(orgId, integrationType, sourceName, assessment, verifiedBy, now) {
  const update = {
    $set: {
      status: assessment.status,
      statusMessage: sourceStatusMessage(sourceName, assessment),
      statusUpdatedAt: now,
      measurementScope: assessment.verified
        ? 'organization-wide Microsoft metadata'
        : 'application access not verified',
      'sync.enabled': assessment.verified,
    },
  };
  if (!assessment.verified) {
    update.$unset = {
      connectedAt: 1,
      connectedBy: 1,
    };
  }
  const previous = await IntegrationConnection.findOneAndUpdate(
    { orgId, integrationType },
    update,
    { upsert: true, returnDocument: 'before' }
  );
  const transitioned = assessment.verified && previous?.status !== 'connected';
  if (transitioned) {
    await IntegrationConnection.updateOne(
      { orgId, integrationType, status: 'connected' },
      {
        $set: {
          connectedAt: now,
          ...(verifiedBy ? { connectedBy: verifiedBy } : {}),
        },
      }
    );
  }
  return transitioned;
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
          'integrations.microsoft.applicationConsentStatus': 'error',
          'integrations.microsoft.applicationConsentSources.outlook.status': 'error',
          'integrations.microsoft.applicationConsentSources.outlook.reasonCode':
            'token_verification_failed',
          'integrations.microsoft.applicationConsentSources.outlook.lastCheckedAt': attemptedAt,
          'integrations.microsoft.applicationConsentSources.outlook.lastError': safeError,
          'integrations.microsoft.applicationConsentSources.outlook.missingRoles': [],
          'integrations.microsoft.applicationConsentSources.outlook.probes': {
            directory: 'not_run',
            calendar: 'not_run',
          },
          'integrations.microsoft.applicationConsentSources.teams.status': 'error',
          'integrations.microsoft.applicationConsentSources.teams.reasonCode':
            'token_verification_failed',
          'integrations.microsoft.applicationConsentSources.teams.lastCheckedAt': attemptedAt,
          'integrations.microsoft.applicationConsentSources.teams.lastError': safeError,
          'integrations.microsoft.applicationConsentSources.teams.missingRoles': [],
          'integrations.microsoft.applicationConsentSources.teams.probes': {
            directory: 'not_run',
            teams: 'not_run',
            channels: 'not_run',
            messages: 'not_run',
          },
          'integrations.microsoft.sync.enabled': false,
          'integrations.microsoft.sync.lastStatus': 'error',
          'integrations.microsoft.sync.error': safeError,
        },
        $unset: {
          'integrations.microsoft.applicationConsentVerifiedAt': 1,
          'integrations.microsoft.applicationConsentSources.outlook.verifiedAt': 1,
          'integrations.microsoft.applicationConsentSources.teams.verifiedAt': 1,
        },
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
    'integrations.microsoft.applicationConsentStatus': assessment.status,
    'integrations.microsoft.applicationConsentSources.outlook.status':
      assessment.sources.outlook.status,
    'integrations.microsoft.applicationConsentSources.outlook.reasonCode':
      assessment.sources.outlook.reasonCode,
    'integrations.microsoft.applicationConsentSources.outlook.lastCheckedAt': attemptedAt,
    'integrations.microsoft.applicationConsentSources.outlook.lastError':
      assessment.sources.outlook.error,
    'integrations.microsoft.applicationConsentSources.outlook.missingRoles':
      assessment.sources.outlook.missingRoles,
    'integrations.microsoft.applicationConsentSources.outlook.probes':
      assessment.sources.outlook.probes,
    'integrations.microsoft.applicationConsentSources.teams.status':
      assessment.sources.teams.status,
    'integrations.microsoft.applicationConsentSources.teams.reasonCode':
      assessment.sources.teams.reasonCode,
    'integrations.microsoft.applicationConsentSources.teams.lastCheckedAt': attemptedAt,
    'integrations.microsoft.applicationConsentSources.teams.lastError':
      assessment.sources.teams.error,
    'integrations.microsoft.applicationConsentSources.teams.missingRoles':
      assessment.sources.teams.missingRoles,
    'integrations.microsoft.applicationConsentSources.teams.probes':
      assessment.sources.teams.probes,
    'integrations.microsoft.sync.enabled':
      assessment.sources.outlook.verified || assessment.sources.teams.verified,
    'integrations.microsoft.sync.lastStatus':
      assessment.status === 'connected' ? 'ok' : assessment.status,
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
  if (assessment.missingRoles.length === 0) {
    organizationSet['integrations.microsoft.applicationConsentGrantedAt'] = attemptedAt;
  } else {
    organizationUnset['integrations.microsoft.applicationConsentGrantedAt'] = 1;
  }
  if (assessment.verified) {
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
