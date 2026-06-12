import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  checkTeamSize,
  MIN_METRIC_CONTRIBUTORS,
  MIN_TEAM_SIZE,
  suppressMetricIfTooFew,
} from '../utils/privacyGate.js';
import { normalizeDepartmentName } from '../services/employeeSyncService.js';
import { fetchGraphCollection } from '../services/coreIntegrationAdapters.js';
import {
  getNextWeeklyRun,
  getPreviousWeekStart,
  getWeekStart,
} from '../services/weeklySchedulerService.js';
import { calculateConfidenceScore } from '../services/engagementScoringService.js';
import Team from '../models/team.js';

afterEach(() => {
  jest.restoreAllMocks();
});

describe('small-team configuration', () => {
  test('enforces the five-person privacy floor by default', () => {
    expect(MIN_TEAM_SIZE).toBe(5);
    expect(MIN_METRIC_CONTRIBUTORS).toBe(5);
    expect(checkTeamSize(1)).toBe(false);
    expect(checkTeamSize(4)).toBe(false);
    expect(checkTeamSize(5)).toBe(true);
    expect(suppressMetricIfTooFew(4)).toBe(true);
  });

  test('new teams are active by default', () => {
    const team = new Team({ name: 'Nobel team', orgId: '507f1f77bcf86cd799439011' });
    expect(team.isActive).toBe(true);
  });
});

describe('directory mapping', () => {
  test('normalizes department names without inventing a department', () => {
    expect(normalizeDepartmentName('  Customer   Success ')).toBe('Customer Success');
    expect(normalizeDepartmentName('Customer Success\u200B')).toBe('Customer Success');
    expect(normalizeDepartmentName('   ')).toBeNull();
    expect(normalizeDepartmentName(null)).toBeNull();
  });
});

describe('Microsoft Graph pagination', () => {
  test('follows next links and combines every page', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: 'one' }], '@odata.nextLink': 'page-2' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: [{ id: 'two' }] }),
      });

    await expect(fetchGraphCollection('page-1', 'token')).resolves.toEqual([
      { id: 'one' },
      { id: 'two' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenLastCalledWith('page-2', {
      headers: { Authorization: 'Bearer token' },
      signal: expect.any(Object),
    });
  });
});

describe('weekly reporting period', () => {
  test('selects the previous completed week', () => {
    const thursday = new Date('2026-06-11T12:00:00Z');
    const current = getWeekStart(thursday);
    const previous = getPreviousWeekStart(thursday);
    expect([
      current.getFullYear(),
      current.getMonth(),
      current.getDate(),
      current.getDay(),
    ]).toEqual([2026, 5, 8, 1]);
    expect([
      previous.getFullYear(),
      previous.getMonth(),
      previous.getDate(),
      previous.getDay(),
    ]).toEqual([2026, 5, 1, 1]);
  });

  test('schedules the current Monday when startup is before 5:30', () => {
    const beforeRun = new Date(2026, 5, 8, 4, 0, 0);
    const next = getNextWeeklyRun(beforeRun);
    expect([next.getDate(), next.getDay(), next.getHours(), next.getMinutes()]).toEqual([
      8, 1, 5, 30,
    ]);
  });
});

describe('confidence scoring', () => {
  test('uses the accepted organization minimum for an eligible team', () => {
    const input = {
      baseline: { baselineQuality: { qualityScore: 80 } },
      weeklyMetrics: { activitySpikeDays: 0 },
      activePeopleCount: 5,
      integrationCoverage: { hasCalendar: true },
      subscores: { recoveryDebt: 30, focusErosion: 35 },
    };
    const accepted = calculateConfidenceScore({ ...input, minimumTeamSize: 5 });
    const belowPolicy = calculateConfidenceScore({ ...input, minimumTeamSize: 8 });
    expect(accepted.score).toBeGreaterThan(belowPolicy.score);
  });
});
