import { describe, expect, test } from '@jest/globals';
import { computeMeetingMetrics, computeMessagingMetrics } from '../services/integrationMetricsService.js';
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
  });
});
