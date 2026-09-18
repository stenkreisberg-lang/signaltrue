import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const connectionLean = jest.fn();
const teamLean = jest.fn();
const userLean = jest.fn();
const aggregate = jest.fn();
const countDocuments = jest.fn();
const distinct = jest.fn();

jest.unstable_mockModule('../models/integrationConnection.js', () => ({
  default: { find: () => ({ lean: connectionLean }) },
}));
jest.unstable_mockModule('../models/team.js', () => ({
  default: { find: () => ({ select: () => ({ lean: teamLean }) }) },
}));
jest.unstable_mockModule('../models/user.js', () => ({
  default: { find: () => ({ select: () => ({ lean: userLean }) }) },
}));
jest.unstable_mockModule('../models/workEvent.js', () => ({
  default: { aggregate, countDocuments, distinct },
}));

const { getOrganizationReadiness } = await import('../services/onboardingReadinessService.js');

const orgId = '507f1f77bcf86cd799439011';
const teamId = '507f1f77bcf86cd799439012';

function organization(overrides = {}) {
  return {
    _id: orgId,
    name: 'Tehnopol',
    domain: 'tehnopol.ee',
    settings: { timezone: 'Europe/Tallinn', timezoneConfirmedAt: new Date() },
    integrations: {
      microsoft: {
        accessToken: 'token',
        tenantId: 'tenant-1',
        scope: 'both',
        ...overrides.microsoft,
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  connectionLean.mockResolvedValue([]);
  teamLean.mockResolvedValue([{ _id: teamId, name: 'Product' }]);
  userLean.mockResolvedValue(
    Array.from({ length: 5 }, (_, index) => ({
      _id: `507f1f77bcf86cd79943902${index}`,
      source: 'microsoft',
      teamId,
    }))
  );
  aggregate.mockResolvedValue([]);
  countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
  distinct.mockResolvedValue([]);
});

describe('canonical onboarding readiness', () => {
  test('does not call Microsoft ready before tenant consent or activity', async () => {
    const setup = await getOrganizationReadiness(organization());

    expect(setup.readiness.permissionsReady).toBe(false);
    expect(setup.readiness.activityReady).toBe(false);
    expect(setup.readiness.reportingReady).toBe(false);
    expect(setup.readiness.setupComplete).toBe(false);
    expect(setup.readiness.nextStep).toBe('grant_admin_access');
  });

  test('becomes report-ready only with consent, mapped activity, and an eligible team', async () => {
    aggregate.mockResolvedValue([
      {
        _id: 'microsoft-outlook',
        events: 60,
        mappedUserIds: Array.from({ length: 5 }, (_, index) => `507f1f77bcf86cd79943902${index}`),
        firstEventAt: new Date('2026-07-01T08:00:00Z'),
        lastEventAt: new Date('2026-07-31T08:00:00Z'),
      },
    ]);
    countDocuments.mockReset();
    countDocuments.mockResolvedValueOnce(60).mockResolvedValueOnce(60);
    distinct
      .mockResolvedValueOnce(
        Array.from({ length: 5 }, (_, index) => `507f1f77bcf86cd79943902${index}`)
      )
      .mockResolvedValueOnce([teamId]);

    const setup = await getOrganizationReadiness(
      organization({
        microsoft: {
          applicationConsentGrantedAt: new Date(),
          applicationConsentVerifiedAt: new Date(),
        },
      })
    );

    expect(setup.readiness.permissionsReady).toBe(true);
    expect(setup.readiness.directoryReady).toBe(true);
    expect(setup.readiness.reportingReady).toBe(true);
    expect(setup.readiness.setupComplete).toBe(true);
    expect(setup.sources.find((source) => source.type === 'microsoft-outlook').status).toBe(
      'measuring'
    );
  });

  test('does not call sparse contributor coverage report-ready', async () => {
    aggregate.mockResolvedValue([
      {
        _id: 'microsoft-outlook',
        events: 60,
        mappedUserIds: ['507f1f77bcf86cd799439020'],
        firstEventAt: new Date('2026-07-01T08:00:00Z'),
        lastEventAt: new Date('2026-07-31T08:00:00Z'),
      },
    ]);
    countDocuments.mockReset();
    countDocuments.mockResolvedValueOnce(60).mockResolvedValueOnce(60);
    distinct.mockReset();
    distinct.mockResolvedValueOnce(['507f1f77bcf86cd799439020']).mockResolvedValueOnce([teamId]);

    const setup = await getOrganizationReadiness(
      organization({
        microsoft: {
          applicationConsentGrantedAt: new Date(),
          applicationConsentVerifiedAt: new Date(),
        },
      })
    );

    expect(setup.activity.contributorCoveragePct).toBe(20);
    expect(setup.readiness.contributorCoverageReady).toBe(false);
    expect(setup.readiness.reportingReady).toBe(false);
    expect(setup.readiness.setupComplete).toBe(false);
    expect(setup.readiness.nextStep).toBe('build_team_coverage');
  });

  test('does not let historical events turn a current Graph failure into needs_admin or measuring', async () => {
    connectionLean.mockResolvedValue([
      { integrationType: 'microsoft-outlook', status: 'connected' },
      {
        integrationType: 'microsoft-teams',
        status: 'error',
        statusMessage: 'Administrator consent required',
      },
    ]);
    aggregate.mockResolvedValue([
      {
        _id: 'microsoft-teams',
        events: 4290,
        mappedUserIds: ['507f1f77bcf86cd799439020'],
        firstEventAt: new Date('2026-07-01T08:00:00Z'),
        lastEventAt: new Date('2026-07-31T08:00:00Z'),
      },
    ]);
    countDocuments.mockReset();
    countDocuments.mockResolvedValueOnce(4290).mockResolvedValueOnce(4290);

    const setup = await getOrganizationReadiness(
      organization({
        microsoft: {
          applicationConsentLastCheckedAt: new Date(),
          applicationConsentRoles: [
            'Calendars.Read',
            'User.Read.All',
            'Team.ReadBasic.All',
            'Channel.ReadBasic.All',
            'ChannelMessage.Read.All',
          ],
          applicationConsentSources: {
            outlook: {
              status: 'connected',
              verifiedAt: new Date(),
              lastCheckedAt: new Date(),
              missingRoles: [],
              probes: { directory: 'passed', calendar: 'passed' },
            },
            teams: {
              status: 'error',
              lastCheckedAt: new Date(),
              missingRoles: [],
              reasonCode: 'channels_probe_failed',
              lastError: 'Company-wide Teams channels verification failed (BadRequest).',
              probes: {
                directory: 'passed',
                teams: 'passed',
                channels: 'failed',
                messages: 'not_run',
              },
            },
          },
        },
      })
    );

    const teams = setup.sources.find((source) => source.type === 'microsoft-teams');
    expect(teams.status).toBe('error');
    expect(teams.statusMessage).toContain('permissions are present');
    expect(teams.statusMessage.toLowerCase()).not.toContain('administrator consent');
    expect(setup.readiness.nextStep).toBe('review_source_verification');
  });
});
