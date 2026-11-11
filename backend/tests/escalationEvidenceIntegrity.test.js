import { describe, expect, test } from '@jest/globals';
import { calculateTeamStatus, STATUS_LEVELS } from '../services/escalationService.js';

const baseline = {
  meetingHours: 20,
  backToBack: 4,
  afterHoursRatio: 0.08,
  focusTimeAvailability: 10,
  calendarFragmentation: 35,
  recurringBurden: 0.3,
  asyncVolume: 200,
};

describe('P0: headline escalation must match observed, comparable periods', () => {
  test('a large messaging drop alone is not an employee-strain signal', () => {
    const result = calculateTeamStatus({
      currentMetrics: { ...baseline, asyncVolume: 20 },
      previousMetrics: baseline,
      weeklyHistory: [],
    });
    expect(result.deterioratingMetrics).not.toContain('asyncVolume');
    expect(result.status).toBe(STATUS_LEVELS.STABLE);
  });

  test('missing and non-finite measurements cannot be treated as deterioration', () => {
    const result = calculateTeamStatus({
      currentMetrics: { meetingHours: NaN, afterHoursRatio: Infinity, focusTimeAvailability: null },
      previousMetrics: baseline,
    });
    expect(result.deterioratingMetrics).toEqual([]);
    expect(result.status).toBe(STATUS_LEVELS.STABLE);
  });

  test('a missing calendar week breaks claimed persistence', () => {
    const current = { ...baseline, meetingHours: 33, backToBack: 8, afterHoursRatio: 0.14 };
    const previous = { ...baseline, meetingHours: 26, backToBack: 6, afterHoursRatio: 0.1 };
    const result = calculateTeamStatus({
      currentMetrics: current,
      previousMetrics: previous,
      weeklyHistory: [
        { ...current, weekStart: '2026-11-09T00:00:00Z' },
        { ...previous, weekStart: '2026-10-26T00:00:00Z' },
        { ...baseline, weekStart: '2026-10-19T00:00:00Z' },
      ],
    });
    expect(result.weeksPersisted).toBe(0);
    expect(result.reason).not.toMatch(/two consecutive weeks|for 2 consecutive weeks/i);
  });

  test('two actual adjacent measured weekly changes can establish persistence', () => {
    const current = { ...baseline, meetingHours: 36, backToBack: 9 };
    const previous = { ...baseline, meetingHours: 28, backToBack: 6 };
    const result = calculateTeamStatus({
      currentMetrics: current,
      previousMetrics: previous,
      weeklyHistory: [
        { ...current, weekStart: '2026-11-09T00:00:00Z' },
        { ...previous, weekStart: '2026-11-02T00:00:00Z' },
        { ...baseline, weekStart: '2026-10-26T00:00:00Z' },
      ],
    });
    expect(result.weeksPersisted).toBe(2);
  });

  test('BDI-only labels never override missing direct supporting evidence', () => {
    const result = calculateTeamStatus({
      currentMetrics: baseline,
      previousMetrics: baseline,
      bdiData: { driftState: 'Critical Drift', driftScore: 99 },
      weeklyHistory: [],
    });
    expect(result.status).toBe(STATUS_LEVELS.STABLE);
  });
});
