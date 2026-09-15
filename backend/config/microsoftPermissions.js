/**
 * Microsoft permissions used by the interactive connection and company-wide
 * verification flows. Keep them in one place so the consent screen, verifier,
 * sync adapters, and operator documentation cannot silently drift apart.
 */

export const MICROSOFT_DELEGATED_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://graph.microsoft.com/User.Read',
];

// Outlook collection enumerates the tenant directory before reading each
// mailbox, so User.Read.All is part of the Outlook contract as well.
export const MICROSOFT_OUTLOOK_APPLICATION_ROLES = ['Calendars.Read', 'User.Read.All'];

export const MICROSOFT_TEAMS_APPLICATION_ROLES = [
  'Channel.ReadBasic.All',
  'ChannelMessage.Read.All',
  'Team.ReadBasic.All',
  'User.Read.All',
];

export const REQUIRED_MICROSOFT_APPLICATION_ROLES = [
  ...new Set([...MICROSOFT_OUTLOOK_APPLICATION_ROLES, ...MICROSOFT_TEAMS_APPLICATION_ROLES]),
];

export function getMissingMicrosoftApplicationRoles(grantedRoles = []) {
  const granted = new Set(Array.isArray(grantedRoles) ? grantedRoles : []);
  return REQUIRED_MICROSOFT_APPLICATION_ROLES.filter((role) => !granted.has(role));
}
