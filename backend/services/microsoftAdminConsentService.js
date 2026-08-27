import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import IntegrationConnection from '../models/integrationConnection.js';
import { getMicrosoftAppToken } from './tokenService.js';

export const REQUIRED_MICROSOFT_APPLICATION_ROLES = [
  'Calendars.Read',
  'Channel.ReadBasic.All',
  'ChannelMessage.Read.All',
  'Team.ReadBasic.All',
  'User.Read.All',
];

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
      // The status is enough for a safe, non-sensitive verification error.
    }
    throw new Error(`${label} verification failed (${code}).`);
  }
  return response.json();
}

/**
 * The application roles a tenant has actually granted.
 *
 * Reported without throwing, so a partial consent can be acted on: a tenant
 * that has granted calendar access should not be left with no history just
 * because the Teams permissions are still outstanding.
 */
export async function getGrantedApplicationRoles(tenantId) {
  if (!tenantId) return [];
  const appToken = await getMicrosoftAppToken(tenantId);
  if (!appToken) return [];
  try {
    const claims = decodeTokenPayload(appToken);
    return Array.isArray(claims.roles) ? [...new Set(claims.roles)].sort() : [];
  } catch {
    return [];
  }
}

export async function verifyMicrosoftCompanyWideAccess(orgId, verifiedBy = null) {
  const attemptedAt = new Date();
  const organization = await Organization.findById(orgId).lean();
  if (!organization) throw new Error('Organization not found.');

  const tenantId = organization.integrations?.microsoft?.tenantId;
  if (!tenantId) throw new Error('Connect Microsoft delegated access before verification.');

  try {
    const appToken = await getMicrosoftAppToken(tenantId);
    if (!appToken) throw new Error('Microsoft application credentials are not configured.');

    const claims = decodeTokenPayload(appToken);
    const roles = Array.isArray(claims.roles) ? [...new Set(claims.roles)].sort() : [];
    const missingRoles = REQUIRED_MICROSOFT_APPLICATION_ROLES.filter(
      (role) => !roles.includes(role)
    );
    if (missingRoles.length > 0) {
      throw new Error(
        `Microsoft tenant consent is missing application permissions: ${missingRoles.join(', ')}.`
      );
    }

    const directory = await graphProbe(
      'https://graph.microsoft.com/v1.0/users?$top=1&$select=id',
      appToken,
      'Microsoft directory'
    );
    const probeUser = await User.findOne({
      orgId,
      'externalIds.microsoftUserId': { $exists: true, $ne: null },
      accountStatus: { $ne: 'inactive' },
    })
      .select('externalIds.microsoftUserId')
      .lean();
    const microsoftUserId = probeUser?.externalIds?.microsoftUserId || directory.value?.[0]?.id;
    if (!microsoftUserId) {
      throw new Error('Microsoft directory access works, but no employee account is available.');
    }

    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    await graphProbe(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/calendarView?startDateTime=${encodeURIComponent(start.toISOString())}&endDateTime=${encodeURIComponent(end.toISOString())}&$top=1&$select=id`,
      appToken,
      'Company-wide calendar'
    );
    await graphProbe(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/joinedTeams?$top=1&$select=id`,
      appToken,
      'Company-wide Teams'
    );

    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.microsoft.applicationConsentGrantedAt': attemptedAt,
        'integrations.microsoft.applicationConsentVerifiedAt': attemptedAt,
        'integrations.microsoft.applicationConsentLastCheckedAt': attemptedAt,
        'integrations.microsoft.applicationConsentLastError': null,
        'integrations.microsoft.applicationConsentRoles': roles,
        'integrations.microsoft.applicationConsentTenantId': tenantId,
        'integrations.microsoft.sync.enabled': true,
        'integrations.microsoft.sync.lastStatus': 'ok',
        'integrations.microsoft.sync.error': null,
      },
    });

    await Promise.all(
      ['microsoft-outlook', 'microsoft-teams'].map((integrationType) =>
        IntegrationConnection.findOneAndUpdate(
          { orgId, integrationType },
          {
            $set: {
              status: 'connected',
              statusMessage:
                'Company-wide Microsoft application access verified; backfill is starting',
              statusUpdatedAt: attemptedAt,
              connectedAt: attemptedAt,
              connectedBy: verifiedBy || undefined,
              measurementScope: 'organization-wide Microsoft metadata',
              'sync.enabled': true,
              'sync.backfillStartedAt': attemptedAt,
              'sync.backfillComplete': false,
              'sync.backfillProgress': 0,
            },
          },
          { upsert: true, returnDocument: 'after' }
        )
      )
    );

    return { verifiedAt: attemptedAt, tenantId, roles };
  } catch (error) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.microsoft.applicationConsentLastCheckedAt': attemptedAt,
        'integrations.microsoft.applicationConsentLastError': String(error.message).slice(0, 500),
      },
      $unset: {
        'integrations.microsoft.applicationConsentVerifiedAt': 1,
      },
    });
    throw error;
  }
}
