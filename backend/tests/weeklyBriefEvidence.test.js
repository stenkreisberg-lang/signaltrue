import { describe, expect, test } from '@jest/globals';
import {
  determineActionability,
  determineMetricReadiness,
  getForecastDisplayTier,
  validateWeeklyBriefConsistency,
} from '../services/weeklyBriefEvidenceService.js';

describe('metric-level evidence readiness', () => {
  test('blocks the anonymized 3-of-59, 3-message failure pattern', () => {
    expect(
      determineMetricReadiness({
        metric: 'after_hours_messaging',
        source: 'microsoft-teams',
        mappedUsers: 3,
        totalUsers: 59,
        eventCount: 3,
      })
    ).toMatchObject({
      coveragePct: 5.1,
      readiness: 'blocked',
      eligibleForStatus: false,
    });
  });

  test.each([
    [20, 100, 40, 'blocked'],
    [45, 100, 40, 'directional_only'],
    [70, 100, 40, 'usable_with_warning'],
    [85, 100, 40, 'usable'],
    [85, 100, 3, 'blocked_low_volume'],
    [85, 100, 20, 'directional_low_volume'],
  ])('maps %s/%s users and %s events to %s', (mappedUsers, totalUsers, eventCount, readiness) => {
    expect(
      determineMetricReadiness({
        metric: 'test',
        source: 'fixture',
        mappedUsers,
        totalUsers,
        eventCount,
      }).readiness
    ).toBe(readiness);
  });
});

describe('evidence-to-action gating', () => {
  test('never promotes Low or blocked evidence above a diagnostic question', () => {
    expect(
      determineActionability({
        evidence: 'Low',
        readiness: 'usable',
        persistence: 5,
        severity: 'Confirmed Drift',
      })
    ).toBe('diagnostic_question');
    expect(
      determineActionability({
        evidence: 'High',
        readiness: 'blocked',
        persistence: 5,
        severity: 'Confirmed Drift',
      })
    ).toBe('diagnostic_question');
  });

  test('requires persistence for experiments and interventions', () => {
    expect(
      determineActionability({
        evidence: 'Medium',
        readiness: 'usable',
        persistence: 1,
        severity: 'Watch',
      })
    ).toBe('diagnostic_question');
    expect(
      determineActionability({
        evidence: 'Medium',
        readiness: 'usable',
        persistence: 2,
        severity: 'Emerging Drift',
      })
    ).toBe('reversible_experiment');
    expect(
      determineActionability({
        evidence: 'High',
        readiness: 'usable',
        persistence: 2,
        severity: 'Confirmed Drift',
      })
    ).toBe('intervention');
    expect(
      determineActionability({
        evidence: 'High',
        readiness: 'usable',
        persistence: 4,
        severity: 'Stable',
      })
    ).toBe('no_action');
  });
});

describe('forecast quality tiers', () => {
  test.each([
    [5, 2, 'hidden'],
    [8, 7, 'experimental_appendix'],
    [12, 9, 'main_report'],
    [12, 8, 'experimental_appendix'],
  ])('grades %s predictions with %s matches as %s', (graded, matched, displayTier) => {
    expect(getForecastDisplayTier(graded, matched).displayTier).toBe(displayTier);
  });
});

describe('weekly brief consistency validation', () => {
  const usableReadiness = { readiness: 'usable', eligibleForStatus: true };
  const blockedReadiness = { readiness: 'blocked', eligibleForStatus: false };

  test.each([
    [
      'positive_percentage_with_zero_numerator',
      {
        metrics: [
          {
            key: 'after_hours',
            unit: '%',
            current: 20,
            numerator: 0,
            denominator: 10,
            available: true,
            readiness: usableReadiness,
          },
        ],
      },
    ],
    [
      'percentage_with_zero_denominator',
      {
        metrics: [
          {
            key: 'after_hours',
            unit: '%',
            current: 20,
            numerator: 1,
            denominator: 0,
            available: true,
            readiness: usableReadiness,
          },
        ],
      },
    ],
    [
      'no_data_with_positive_metric',
      {
        metrics: [
          {
            key: 'messages',
            unit: 'messages',
            current: 3,
            display: 'No data',
            available: true,
            readiness: usableReadiness,
          },
        ],
      },
    ],
    [
      'stable_with_critical_alert',
      { status: { label: 'Stable' }, metrics: [], signals: [{ severity: 'Critical' }] },
    ],
    [
      'low_evidence_high_effort_action',
      {
        status: { label: 'Watch', evidenceGrade: 'Low' },
        metrics: [],
        actions: {
          primary: { effort: 'High', evidenceGrade: 'Low', actionability: 'intervention' },
        },
      },
    ],
    [
      'blocked_metric_changed_status',
      {
        status: { label: 'Watch', deterioratingMetrics: ['afterHoursRatio'] },
        metrics: [
          {
            key: 'after_hours',
            statusKey: 'afterHoursRatio',
            readiness: blockedReadiness,
          },
        ],
      },
    ],
    [
      'stable_with_intervention',
      {
        status: { label: 'Stable', evidenceGrade: 'High' },
        metrics: [],
        actions: {
          primary: { effort: 'Low', evidenceGrade: 'High', actionability: 'intervention' },
        },
      },
    ],
    [
      'calculated_count_mismatch',
      {
        metrics: [
          {
            key: 'after_hours',
            unit: '%',
            current: 67,
            numerator: 1,
            denominator: 3,
            available: true,
            readiness: usableReadiness,
          },
        ],
      },
    ],
  ])('detects and suppresses %s', (code, input) => {
    const result = validateWeeklyBriefConsistency(input);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.code)).toContain(code);
  });

  test('does not calculate a percentage for a zero-denominator unavailable metric', () => {
    const result = validateWeeklyBriefConsistency({
      metrics: [
        {
          key: 'after_hours',
          unit: '%',
          current: null,
          numerator: 0,
          denominator: 0,
          display: 'No usable messaging observations this week.',
          available: false,
          readiness: { readiness: 'blocked_low_volume', eligibleForStatus: false },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });
});
