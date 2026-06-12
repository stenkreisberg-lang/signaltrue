/**
 * Scoring Engine Service
 *
 * Single authoritative source for ALL score computation in SignalTrue.
 * Replaces fragmented calls scattered across bdiService.js,
 * riskCalculationService.js, and ad-hoc helpers.
 *
 * Systems implemented:
 *   A) BDI (Behavioral Drift Index) — 6-signal count model
 *   B) Risk Scores — overload / execution / retention_strain
 *   C) Composite Drift — Capacity / Coordination / Cohesion / Overall
 *
 * Every run:
 *   1. Checks the privacy gate (team size ≥ min)
 *   2. Fetches inputs (MetricsDaily, Baseline)
 *   3. Runs all three score systems
 *   4. Writes results to DB
 *   5. Writes a ScoringAuditLog entry
 *   6. Returns a ScoringResult object
 */

import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import RiskWeekly from '../models/riskWeekly.js';
import RiskDriver from '../models/riskDriver.js';
import MetricsDaily from '../models/metricsDaily.js';
import Baseline from '../models/baseline.js';
import Team from '../models/team.js';
import ScoringAuditLog from '../models/scoringAuditLog.js';
import TeamSizeGate from '../models/teamSizeGate.js';
import { MIN_TEAM_SIZE, resolveMinimumTeamSize } from '../utils/privacyGate.js';
import DriftTimeline from '../models/driftTimeline.js';

// ── Version ────────────────────────────────────────────────────────────────────

export const SCORING_VERSION = '1.0.0';

// ── Metric field mapping ───────────────────────────────────────────────────────
// Maps logical metric keys → MetricsDaily field names

const METRIC_FIELD_MAP = {
  after_hours_activity: 'afterHoursRate',
  meeting_load: 'meetingLoadIndex',
  back_to_back_meetings: 'backToBackBlocks',
  focus_time: 'focusTimeRatio',
  response_time: 'responseMedianMins',
  participation_drift: 'uniqueContacts',
  meeting_fragmentation: 'meetingFragmentScore',
  weekend_activity: 'weekendActivityRate',
  cross_team_contacts: 'crossTeamContacts',
  async_participation: 'asyncParticipationIdx',
};

// Metrics where a higher value is BETTER (loss of focus = more risk)
const HIGHER_IS_BETTER = new Set([
  'focus_time',
  'participation_drift',
  'cross_team_contacts',
  'async_participation',
]);

// ── Weight definitions (change only here — audit log snapshots them) ───────────

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

const RETENTION_WEIGHTS = {
  after_hours_activity: 0.4,
  meeting_load: 0.3,
  response_time: 0.3,
};

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
  collaboration_breadth: 0.35, // handled via BDI signals
  async_participation: 0.25,
  response_time: 0.2,
  after_hours_activity: 0.2,
};

const COMPOSITE_WEIGHTS = {
  capacity: 0.4,
  coordination: 0.35,
  cohesion: 0.25,
};

const BDI_THRESHOLDS = {
  meetingLoad: 20,
  afterHoursActivity: 30,
  responseTime: 25,
  asyncParticipation: 20,
  focusTime: 20,
  collaborationBreadth: 25,
};

const DEFAULT_MIN_TEAM_SIZE = MIN_TEAM_SIZE;

// ── Custom error class ─────────────────────────────────────────────────────────

export class ScoringError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.name = 'ScoringError';
    this.code = code;
    this.meta = meta;
  }
}

// ── Privacy gate ───────────────────────────────────────────────────────────────

async function runPrivacyGate(teamId, orgId) {
  try {
    const [team, minSize] = await Promise.all([
      Team.findById(teamId).select('metadata.actualSize').lean(),
      resolveMinimumTeamSize(orgId),
    ]);

    const actualSize = team?.metadata?.actualSize ?? 0;

    if (actualSize < minSize) {
      // Log suppression event
      TeamSizeGate.create({
        teamId,
        orgId,
        endpoint: 'scoringEngine',
        reportedSize: actualSize,
        minRequired: minSize,
        reason: 'insufficient_sample',
      }).catch(() => {});

      Team.findByIdAndUpdate(teamId, {
        analyticsEnabled: false,
        privacyGateFiredAt: new Date(),
      }).catch(() => {});

      return { passed: false, reason: 'insufficient_sample', actualSize, minRequired: minSize };
    }

    return { passed: true, actualSize, minRequired: minSize };
  } catch (err) {
    console.error('[scoringEngine] privacyGate error:', err.message);
    return { passed: true, actualSize: 0, minRequired: DEFAULT_MIN_TEAM_SIZE }; // fail open
  }
}

