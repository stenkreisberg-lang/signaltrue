import { describe, expect, test } from '@jest/globals';
import { calculateOverallScore } from '../services/engagementScoringService.js';
import { calculateSubscores } from '../services/engagementSubscoreService.js';

describe('measurement integrity', () => {
  test('does not turn missing components into a plausible overall score', () => {
    expect(calculateOverallScore({})).toBeNull();
    expect(calculateOverallScore({ recoveryDebt: null, focusErosion: undefined })).toBeNull();
  });

  test('requires three components and reweights over measured components only', () => {
    expect(calculateOverallScore({ recoveryDebt: 80 })).toBeNull();
    expect(calculateOverallScore({ recoveryDebt: 80, focusErosion: 20 })).toBeNull();
    expect(
      calculateOverallScore({ recoveryDebt: 80, focusErosion: 20, coordinationFriction: 50 })
    ).toBe(51);
  });

  test('keeps metrics unavailable when values or baselines are absent', () => {
    const result = calculateSubscores(
      {
        afterHoursMessageRatio: 0.2,
        integrationCoverage: { hasCalendar: true, hasMessaging: true, hasEmail: true },
      },
      { metrics: {} }
    );

    expect(result.metricRisks.afterHoursMessageRatio).toMatchObject({
      score: null,
      z: null,
      unavailableReason: 'missing_baseline',
    });
    expect(result.metricRisks.meetingHoursPerPerson).toMatchObject({
      score: null,
      z: null,
      unavailableReason: 'missing_value',
    });
    expect(Object.values(result.subscores).every((value) => value === null)).toBe(true);
  });
});
