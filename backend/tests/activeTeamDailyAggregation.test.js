import { afterEach, describe, expect, jest, test } from '@jest/globals';
import mongoose from 'mongoose';
import User from '../models/user.js';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';
import WorkEvent from '../models/workEvent.js';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import { computeAndSaveTeamDay } from '../services/engagementDailyAggregationService.js';

afterEach(() => jest.restoreAllMocks());

describe('daily work-pattern aggregation source evidence', () => {
  test('does not treat former or unidentified source actors as team contributors', async () => {
    const orgId = new mongoose.Types.ObjectId();
    const teamId = new mongoose.Types.ObjectId();
    const active = Array.from({ length: 8 }, () => new mongoose.Types.ObjectId());
    const former = new mongoose.Types.ObjectId();
    const meeting = (actorUserId) => ({
      actorUserId, source: 'microsoft-outlook', eventType: 'meeting',
      teamId, orgId,
      timestamp: new Date('2026-11-03T10:00:00Z'),
      metadata: { startTime: '2026-11-03T10:00:00Z', durationMinutes: 30 },
    });
    jest.spyOn(Team, 'findById').mockReturnValue({
      lean: async () => ({ _id: teamId, orgId, timezone: 'UTC' }),
    });
    jest.spyOn(IntegrationConnection, 'find').mockReturnValue({
      lean: async () => [{ integrationType: 'microsoft-outlook', status: 'connected' }],
    });
    jest.spyOn(Organization, 'findById').mockReturnValue({
      select: () => ({ lean: async () => ({ settings: { minTeamSize: 2, timezone: 'UTC' } }) }),
    });
    jest.spyOn(WorkEvent, 'find').mockReturnValue({
      lean: async () => [...active.map(meeting), meeting(former), meeting(null)],
    });
    const userFind = jest.spyOn(User, 'find').mockReturnValue({
      select: () => ({ lean: async () => active.map((_id) => ({ _id })) }),
    });
    const save = jest.spyOn(EngagementTeamDaily, 'findOneAndUpdate')
      .mockImplementation(async (_filter, update) => update.$set);

    const result = await computeAndSaveTeamDay(orgId, teamId, new Date('2026-11-03T12:00:00Z'));
    expect(userFind).toHaveBeenCalledWith(expect.objectContaining({
      orgId, teamId, accountStatus: { $ne: 'inactive' },
    }));
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.activePeopleCount).toBe(8);
    expect(result.measurementEvidence.calendarEventCount).toBe(8);
    expect(result.measurementEvidence.excludedUnmappedOrInactiveEvents).toBe(2);
    expect(result.integrationCoverage.hasCalendar).toBe(true);
    expect(result.integrationCoverage.hasMessaging).toBe(false);
  });
});
