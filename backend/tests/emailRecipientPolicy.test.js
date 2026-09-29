import {
  ADMIN_REMINDER_ROLES,
  HUMAN_ACCOUNT_SOURCES,
  buildAdminReminderUserQuery,
  buildConnectedOrganizationQuery,
} from '../utils/emailRecipientPolicy.js';

describe('email recipient policy', () => {
  test('reminder recipients are restricted to active human-created admin accounts', () => {
    const cutoff = new Date('2026-09-29T00:00:00Z');
    const connectedOrgIds = ['org-1'];
    const query = buildAdminReminderUserQuery(cutoff, connectedOrgIds);

    expect(query).toEqual({
      createdAt: { $lt: cutoff },
      orgId: { $nin: connectedOrgIds },
      accountStatus: 'active',
      source: { $in: [...HUMAN_ACCOUNT_SOURCES] },
      role: { $in: [...ADMIN_REMINDER_ROLES] },
    });

    expect(query.role.$in).not.toContain('team_member');
    expect(query.role.$in).not.toContain('viewer');
    expect(query.role.$in).not.toContain('employee');
    expect(query.source.$in).not.toContain('microsoft');
    expect(query.source.$in).not.toContain('google_workspace');
    expect(query.source.$in).not.toContain('slack');
    expect(query.source.$in).not.toContain('hr_import');
  });

  test('Microsoft application-consent connections count as connected', () => {
    const query = buildConnectedOrganizationQuery();
    expect(query.$or).toEqual(
      expect.arrayContaining([
        { 'integrations.microsoft.applicationConsentGrantedAt': { $exists: true, $ne: null } },
        { 'integrations.microsoft.applicationConsentStatus': 'connected' },
        { 'integrations.microsoft.applicationConsentSources.outlook.status': 'connected' },
        { 'integrations.microsoft.applicationConsentSources.teams.status': 'connected' },
      ])
    );
  });

  test('retired organizations are excluded from reminder processing', () => {
    expect(buildConnectedOrganizationQuery().lifecycleStatus).toEqual({ $ne: 'retired' });
  });
});
