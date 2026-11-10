import { afterEach, describe, expect, jest, test } from '@jest/globals';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import { aggregateWeeklyMetrics } from '../services/engagementWeeklyMetricsService.js';
import { candidateMappedActorIds } from '../services/engagementDailyAggregationService.js';

afterEach(() => jest.restoreAllMocks());

function mockDays(days, previous = []) {
  jest.spyOn(EngagementTeamDaily, 'find')
    .mockReturnValueOnce({ sort: () => ({ lean: async () => days }) })
    .mockReturnValueOnce({ sort: () => ({ lean: async () => previous }) });
}

describe('observed work-pattern metrics', () => {
  test('counts only plausible mapped internal actor identifiers', () => {
    const actor = '507f191e810c19729de860ea';
    expect(candidateMappedActorIds([
      { actorUserId: undefined },
      { actorUserId: null },
      { actorUserId: 'not-a-user-id' },
      { actorUserId: actor },
      { actorUserId: actor },
    ])).toEqual([actor]);
  });

  test('after-hours ratio weights observed events rather than equally averaging connected sources', async () => {
    const observed = {
      date: '2026-11-02', activePeopleCount: 8,
      calendar: {
        meetingCount: 2, afterHoursMeetingCount: 1,
        meetingHoursTotal: 3, afterHoursMeetingMinutes: 60,
        meetingHoursPerPerson: 0.375,
      },
      messaging: { messagesSentTotal: 10, afterHoursMessageRatio: 0.2, messagesSentPerPerson: 1.25 },
      email: { emailsSentTotal: 4, afterHoursEmailRatio: 0.25 },
      integrationCoverage: { hasCalendar: true, hasMessaging: true, hasEmail: true },
    };
    const unobserved = {
      date: '2026-11-03', activePeopleCount: 8,
      calendar: { meetingHoursPerPerson: 0 },
      messaging: { messagesSentTotal: 0, afterHoursMessageRatio: 0 },
      email: { emailsSentTotal: 0, afterHoursEmailRatio: 0 },
      integrationCoverage: { hasCalendar: false, hasMessaging: false, hasEmail: false },
    };
    mockDays([observed, unobserved]);
    const result = await aggregateWeeklyMetrics('team-1', '2026-11-02');
    expect(result.afterHoursActivityRatio).toBe(0.25);
    expect(result.afterHoursMeetingRatio).toBeCloseTo(1 / 3, 3);
    expect(result.meetingHoursPerPerson).toBe(0.375);
    expect(result.messagesSentPerPerson).toBe(1.25);
    expect(result.weekOverWeekMeetingLoadChange).toBeNull();
  });

  test('never represents missing source evidence as verified zero activity', async () => {
    mockDays([{
      date: '2026-11-02', activePeopleCount: 8,
      calendar: { meetingHoursPerPerson: 0 },
      messaging: { messagesSentTotal: 0, afterHoursMessageRatio: 0 },
      email: { emailsSentTotal: 0, afterHoursEmailRatio: 0 },
      integrationCoverage: { hasCalendar: false, hasMessaging: false, hasEmail: false },
    }]);
    const result = await aggregateWeeklyMetrics('team-2', '2026-11-02');
    expect(result.meetingHoursPerPerson).toBeNull();
    expect(result.afterHoursMessageRatio).toBeNull();
    expect(result.afterHoursEmailRatio).toBeNull();
    expect(result.afterHoursActivityRatio).toBeNull();
    expect(result.afterHoursMeetingRatio).toBeNull();
    expect(result.integrationCoverage.hasCalendar).toBe(false);
  });
});
