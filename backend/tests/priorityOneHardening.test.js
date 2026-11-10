import { afterEach, describe, expect, jest, test } from '@jest/globals';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import {
  hasValidAdminApiKey,
  requireCurrentUserRoles,
} from '../middleware/auth.js';
import { MIN_TEAM_DEFINITION_SIZE, MIN_TEAM_SIZE, MIN_METRIC_CONTRIBUTORS } from '../utils/privacyGate.js';

const previousKey = process.env.ADMIN_API_KEY;
afterEach(() => {
  jest.restoreAllMocks();
  if (previousKey === undefined) delete process.env.ADMIN_API_KEY;
  else process.env.ADMIN_API_KEY = previousKey;
});

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('Priority 1 security fixes', () => {
  test('admin key is never valid if the configured secret is missing', () => {
    delete process.env.ADMIN_API_KEY;
    expect(hasValidAdminApiKey(undefined)).toBe(false);
    expect(hasValidAdminApiKey('anything')).toBe(false);
  });

  test('rejects a missing, incorrect, or short administrative key', () => {
    process.env.ADMIN_API_KEY = 'x'.repeat(32);
    expect(hasValidAdminApiKey(undefined)).toBe(false);
    expect(hasValidAdminApiKey('x')).toBe(false);
    expect(hasValidAdminApiKey('a'.repeat(32))).toBe(false);
    expect(hasValidAdminApiKey('x'.repeat(32))).toBe(true);
  });

  test('revoked employees and stale role claims cannot access protected writes', async () => {
    const current = { orgId: 'org-1', role: 'viewer', accountStatus: 'active', isMasterAdmin: false };
    jest.spyOn(User, 'findById').mockReturnValue({
      select: () => ({ lean: async () => current }),
    });
    const res = response(), next = jest.fn();
    await requireCurrentUserRoles(['admin'])({
      user: { userId: 'user-1', orgId: 'org-1', role: 'admin' },
    }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    current.role = 'admin';
    current.accountStatus = 'inactive';
    const res2 = response(), next2 = jest.fn();
    await requireCurrentUserRoles(['admin'])({
      user: { userId: 'user-1', orgId: 'org-1', role: 'admin' },
    }, res2, next2);
    expect(res2.status).toHaveBeenCalledWith(403);
    expect(next2).not.toHaveBeenCalled();
  });

  test('tenant membership changes invalidate old organization claims', async () => {
    jest.spyOn(User, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({
        orgId: 'org-B', role: 'admin', accountStatus: 'active', isMasterAdmin: false,
      }) }),
    });
    const res = response(), next = jest.fn();
    await requireCurrentUserRoles(['admin'])({
      user: { userId: 'user-1', orgId: 'org-A', role: 'admin' },
    }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('two-person teams are recognised without lowering sensitive metric disclosure', () => {
    expect(MIN_TEAM_DEFINITION_SIZE).toBe(2);
    expect(Organization.schema.path('settings.minTeamSize').options.min).toBe(2);
    expect(MIN_TEAM_SIZE).toBe(8);
    expect(MIN_METRIC_CONTRIBUTORS).toBe(8);
  });
});
