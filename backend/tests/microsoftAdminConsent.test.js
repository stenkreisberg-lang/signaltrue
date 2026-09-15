import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const organizationLean = jest.fn();
const organizationUpdate = jest.fn();
const userLean = jest.fn();
const connectionUpdate = jest.fn();
const connectionUpdateMany = jest.fn();
const getMicrosoftAppToken = jest.fn();

jest.unstable_mockModule('../models/organizationModel.js', () => ({
  default: {
    findById: () => ({ lean: organizationLean }),
    findByIdAndUpdate: organizationUpdate,
  },
}));
jest.unstable_mockModule('../models/user.js', () => ({
  default: {
    find: () => ({
      select: () => ({ limit: () => ({ lean: userLean }) }),
    }),
  },
}));
jest.unstable_mockModule('../models/integrationConnection.js', () => ({
  default: {
    findOneAndUpdate: connectionUpdate,
    updateMany: connectionUpdateMany,
  },
}));
jest.unstable_mockModule('../services/tokenService.js', () => ({ getMicrosoftAppToken }));

const { REQUIRED_MICROSOFT_APPLICATION_ROLES, verifyMicrosoftCompanyWideAccess } =
  await import('../services/microsoftAdminConsentService.js');

function tokenWithRoles(roles, overrides = {}) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({
    roles,
    tid: 'tenant-1',
    appid: 'signaltrue-client-id',
    ...overrides,
  })}.signature`;
}

function ok(value = []) {
  return Promise.resolve({ ok: true, status: 200, json: async () => ({ value }) });
}

function failed(status = 403, code = 'Authorization_RequestDenied') {
  return Promise.resolve({
    ok: false,
    status,
    json: async () => ({ error: { code } }),
  });
}

function successfulGraphProbes() {
  global.fetch = jest
    .fn()
    .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
    .mockImplementationOnce(() => ok([]))
    .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
    .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
    .mockImplementationOnce(() => ok([]));
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MS_APP_CLIENT_ID = 'signaltrue-client-id';
  organizationLean.mockResolvedValue({
    _id: 'org-1',
    integrations: { microsoft: { tenantId: 'tenant-1' } },
  });
  organizationUpdate.mockResolvedValue({});
  connectionUpdate.mockResolvedValue({ status: 'needs_admin' });
  connectionUpdateMany.mockResolvedValue({});
  userLean.mockResolvedValue([{ externalIds: { microsoftUserId: 'ms-user-1' } }]);
  getMicrosoftAppToken.mockResolvedValue(tokenWithRoles(REQUIRED_MICROSOFT_APPLICATION_ROLES));
  successfulGraphProbes();
});

describe('Microsoft company-wide access verification', () => {
  test('registers consent only after roles and directory, calendar, channel and message probes pass', async () => {
    const result = await verifyMicrosoftCompanyWideAccess('org-1', 'user-1');

    expect(result.verified).toBe(true);
    expect(result.roles).toEqual([...REQUIRED_MICROSOFT_APPLICATION_ROLES].sort());
    expect(result.sources.outlook.probes).toEqual({ directory: 'passed', calendar: 'passed' });
    expect(result.sources.teams.probes).toEqual({
      directory: 'passed',
      teams: 'passed',
      channels: 'passed',
      messages: 'passed',
    });
    expect(global.fetch).toHaveBeenCalledTimes(5);
    expect(organizationUpdate).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        $set: expect.objectContaining({
          'integrations.microsoft.applicationConsentVerifiedAt': expect.any(Date),
          'integrations.microsoft.applicationConsentLastError': null,
        }),
      })
    );
    expect(connectionUpdate).toHaveBeenCalledTimes(2);
    for (const [, update] of connectionUpdate.mock.calls) {
      expect(update.$set.status).toBe('connected');
      expect(update.$set['sync.enabled']).toBe(true);
      expect(update.$set).not.toHaveProperty('sync.backfillComplete');
      expect(update.$set).not.toHaveProperty('sync.backfillProgress');
    }
  });

  test('migrates a legacy delegated marker and retires delegated tokens after live inspection', async () => {
    organizationLean.mockResolvedValue({
      _id: 'org-1',
      integrations: {
        microsoft: { tenantId: 'tenant-1', accessToken: 'encrypted-legacy-token' },
      },
    });

    await verifyMicrosoftCompanyWideAccess('org-1', 'user-1');

    const overallWrite = organizationUpdate.mock.calls.at(-1)[1];
    expect(overallWrite.$set['integrations.microsoft.delegatedConnectedAt']).toEqual(
      expect.any(Date)
    );
    expect(overallWrite.$unset).toEqual(
      expect.objectContaining({
        'integrations.microsoft.accessToken': 1,
        'integrations.microsoft.refreshToken': 1,
        'integrations.microsoft.expiry': 1,
      })
    );
  });

  test('treats a delegated-only token with no roles as awaiting admin consent', async () => {
    getMicrosoftAppToken.mockResolvedValue(tokenWithRoles([]));

    await expect(verifyMicrosoftCompanyWideAccess('org-1')).rejects.toThrow(
      'Missing application permissions'
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(connectionUpdate).toHaveBeenCalledTimes(2);
    for (const [, update] of connectionUpdate.mock.calls) {
      expect(update.$set.status).toBe('needs_admin');
      expect(update.$unset).toEqual({
        connectedAt: 1,
        connectedBy: 1,
        'sync.backfillStartedAt': 1,
        'sync.backfillCompletedAt': 1,
      });
    }
  });

  test.each(REQUIRED_MICROSOFT_APPLICATION_ROLES)(
    'does not fully verify when the %s application role is missing',
    async (missingRole) => {
      const roles = REQUIRED_MICROSOFT_APPLICATION_ROLES.filter((role) => role !== missingRole);
      getMicrosoftAppToken.mockResolvedValue(tokenWithRoles(roles));

      await expect(verifyMicrosoftCompanyWideAccess('org-1')).rejects.toThrow(missingRole);

      const overallWrite = organizationUpdate.mock.calls.at(-1)[1];
      expect(overallWrite.$unset['integrations.microsoft.applicationConsentVerifiedAt']).toBe(1);
    }
  );

  test('preserves a verified Teams source when the calendar Graph probe fails', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
      .mockImplementationOnce(() => failed(403, 'ErrorAccessDenied'))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
      .mockImplementationOnce(() => ok([]));

    await expect(verifyMicrosoftCompanyWideAccess('org-1')).rejects.toThrow(
      'calendar verification failed'
    );

    const outlookWrite = connectionUpdate.mock.calls.find(
      ([filter]) => filter.integrationType === 'microsoft-outlook'
    )[1];
    const teamsWrite = connectionUpdate.mock.calls.find(
      ([filter]) => filter.integrationType === 'microsoft-teams'
    )[1];
    expect(outlookWrite.$set.status).toBe('error');
    expect(teamsWrite.$set.status).toBe('connected');
  });

  test('does not verify Teams when the message probe fails', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
      .mockImplementationOnce(() => failed(403, 'Forbidden'));

    await expect(verifyMicrosoftCompanyWideAccess('org-1')).rejects.toThrow(
      'Teams messages verification failed'
    );

    const outlookWrite = connectionUpdate.mock.calls[0][1];
    const teamsWrite = connectionUpdate.mock.calls[1][1];
    expect(outlookWrite.$set.status).toBe('connected');
    expect(teamsWrite.$set.status).toBe('error');
  });

  test('rejects an application token issued for another tenant', async () => {
    getMicrosoftAppToken.mockResolvedValue(
      tokenWithRoles(REQUIRED_MICROSOFT_APPLICATION_ROLES, { tid: 'tenant-2' })
    );

    await expect(verifyMicrosoftCompanyWideAccess('org-1')).rejects.toThrow('different tenant');
    expect(connectionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'org-1' }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'error', 'sync.enabled': false }),
      })
    );
  });
});
