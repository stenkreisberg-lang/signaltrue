import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const organizationLean = jest.fn();
const organizationUpdate = jest.fn();
const userLean = jest.fn();
const connectionUpdate = jest.fn();
const connectionUpdateOne = jest.fn();
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
    updateOne: connectionUpdateOne,
    updateMany: connectionUpdateMany,
  },
}));
jest.unstable_mockModule('../services/tokenService.js', () => ({ getMicrosoftAppToken }));

const {
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
  inspectMicrosoftCompanyWideAccess,
  verifyMicrosoftCompanyWideAccess,
} = await import('../services/microsoftAdminConsentService.js');

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

function failed(status = 403, code = 'Authorization_RequestDenied', retryAfter = null) {
  return Promise.resolve({
    ok: false,
    status,
    headers: { get: (name) => (name === 'retry-after' ? retryAfter : null) },
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
  connectionUpdateOne.mockResolvedValue({});
  connectionUpdateMany.mockResolvedValue({});
  userLean.mockResolvedValue([{ externalIds: { microsoftUserId: 'ms-user-1' } }]);
  getMicrosoftAppToken.mockResolvedValue(tokenWithRoles(REQUIRED_MICROSOFT_APPLICATION_ROLES));
  successfulGraphProbes();
});

describe('Microsoft company-wide access verification', () => {
  test('registers consent only after roles and directory, calendar, channel and message probes pass', async () => {
    const result = await verifyMicrosoftCompanyWideAccess('org-1', 'user-1');

    expect(result.verified).toBe(true);
    expect(result.status).toBe('connected');
    expect(result.roles).toEqual([...REQUIRED_MICROSOFT_APPLICATION_ROLES].sort());
    expect(result.sources.outlook.status).toBe('connected');
    expect(result.sources.teams.status).toBe('connected');
    expect(result.sources.outlook.probes).toEqual({ directory: 'passed', calendar: 'passed' });
    expect(result.sources.teams.probes).toEqual({
      directory: 'passed',
      teams: 'passed',
      channels: 'passed',
      messages: 'passed',
    });
    expect(global.fetch).toHaveBeenCalledTimes(5);
    const requestedUrls = global.fetch.mock.calls.map(([url]) => url);
    expect(requestedUrls[2]).toBe('https://graph.microsoft.com/v1.0/users/ms-user-1/joinedTeams');
    expect(requestedUrls[3]).toBe(
      'https://graph.microsoft.com/v1.0/teams/team-1/channels?$select=id'
    );
    expect(requestedUrls[3]).not.toContain('$top');
    expect(requestedUrls[4]).toBe(
      'https://graph.microsoft.com/v1.0/teams/team-1/channels/channel-1/messages?$top=1'
    );
    expect(organizationUpdate).toHaveBeenCalledWith(
      'org-1',
      expect.objectContaining({
        $set: expect.objectContaining({
          'integrations.microsoft.applicationConsentStatus': 'connected',
          'integrations.microsoft.applicationConsentVerifiedAt': expect.any(Date),
          'integrations.microsoft.applicationConsentLastError': null,
          'integrations.microsoft.applicationConsentSources.outlook.status': 'connected',
          'integrations.microsoft.applicationConsentSources.teams.status': 'connected',
        }),
      })
    );
    expect(connectionUpdate).toHaveBeenCalledTimes(2);
    expect(connectionUpdateOne).toHaveBeenCalledTimes(2);
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
      });
      expect(update.$set).not.toHaveProperty('sync.backfillComplete');
      expect(update.$set).not.toHaveProperty('sync.backfillProgress');
    }
  });

  test('keeps Outlook connected while a missing Teams role requires admin consent', async () => {
    const roles = REQUIRED_MICROSOFT_APPLICATION_ROLES.filter(
      (role) => role !== 'ChannelMessage.Read.All'
    );
    getMicrosoftAppToken.mockResolvedValue(tokenWithRoles(roles));
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
      .mockImplementationOnce(() => ok([]));

    let verificationError;
    try {
      await verifyMicrosoftCompanyWideAccess('org-1');
    } catch (error) {
      verificationError = error;
    }

    expect(verificationError.verification.status).toBe('partial');
    expect(verificationError.verification.sources.outlook.status).toBe('connected');
    expect(verificationError.verification.sources.teams.status).toBe('needs_admin');
    expect(verificationError.verification.sources.teams.missingRoles).toEqual([
      'ChannelMessage.Read.All',
    ]);
    const teamsWrite = connectionUpdate.mock.calls.find(
      ([filter]) => filter.integrationType === 'microsoft-teams'
    )[1];
    expect(teamsWrite.$set.status).toBe('needs_admin');
    expect(teamsWrite.$set.statusMessage).toContain('ChannelMessage.Read.All');
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

  test('treats a channels BadRequest with all roles present as an error, not missing consent', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => failed(400, 'BadRequest'));

    let verificationError;
    try {
      await verifyMicrosoftCompanyWideAccess('org-1');
    } catch (error) {
      verificationError = error;
    }

    expect(verificationError.verification.status).toBe('partial');
    expect(verificationError.verification.sources.outlook.status).toBe('connected');
    expect(verificationError.verification.sources.teams.status).toBe('error');
    expect(verificationError.verification.sources.teams.reasonCode).toBe('channels_probe_failed');
    expect(verificationError.verification.sources.teams.missingRoles).toEqual([]);
    const overallWrite = organizationUpdate.mock.calls.at(-1)[1];
    expect(overallWrite.$set).toEqual(
      expect.objectContaining({
        'integrations.microsoft.applicationConsentGrantedAt': expect.any(Date),
        'integrations.microsoft.applicationConsentStatus': 'partial',
        'integrations.microsoft.sync.lastStatus': 'partial',
      })
    );
    expect(overallWrite.$unset['integrations.microsoft.applicationConsentVerifiedAt']).toBe(1);
    const teamsWrite = connectionUpdate.mock.calls.find(
      ([filter]) => filter.integrationType === 'microsoft-teams'
    )[1];
    expect(teamsWrite.$set.status).toBe('error');
    expect(teamsWrite.$set.statusMessage).toBe(
      'Company-wide Teams channels verification failed (BadRequest).'
    );
    expect(teamsWrite.$set.statusMessage).not.toMatch(/administrator consent/i);
  });

  test('skips a user without a mailbox and verifies a later eligible user', async () => {
    userLean.mockResolvedValue([]);
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'no-mailbox' }, { id: 'eligible-user' }]))
      .mockImplementationOnce(() => failed(404, 'ErrorMailboxNotEnabledForRESTAPI'))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
      .mockImplementationOnce(() => ok([]));

    const result = await inspectMicrosoftCompanyWideAccess('org-1');

    expect(result.sources.outlook.status).toBe('connected');
    expect(global.fetch.mock.calls[1][0]).toContain('/users/no-mailbox/calendarView?');
    expect(global.fetch.mock.calls[2][0]).toContain('/users/eligible-user/calendarView?');
  });

  test('returns a precise inconclusive state when no sampled user has a mailbox', async () => {
    userLean.mockResolvedValue([]);
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'no-mailbox' }]))
      .mockImplementationOnce(() => failed(404, 'ErrorMailboxNotEnabledForRESTAPI'))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
      .mockImplementationOnce(() => ok([]));

    const result = await inspectMicrosoftCompanyWideAccess('org-1');

    expect(result.sources.outlook).toEqual(
      expect.objectContaining({
        status: 'error',
        reasonCode: 'permission_granted_but_no_verifiable_mailbox',
        missingRoles: [],
        probes: { directory: 'passed', calendar: 'not_verifiable' },
      })
    );
    expect(result.sources.teams.status).toBe('connected');
    expect(result.status).toBe('partial');
  });

  test('prefers fresh directory users over stale mapped IDs when choosing probes', async () => {
    userLean.mockResolvedValue([{ externalIds: { microsoftUserId: 'stale-user' } }]);
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'live-user' }]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => failed(404, 'Request_ResourceNotFound'))
      .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
      .mockImplementationOnce(() => ok([]));

    const result = await inspectMicrosoftCompanyWideAccess('org-1');

    expect(result.verified).toBe(true);
    expect(global.fetch.mock.calls[1][0]).toContain('/users/live-user/calendarView?');
    expect(global.fetch.mock.calls[2][0]).toBe(
      'https://graph.microsoft.com/v1.0/users/live-user/joinedTeams'
    );
  });

  test('continues after an empty joinedTeams response and verifies a later user', async () => {
    userLean.mockResolvedValue([]);
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'no-teams' }, { id: 'eligible-user' }]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
      .mockImplementationOnce(() => ok([]));

    const result = await inspectMicrosoftCompanyWideAccess('org-1');

    expect(result.sources.teams.status).toBe('connected');
    expect(global.fetch.mock.calls[2][0]).toBe(
      'https://graph.microsoft.com/v1.0/users/no-teams/joinedTeams'
    );
    expect(global.fetch.mock.calls[3][0]).toBe(
      'https://graph.microsoft.com/v1.0/users/eligible-user/joinedTeams'
    );
  });

  test('returns a precise inconclusive state when sampled users have no Teams membership', async () => {
    userLean.mockResolvedValue([]);
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'no-teams-1' }, { id: 'no-teams-2' }]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([]));

    const result = await inspectMicrosoftCompanyWideAccess('org-1');

    expect(result.sources.outlook.status).toBe('connected');
    expect(result.sources.teams).toEqual(
      expect.objectContaining({
        status: 'error',
        reasonCode: 'permission_granted_but_no_verifiable_team',
        missingRoles: [],
      })
    );
    expect(result.sources.teams.error).not.toMatch(/missing|consent/i);
    expect(result.status).toBe('partial');
  });

  test('tries another team and channel when the first team cannot be probed', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }, { id: 'team-2' }]))
      .mockImplementationOnce(() => failed(400, 'BadRequest'))
      .mockImplementationOnce(() => ok([{ id: 'channel-2' }]))
      .mockImplementationOnce(() => ok([]));

    const result = await inspectMicrosoftCompanyWideAccess('org-1');

    expect(result.verified).toBe(true);
    expect(global.fetch.mock.calls[3][0]).toBe(
      'https://graph.microsoft.com/v1.0/teams/team-1/channels?$select=id'
    );
    expect(global.fetch.mock.calls[4][0]).toBe(
      'https://graph.microsoft.com/v1.0/teams/team-2/channels?$select=id'
    );
  });

  test('retries a throttled Graph probe without changing the request contract', async () => {
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => failed(429, 'TooManyRequests', '0'))
      .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
      .mockImplementationOnce(() => ok([]))
      .mockImplementationOnce(() => ok([{ id: 'team-1' }]))
      .mockImplementationOnce(() => ok([{ id: 'channel-1' }]))
      .mockImplementationOnce(() => ok([]));

    const result = await inspectMicrosoftCompanyWideAccess('org-1');

    expect(result.verified).toBe(true);
    expect(global.fetch.mock.calls[0][0]).toBe(global.fetch.mock.calls[1][0]);
  });

  test('reports transitions only once when verification is repeated', async () => {
    connectionUpdate
      .mockResolvedValueOnce({ status: 'needs_admin' })
      .mockResolvedValueOnce({ status: 'needs_admin' })
      .mockResolvedValueOnce({ status: 'connected' })
      .mockResolvedValueOnce({ status: 'connected' });

    const first = await verifyMicrosoftCompanyWideAccess('org-1');
    successfulGraphProbes();
    const second = await verifyMicrosoftCompanyWideAccess('org-1');

    expect(first.transitions).toEqual(['microsoft-outlook', 'microsoft-teams']);
    expect(second.transitions).toEqual([]);
    expect(connectionUpdateOne).toHaveBeenCalledTimes(2);
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

  test('rejects a token without a tenant claim or expected application claim', async () => {
    getMicrosoftAppToken.mockResolvedValue(
      tokenWithRoles(REQUIRED_MICROSOFT_APPLICATION_ROLES, { tid: undefined })
    );
    await expect(inspectMicrosoftCompanyWideAccess('org-1')).rejects.toThrow('different tenant');

    getMicrosoftAppToken.mockResolvedValue(
      tokenWithRoles(REQUIRED_MICROSOFT_APPLICATION_ROLES, { appid: undefined })
    );
    await expect(inspectMicrosoftCompanyWideAccess('org-1')).rejects.toThrow(
      'different application'
    );
  });
});
