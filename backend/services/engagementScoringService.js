/**
 * Work-Pattern Deviation Scoring Service
 *
 * Implements:
 *   - Overall internal deviation index formula (spec Section 11)
 *   - getRiskState()  (spec Section 11)
 *   - getTrend()      (spec Section 11)
 *   - Confidence Score formula (spec Section 12)
 *   - Top driver detection
 *
 * The overall score is an internally weighted sum of the 7 subscores. Its exact
 * weights and bands are product review rules, not externally validated thresholds.
 *
 *   Engagement Strain Risk =
 *     0.20 * Recovery Debt
 *     0.18 * Focus Erosion
 *     0.17 * Coordination Friction
 *     0.14 * Responsiveness Pressure
 *     0.12 * Collaboration Withdrawal
 *     0.11 * Manager Support Gap
 *     0.08 * Workload Volatility
 *
 * Confidence score formula:
 *
 *   0.25 * baseline_quality
 *   0.20 * sample_size_score
 *   0.20 * integration_coverage_score
 *   0.15 * data_completeness_score
 *   0.10 * metric_consistency_score
 *   0.10 * calendar_normality_score
 */

import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';

// ── Weights (spec Section 11) ──────────────────────────────────────────────────

const SUBSCORE_WEIGHTS = {
  recoveryDebt: 0.2,
  focusErosion: 0.18,
  coordinationFriction: 0.17,
  responsivenessPressure: 0.14,
  collaborationWithdrawal: 0.12,
  managerSupportGap: 0.11,
  workloadVolatility: 0.08,
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Calculate the overall internal deviation index from the available subscores.
 *
 * @param {Object} subscores — output of engagementSubscoreService.calculateSubscores()
 * @returns {number|null}    — 0–100 integer, or null when no component is available
 */
export function calculateOverallScore(subscores) {
  let raw = 0;
  let availableWeight = 0;
  let availableComponents = 0;
  for (const [key, weight] of Object.entries(SUBSCORE_WEIGHTS)) {
    if (!Number.isFinite(subscores[key])) continue;
    raw += weight * subscores[key];
    availableWeight += weight;
    availableComponents += 1;
  }
  if (availableComponents < 3) return null;
  return Math.max(0, Math.min(100, Math.round(raw / availableWeight)));
}

/**
 * Classify the risk band (spec Section 11).
 *
 * @param {number} score
 * @returns {'healthy'|'watch'|'strain'|'critical'}
 */
export function getRiskState(score) {
  if (score < 30) return 'healthy';
  if (score < 50) return 'watch';
  if (score < 70) return 'strain';
  return 'critical';
}

/**
 * Determine trend direction versus the previous week's score (spec Section 11).
 *
 * rising    if diff >= +8
 * improving if diff <= -8
 * stable    if within ±8
 *
 * @param {number} current
 * @param {number} previous
 * @returns {'rising'|'improving'|'stable'}
 */
export function getTrend(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 'stable';
  const diff = current - previous;
  if (diff >= 8) return 'rising';
  if (diff <= -8) return 'improving';
  return 'stable';
}

/**
 * Fetch the previous week's overall score for a team.
 * Returns null if no prior record exists.
 *
 * @param {string|ObjectId} teamId
 * @param {string} weekStart  — YYYY-MM-DD (current week's Monday)
 * @returns {number}
 */
export async function getPreviousWeekScore(teamId, weekStart) {
  const prevWeekStart = addDays(weekStart, -7);
  const prev = await EngagementStrainWeekly.findOne(
    { teamId, weekStart: prevWeekStart },
    { engagementStrainRisk: 1 }
  ).lean();
  return prev?.engagementStrainRisk ?? null;
}

/**
 * Calculate confidence score (spec Section 12).
 *
 * @param {Object} opts
 * @param {Object}  opts.baseline          — EngagementBaseline lean doc
 * @param {Object}  opts.weeklyMetrics     — WeeklyMetrics object
 * @param {number}  opts.activePeopleCount
 * @param {number}  opts.minimumTeamSize
 * @param {Object}  opts.integrationCoverage — { hasCalendar, hasMessaging, hasEmail, hasOrgStructure }
 * @param {Object}  opts.subscores         — for metric consistency check
 * @returns {{ score: number, label: 'low'|'moderate'|'high' }}
 */
export function calculateConfidenceScore({
  baseline,
  weeklyMetrics,
  activePeopleCount,
  minimumTeamSize = 1,
  integrationCoverage,
  subscores,
}) {
  const baselineQuality = baseline?.baselineQuality?.qualityScore ?? 0;
  const sampleSize = sampleSizeScore(activePeopleCount, minimumTeamSize);
  const integrationCov = integrationCoverageScore(integrationCoverage);
  const dataComplete = dataCompletenessScore(weeklyMetrics);
  const metricConsist = metricConsistencyScore(subscores);
  const calNormality = calendarNormalityScore(weeklyMetrics);

  const raw =
    0.25 * baselineQuality +
    0.2 * sampleSize +
    0.2 * integrationCov +
    0.15 * dataComplete +
    0.1 * metricConsist +
    0.1 * calNormality;

  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const label = score < 50 ? 'low' : score < 75 ? 'moderate' : 'high';

  return { score, label };
}

/**
 * Identify the top 3 subscores driving the overall score.
 * Returns them sorted by score descending with change-vs-baseline and explanation.
 *
 * @param {Object} subscores     — { recoveryDebt, focusErosion, ... }
 * @param {Object} metricRisks   — raw per-metric risk scores from subscoreService
 * @param {Object} baseline      — EngagementBaseline lean doc
 * @param {Object} weeklyMetrics — WeeklyMetrics
 * @returns {Array}
 */
export function getTopDrivers(subscores, metricRisks, baseline, weeklyMetrics) {
  const drivers = Object.entries(subscores)
    .filter(([, score]) => Number.isFinite(score))
    .map(([key, score]) => ({
      driver: camelToSnake(key),
      score,
      changeVsBaseline: computeChangeVsBaseline(key, weeklyMetrics, baseline),
      explanation: generateDriverExplanation(key, score, weeklyMetrics, baseline),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return drivers;
}

// ── Confidence Sub-Scores ──────────────────────────────────────────────────────

/**
 * Sample size score (spec Section 12).
 *
 * Below the organization minimum → 0. Above that, confidence increases
 * as the sample reaches 1.5x and 2.5x the accepted minimum.
 */
function sampleSizeScore(activePeople, minimumTeamSize) {
  if (activePeople < minimumTeamSize) return 0;
  if (activePeople < minimumTeamSize * 1.5) return 60;
  if (activePeople < minimumTeamSize * 2.5) return 80;
  return 100;
}

/**
 * Integration coverage score (spec Section 12).
 *
 * Calendar only            → 45
 * Messaging only           → 45
 * Calendar + messaging     → 80
 * + email                  → 90
 * + org structure          → 100
 */
function integrationCoverageScore(cov) {
  if (!cov) return 0;
  const { hasCalendar, hasMessaging, hasEmail, hasOrgStructure } = cov;

  if (hasCalendar && hasMessaging && hasEmail && hasOrgStructure) return 100;
  if (hasCalendar && hasMessaging && hasEmail) return 90;
  if (hasCalendar && hasMessaging) return 80;
  if (hasCalendar || hasMessaging) return 45;
  return 10;
}

/**
 * Data completeness: fraction of expected weekly metric fields that have
 * non-null non-zero values.
 */
function dataCompletenessScore(w) {
  if (!w) return 0;

  const expectedFields = [
    'meetingHoursPerPerson',
    'attendeeHoursPerPerson',
    'recurringMeetingRatio',
    'fragmentedDayRatio',
    'focusHoursAvailablePerPerson',
    'backToBackMeetingCount',
    'manager1to1MinutesPerPerson',
    'afterHoursActivityRatio',
    'messagesSentPerPerson',
    'afterHoursMessageRatio',
    'medianResponseMinutes',
    'p90ResponseMinutes',
    'uniqueCollaboratorsPerPerson',
    'reciprocityRatio',
  ];

  const present = expectedFields.filter(
    (f) => w[f] !== null && w[f] !== undefined && Number.isFinite(w[f])
  ).length;

  return Math.round((present / expectedFields.length) * 100);
}

/**
 * Metric consistency: check that subscores are not wildly divergent.
 * If all subscores are within 30 points of each other, data is coherent.
 * High divergence (one subscore at 90, others at 20) may indicate noisy data.
 */
function metricConsistencyScore(subscores) {
  if (!subscores) return 50;
  const values = Object.values(subscores).filter((v) => typeof v === 'number');
  if (values.length < 2) return 50;

  const range = Math.max(...values) - Math.min(...values);
  // Range of <= 30 → high consistency (100); range of 70+ → low (20)
  if (range <= 30) return 100;
  if (range <= 50) return 70;
  if (range <= 70) return 40;
  return 20;
}

/**
 * Calendar normality: detect if this week had atypical activity (holidays, off-sites).
 * Uses activitySpikeDays and fragmented day ratio as a rough proxy.
 */
function calendarNormalityScore(w) {
  if (!w) return 70; // assume normal if no data
  const spikeDays = w.activitySpikeDays ?? 0;
  if (spikeDays >= 4) return 30; // most of the week was abnormal
  if (spikeDays >= 2) return 60;
  return 90;
}

// ── Driver Explanation Helpers ─────────────────────────────────────────────────

const DRIVER_EXPLANATION_TEMPLATES = {
  recoveryDebt: (score, w, bm) => {
    const ah = w?.afterHoursActivityRatio;
    const baseline = bm?.metrics?.afterHoursEmailRatio?.median;
    const pct = deltaPercent(ah, baseline);
    return `After-hours activity is${pct ? ` ${pct} versus team baseline.` : ' above its baseline.'} Review schedule coverage and week context before interpreting the change.`;
  },
  focusErosion: (score, w, bm) => {
    const fh = w?.focusHoursAvailablePerPerson;
    const baseline = bm?.metrics?.focusHoursAvailablePerPerson?.median;
    const pct = deltaPercent(fh, baseline);
    return `Available focus blocks${pct ? ` changed ${pct} versus baseline.` : ' differ from baseline.'} Calendar fragmentation is also included in this model component.`;
  },
  coordinationFriction: (score, w, bm) => {
    const ah = w?.attendeeHoursPerPerson;
    const baseline = bm?.metrics?.attendeeHoursPerPerson?.median;
    const pct = deltaPercent(ah, baseline);
    return `Attendee hours are${pct ? ` ${pct} versus baseline.` : ' above their baseline.'} This describes coordination time and does not measure output.`;
  },
  responsivenessPressure: (score, w) =>
    `This component combines message-volume deviation, activity outside schedule, and response-time metadata. ` +
    `P90 response time: ${w?.p90ResponseMinutes ? Math.round(w.p90ResponseMinutes) + ' min' : 'unavailable'}.`,
  collaborationWithdrawal: (_score, _w) =>
    `Collaboration breadth and reciprocity differ from the team's baseline. ` +
    `The metadata does not establish cohesion, isolation, or intent.`,
  managerSupportGap: (_score, _w) =>
    `This component compares recorded manager 1:1 time with the team's baseline. It does not measure support quality.`,
  workloadVolatility: (_score, _w) =>
    `Week-over-week meeting and message activity differ from the preceding period.`,
};

function generateDriverExplanation(key, score, weeklyMetrics, baseline) {
  const fn = DRIVER_EXPLANATION_TEMPLATES[key];
  if (!fn) return '';
  try {
    return fn(score, weeklyMetrics, baseline);
  } catch {
    return '';
  }
}

function computeChangeVsBaseline(subscoreKey, weekly, baseline) {
  // Map subscore key → primary metric for the change calculation
  const primaryMetric = {
    recoveryDebt: ['afterHoursActivityRatio', 'afterHoursEmailRatio'],
    focusErosion: ['focusHoursAvailablePerPerson', 'focusHoursAvailablePerPerson'],
    coordinationFriction: ['attendeeHoursPerPerson', 'attendeeHoursPerPerson'],
    responsivenessPressure: ['p90ResponseMinutes', 'p90ResponseMinutes'],
    collaborationWithdrawal: ['reciprocityRatio', 'reciprocityRatio'],
    managerSupportGap: ['manager1to1MinutesPerPerson', 'manager1to1MinutesPerPerson'],
    workloadVolatility: ['weekOverWeekMeetingLoadChange', null],
  };

  const [weeklyField, baselineField] = primaryMetric[subscoreKey] ?? [null, null];
  if (!weeklyField) return null;

  const current = weekly?.[weeklyField];
  const baselineMedian = baselineField ? baseline?.metrics?.[baselineField]?.median : null;

  if (current === null || current === undefined || !baselineMedian) return null;

  const pct = deltaPercent(current, baselineMedian);
  return pct;
}

function deltaPercent(current, baseline) {
  if (current === null || current === undefined || !baseline || baseline === 0) return null;
  const pct = Math.round(((current - baseline) / baseline) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function camelToSnake(str) {
  return str.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}
