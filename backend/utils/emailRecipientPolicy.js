/**
 * Fail-closed policy for externally visible onboarding reminder emails.
 *
 * Directory-synced people exist so SignalTrue can aggregate work metadata.
 * They are not product users and must never receive onboarding or report emails.
 */

export const ADMIN_REMINDER_ROLES = Object.freeze([
  'master_admin',
  'hr_admin',
  'admin',
  'org_admin',
]);

export const HUMAN_ACCOUNT_SOURCES = Object.freeze(['manual', 'invitation']);

export function buildConnectedOrganizationQuery() {
  return {
    lifecycleStatus: { $ne: 'retired' },
    $or: [
      { 'integrations.slack.installed': true },
      { 'integrations.google.refreshToken': { $exists: true, $ne: null } },
      { 'integrations.googleChat.refreshToken': { $exists: true, $ne: null } },
      { 'integrations.microsoft.refreshToken': { $exists: true, $ne: null } },
      { 'integrations.microsoft.applicationConsentGrantedAt': { $exists: true, $ne: null } },
      { 'integrations.microsoft.applicationConsentStatus': 'connected' },
      { 'integrations.microsoft.applicationConsentSources.outlook.status': 'connected' },
      { 'integrations.microsoft.applicationConsentSources.teams.status': 'connected' },
    ],
  };
}

export function buildAdminReminderUserQuery(createdBefore, connectedOrgIds = []) {
  return {
    createdAt: { $lt: createdBefore },
    orgId: { $nin: connectedOrgIds },
    accountStatus: 'active',
    source: { $in: [...HUMAN_ACCOUNT_SOURCES] },
    role: { $in: [...ADMIN_REMINDER_ROLES] },
  };
}
