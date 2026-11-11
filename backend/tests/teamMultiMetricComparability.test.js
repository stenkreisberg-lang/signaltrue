import { describe, expect, test } from '@jest/globals';
import { buildEligibleTeamTrends, TEAM_TREND_DIMENSIONS } from '../services/reportTrendService.js';

const now = new Date('2026-11-11T13:00:00Z');
const id = '507f191e810c19729de860aa';
const team = { _id: id, name: 'Estonian knowledge team', isActive: true,
  analyticsEnabled: true, metadata: { actualSize: 2 } };
const sunday = ['2026-09-27', '2026-10-04', '2026-10-11', '2026-10-18', '2026-10-25', '2026-11-01', '2026-11-08'];
const monday = ['2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
const records = sunday.map((day, n) => ({
  date: new Date(day + 'T00:00:00Z'),
  teamId: id,
  userId: null,
  calculationWindowVersion: 'rolling7-calendar-days-v2',
  meetingInstanceCount7d: 6 + n,
  meetingParticipantHours7d: 12 + n * 2,
  messageCount7d: 20 + n * 2,
  afterHoursMessageRatio: 0.05 + n * 0.01,
  focusTimeAvailabilityHours: 10 + n,
  calendarDaysObserved: 5,
  recurringMeetingBurden: 0.2 + n * 0.01,
  calendarFragmentationScore: 30 + n,
}));

const cohort = (count = 2) => Object.fromEntries(monday.map(day => [id + ':' + day, count]));
const build = ({ calendar = cohort(), messaging = cohort(), all = cohort(), source = records } = {}) =>
  buildEligibleTeamTrends({
    records: source,
    teams: [team],
    activeMemberCounts: { [id]: 2 },
    actorsByWeek: all,
    calendarActorsByWeek: calendar,
    messagingActorsByWeek: messaging,
    minimumGroupSize: 2,
    now,
    anchorDay: 0,
  });

describe('P1: source-specific, historically comparable team measurements', () => {
  test('the same two-member team has seven measured dimensions without a special mode', () => {
    const result = build();
    expect(result).toHaveLength(1);
    const latest = result[0].points.at(-1);
    expect(TEAM_TREND_DIMENSIONS).toHaveLength(7);
    expect(latest.meetingsPerRepresentedPerson).toBe(6);
    expect(latest.meetingHoursPerRepresentedPerson).toBe(12);
    expect(latest.messagesPerRepresentedPerson).toBe(16);
    expect(latest.afterHoursPct).toBe(11);
    expect(latest.focusHoursPerRepresentedPerson).toBe(8);
    expect(latest.recurringLoadPct).toBe(26);
    expect(latest.calendarFragmentation).toBe(36);
    expect(result[0].metricSummaries.meetingHoursPerRepresentedPerson.comparablePeriods).toBe(6);
    expect(result[0].metricSummaries.meetingHoursPerRepresentedPerson.verifiedComparison).toBe(true);
  });

  test('missing one messaging contributor hides messaging values but not calendar values', () => {
    const result = build({ messaging: cohort(1) });
    expect(result).toHaveLength(1);
    const latest = result[0].points.at(-1);
    expect(latest.messagesPerRepresentedPerson).toBeNull();
    expect(latest.afterHoursPct).toBeNull();
    expect(latest.meetingHoursPerRepresentedPerson).toBe(12);
  });

  test('missing a calendar contributor hides calendar metrics but not measured Teams messages', () => {
    const result = build({ calendar: cohort(1) });
    expect(result).toHaveLength(1);
    const latest = result[0].points.at(-1);
    expect(latest.meetingsPerRepresentedPerson).toBeNull();
    expect(latest.focusHoursPerRepresentedPerson).toBeNull();
    expect(latest.calendarFragmentation).toBeNull();
    expect(latest.messagesPerRepresentedPerson).toBe(16);
  });

  test('a missing current week stays unavailable, not a carried-forward value', () => {
    const result = build({ source: records.slice(0, -1) });
    expect(result).toHaveLength(1);
    expect(result[0].points.at(-1).meetingHoursPerRepresentedPerson).toBeNull();
    expect(result[0].metricSummaries.meetingHoursPerRepresentedPerson.current).toBeNull();
    expect(result[0].metricSummaries.meetingHoursPerRepresentedPerson.verifiedComparison).toBe(false);
  });

  test('fewer than four preceding observations never produces a persuasive baseline', () => {
    const result = build({ source: records.slice(-3) });
    expect(result[0].metricSummaries.meetingHoursPerRepresentedPerson.baseline).toBeNull();
    expect(result[0].metricSummaries.meetingHoursPerRepresentedPerson.changePct).toBeNull();
  });

  test('corrected seven-day data are not mixed with legacy meeting counts', () => {
    const legacy = { ...records[0], calculationWindowVersion: undefined,
      meetingInstanceCount7d: 600 };
    const result = build({ source: [...records, legacy] });
    expect(result).toHaveLength(1);
    expect(result[0].points.at(-1).meetingsPerRepresentedPerson).toBe(6);
  });
});
