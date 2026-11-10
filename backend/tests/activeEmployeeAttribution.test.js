import { afterEach, describe, expect, jest, test } from '@jest/globals';
import User from '../models/user.js';
import { buildUserAttributionMaps, resolveUserForEvent } from '../services/workEventAttributionService.js';

afterEach(() => jest.restoreAllMocks());

describe('active employee mapping', () => {
  test('builds event attribution maps from non-inactive employees only', async () => {
    const active = {
      _id: 'active-id', email: 'active@example.test', teamId: 'team-1',
      externalIds: { microsoftUserId: 'ms-active' },
    };
    const find = jest.spyOn(User, 'find').mockReturnValue({
      select: () => ({ lean: async () => [active] }),
    });
    const maps = await buildUserAttributionMaps('org-1');
    expect(find).toHaveBeenCalledWith({
      orgId: 'org-1', accountStatus: { $ne: 'inactive' },
    });
    expect(resolveUserForEvent({
      from: { user: { id: 'ms-active' } },
    }, maps)).toEqual(expect.objectContaining({ _id: 'active-id' }));
  });
});
