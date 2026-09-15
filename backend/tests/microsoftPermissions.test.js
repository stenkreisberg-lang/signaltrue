import { describe, expect, test } from '@jest/globals';
import {
  MICROSOFT_DELEGATED_SCOPES,
  MICROSOFT_OUTLOOK_APPLICATION_ROLES,
  MICROSOFT_TEAMS_APPLICATION_ROLES,
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
  getMissingMicrosoftApplicationRoles,
} from '../config/microsoftPermissions.js';

describe('Microsoft integration permission contract', () => {
  test('requests the complete delegated connection scope exactly once', () => {
    expect(new Set(MICROSOFT_DELEGATED_SCOPES).size).toBe(MICROSOFT_DELEGATED_SCOPES.length);
    expect(MICROSOFT_DELEGATED_SCOPES).toEqual(
      expect.arrayContaining([
        'openid',
        'offline_access',
        'https://graph.microsoft.com/Calendars.Read',
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Team.ReadBasic.All',
        'https://graph.microsoft.com/Channel.ReadBasic.All',
        'https://graph.microsoft.com/ChannelMessage.Read.All',
        'https://graph.microsoft.com/Chat.Read',
        'https://graph.microsoft.com/User.Read.All',
      ])
    );
  });

  test('keeps verifier requirements aligned with Outlook and Teams adapters', () => {
    expect(REQUIRED_MICROSOFT_APPLICATION_ROLES).toEqual([
      ...MICROSOFT_OUTLOOK_APPLICATION_ROLES,
      ...MICROSOFT_TEAMS_APPLICATION_ROLES,
    ]);
    expect(new Set(REQUIRED_MICROSOFT_APPLICATION_ROLES).size).toBe(
      REQUIRED_MICROSOFT_APPLICATION_ROLES.length
    );
  });

  test('reports the exact missing application roles for partial consent', () => {
    expect(getMissingMicrosoftApplicationRoles(['Calendars.Read'])).toEqual([
      'Channel.ReadBasic.All',
      'ChannelMessage.Read.All',
      'Team.ReadBasic.All',
      'User.Read.All',
    ]);
  });
});
