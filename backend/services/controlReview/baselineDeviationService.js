/**
 * Baseline, deviation, persistence and data quality (spec §11.2, §11.3).
 *
 * Comparison is always against the team's own history, never a cross-company
 * benchmark: "high" meeting time is not inherently harmful, and the only
 * defensible statement is that this team's pattern moved away from its own.
 *
 * Robust statistics (median, MAD, percentile bands) are used because a single
 * launch week should not drag the comparison point with it.
 */

import TeamWorkPatternMetric from '../../models/controlReview/teamMetric.js';
import SignalObservation from '../../models/controlReview/signalObservation.js';
import {
  ALGORITHM_VERSION,
  BASELINE_WEEKS_DEFAULT,
  BASELINE_WEEKS_MINIMUM,
  PATTERN_DEFAULTS,
} from '../../models/controlReview/constants.js';
import { P0_METRIC_ORDER } from './workPatternMetricsService.js';

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Median absolute deviation, scaled to be comparable with a standard deviation. */
export function medianAbsoluteDeviation(values, med = null) {
  if (!values.length) return null;
  const centre = med ?? median(values);
  const deviations = values.map((v) => Math.abs(v - centre));
  return median(deviations) * 1.4826;
}

export function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Build a baseline from prior periods, excluding the current one.
 *
 * Below BASELINE_WEEKS_MINIMUM complete weeks nothing is produced; between the
 * minimum and the default the baseline is marked immature so the UI can say so
 * rather than presenting a thin comparison as settled.
 */
export function buildBaseline(priorRows) {
  const usable = priorRows.filter((row) => !row.suppressed && typeof row.value === 'number');
  const values = usable.map((row) => row.value);

  if (values.length < BASELINE_WEEKS_MINIMUM) {
    return {
      available: false,
      sampleSize: values.length,
      mature: false,
      reason: `Fewer than ${BASELINE_WEEKS_MINIMUM} complete comparison weeks are available.`,
    };
  }

  const med = median(values);
  const mad = medianAbsoluteDeviation(values, med);
  const coverage =
    usable.reduce((sum, row) => sum + (row.dataCoverage || 0), 0) / (usable.length || 1);

  return {
    available: true,
    startDate: usable[0].periodStart,
    endDate: usable[usable.length - 1].periodEnd,
    sampleSize: values.length,
    median: Number(med.toFixed(4)),
    mad: Number((mad ?? 0).toFixed(4)),
    p25: Number(percentile(values, 0.25).toFixed(4)),
    p75: Number(percentile(values, 0.75).toFixed(4)),
    coverage: Number(coverage.toFixed(4)),
    mature: values.length >= BASELINE_WEEKS_DEFAULT,
  };
}

/**
 * Distance from baseline in MAD units. Where a team's history is genuinely
 * flat, MAD collapses to zero and the score would explode, so a floor derived
 * from the baseline level keeps it finite.
 */
export function robustDeviation(currentValue, baseline) {
  if (!baseline?.available || currentValue === null || currentValue === undefined) return null;
  const spread = Math.max(baseline.mad || 0, Math.abs(baseline.median || 0) * 0.05, 1e-6);
  return Number(((currentValue - baseline.median) / spread).toFixed(3));
}

function directionOf(deviationScore, threshold) {
  if (deviationScore === null) return 'FLAT';
  if (deviationScore >= threshold) return 'UP';
  if (deviationScore <= -threshold) return 'DOWN';
  return 'FLAT';
}

/**
 * Observe one metric for one team in one period against its own baseline.
 * Persists a SignalObservation and returns it.
 */