// ── Data fetching ──────────────────────────────────────────────────────────────

/**
 * Fetch average metric values for a team over the last 7 days.
 */
async function fetchCurrentMetrics(teamId) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const rows = await MetricsDaily.find({
    teamId,
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const metrics = {};
  for (const [key, field] of Object.entries(METRIC_FIELD_MAP)) {
    const values = rows.map((r) => r[field]).filter((v) => v != null && !isNaN(v));
    metrics[key] = values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : 0;
  }

  return metrics;
}

/**
 * Fetch baseline means for a team.
 */
async function fetchBaselines(teamId) {
  const baseline = await Baseline.findOne({ teamId }).lean();
  const baselines = {};
  for (const key of Object.keys(METRIC_FIELD_MAP)) {
    baselines[key] = baseline?.metrics?.[key]?.mean ?? 0;
  }
  return baselines;
}

/**
 * Fetch 21 days of MetricsDaily for retention strain trend.
 */
async function fetchMetricsHistory(teamId) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 21);
  return MetricsDaily.find({
    teamId,
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1 })
    .lean();
}

// ── Core math ──────────────────────────────────────────────────────────────────

/**
 * Calculate normalised deviation, clamped to [-1, +1].
 * For metrics where higher is better, the deviation is inverted
 * so a drop in the metric produces a positive (risk) value.
 */
function calculateDeviation(currentValue, baselineMean, isHigherBetter = false) {
  if (!baselineMean || baselineMean === 0) return 0;
  let d = (currentValue - baselineMean) / baselineMean;
  if (isHigherBetter) d = -d;
  return Math.max(-1, Math.min(1, d));
}

/**
 * Calculate the normalised linear-regression slope over an array of values.
 * Used for retention strain trend detection.
 */
function calculateTrendSlope(history, metricKey) {
  if (!history || history.length < 2) return 0;
  const field = METRIC_FIELD_MAP[metricKey];
  if (!field) return 0;

  const y = history.map((r) => r[field] ?? 0);
  const n = y.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
  const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);
  const meanY = sumY / n;
  return meanY !== 0 ? slope / meanY : 0;
}

function getRiskBand(score) {
  if (score < 35) return 'green';
  if (score < 65) return 'yellow';
  return 'red';
}

