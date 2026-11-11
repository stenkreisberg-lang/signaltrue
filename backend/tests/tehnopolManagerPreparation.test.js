import mongoose from 'mongoose';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import ManagerAssignment from '../models/managerAssignment.js';
import { prepareTehnopolManagerScopes } from '../services/tehnopolManagerPreparationService.js';

afterEach(() => jest.restoreAllMocks());

describe('only HR-approved manager identity can produce a pending invitation scope', () => {
  test('creates pending scopes with disabled email and exports, without activating access', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const managerId = new mongoose.Types.ObjectId();
    const approverId = new mongoose.Types.ObjectId();
    const teamId = new mongoose.Types.ObjectId();
    jest.spyOn(Organization, 'findById').mockReturnValue({
      select: () => ({ lean: async () =>
        ({ _id: orgId, domain: 'tehnopol.ee', lifecycleStatus: 'active' }) }),
    });
    jest.spyOn(Team, 'find').mockReturnValue({
      select: () => ({ lean: async () => [{
        _id: teamId, structure: { source: 'hr',
          verifiedAt: new Date(), managerUserId: managerId, verifiedBy: approverId },
      }] }),
    });
    jest.spyOn(User, 'findOne').mockImplementation((query) => ({
      select: () => ({ lean: async () =>
        String(query._id) === String(managerId)
          ? { _id: managerId, email: 'manager@tehnopol.ee' }
          : { _id: approverId } }),
    }));
    jest.spyOn(ManagerAssignment, 'exists').mockResolvedValue(null);
    const create = jest.spyOn(ManagerAssignment, 'create').mockResolvedValue({ _id: 'pending-1' });
    const result = await prepareTehnopolManagerScopes();
    expect(result).toMatchObject({ status: 'pending_only', prepared: 1,
      activeAccessGranted: 0, invitationEmailsSent: 0 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      orgId, teamId, managerUserId: managerId, invitedBy: approverId,
      status: 'pending', weeklyEmailEnabled: false, exportEnabled: false,
    }));
  });

  test('never provisions access for retired organizations', async () => {
    jest.spyOn(Organization, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({
        _id: new mongoose.Types.ObjectId(), domain: 'tehnopol.ee',
        lifecycleStatus: 'retired',
      }) }),
    });
    const create = jest.spyOn(ManagerAssignment, 'create');
    expect(await prepareTehnopolManagerScopes()).toEqual({
      status: 'not_applicable', prepared: 0,
    });
    expect(create).not.toHaveBeenCalled();
  });
});
