import { describe, expect, test } from '@jest/globals';
import { computeCalendarTransitionEvidence, computeMeetingMetrics, computeMessagingMetrics, isOutsideWorkingHours } from '../services/integrationMetricsService.js';
import { compareStoredWorkPatternMetrics } from '../services/workPatternParityAudit.js';
import { evaluateCountComparability } from '../utils/periodComparability.js';
import { validateTeamPermission } from '../services/managerIntelligenceService.js';

const day = new Date('2026-11-10T00:00:00Z');
const workSchedule = { timezone: 'Europe/Tallinn', workdayStart: '09:00', workdayEnd: '17:00' };
const actor = '507f191e810c19729de860ea';
const orgId = '507f191e810c19729de860eb';
const teamId = '507f191e810c19729de860ec';
const secondTeam = '507f191e810c19729de860ed';

const rows = [
  { source: 'microsoft-outlook', eventType: 'meeting', actorUserId: actor,
    timestamp: new Date('2026-11-10T08:00:00Z'),
    metadata: { meetingInstanceIdHash: 'meeting-1', durationMinutes: 60,
      startTime: new Date('2026-11-10T08:00:00Z'), endTime: new Date('2026-11-10T09:00:00Z') } },
  { source: 'microsoft-teams', eventType: 'message', actorUserId: actor,
    timestamp: new Date('2026-11-10T09:00:00Z'), metadata: { channelHash: 'c1' } },
  { source: 'microsoft-teams', eventType: 'message', actorUserId: actor,
    timestamp: new Date('2026-11-10T20:00:00Z'), metadata: { channelHash: 'c1' } },
];

