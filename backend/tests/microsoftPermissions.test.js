import { describe, expect, test } from '@jest/globals';
import {
  MICROSOFT_DELEGATED_SCOPES,
  MICROSOFT_OUTLOOK_APPLICATION_ROLES,
  MICROSOFT_TEAMS_APPLICATION_ROLES,
  MICROSOFT_TEAMS_CHAT_APPLICATION_ROLES,
  getMissingMicrosoftChatRoles,
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
  getMissingMicrosoftApplicationRoles,
} from '../config/microsoftPermissions.js';

describe('Microsoft integration permission contract', () => {
  test('limits delegated consent to tenant identity and does not request data access', () => {
    expect(new Set(MICROSOFT_DELEGATED_SCOPES).size).toBe(MICROSOFT_DELEGATED_SCOPES.length);
    expect(MICROSOFT_DELEGATED_SCOPES).toEqual([
      'openid',
      'email',
      'profile',
      'https://graph.microsoft.com/User.Read',
    ]);
  });

  test('keeps verifier requirements aligned with Outlook and Teams adapters', () => {
    expect(REQUIRED_MICROSOFT_APPLICATION_ROLES).toEqual([
      ...new Set([...MICROSOFT_OUTLOOK_APPLICATION_ROLES, ...MICROSOFT_TEAMS_APPLICATION_ROLES]),
    ]);
    expect(new Set(REQUIRED_MICROSOFT_APPLICATION_ROLES).size).toBe(
      REQUIRED_MICROSOFT_APPLICATION_ROLES.length
    );
  });

  test('chat consent is distinct and never disables existing channel collection', () => {
    expect(MICROSOFT_TEAMS_CHAT_APPLICATION_ROLES).toEqual(['Chat.Read.All']);
    expect(REQUIRED_MICROSOFT_APPLICATION_ROLES).not.toContain('Chat.Read.All');
    expect(getMissingMicrosoftChatRoles(['ChannelMessage.Read.All'])).toEqual(['Chat.Read.All']);
    expect(getMissingMicrosoftChatRoles(['Chat.Read.All'])).toEqual([]);
  });

  test('reports the exact missing application roles for partial consent', () => {
    expect(getMissingMicrosoftApplicationRoles(['Calendars.Read'])).toEqual([
      'User.Read.All',
      'Channel.ReadBasic.All',
      'ChannelMessage.Read.All',
      'Team.ReadBasic.All',
    ]);
  });
});
