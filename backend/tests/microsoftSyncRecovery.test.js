import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const cronSchedule = jest.fn();
const connectionFind = jest.fn();
const connectionExists = jest.fn();
const connectionUpdateMany = jest.fn();
const connectionFindOneAndUpdate = jest.fn();
const organizationFind = jest.fn();
const organizationFindById = jest.fn();
const organizationFindByIdAndUpdate = jest.fn();
const verifyMicrosoftCompanyWideAccess = jest.fn();
const getGrantedApplicationRoles = jest.fn();
const getMicrosoftAppToken = jest.fn();
const syncEmployeesFromMicrosoft = jest.fn();
const notifyHRIntegrationsComplete = jest.fn();
const notifyIntegrationConnected = jest.fn();

jest.unstable_mockModule('node-cron', () => ({
  default: { schedule: cronSchedule },
}));
jest.unstable_mockModule('../services/integrationAdapters.js', () => ({
  syncAllIntegrations: jest.fn(async () => []),
  getAdapter: jest.fn(),
}));
jest.unstable_mockModule('../services/coreIntegrationAdapters.js', () => ({
  syncCoreIntegrations: jest.fn(async () => []),
  SlackAdapter: class {},
  MicrosoftAdapter: class {},
  GoogleCalendarAdapter: class {},
  GoogleChatAdapter: class {},
}));
jest.unstable_mockModule('../services/integrationMetricsService.js', () => ({
  computeDailyMetrics: jest.fn(),
  computeWeeklyRollups: jest.fn(),
}));
jest.unstable_mockModule('../services/signalGenerationService.js', () => ({
  detectSignals: jest.fn(),
}));
jest.unstable_mockModule('../services/signalBridgeService.js', () => ({
  bridgeAllOrgSignals: jest.fn(),
}));
jest.unstable_mockModule('../services/engagementDailyAggregationService.js', () => ({
  computeDayForOrg: jest.fn(),
}));
jest.unstable_mockModule('../services/managerOneOnOneClassifier.js', () => ({
  classifyManagerOneOnOnesForOrgDay: jest.fn(),
}));
jest.unstable_mockModule('../models/integrationConnection.js', () => ({
  default: {
    find: connectionFind,
    exists: connectionExists,
    updateMany: connectionUpdateMany,
    findOneAndUpdate: connectionFindOneAndUpdate,
  },
}));
jest.unstable_mockModule('../models/integrationMetricsDaily.js', () => ({
  default: { findOne: jest.fn(), find: jest.fn() },
}));
jest.unstable_mockModule('../models/categoryKingSignal.js', () => ({
  default: { aggregate: jest.fn() },
}));
jest.unstable_mockModule('../models/organizationModel.js', () => ({
  ACTIVE_ORG_FILTER: { status: { $ne: 'deleted' } },
  default: {
    find: organizationFind,
    findById: organizationFindById,
    findByIdAndUpdate: organizationFindByIdAndUpdate,
  },
}));
jest.unstable_mockModule('../services/employeeSyncService.js', () => ({
  syncEmployeesFromMicrosoft,
}));
jest.unstable_mockModule('../services/tokenService.js', () => ({ getMicrosoftAppToken }));
jest.unstable_mockModule('../services/integrationNotifyService.js', () => ({
  notifyHRIntegrationsComplete,
}));
jest.unstable_mockModule('../services/superadminNotifyService.js', () => ({
  notifyIntegrationConnected,
}));
jest.unstable_mockModule('../services/microsoftAdminConsentService.js', () => ({
  verifyMicrosoftCompanyWideAccess,
  getGrantedApplicationRoles,
}));

const { reconcilePendingMicrosoftCompanyAccess, runMicrosoftCompanyBackfill } = await import(
  '../services/integrationSyncScheduler.js'
);