describe('real-tenant-safe source/snapshot parity audit', () => {
  test('simultaneous starts have the same back-to-back count in either ingestion order', () => {
    const event = (id, start, end) => ({ source: 'microsoft-outlook', eventType: 'meeting',
      actorUserId: actor, timestamp: new Date(start), metadata: { meetingInstanceIdHash: id,
        startTime: new Date(start), endTime: new Date(end) } });
    const short = event('short', '2026-11-10T08:00Z', '2026-11-10T08:30Z');
    const long = event('long', '2026-11-10T08:00Z', '2026-11-10T09:00Z');
    const next = event('next', '2026-11-10T09:04Z', '2026-11-10T10:00Z');
    for (const order of [[short, long, next], [long, next, short]]) {
      expect(computeMeetingMetrics(order, day, workSchedule).backToBackMeetingBlocks).toBe(1);
    }
  });
  test('transition repair uses the same counts and weights as the full calendar calculation', () => {
    const first = rows[0];
    const legacy = { ...first, actorUserId: null, source: 'meet', eventType: 'meet_started',
      metadata: { ...first.metadata, meetingInstanceIdHash: 'legacy', internalAttendeeCount: 3 } };
    const next = { ...first, timestamp: new Date('2026-11-10T09:03Z'),
      metadata: { durationMinutes: 30, meetingInstanceIdHash: 'next' } };
    const declined = { ...next, metadata: { ...next.metadata, meetingInstanceIdHash: 'declined',
      attendeeResponseStatus: 'declined' } };
    const events = [first, legacy, first, next, declined, rows[1], { ...first, actorUserId: 'second' }];
    const evidence = computeCalendarTransitionEvidence(events, day);
    expect(evidence).toEqual({ meetingInstanceCount7d: 3, meetingParticipantHours7d: 5.5,
      backToBackMeetingBlocks: 1, avgGapBetweenMeetingsMins: 3 });
    expect(computeMeetingMetrics(events, day, workSchedule)).toMatchObject(evidence);
  });

  test('timezone changes and invalid zones preserve working-hour boundaries', () => {
    const time = '2026-11-10T15:15:00Z';
    for (const [timezone, outside] of [['Europe/Tallinn', true], ['UTC', false],
      ['Invalid/Zone', false], ['Europe/Tallinn', true]]) {
      expect(isOutsideWorkingHours(time, { timezone })).toBe(outside);
    }
  });
  const meeting = computeMeetingMetrics(rows, day, workSchedule);
  const messaging = computeMessagingMetrics(rows, day, workSchedule);
  const snapshot = { date: day,
    meetingInstanceCount7d: meeting.meetingInstanceCount7d,
    meetingDurationTotalHours7d: meeting.meetingDurationTotalHours7d,
    focusTimeAvailabilityHours: meeting.focusTimeAvailabilityHours,
    messageCount7d: messaging.messageCount7d,
    afterHoursMessageRatio: messaging.afterHoursMessageRatio,
  };
  test('compares the same UTC seven-day window and all five customer metrics', () => {
    const checked = compareStoredWorkPatternMetrics({ events: rows, snapshot, workSchedule });
    expect(checked.status).toBe('PASS');
    expect(checked.checks).toHaveLength(5);
    expect(checked.sourceEvidence).toMatchObject({ calendarRows: 1, messagingRows: 2 });
    expect(checked.period).toEqual({
      start: '2026-11-04T00:00:00.000Z', endExclusive: '2026-11-11T00:00:00.000Z',
    });
  });
  test('includes Teams-origin meeting observations in the same scope as the canonical calculator', () => {
    const teamsMeeting = {
      source: 'microsoft-teams',
      eventType: 'meeting',
      actorUserId: actor,
      timestamp: new Date('2026-11-10T11:00:00Z'),
      metadata: {
        meetingInstanceIdHash: 'teams-meeting-1', durationMinutes: 90,
        startTime: new Date('2026-11-10T11:00:00Z'),
        endTime: new Date('2026-11-10T12:30:00Z'),
      },
    };
    const fullRows = [...rows, teamsMeeting];
    const withTeamsMeeting = computeMeetingMetrics(fullRows, day, workSchedule);
    expect(computeMessagingMetrics(fullRows, day, workSchedule).messageCount7d).toBe(2);
    const checked = compareStoredWorkPatternMetrics({
      events: fullRows,
      snapshot: {
        ...snapshot,
        meetingInstanceCount7d: withTeamsMeeting.meetingInstanceCount7d,
        meetingDurationTotalHours7d: withTeamsMeeting.meetingDurationTotalHours7d,
        focusTimeAvailabilityHours: withTeamsMeeting.focusTimeAvailabilityHours,
      },
      workSchedule,
    });
    expect(checked.status).toBe('PASS');
    expect(checked.sourceEvidence.calendarRows).toBe(2);
    expect(checked.checks.every(item => item.status === 'PASS')).toBe(true);
  });

  test('includes a second calendar adapter when the org snapshot already includes it', () => {
    const otherCalendarMeeting = {
      source: 'calendar',
      eventType: 'meeting',
      actorUserId: actor,
      timestamp: new Date('2026-11-10T12:00:00Z'),
      metadata: {
        meetingInstanceIdHash: 'another-calendar-meeting',
        durationMinutes: 30,
        startTime: new Date('2026-11-10T12:00:00Z'),
        endTime: new Date('2026-11-10T12:30:00Z'),
      },
    };
    const fullRows = [...rows, otherCalendarMeeting];
    const allSourcesMeeting = computeMeetingMetrics(fullRows, day, workSchedule);
    const checked = compareStoredWorkPatternMetrics({
      events: fullRows,
      snapshot: {
        ...snapshot,
        meetingInstanceCount7d: allSourcesMeeting.meetingInstanceCount7d,
        meetingDurationTotalHours7d: allSourcesMeeting.meetingDurationTotalHours7d,
        focusTimeAvailabilityHours: allSourcesMeeting.focusTimeAvailabilityHours,
      },
      workSchedule,
    });
    expect(checked.status).toBe('PASS');
    expect(checked.sourceEvidence.otherOriginMeetingRows).toBe(1);
    expect(checked.sourceEvidence.otherMeetingSources).toContain('calendar');
  });

  test('flags inconsistent persisted report data, never backfills invented values', () => {
    const result = compareStoredWorkPatternMetrics({
      events: rows, snapshot: { ...snapshot, messageCount7d: 400 }, workSchedule,
    });
    expect(result.status).toBe('FAIL');
    expect(result.checks.find(c => c.field === 'messageCount7d')).toMatchObject({
      status: 'FAIL', stored: 400, recomputed: 2,
    });
  });
  test('missing source evidence remains unverified instead of a zero activity conclusion', () => {
    const result = compareStoredWorkPatternMetrics({ events: rows.slice(0, 1), snapshot, workSchedule });
    expect(result.status).toBe('INCOMPLETE');
    expect(result.checks.find(c => c.field === 'messageCount7d').status).toBe('UNVERIFIED');
  });
});

