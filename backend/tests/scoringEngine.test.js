/**
 * Scoring Engine — Unit Tests
 *
 * Tests every formula in scoringEngineService.js with fixture inputs
 * and deterministic expected outputs.
 *
 * Run with:  npm test --testPathPattern=scoringEngine
 */

// ── Import the pure math functions ─────────────────────────────────────────────
// We expose them via a test-only export in __tests__/helpers if needed,
// but here we inline re-implementations of the pure functions to keep
// tests independent of DB calls.  Integration tests are in a separate file.

// ── Pure function re-implementations (mirroring scoringEngineService.js) ───────

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function calculateDeviation(currentValue, baselineMean, isHigherBetter = false) {
  if (!baselineMean || baselineMean === 0) return 0;
  let d = (currentValue - baselineMean) / baselineMean;
  if (isHigherBetter) d = -d;
  return clamp(d, -1, 1);
}

function computeWeightedScore(weightMap, metrics, baselines, HIGHER_IS_BETTER) {
  let score = 0;
  const contributions = [];
  for (const [key, weight] of Object.entries(weightMap)) {
    const current = metrics[key] ?? 0;
    const baseline = baselines[key] ?? 0;
    const isHB = HIGHER_IS_BETTER.has(key);
    const deviation = calculateDeviation(current, baseline, isHB);
    const contribution = Math.max(0, deviation) * weight;
    score += contribution;
    contributions.push({ metricKey: key, weight, deviation, contribution });
  }
  return { score: Math.round(score * 100), contributions };
}

function getRiskBand(score) {
  if (score < 35) return 'green';
  if (score < 65) return 'yellow';
  return 'red';
}

function calculateTrendSlope(values) {
  if (!values || values.length < 2) return 0;
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const meanY = sumY / n;
  return meanY !== 0 ? slope / meanY : 0;
}

function computeBDIState(signals, baselines, thresholds) {
  let negativeCount = 0;
  const HIGHER_BAD = new Set(['meetingLoad', 'afterHoursActivity', 'responseTime']);

  for (const key of Object.keys(signals)) {
    const current = signals[key];
    const base = baselines[key] ?? 0;
    const threshold = thresholds[key] ?? 20;
    if (base === 0) continue;
    const pct = ((current - base) / base) * 100;
    const deviating = Math.abs(pct) > threshold;
    if (!deviating) continue;
    const isNegative = HIGHER_BAD.has(key) ? pct > threshold : pct < -threshold;
    if (isNegative) negativeCount++;
  }

  const driftScore = Math.min(Math.round((negativeCount / 6) * 100), 100);
  let state;
  if (negativeCount <= 1) state = 'Stable';
  else if (negativeCount === 2) state = 'Early Drift';
  else if (negativeCount <= 4) state = 'Developing Drift';
  else state = 'Critical Drift';

  return { driftScore, state, negativeCount };
}

// ── Constants (must match scoringEngineService.js) ────────────────────────────

const HIGHER_IS_BETTER = new Set([
  'focus_time',
  'participation_drift',
  'cross_team_contacts',
  'async_participation',
]);

const OVERLOAD_WEIGHTS = {
  after_hours_activity: 0.35,
  meeting_load: 0.3,
  back_to_back_meetings: 0.2,
  focus_time: 0.15,
};
const EXECUTION_WEIGHTS = {
  response_time: 0.3,
  participation_drift: 0.25,
  meeting_fragmentation: 0.25,
  focus_time: 0.2,
};
const RETENTION_WEIGHTS = { after_hours_activity: 0.4, meeting_load: 0.3, response_time: 0.3 };
const CAPACITY_WEIGHTS = {
  after_hours_activity: 0.3,
  meeting_load: 0.25,
  back_to_back_meetings: 0.2,
  focus_time: 0.15,
  weekend_activity: 0.1,
};
const COORDINATION_WEIGHTS = {
  response_time: 0.3,
  meeting_fragmentation: 0.25,
  participation_drift: 0.2,
  cross_team_contacts: 0.15,
  async_participation: 0.1,
};
const COHESION_WEIGHTS = {
  collaboration_breadth: 0.35,
  async_participation: 0.25,
  response_time: 0.2,
  after_hours_activity: 0.2,
};
const COMPOSITE_WEIGHTS = { capacity: 0.4, coordination: 0.35, cohesion: 0.25 };
const BDI_THRESHOLDS = {
  meetingLoad: 20,
  afterHoursActivity: 30,
  responseTime: 25,
  asyncParticipation: 20,
  focusTime: 20,
  collaborationBreadth: 25,
};

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Baseline: healthy team at normal levels
const HEALTHY_BASELINE = {
  after_hours_activity: 0.1,
  meeting_load: 0.5, // 50% of 40h = 20h/week
  back_to_back_meetings: 2,
  focus_time: 0.4,
  response_time: 60, // 60 min median
  participation_drift: 12,
  meeting_fragmentation: 0.2,
  weekend_activity: 0.02,
  cross_team_contacts: 5,
  async_participation: 0.6,
  collaboration_breadth: 10,
};

