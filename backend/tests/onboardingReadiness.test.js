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
      microsoft: { accessToken: 'token', scope: 'both', ...overrides.microsoft },
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
        events: 20,
        mappedUserIds: Array.from({ length: 5 }, (_, index) => `507f1f77bcf86cd79943902${index}`),
        firstEventAt: new Date('2026-07-01T08:00:00Z'),
        lastEventAt: new Date('2026-07-31T08:00:00Z'),
      },
    ]);
    countDocuments.mockReset();
    countDocuments.mockResolvedValueOnce(20).mockResolvedValueOnce(20);
    distinct.mockResolvedValue([teamId]);

    const setup = await getOrganizationReadiness(
      organization({ microsoft: { applicationConsentGrantedAt: new Date() } })
    );

    expect(setup.readiness.permissionsReady).toBe(true);
    expect(setup.readiness.directoryReady).toBe(true);
    expect(setup.readiness.reportingReady).toBe(true);
    expect(setup.readiness.setupComplete).toBe(true);
    expect(setup.sources.find((source) => source.type === 'microsoft-outlook').status).toBe(
      'measuring'
    );
  });
});