describe('HR reporting comparisons', () => {
  const sameSources = ['microsoft-teams'];
  test('suppresses 40,000% growth from a sparse prior baseline', () => {
    const result = evaluateCountComparability({
      current: 5803, previous: 14, currentSources: sameSources,
      previousSources: sameSources, currentContributors: 40, previousContributors: 1,
    });
    expect(result.comparable).toBe(false);
    expect(result.reason).toMatch(/baseline/);
  });
  test('rejects a newly added Teams connector and a sudden changed represented population', () => {
    expect(evaluateCountComparability({
      current: 400, previous: 380, currentSources: ['slack','microsoft-teams'],
      previousSources: ['slack'],
    }).comparable).toBe(false);
    expect(evaluateCountComparability({
      current: 400, previous: 380,
      currentSources: sameSources, previousSources: sameSources,
      currentContributors: 40, previousContributors: 12,
    }).comparable).toBe(false);
  });
  test('permits ordinary comparable source observations', () => {
    expect(evaluateCountComparability({
      current: 400, previous: 380,
      currentSources: sameSources, previousSources: sameSources,
      currentContributors: 40, previousContributors: 39,
    }).comparable).toBe(true);
  });
});

describe('manager access is scoped to the accepted team, never HR structure alone', () => {
  const user = { _id: actor, orgId, accountStatus: 'active' };
  const team = { _id: teamId, orgId, isActive: true, analyticsEnabled: true };
  const assignment = { managerUserId: actor, teamId, orgId,
    acceptedAt: new Date('2026-11-10T00:00:00Z'), status: 'active' };
  test('only accepted, current, unrevoked manager assignments pass', () => {
    const args = { user, assignment, team, orgId, teamId };
    expect(validateTeamPermission(args)).toBe(true);
    expect(validateTeamPermission({ ...args, assignment: null })).toBe(false);
    expect(validateTeamPermission({ ...args, assignment: { ...assignment, acceptedAt: null } })).toBe(false);
    expect(validateTeamPermission({ ...args, assignment: { ...assignment, revokedAt: new Date() } })).toBe(false);
    expect(validateTeamPermission({ ...args, assignment: { ...assignment, status: 'pending' } })).toBe(false);
  });
  test('denies another team and cross-organization access', () => {
    const args = { user, assignment, team, orgId, teamId };
    expect(validateTeamPermission({ ...args, teamId: secondTeam })).toBe(false);
    expect(validateTeamPermission({ ...args, orgId: secondTeam })).toBe(false);
    expect(validateTeamPermission({ ...args, user: { ...user, accountStatus: 'inactive' } })).toBe(false);
    expect(validateTeamPermission({ ...args, team: { ...team,
      structure: { source: 'hr', verifiedAt: new Date(), managerUserId: secondTeam },
    } })).toBe(false);
    expect(validateTeamPermission({ ...args, team: { ...team,
      structure: { source: 'hr', verifiedAt: new Date(), managerUserId: actor },
    } })).toBe(true);
  });
});
