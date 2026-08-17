import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const organizationLean = jest.fn();
const organizationUpdate = jest.fn();
const userLean = jest.fn();
const connectionUpdate = jest.fn();
const getMicrosoftAppToken = jest.fn();

jest.unstable_mockModule('../models/organizationModel.js', () => ({
  default: {
    findById: () => ({ lean: organizationLean }),
    findByIdAndUpdate: organizationUpdate,
  },
}));
jest.unstable_mockModule('../models/user.js', () => ({
  default: {
    findOne: () => ({ select: () => ({ lean: userLean }) }),
  },
}));
jest.unstable_mockModule('../models/integrationConnection.js', () => ({
  default: { findOneAndUpdate: connectionUpdate },
}));
jest.unstable_mockModule('../services/tokenService.js', () => ({ getMicrosoftAppToken }));

const { REQUIRED_MICROSOFT_APPLICATION_ROLES, verifyMicrosoftCompanyWideAccess } =
  await import('../services/microsoftAdminConsentService.js');

function tokenWithRoles(roles) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ roles })}.signature`;
}

function ok(value = []) {
  return Promise.resolve({ ok: true, status: 200, json: async () => ({ value }) });
}

beforeEach(() => {
  jest.clearAllMocks();
  organizationLean.mockResolvedValue({
    _id: 'org-1',
    integrations: { microsoft: { tenantId: 'tenant-1' } },
  });
  organizationUpdate.mockResolvedValue({});
  connectionUpdate.mockResolvedValue({});
  userLean.mockResolvedValue({ externalIds: { microsoftUserId: 'ms-user-1' } });
  getMicrosoftAppToken.mockResolvedValue(tokenWithRoles(REQUIRED_MICROSOFT_APPLICATION_ROLES));
  global.fetch = jest
    .fn()
    .mockImplementationOnce(() => ok([{ id: 'ms-user-1' }]))
    .mockImplementationOnce(() => ok([]))
    .mockImplementationOnce(() => ok([]));
});

describe('Microsoft company-wide access verification', () => {
  test('registers consent only after application roles and Graph probes succeed', async () => {
    const result = await verifyMicrosoftCompanyWideAccess('org-1', 'user-1');

    expect(result.roles).toEqual(REQUIRED_MICROSOFT_APPLICATION_ROLES);
    expect(global.fetch).toHaveBeenCalledTimes(3);
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
  });

  test('does not verify consent when required application roles are missing', async () => {
    getMicrosoftAppToken.mockResolvedValue(tokenWithRoles(['Calendars.Read']));

    await expect(verifyMicrosoftCompanyWideAccess('org-1', 'user-1')).rejects.toThrow(
      'missing application permissions'
    );

    expect(global.fetch).not.toHaveBeenCalled();
    expect(organizationUpdate).toHaveBeenLastCalledWith(
      'org-1',
      expect.objectContaining({
        $unset: { 'integrations.microsoft.applicationConsentVerifiedAt': 1 },
      })
    );
  });
});
