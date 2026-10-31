import { describe, test, expect } from '@jest/globals';
import { MIN_TEAM_SIZE, MIN_METRIC_CONTRIBUTORS, MIN_HEALTH_SAFETY_TEAM_SIZE,
  checkTeamSize, suppressMetricIfTooFew, shouldRollUpToDepartment } from '../utils/privacyGate.js';
import { validateWeeklyBriefConsistency } from '../services/weeklyBriefEvidenceService.js';

describe('privacy floor for team reporting', () => {
  test('team and per-metric reporting require at least eight people', () => {
    expect(MIN_TEAM_SIZE).toBe(8);
    expect(MIN_METRIC_CONTRIBUTORS).toBe(8);
    expect(MIN_HEALTH_SAFETY_TEAM_SIZE).toBe(8);
    expect(checkTeamSize(7)).toBe(false);
    expect(checkTeamSize(8)).toBe(true);
    expect(suppressMetricIfTooFew(7)).toBe(true);
    expect(suppressMetricIfTooFew(8)).toBe(false);
    expect(shouldRollUpToDepartment(5).rollUp).toBe(true);
  });
});

describe('invalid evidence cannot be represented as a reliable observation', () => {
  test('contradictory after-hours percentages fail validation', () => {
    const out = validateWeeklyBriefConsistency({ metrics: [{
      key: 'after_hours', available: true, unit: '%', current: 50,
      numerator: 0, denominator: 20,
      readiness: { readiness: 'usable', eligibleForStatus: true }
    }] });
    expect(out.valid).toBe(false);
    expect(out.diagnostics.map(x => x.code)).toContain('positive_percentage_with_zero_numerator');
  });
  test('missing measurements remain null instead of becoming zero', () => {
    const out = validateWeeklyBriefConsistency({ metrics: [{
      key: 'after_hours', available: false, unit: '%', current: null,
      numerator: 0, denominator: 0,
      readiness: { readiness: 'blocked', eligibleForStatus: false }
    }] });
    expect(out.valid).toBe(true);
    expect(out.brief.metrics[0].current).toBeNull();
  });
});
