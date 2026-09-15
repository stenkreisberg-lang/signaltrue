/**
 * Microsoft permissions used by the interactive connection and company-wide
 * verification flows. Keep them in one place so the consent screen, verifier,
 * sync adapters, and operator documentation cannot silently drift apart.
 */

export const MICROSOFT_DELEGATED_SCOPES = [
  'openid',
  'email',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Calendars.Read',
  'https://graph.microsoft.com/Mail.Read',
  'https://graph.microsoft.com/Team.ReadBasic.All',
  'https://graph.microsoft.com/Channel.ReadBasic.All',
  'https://graph.microsoft.com/ChannelMessage.Read.All',
  'https://graph.microsoft.com/Chat.Read',
  'https://graph.microsoft.com/User.Read.All',
];

export const MICROSOFT_OUTLOOK_APPLICATION_ROLES = ['Calendars.Read'];

export const MICROSOFT_TEAMS_APPLICATION_ROLES = [
  'Channel.ReadBasic.All',
  'ChannelMessage.Read.All',
  'Team.ReadBasic.All',
  'User.Read.All',
];

export const REQUIRED_MICROSOFT_APPLICATION_ROLES = [
  ...MICROSOFT_OUTLOOK_APPLICATION_ROLES,
  ...MICROSOFT_TEAMS_APPLICATION_ROLES,
];

export function getMissingMicrosoftApplicationRoles(grantedRoles = []) {
  const granted = new Set(Array.isArray(grantedRoles) ? grantedRoles : []);
  return REQUIRED_MICROSOFT_APPLICATION_ROLES.filter((role) => !granted.has(role));
}