export async function observeMetric({
  tenantId,
  teamId,
  metric,
  periodStart,
  thresholds = PATTERN_DEFAULTS,
  persist = true,
}) {
  const [currentRow, priorRows] = await Promise.all([
    TeamWorkPatternMetric.findOne({ tenantId, teamId, metric, periodStart }).lean(),
    TeamWorkPatternMetric.find({
      tenantId,
      teamId,
      metric,
      periodStart: { $lt: periodStart },
    })
      .sort({ periodStart: -1 })
      .limit(BASELINE_WEEKS_DEFAULT)
      .lean(),
  ]);

  if (!currentRow) return null;

  const orderedPrior = [...priorRows].reverse();
  const baseline = buildBaseline(orderedPrior);

  const observation = {
    tenantId,
    teamId,
    metric,
    periodStart: currentRow.periodStart,
    periodEnd: currentRow.periodEnd,
    currentValue: currentRow.value,
    dataCoverage: currentRow.dataCoverage,
    dataQuality: currentRow.dataQuality,
    algorithmVersion: ALGORITHM_VERSION,
    baseline: {
      startDate: baseline.startDate,
      endDate: baseline.endDate,
      sampleSize: baseline.sampleSize,
      median: baseline.median,
      mad: baseline.mad,
      p25: baseline.p25,
      p75: baseline.p75,
      coverage: baseline.coverage,
      mature: baseline.mature,
    },
  };

  if (currentRow.suppressed) {
    observation.status = 'SUPPRESSED';
    observation.direction = 'FLAT';
  } else if (currentRow.reportingGroup && currentRow.reportingGroup.scope !== 'TEAM') {
    // The figure describes the group this team was rolled into, not the team.
    // Recommending a review of the team on the strength of it would point H&S
    // at a group too small to report on, and every small team in the
    // organisation would raise the same finding.
    observation.status = 'AGGREGATED';
    observation.direction = 'FLAT';
  } else if (!baseline.available || currentRow.value === null) {
    observation.status = 'INSUFFICIENT_DATA';
    observation.direction = 'FLAT';
  } else {
    const deviation = robustDeviation(currentRow.value, baseline);
    const direction = directionOf(deviation, thresholds.robustDeviationThreshold);

    observation.baselineValue = baseline.median;
    observation.absoluteChange = Number((currentRow.value - baseline.median).toFixed(4));
    observation.relativeChange =
      baseline.median === 0
        ? null
        : Number(((currentRow.value - baseline.median) / Math.abs(baseline.median)).toFixed(4));
    observation.robustDeviationScore = deviation;
    observation.direction = direction;
    observation.status = direction === 'FLAT' ? 'WITHIN_BASELINE' : 'DEVIATION_OBSERVED';
    observation.persistencePeriods = await countPersistence({
      tenantId,
      teamId,
      metric,
      periodStart,
      direction,
      thresholds,
    });
  }

  if (!persist) return observation;

  return SignalObservation.findOneAndUpdate(
    { tenantId, teamId, metric, periodStart: currentRow.periodStart },
    { $set: observation },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

/**
 * How many consecutive periods, ending with this one, deviated the same way.
 * Persistence is what separates a busy fortnight from a changed pattern.
 */
export async function countPersistence({
  tenantId,
  teamId,
  metric,
  periodStart,
  direction,
  thresholds = PATTERN_DEFAULTS,
}) {
  if (direction === 'FLAT') return 0;

  const prior = await SignalObservation.find({
    tenantId,
    teamId,
    metric,
    periodStart: { $lt: periodStart },
  })
    .sort({ periodStart: -1 })
    .limit(thresholds.persistenceWindow)
    .lean();

  let count = 1;
  for (const observation of prior) {
    if (observation.direction === direction && observation.status === 'DEVIATION_OBSERVED') {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/** Observe every P0 metric for a team in one period. */
export async function observeTeamPeriod({ tenantId, teamId, periodStart, thresholds }) {
  const observations = [];
  for (const metric of P0_METRIC_ORDER) {
    const observation = await observeMetric({
      tenantId,
      teamId,
      metric,
      periodStart,
      thresholds,
    });
    if (observation) observations.push(observation);
  }
  return observations;
}

export default {
  median,
  medianAbsoluteDeviation,
  percentile,
  buildBaseline,
  robustDeviation,
  observeMetric,
  observeTeamPeriod,
  countPersistence,
};
