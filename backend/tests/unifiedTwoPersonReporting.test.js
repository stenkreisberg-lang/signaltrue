import { describe, expect, test } from '@jest/globals';
import {
  MIN_TEAM_SIZE,
  MIN_METRIC_CONTRIBUTORS,
  MIN_ENGAGEMENT_TEAM_SIZE,
  checkTeamSize,
  suppressMetricIfTooFew,
} from '../utils/privacyGate.js';
import { buildEligibleTeamTrends } from '../services/reportTrendService.js';
import { buildRollingActorCohorts, summarizeObservedTeamDays } from '../services/managerIntelligenceService.js';

const now = new Date('2026-11-11T13:00:00.000Z');
const teamId = '507f191e810c19729de860ec';
const team = { _id: teamId, name: 'Team of two', isActive: true, analyticsEnabled: true,
  metadata: { actualSize: 2 } };

function record(date, meetings, messages) {
  return { date: new Date(date), teamId, userId: null,
    calculationWindowVersion: 'rolling7-calendar-days-v2',
    meetingInstanceCount7d: meetings, meetingParticipantHours7d: meetings * 1.5,
    focusTimeAvailabilityHours: 8, calendarDaysObserved: 5,
    messageCount7d: messages, afterHoursMessageRatio: 0.1,
    recurringMeetingBurden: 0.25 };
}

const records = [
  record('2026-11-01T00:00:00.000Z', 8, 40),
  record('2026-11-08T00:00:00.000Z', 10, 50),
];
const actorWeeks = {
  [teamId + ':2026-10-26']: 2,
  [teamId + ':2026-11-02']: 2,
};

describe('unified team reporting minimum', () => {
  test('uses two active mapped contributors everywhere with no alternate approval gate', () => {
    expect(MIN_TEAM_SIZE).toBe(2);
    expect(MIN_METRIC_CONTRIBUTORS).toBe(2);
    expect(MIN_ENGAGEMENT_TEAM_SIZE).toBe(2);
    expect(checkTeamSize(2)).toBe(true);
    expect(suppressMetricIfTooFew(2)).toBe(false);
    expect(checkTeamSize(1)).toBe(false);
    expect(suppressMetricIfTooFew(1)).toBe(true);
  });

  test('two-member teams show observed multi-week measurements just like larger teams', () => {
    const result = buildEligibleTeamTrends({
      records, teams:[team], activeMemberCounts:{[teamId]:2},
      actorsByWeek:actorWeeks, minimumGroupSize:2, now, anchorDay:0,
    });
    expect(result).toHaveLength(1);
    expect(result[0].population).toBe(2);
    expect(result[0].current).toBe(5);
    expect(result[0].points.filter(point => point.meetingsPerRepresentedPerson != null))
      .toHaveLength(2);
    expect(result[0].baseline).toBeNull();
  });

  test('no inferred values when a team has only one observed contributor', () => {
    const result = buildEligibleTeamTrends({
      records, teams:[team], activeMemberCounts:{[teamId]:2},
      actorsByWeek:{...actorWeeks,[teamId + ':2026-11-02']:1},
      minimumGroupSize:2, now, anchorDay:0,
    });
    expect(result).toHaveLength(1);
    expect(result[0].points.at(-1).meetingsPerRepresentedPerson).toBeNull();
  });

  test('seven-day denominators use the complete sampled window and both mapped senders', () => {
    const counts = buildRollingActorCohorts({
      grouped:[
        { _id:'2026-10-27', actors:['a'] },
        { _id:'2026-10-30', actors:['b'] },
        { _id:'2026-11-03', actors:['a'] },
        { _id:'2026-11-06', actors:['b'] },
      ],
      activeIds:new Set(['a','b']), teamId, now, anchorDay:0, count:2,
    });
    expect(counts[teamId + ':2026-10-26']).toBe(2);
    expect(counts[teamId + ':2026-11-02']).toBe(2);
  });

  test('observed team daily metrics use the same group threshold, not assumed zeroes', () => {
    const daily = [{
      activePeopleCount:2,
      integrationCoverage:{hasCalendar:true,hasMessaging:true},
      measurementEvidence:{calendarEventCount:2,messagingEventCount:4},
      calendar:{meetingCount:2,meetingHoursPerPerson:1,
        focusHoursAvailablePerPerson:3,fragmentedDayRatio:0.2},
      messaging:{messagesSentTotal:4,afterHoursMessageRatio:0.25},
    }];
    const x = summarizeObservedTeamDays(daily,2);
    expect(x.metrics.find(m=>m.key==='meeting_hours').value).toBe(1);
    expect(x.metrics.find(m=>m.key==='teams_messages').value).toBe(4);
    expect(x.metrics.find(m=>m.key==='after_hours_messages').value).toBe(25);
  });
});