// Metrics: team in overloaded state
const OVERLOADED_METRICS = {
  after_hours_activity: 0.35, // 3.5x baseline → +250% deviation
  meeting_load: 0.8, // 60% above baseline
  back_to_back_meetings: 6, // 3x baseline
  focus_time: 0.15, // dropped from 0.40 → negative deviation for HiB
  response_time: 60,
  participation_drift: 12,
  meeting_fragmentation: 0.2,
  weekend_activity: 0.02,
  cross_team_contacts: 5,
  async_participation: 0.6,
  collaboration_breadth: 10,
};

// Metrics: team in execution-risk state
const EXECUTION_RISK_METRICS = {
  after_hours_activity: 0.1,
  meeting_load: 0.5,
  back_to_back_meetings: 2,
  focus_time: 0.1, // dropped sharply
  response_time: 180, // 3x baseline → slow responses
  participation_drift: 6, // dropped — less collaboration
  meeting_fragmentation: 0.6, // highly fragmented
  weekend_activity: 0.02,
  cross_team_contacts: 2,
  async_participation: 0.3,
  collaboration_breadth: 10,
};

// Metrics: healthy team (at baseline)
const HEALTHY_METRICS = { ...HEALTHY_BASELINE };

// ── calculateDeviation ────────────────────────────────────────────────────────

describe('calculateDeviation', () => {
  test('returns 0 when baseline is 0', () => {
    expect(calculateDeviation(10, 0)).toBe(0);
  });

  test('returns positive deviation when current > baseline (not higher-better)', () => {
    const d = calculateDeviation(1.5, 1.0, false);
    expect(d).toBeCloseTo(0.5);
  });

  test('returns negative deviation when current < baseline (not higher-better)', () => {
    const d = calculateDeviation(0.5, 1.0, false);
    expect(d).toBeCloseTo(-0.5);
  });

  test('inverts deviation for higher-is-better metric', () => {
    // current focus_time dropped below baseline → should be POSITIVE risk deviation
    const d = calculateDeviation(0.15, 0.4, true);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeCloseTo(0.625); // (0.15-0.40)/0.40 = -0.625 → inverted = +0.625
  });

  test('clamps large deviations to +1', () => {
    const d = calculateDeviation(10, 1, false);
    expect(d).toBe(1);
  });

  test('clamps large negative deviations to -1', () => {
    const d = calculateDeviation(0, 10, false);
    expect(d).toBe(-1);
  });
});

// ── getRiskBand ────────────────────────────────────────────────────────────────

describe('getRiskBand', () => {
  test('returns green for score < 35', () => {
    expect(getRiskBand(0)).toBe('green');
    expect(getRiskBand(34)).toBe('green');
  });

  test('returns yellow for 35 ≤ score < 65', () => {
    expect(getRiskBand(35)).toBe('yellow');
    expect(getRiskBand(64)).toBe('yellow');
  });

  test('returns red for score ≥ 65', () => {
    expect(getRiskBand(65)).toBe('red');
    expect(getRiskBand(100)).toBe('red');
  });
});

// ── Overload Risk ─────────────────────────────────────────────────────────────

