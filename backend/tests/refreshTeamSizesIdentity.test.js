import { afterEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/user.js';
import Team from '../models/team.js';
import { refreshTeamSizes } from '../services/employeeSyncService.js';

afterEach(() => jest.restoreAllMocks());

describe('refreshTeamSizes MongoDB tenant identity', () => {
  test('string organisation ID is cast to ObjectId before aggregate, retaining two-member analytics', async () => {
    const orgId = '6a509c2e85ba56cdc945b3c7';
    const teamId = new mongoose.Types.ObjectId();
    const aggregate = jest.spyOn(User, 'aggregate').mockResolvedValue([
      { _id: teamId, count: 2 },
    ]);
    const find = jest.spyOn(Team, 'find').mockReturnValue({
      select: () => ({ lean: async () => [{ _id: teamId }] }),
    });
    const update = jest.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});
    await refreshTeamSizes(orgId, 2);
    const match = aggregate.mock.calls[0][0][0].$match;
    expect(match.orgId).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(String(match.orgId)).toBe(orgId);
    expect(find).toHaveBeenCalledWith({
      orgId, isActive: { $ne: false },
    });
    expect(update).toHaveBeenCalledWith(teamId, {
      $set: {
        'metadata.actualSize': 2,
        analyticsEnabled: true,
        operationalTeamEligible: true,
      },
    });
  });

  test('one-person group is not eligible and inactive teams are not refreshed', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const teamId = new mongoose.Types.ObjectId();
    jest.spyOn(User, 'aggregate').mockResolvedValue([{ _id: teamId, count: 1 }]);
    jest.spyOn(Team, 'find').mockReturnValue({
      select: () => ({ lean: async () => [{ _id: teamId }] }),
    });
    const update = jest.spyOn(Team, 'findByIdAndUpdate').mockResolvedValue({});
    await refreshTeamSizes(orgId, 2);
    expect(update.mock.calls[0][1].$set).toMatchObject({
      'metadata.actualSize': 1,
      analyticsEnabled: false,
      operationalTeamEligible: false,
    });
    expect(update.mock.calls[0][1].$set).not.toHaveProperty('isActive');
  });
});