function determineConfidence(baselines) {
  const keys = Object.keys(METRIC_FIELD_MAP);
  const covered = keys.filter((k) => (baselines[k] ?? 0) > 0).length;
  const ratio = covered / keys.length;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

/**
 * Compute a weighted deviation score from a weights map.
 * Returns { score (0-100), contributions [{metricKey, weight, deviation, contribution}] }
 */
function computeWeightedScore(weightMap, metrics, baselines) {
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

/**
 * Compute a weighted trend-slope score (retention strain).
 */
function computeTrendScore(weightMap, history, baselines) {
  let score = 0;
  const contributions = [];

  for (const [key, weight] of Object.entries(weightMap)) {
    const slope = calculateTrendSlope(history, key);
    const contribution = Math.max(0, slope) * weight;
    score += contribution;
    contributions.push({ metricKey: key, weight, deviation: slope, contribution });
  }

  return { score: Math.round(score * 100), contributions };
}

// ── Score system A: Risk scores ────────────────────────────────────────────────

async function computeOverloadRisk(teamId, weekStart, metrics, baselines) {
  const { score, contributions } = computeWeightedScore(OVERLOAD_WEIGHTS, metrics, baselines);
  const band = getRiskBand(score);
  const confidence = determineConfidence(baselines);

  const drivers = contributions
    .filter((c) => c.deviation > 0.1)
    .map((c) => ({
      teamId,
      weekStart,
      riskType: 'overload',
      metricKey: c.metricKey,
      contributionWeight: c.weight,
      deviation: c.deviation,
      explanationText: buildDeviationText(c.metricKey, c.deviation),
    }));

  const risk = await RiskWeekly.findOneAndUpdate(
    { teamId, weekStart, riskType: 'overload' },
    {
      score,
      band,
      confidence,
      explanation: buildRiskExplanation('overload', score, band),
      inputSnapshot: {
        metrics: Object.fromEntries(
          Object.entries(metrics).filter(([k]) => OVERLOAD_WEIGHTS[k] !== undefined)
        ),
        baselines,
      },
      contributions,
      scoringVersion: SCORING_VERSION,
    },
    { upsert: true, new: true }
  );

  await RiskDriver.deleteMany({ teamId, weekStart, riskType: 'overload' });
  if (drivers.length > 0) await RiskDriver.insertMany(drivers);

  return { score, band, confidence, drivers };
}

async function computeExecutionRisk(teamId, weekStart, metrics, baselines) {
  const { score, contributions } = computeWeightedScore(EXECUTION_WEIGHTS, metrics, baselines);
  const band = getRiskBand(score);
  const confidence = determineConfidence(baselines);

  const drivers = contributions
    .filter((c) => c.deviation > 0.1)
    .map((c) => ({
      teamId,
      weekStart,
      riskType: 'execution',
      metricKey: c.metricKey,
      contributionWeight: c.weight,
      deviation: c.deviation,
      explanationText: buildDeviationText(c.metricKey, c.deviation),
    }));

  const risk = await RiskWeekly.findOneAndUpdate(
    { teamId, weekStart, riskType: 'execution' },
    {
      score,
      band,
      confidence,
      explanation: buildRiskExplanation('execution', score, band),
      inputSnapshot: {
        metrics: Object.fromEntries(
          Object.entries(metrics).filter(([k]) => EXECUTION_WEIGHTS[k] !== undefined)
        ),
        baselines,
      },
      contributions,
      scoringVersion: SCORING_VERSION,
    },
    { upsert: true, new: true }
  );

  await RiskDriver.deleteMany({ teamId, weekStart, riskType: 'execution' });
  if (drivers.length > 0) await RiskDriver.insertMany(drivers);

  return { score, band, confidence, drivers };
}

async function computeRetentionStrainRisk(teamId, weekStart, history, baselines) {
  const { score, contributions } = computeTrendScore(RETENTION_WEIGHTS, history, baselines);
  const band = getRiskBand(score);
  const confidence = determineConfidence(baselines);

  const drivers = contributions
    .filter((c) => c.deviation > 0.1)
    .map((c) => ({
      teamId,
      weekStart,
      riskType: 'retention_strain',
      metricKey: c.metricKey,
      contributionWeight: c.weight,
      deviation: c.deviation,
      explanationText: buildTrendText(c.metricKey, c.deviation),
    }));

  const risk = await RiskWeekly.findOneAndUpdate(
    { teamId, weekStart, riskType: 'retention_strain' },
    {
      score,
      band,
      confidence,
      explanation: buildRiskExplanation('retention_strain', score, band),
      contributions,
      scoringVersion: SCORING_VERSION,
    },
    { upsert: true, new: true }
  );

  await RiskDriver.deleteMany({ teamId, weekStart, riskType: 'retention_strain' });
  if (drivers.length > 0) await RiskDriver.insertMany(drivers);

  return { score, band, confidence, drivers };
}

// ── Score system B: Composite drift ───────────────────────────────────────────

function computeCapacityDrift(metrics, baselines) {
  const { score, contributions } = computeWeightedScore(CAPACITY_WEIGHTS, metrics, baselines);
  return { score, contributions };
}

function computeCoordinationDrag(metrics, baselines) {
  const { score, contributions } = computeWeightedScore(COORDINATION_WEIGHTS, metrics, baselines);
  return { score, contributions };
}

function computeCohesionDrift(
  metrics,
  baselines,
  collaborationBreadthValue,
  collaborationBreadthBaseline
) {
  // For cohesion we inline collaboration_breadth (from BDI signals) plus metric-based inputs
  const cohesionMetrics = { ...metrics };
  const cohesionBaselines = { ...baselines };

  // Map collaboration_breadth from BDI signal into the metric space
  cohesionMetrics['collaboration_breadth'] = collaborationBreadthValue ?? 0;
  cohesionBaselines['collaboration_breadth'] = collaborationBreadthBaseline ?? 0;

  const { score, contributions } = computeWeightedScore(
    COHESION_WEIGHTS,
    cohesionMetrics,
    cohesionBaselines
  );
  return { score, contributions };
}

function computeOverallDrift(capacityScore, coordinationScore, cohesionScore) {
  return Math.round(
    COMPOSITE_WEIGHTS.capacity * capacityScore +
      COMPOSITE_WEIGHTS.coordination * coordinationScore +
      COMPOSITE_WEIGHTS.cohesion * cohesionScore
  );
}

// ── Score system A: BDI ────────────────────────────────────────────────────────

async function computeBDI(teamId, orgId, weekStart, metrics, baselines) {
  const team = await Team.findById(teamId).lean();
  if (!team) throw new ScoringError('TEAM_NOT_FOUND', `Team ${teamId} not found`);

  // Resolve baseline from BDI-specific fields (mapped from MetricsDaily)
  const bdiBaseline = {
    meetingLoad: baselines['meeting_load'] ?? team.calendarSignals?.meetingHoursWeek ?? 0,
    afterHoursActivity: baselines['after_hours_activity'] ?? 0,
    responseTime: baselines['response_time'] ?? 0,
    asyncParticipation: baselines['async_participation'] ?? metrics['async_participation'] ?? 0,
    focusTime: baselines['focus_time'] ?? 0,
    collaborationBreadth: baselines['participation_drift'] ?? 0,
    establishedDate: new Date(),
    sampleSize: 30,
  };

  const currentSignals = {
    meetingLoad: metrics['meeting_load'] ?? 0,
    afterHoursActivity: metrics['after_hours_activity'] * 100 ?? 0, // convert ratio → %
    responseTime: metrics['response_time'] ?? 0,
    asyncParticipation: metrics['async_participation'] ?? 0,
    focusTime: metrics['focus_time'] * 40 ?? 0, // ratio → hours (assume 40h week)
    collaborationBreadth: metrics['participation_drift'] ?? 0,
  };

  const signalKeys = Object.keys(currentSignals);
  let deviatingCount = 0;
  let negativeCount = 0;
  const processedSignals = {};
  const driverList = [];

  for (const key of signalKeys) {
    const current = currentSignals[key];
    const base = bdiBaseline[key] ?? 0;
    const threshold = BDI_THRESHOLDS[key] ?? 20;

    const pct = base !== 0 ? ((current - base) / base) * 100 : 0;
    const deviating = Math.abs(pct) > threshold;

    // Determine direction (negative = bad for the team)
    const isHigherBad = ['meetingLoad', 'afterHoursActivity', 'responseTime'].includes(key);
    let direction = 'neutral';
    if (deviating) {
      direction = isHigherBad
        ? pct > threshold
          ? 'negative'
          : 'positive'
        : pct < -threshold
          ? 'negative'
          : 'positive';
    }

    if (deviating) deviatingCount++;
    if (direction === 'negative') negativeCount++;

    processedSignals[key] = { value: current, deviating, direction };

    if (deviating) {
      driverList.push({
        signal: key,
        contribution: Math.abs(pct),
        currentValue: current,
        baselineValue: base,
        change: `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
      });
    }
  }

  const topDrivers = driverList.sort((a, b) => b.contribution - a.contribution).slice(0, 3);

  const driftScore = Math.min(Math.round((negativeCount / 6) * 100), 100);

  const stateMap = [
    [0, 'Stable'],
    [1, 'Stable'],
    [2, 'Early Drift'],
    [3, 'Developing Drift'],
    [4, 'Developing Drift'],
    [5, 'Critical Drift'],
    [6, 'Critical Drift'],
  ];
  const state = (stateMap[negativeCount] ?? stateMap[6])[1];

  const summary = buildBDISummary(state, topDrivers);

  const periodEnd = new Date(weekStart);
  periodEnd.setDate(periodEnd.getDate() + 7);

  const bdi = await BehavioralDriftIndex.findOneAndUpdate(
    { teamId, periodStart: weekStart },
    {
      orgId,
      periodEnd,
      signals: processedSignals,
      state,
      driftScore,
      deviatingSignalsCount: deviatingCount,
      negativeSignalsCount: negativeCount,
      topDrivers,
      summary,
      baseline: bdiBaseline,
      scoringVersion: SCORING_VERSION,
    },
    { upsert: true, new: true }
  );

  // Update team's bdi field
  await Team.findByIdAndUpdate(teamId, { bdi: driftScore });

  // Update drift timeline
  updateDriftTimeline(teamId, state).catch(() => {});

  return { driftScore, state, topDrivers, negativeCount, deviatingCount, bdiId: bdi._id };
}

async function updateDriftTimeline(teamId, newState) {
  try {
    const timeline = await DriftTimeline.findOne({ teamId, resolvedAt: null });
    if (!timeline) {
      if (newState !== 'Stable') {
        await DriftTimeline.create({ teamId, startState: newState, currentState: newState });
      }
    } else {
      timeline.currentState = newState;
      if (newState === 'Stable') timeline.resolvedAt = new Date();
      await timeline.save();
    }
  } catch (err) {
    console.error('[scoringEngine] DriftTimeline update error:', err.message);
  }
}

// ── Team state ─────────────────────────────────────────────────────────────────

async function determineTeamState(
  teamId,
  weekStart,
  overloadScore,
  executionScore,
  retentionScore
) {
  // Check for 'breaking' — execution risk ≥ 65 for 2+ consecutive weeks
  const recentHigh = await RiskWeekly.find({
    teamId,
    riskType: 'execution',
    weekStart: { $lte: weekStart },
    score: { $gte: 65 },
  })
    .sort({ weekStart: -1 })
    .limit(2)
    .lean();

  if (recentHigh.length >= 2) return 'breaking';
  if (overloadScore >= 65) return 'overloaded';
  if (overloadScore >= 35 || executionScore >= 35 || retentionScore >= 35) return 'strained';
  return 'healthy';
}

// ── Text helpers ───────────────────────────────────────────────────────────────

function buildDeviationText(metricKey, deviation) {
  const pct = Math.round(deviation * 100);
  const labels = {
    after_hours_activity: 'After-hours activity',
    meeting_load: 'Meeting load',
    back_to_back_meetings: 'Back-to-back meeting blocks',
    focus_time: 'Focus time',
    response_time: 'Response time',
    participation_drift: 'Collaboration breadth',
    meeting_fragmentation: 'Calendar fragmentation',
    weekend_activity: 'Weekend activity',
    cross_team_contacts: 'Cross-team collaboration',
    async_participation: 'Async participation',
  };
  return `${labels[metricKey] || metricKey} deviating by ${pct}% from baseline.`;
}

function buildTrendText(metricKey, slope) {
  const pct = Math.round(slope * 100);
  return `${metricKey.replace(/_/g, ' ')} trending upward by ${pct}% over the last 3 weeks.`;
}

function buildRiskExplanation(type, score, band) {
  const bandText = { green: 'within normal range', yellow: 'elevated', red: 'critically high' };
  const typeText = {
    overload: 'Overload risk',
    execution: 'Execution risk',
    retention_strain: 'Retention strain',
  };
  return `${typeText[type] || type} is ${bandText[band] || band} (score: ${score}/100).`;
}

function buildBDISummary(state, topDrivers) {
  if (topDrivers.length === 0) return 'No significant behavioral drift detected.';
  const driverNames = topDrivers
    .map((d) => d.signal.replace(/([A-Z])/g, ' $1').toLowerCase())
    .join(', ');
  return `${state}: key drivers are ${driverNames}.`;
}

// ── Audit log write ────────────────────────────────────────────────────────────

async function writeAuditLog({
  teamId,
  orgId,
  trigger,
  scoreType,
  inputSnapshot,
  outputSnapshot,
  weights,
  gate,
  durationMs,
  error,
}) {
  try {
    const doc = await ScoringAuditLog.create({
      teamId,
      orgId,
      runAt: new Date(),
      trigger,
      scoreType,
      scoringVersion: SCORING_VERSION,
      inputSnapshot,
      outputSnapshot: outputSnapshot ?? {},
      weights: weights ?? {},
      privacyGatePassed: gate.passed,
      privacySuppressed: !gate.passed,
      durationMs,
      error: error ?? null,
    });
    return doc._id;
  } catch (err) {
    console.error('[scoringEngine] Failed to write audit log:', err.message);
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Run all scoring for a single team.
 *
 * @param {string|ObjectId} teamId
 * @param {Date}   weekStart   – Monday 00:00 UTC of the scoring week
 * @param {string} trigger     – 'cron' | 'manual' | 'api' | 'integration_push'
 * @returns {Promise<ScoringResult>}
 */
export async function runFullScoring(teamId, weekStart, trigger = 'cron') {
  const startTime = Date.now();

  // Resolve orgId
  const team = await Team.findById(teamId).select('orgId metadata.actualSize').lean();
  if (!team) throw new ScoringError('TEAM_NOT_FOUND', `Team ${teamId} not found`);
  const orgId = team.orgId;

  // 1. Privacy gate
  const gate = await runPrivacyGate(teamId, orgId);
  if (!gate.passed) {
    const auditLogId = await writeAuditLog({
      teamId,
      orgId,
      trigger,
      scoreType: 'full_run',
      inputSnapshot: { teamSize: gate.actualSize },
      gate,
      durationMs: Date.now() - startTime,
    });
    return {
      teamId: teamId.toString(),
      suppressed: true,
      suppressReason: gate.reason,
      auditLogId,
      durationMs: Date.now() - startTime,
    };
  }

  let auditLogId = null;

  try {
    // 2. Fetch inputs
    const [metrics, baselines, history] = await Promise.all([
      fetchCurrentMetrics(teamId),
      fetchBaselines(teamId),
      fetchMetricsHistory(teamId),
    ]);

    // 3. Run scores
    const [overload, execution, retention, capacity, coordination] = await Promise.all([
      computeOverloadRisk(teamId, weekStart, metrics, baselines),
      computeExecutionRisk(teamId, weekStart, metrics, baselines),
      computeRetentionStrainRisk(teamId, weekStart, history, baselines),
      Promise.resolve(computeCapacityDrift(metrics, baselines)),
      Promise.resolve(computeCoordinationDrag(metrics, baselines)),
    ]);

    // Cohesion needs collaboration_breadth from BDI baseline
    const collabBreadthBaseline = baselines['participation_drift'] ?? 0;
    const cohesion = computeCohesionDrift(
      metrics,
      baselines,
      metrics['participation_drift'],
      collabBreadthBaseline
    );

    const overallDrift = computeOverallDrift(capacity.score, coordination.score, cohesion.score);

    // 4. BDI
    const bdiResult = await computeBDI(teamId, orgId, weekStart, metrics, baselines);

    // 5. Team state
    const teamState = await determineTeamState(
      teamId,
      weekStart,
      overload.score,
      execution.score,
      retention.score
    );

    // 6. Write composite scores to Team
    await Team.findByIdAndUpdate(teamId, {
      capacityDriftScore: capacity.score,
      coordinationDragScore: coordination.score,
      cohesionDriftScore: cohesion.score,
      overallDriftScore: overallDrift,
      driftScoreUpdatedAt: new Date(),
      analyticsEnabled: true,
    });

    const outputSnapshot = {
      scores: {
        bdi: bdiResult.driftScore,
        overload: overload.score,
        execution: execution.score,
        retention_strain: retention.score,
        capacity: capacity.score,
        coordination: coordination.score,
        cohesion: cohesion.score,
        overall: overallDrift,
      },
      bands: {
        overload: overload.band,
        execution: execution.band,
        retention_strain: retention.band,
      },
      state: teamState,
      drivers: [...overload.drivers, ...execution.drivers, ...retention.drivers],
    };

    // 7. Audit log
    auditLogId = await writeAuditLog({
      teamId,
      orgId,
      trigger,
      scoreType: 'full_run',
      inputSnapshot: {
        weekStart,
        metricsUsed: metrics,
        baselines,
        baselineConfidence:
          determineConfidence(baselines) === 'high'
            ? 1
            : determineConfidence(baselines) === 'medium'
              ? 0.6
              : 0.3,
        teamSize: gate.actualSize,
      },
      outputSnapshot,
      weights: {
        overload: OVERLOAD_WEIGHTS,
        execution: EXECUTION_WEIGHTS,
        retention: RETENTION_WEIGHTS,
        capacity: CAPACITY_WEIGHTS,
        coordination: COORDINATION_WEIGHTS,
        cohesion: COHESION_WEIGHTS,
        composite: COMPOSITE_WEIGHTS,
      },
      gate,
      durationMs: Date.now() - startTime,
    });

    return {
      teamId: teamId.toString(),
      suppressed: false,
      bdi: {
        driftScore: bdiResult.driftScore,
        state: bdiResult.state,
        topDrivers: bdiResult.topDrivers,
        confidence: determineConfidence(baselines),
      },
      risks: {
        overload: { score: overload.score, band: overload.band, confidence: overload.confidence },
        execution: {
          score: execution.score,
          band: execution.band,
          confidence: execution.confidence,
        },
        retention_strain: {
          score: retention.score,
          band: retention.band,
          confidence: retention.confidence,
        },
      },
      compositeDrift: {
        capacity: capacity.score,
        coordination: coordination.score,
        cohesion: cohesion.score,
        overall: overallDrift,
      },
      teamState,
      auditLogId,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    auditLogId = await writeAuditLog({
      teamId,
      orgId,
      trigger,
      scoreType: 'full_run',
      inputSnapshot: { weekStart, teamSize: gate.actualSize },
      gate,
      durationMs: Date.now() - startTime,
      error: err.message,
    });

    console.error('[scoringEngine] runFullScoring error:', err.message);
    throw err;
  }
}

/**
 * Run only BDI for a single team.
 */
export async function runBDI(teamId, weekStart, trigger = 'cron') {
  const team = await Team.findById(teamId).select('orgId').lean();
  if (!team) throw new ScoringError('TEAM_NOT_FOUND', `Team ${teamId} not found`);

  const gate = await runPrivacyGate(teamId, team.orgId);
  if (!gate.passed) return { suppressed: true, suppressReason: gate.reason };

  const [metrics, baselines] = await Promise.all([
    fetchCurrentMetrics(teamId),
    fetchBaselines(teamId),
  ]);

  return computeBDI(teamId, team.orgId, weekStart, metrics, baselines);
}

/**
 * Run only the three risk scores for a single team.
 */
export async function runRiskScores(teamId, weekStart, trigger = 'cron') {
  const team = await Team.findById(teamId).select('orgId').lean();
  if (!team) throw new ScoringError('TEAM_NOT_FOUND', `Team ${teamId} not found`);

  const gate = await runPrivacyGate(teamId, team.orgId);
  if (!gate.passed) return { suppressed: true, suppressReason: gate.reason };

  const [metrics, baselines, history] = await Promise.all([
    fetchCurrentMetrics(teamId),
    fetchBaselines(teamId),
    fetchMetricsHistory(teamId),
  ]);

  const [overload, execution, retention] = await Promise.all([
    computeOverloadRisk(teamId, weekStart, metrics, baselines),
    computeExecutionRisk(teamId, weekStart, metrics, baselines),
    computeRetentionStrainRisk(teamId, weekStart, history, baselines),
  ]);

  return { overload, execution, retention };
}

/**
 * Run only the composite drift scores for a single team.
 */
export async function runCompositeDrift(teamId, weekStart, trigger = 'cron') {
  const team = await Team.findById(teamId).select('orgId').lean();
  if (!team) throw new ScoringError('TEAM_NOT_FOUND', `Team ${teamId} not found`);

  const gate = await runPrivacyGate(teamId, team.orgId);
  if (!gate.passed) return { suppressed: true, suppressReason: gate.reason };

  const [metrics, baselines] = await Promise.all([
    fetchCurrentMetrics(teamId),
    fetchBaselines(teamId),
  ]);

  const capacity = computeCapacityDrift(metrics, baselines);
  const coordination = computeCoordinationDrag(metrics, baselines);
  const cohesion = computeCohesionDrift(
    metrics,
    baselines,
    metrics['participation_drift'],
    baselines['participation_drift']
  );
  const overall = computeOverallDrift(capacity.score, coordination.score, cohesion.score);

  await Team.findByIdAndUpdate(teamId, {
    capacityDriftScore: capacity.score,
    coordinationDragScore: coordination.score,
    cohesionDriftScore: cohesion.score,
    overallDriftScore: overall,
    driftScoreUpdatedAt: new Date(),
  });

  return {
    capacity: capacity.score,
    coordination: coordination.score,
    cohesion: cohesion.score,
    overall,
  };
}

/**
 * Run full scoring for every team in an org.
 */
export async function runOrgScoring(orgId, weekStart, trigger = 'cron') {
  const teams = await Team.find({ orgId }).select('_id').lean();
  const results = [];

  for (const team of teams) {
    try {
      const result = await runFullScoring(team._id, weekStart, trigger);
      results.push({ teamId: team._id.toString(), ...result });
    } catch (err) {
      console.error(`[scoringEngine] runOrgScoring failed for team ${team._id}:`, err.message);
      results.push({ teamId: team._id.toString(), error: err.message });
    }
  }

  return results;
}