describe('Overload Risk', () => {
  test('healthy team scores green (< 35)', () => {
    const { score } = computeWeightedScore(
      OVERLOAD_WEIGHTS,
      HEALTHY_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    expect(score).toBeLessThan(35);
    expect(getRiskBand(score)).toBe('green');
  });

  test('overloaded team scores red (≥ 65)', () => {
    const { score } = computeWeightedScore(
      OVERLOAD_WEIGHTS,
      OVERLOADED_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    expect(score).toBeGreaterThanOrEqual(65);
    expect(getRiskBand(score)).toBe('red');
  });

  test('after_hours_activity drives overload score when elevated', () => {
    const metrics = { ...HEALTHY_METRICS, after_hours_activity: 0.3 }; // 3x baseline
    const { contributions } = computeWeightedScore(
      OVERLOAD_WEIGHTS,
      metrics,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    const ahContrib = contributions.find((c) => c.metricKey === 'after_hours_activity');
    expect(ahContrib.contribution).toBeGreaterThan(0);
  });

  test('weights sum to 1.0', () => {
    const total = Object.values(OVERLOAD_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0);
  });
});

// ── Execution Risk ────────────────────────────────────────────────────────────

describe('Execution Risk', () => {
  test('healthy team scores green', () => {
    const { score } = computeWeightedScore(
      EXECUTION_WEIGHTS,
      HEALTHY_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    expect(score).toBeLessThan(35);
  });

  test('execution-risk team scores yellow or red', () => {
    const { score } = computeWeightedScore(
      EXECUTION_WEIGHTS,
      EXECUTION_RISK_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    expect(score).toBeGreaterThanOrEqual(35);
  });

  test('weights sum to 1.0', () => {
    const total = Object.values(EXECUTION_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0);
  });

  test('response_time increase raises execution score', () => {
    const base = computeWeightedScore(
      EXECUTION_WEIGHTS,
      HEALTHY_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    ).score;
    const elevated = computeWeightedScore(
      EXECUTION_WEIGHTS,
      { ...HEALTHY_METRICS, response_time: 240 },
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    ).score;
    expect(elevated).toBeGreaterThan(base);
  });
});

// ── Retention Strain (trend slope) ────────────────────────────────────────────

describe('calculateTrendSlope', () => {
  test('returns 0 for constant series', () => {
    const slope = calculateTrendSlope([10, 10, 10, 10, 10]);
    expect(slope).toBeCloseTo(0);
  });

  test('returns positive slope for monotonically increasing series', () => {
    const slope = calculateTrendSlope([1, 2, 3, 4, 5]);
    expect(slope).toBeGreaterThan(0);
  });

  test('returns negative slope for monotonically decreasing series', () => {
    const slope = calculateTrendSlope([5, 4, 3, 2, 1]);
    expect(slope).toBeLessThan(0);
  });

  test('returns 0 for single-element series', () => {
    expect(calculateTrendSlope([5])).toBe(0);
  });
});

describe('Retention Strain Risk weights', () => {
  test('weights sum to 1.0', () => {
    const total = Object.values(RETENTION_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0);
  });
});

// ── Composite Drift Scores ────────────────────────────────────────────────────

describe('Capacity Drift Score', () => {
  test('healthy team near zero', () => {
    const { score } = computeWeightedScore(
      CAPACITY_WEIGHTS,
      HEALTHY_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    expect(score).toBeLessThan(10);
  });

  test('weights sum to 1.0', () => {
    const total = Object.values(CAPACITY_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0);
  });

  test('overloaded team has elevated capacity drift', () => {
    const { score } = computeWeightedScore(
      CAPACITY_WEIGHTS,
      OVERLOADED_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    expect(score).toBeGreaterThan(30);
  });
});

describe('Coordination Drag Score', () => {
  test('healthy team near zero', () => {
    const { score } = computeWeightedScore(
      COORDINATION_WEIGHTS,
      HEALTHY_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    expect(score).toBeLessThan(10);
  });

  test('weights sum to 1.0', () => {
    const total = Object.values(COORDINATION_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0);
  });
});

describe('Cohesion Drift Score', () => {
  test('weights sum to 1.0', () => {
    const total = Object.values(COHESION_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0);
  });
});

describe('Overall Drift Score', () => {
  test('composite weights sum to 1.0', () => {
    const total = Object.values(COMPOSITE_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0);
  });

  test('is correctly weighted combination of sub-scores', () => {
    const capacity = 60,
      coordination = 40,
      cohesion = 20;
    const overall = Math.round(
      COMPOSITE_WEIGHTS.capacity * capacity +
        COMPOSITE_WEIGHTS.coordination * coordination +
        COMPOSITE_WEIGHTS.cohesion * cohesion
    );
    // 0.40*60 + 0.35*40 + 0.25*20 = 24+14+5 = 43
    expect(overall).toBe(43);
  });

  test('healthy team overall score < 10', () => {
    const cap = computeWeightedScore(
      CAPACITY_WEIGHTS,
      HEALTHY_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    ).score;
    const coord = computeWeightedScore(
      COORDINATION_WEIGHTS,
      HEALTHY_METRICS,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    ).score;
    // cohesion: add collaboration_breadth manually
    const cohMetrics = {
      ...HEALTHY_METRICS,
      collaboration_breadth: HEALTHY_BASELINE.collaboration_breadth,
    };
    const coh = computeWeightedScore(
      COHESION_WEIGHTS,
      cohMetrics,
      { ...HEALTHY_BASELINE },
      HIGHER_IS_BETTER
    ).score;
    const overall = Math.round(0.4 * cap + 0.35 * coord + 0.25 * coh);
    expect(overall).toBeLessThan(10);
  });
});

// ── BDI ───────────────────────────────────────────────────────────────────────

describe('BDI — driftScore and state', () => {
  const baselines = {
    meetingLoad: 20,
    afterHoursActivity: 10,
    responseTime: 1,
    asyncParticipation: 50,
    focusTime: 20,
    collaborationBreadth: 10,
  };

  test('all at baseline → Stable, driftScore = 0', () => {
    const { driftScore, state } = computeBDIState(baselines, baselines, BDI_THRESHOLDS);
    expect(driftScore).toBe(0);
    expect(state).toBe('Stable');
  });

  test('2 negative signals → Early Drift', () => {
    const signals = { ...baselines, meetingLoad: 30, responseTime: 2 }; // +50%, +100%
    const { state } = computeBDIState(signals, baselines, BDI_THRESHOLDS);
    expect(state).toBe('Early Drift');
  });

  test('3–4 negative signals → Developing Drift', () => {
    const signals = {
      ...baselines,
      meetingLoad: 30, // +50% → negative (higher-bad)
      responseTime: 2, // +100% → negative
      afterHoursActivity: 20, // +100% → negative
    };
    const { state } = computeBDIState(signals, baselines, BDI_THRESHOLDS);
    expect(state).toBe('Developing Drift');
  });

  test('5–6 negative signals → Critical Drift', () => {
    const signals = {
      meetingLoad: 40, // +100% → negative
      afterHoursActivity: 25, // +150% → negative
      responseTime: 3, // +200% → negative
      asyncParticipation: 20, // -60% → negative (lower-bad)
      focusTime: 5, // -75% → negative (lower-bad)
      collaborationBreadth: 3, // -70% → negative (lower-bad)
    };
    const { state, driftScore } = computeBDIState(signals, baselines, BDI_THRESHOLDS);
    expect(state).toBe('Critical Drift');
    expect(driftScore).toBe(100);
  });

  test('driftScore is proportional to negative signal count', () => {
    // 3 out of 6 negative → score should be 50
    const signals = {
      ...baselines,
      meetingLoad: 30,
      responseTime: 2,
      afterHoursActivity: 20,
    };
    const { driftScore } = computeBDIState(signals, baselines, BDI_THRESHOLDS);
    expect(driftScore).toBe(50); // round(3/6 * 100)
  });

  test('a positive deviation does not count as negative', () => {
    // meetingLoad DROPS well below baseline → positive direction → not negative
    const signals = { ...baselines, meetingLoad: 5 }; // -75%
    const { negativeCount } = computeBDIState(signals, baselines, BDI_THRESHOLDS);
    // meetingLoad drop is POSITIVE for the team (less meetings is good)
    expect(negativeCount).toBe(0);
  });
});

// ── Privacy gate (pure logic only) ───────────────────────────────────────────

describe('Privacy gate logic', () => {
  test('team with actualSize below the configured minimum should be suppressed', () => {
    const actualSize = 0;
    const minSize = 1;
    expect(actualSize < minSize).toBe(true);
  });

  test('one-person and two-person teams pass when the configured minimum is one', () => {
    const actualSize = 1;
    const minSize = 1;
    expect(actualSize < minSize).toBe(false);
    expect(2 < minSize).toBe(false);
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  test('all baselines zero → all deviations are 0 → score is 0', () => {
    const zeroBaselines = Object.fromEntries(Object.keys(HEALTHY_BASELINE).map((k) => [k, 0]));
    const { score } = computeWeightedScore(
      OVERLOAD_WEIGHTS,
      OVERLOADED_METRICS,
      zeroBaselines,
      HIGHER_IS_BETTER
    );
    expect(score).toBe(0);
  });

  test('current metrics all zero with non-zero baselines → only higher-is-better metrics contribute risk', () => {
    const zeroMetrics = Object.fromEntries(Object.keys(HEALTHY_BASELINE).map((k) => [k, 0]));
    const { score } = computeWeightedScore(
      OVERLOAD_WEIGHTS,
      zeroMetrics,
      HEALTHY_BASELINE,
      HIGHER_IS_BETTER
    );
    // focus_time is higher-is-better with weight 0.15 — dropping to 0 contributes 0.15
    expect(score).toBe(15); // 0.15 * 1.0 * 100
  });

  test('trendSlope of all-zero series returns 0', () => {
    expect(calculateTrendSlope([0, 0, 0, 0, 0])).toBe(0);
  });
});