function organizationQueryResult(organizations = [{ _id: 'org-1', name: 'Tehnopol' }]) {
  return {
    select: () => ({ lean: async () => organizations }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  connectionFind.mockReturnValue({ distinct: async () => ['org-1'] });
  organizationFind.mockReturnValue(organizationQueryResult());
  organizationFindById.mockResolvedValue({ _id: 'org-1', name: 'Tehnopol' });
  organizationFindByIdAndUpdate.mockResolvedValue({});
  connectionExists.mockResolvedValue({ _id: 'connection-1' });
  connectionUpdateMany.mockResolvedValue({ modifiedCount: 0 });
  connectionFindOneAndUpdate.mockResolvedValue({});
  notifyHRIntegrationsComplete.mockResolvedValue({ success: true });
  notifyIntegrationConnected.mockResolvedValue({ sent: true });
});

describe('scheduled Microsoft access recovery', () => {
  test('re-verifies an eligible tenant and resumes an incomplete backfill without OAuth', async () => {
    verifyMicrosoftCompanyWideAccess.mockResolvedValue({
      verified: true,
      tenantId: 'tenant-1',
      transitions: [],
    });
    const startBackfill = jest.fn();

    await expect(
      reconcilePendingMicrosoftCompanyAccess({ startBackfill })
    ).resolves.toEqual({ checked: 1 });

    expect(verifyMicrosoftCompanyWideAccess).toHaveBeenCalledWith('org-1');
    expect(startBackfill).toHaveBeenCalledWith('org-1', 60);
    expect(notifyHRIntegrationsComplete).not.toHaveBeenCalled();
    expect(connectionFind).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationType: { $in: ['microsoft-outlook', 'microsoft-teams'] },
        $or: expect.arrayContaining([
          { status: { $in: ['needs_admin', 'error'] } },
          expect.objectContaining({
            status: 'connected',
            'sync.backfillComplete': { $ne: true },
          }),
        ]),
      })
    );
  });

  test('notifies once on a recovered connection transition and starts the backfill', async () => {
    verifyMicrosoftCompanyWideAccess.mockResolvedValue({
      verified: true,
      tenantId: 'tenant-1',
      transitions: ['microsoft-outlook', 'microsoft-teams'],
    });
    connectionExists.mockResolvedValue(null);
    const startBackfill = jest.fn();

    await reconcilePendingMicrosoftCompanyAccess({ startBackfill });

    expect(notifyHRIntegrationsComplete).toHaveBeenCalledTimes(1);
    expect(notifyIntegrationConnected).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'org-1' }),
      'microsoft',
      'company-wide',
      { idempotencyKey: 'company-wide:tenant-1' }
    );
    expect(startBackfill).toHaveBeenCalledWith('org-1', 60);
  });

  test('keeps a calendar-only failed backfill eligible for later reconciliation', async () => {
    const partial = new Error('Teams verification requires attention');
    partial.verification = { sources: { outlook: { verified: true }, teams: { verified: false } } };
    verifyMicrosoftCompanyWideAccess.mockRejectedValue(partial);
    const startBackfill = jest.fn();

    await reconcilePendingMicrosoftCompanyAccess({ startBackfill });
    await reconcilePendingMicrosoftCompanyAccess({ startBackfill });

    expect(startBackfill).toHaveBeenCalledTimes(2);
    expect(organizationFindByIdAndUpdate).toHaveBeenCalledTimes(2);
  });

  test('the durable lease claim prevents a duplicate backfill run', async () => {
    connectionUpdateMany.mockResolvedValue({ modifiedCount: 0 });

    await expect(
      runMicrosoftCompanyBackfill('org-1', 60, new Date('2026-09-18T10:00:00.000Z'))
    ).resolves.toMatchObject({
      started: false,
      alreadyRunningOrComplete: true,
      daysBack: 60,
    });

    expect(getMicrosoftAppToken).not.toHaveBeenCalled();
    expect(syncEmployeesFromMicrosoft).not.toHaveBeenCalled();
  });
});
