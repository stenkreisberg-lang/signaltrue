/**
 * Pre / buffer / post verification and sustainability (spec §16, §18).
 *
 * The comparison answers one question: after the control was implemented, did
 * the work patterns the organisation expected to move actually move, and did
 * the movement hold?
 *
 * It never answers why. `directionMatched` means the observed movement matched
 * the recorded expectation — the language guardrail in §16.2 is enforced at
 * every point where this data becomes prose.
 */

import ControlIntervention from '../../models/controlReview/controlIntervention.js';
import InterventionEvaluation from '../../models/controlReview/interventionEvaluation.js';
import TeamWorkPatternMetric from '../../models/controlReview/teamMetric.js';
import HsDeploymentConfig from '../../models/controlReview/deploymentConfig.js';
import {
  EVALUATION_DEFAULTS,
  ALGORITHM_VERSION,
  HIGHER_IS_MORE_DEMAND,
  P0_METRICS,
  DATA_QUALITY_RANK,
} from '../../models/controlReview/constants.js';
import { recordAudit } from './auditService.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function resolveEvaluationDefaults(tenantId) {
  try {
    const config = await HsDeploymentConfig.findOne({ tenantId })
      .select('evaluationDefaults')
      .lean();
    return { ...EVALUATION_DEFAULTS, ...(config?.evaluationDefaults || {}) };
  } catch {
    return { ...EVALUATION_DEFAULTS };
  }
}

/**
 * The three windows around implementation. The buffer exists so transition
 * effects — the week everyone is rescheduling meetings — do not land in either
 * comparison side.
 */
export function analysisPeriods(intervention, defaults = EVALUATION_DEFAULTS) {
  const implementation = new Date(intervention.implementationDate);
  const preDays = intervention.prePeriodDays ?? defaults.prePeriodDays;
  const bufferDays = intervention.implementationBufferDays ?? defaults.implementationBufferDays;
  const postDays = intervention.postPeriodDays ?? defaults.postPeriodDays;

  const preEnd = implementation;
  const preStart = new Date(preEnd.getTime() - preDays * DAY_MS);
  const bufferStart = implementation;
  const bufferEnd = new Date(implementation.getTime() + bufferDays * DAY_MS);
  const postStart = bufferEnd;
  const postEnd = new Date(postStart.getTime() + postDays * DAY_MS);

  return { preStart, preEnd, bufferStart, bufferEnd, postStart, postEnd };
}

/** Mean of the periods overlapping a window, ignoring suppressed rows. */
async function windowValue({ tenantId, teamId, metric, start, end }) {
  const rows = await TeamWorkPatternMetric.find({
    tenantId,
    teamId,
    metric,
    periodStart: { $lt: end },
    periodEnd: { $gt: start },
  })
    .sort({ periodStart: 1 })
    .lean();

  const usable = rows.filter((row) => !row.suppressed && typeof row.value === 'number');
  if (usable.length === 0) {
    return {
      value: null,
      coverage: 0,
      quality: 'INSUFFICIENT',
      periods: rows.length,
      suppressedPeriods: rows.filter((r) => r.suppressed).length,
    };
  }

  const value = usable.reduce((sum, row) => sum + row.value, 0) / usable.length;
  const coverage = usable.reduce((sum, row) => sum + (row.dataCoverage || 0), 0) / usable.length;
  const quality = usable.reduce(
    (worst, row) =>
      DATA_QUALITY_RANK[row.dataQuality] < DATA_QUALITY_RANK[worst] ? row.dataQuality : worst,
    'GOOD'
  );

  return {
    value: Number(value.toFixed(4)),
    coverage: Number(coverage.toFixed(4)),
    quality,
    periods: usable.length,
    suppressedPeriods: rows.filter((r) => r.suppressed).length,
  };
}

function observedDirection(relativeChange, threshold) {
  if (relativeChange === null) return 'NO_CHANGE';
  if (relativeChange > threshold) return 'INCREASE';
  if (relativeChange < -threshold) return 'DECREASE';
  return 'NO_CHANGE';
}

/**
 * Is the post period available yet? Used to move a case to REVIEW_DUE rather
 * than producing an evaluation on half a window.
 */
export function postPeriodAvailable(intervention, defaults = EVALUATION_DEFAULTS, now = new Date()) {
  const { postEnd } = analysisPeriods(intervention, defaults);
  return now >= postEnd;
}

/**
 * Evaluate every metric worth comparing for this control: the expected effects
 * first, then the remaining coordination and time metrics, because a control
 * that improves its target while another metric worsens is exactly the case
 * §17 exists to catch.
 */
export async function evaluateIntervention({ tenantId, interventionId, actor = null, req = null }) {
  const intervention = await ControlIntervention.findOne({ _id: interventionId, tenantId });
  if (!intervention) throw new Error('Control not found');

  if (!intervention.expectedEffects?.length) {
    throw new Error('Expected effects must be recorded before a control is reviewed (§15.1).');
  }

  const defaults = await resolveEvaluationDefaults(tenantId);
  const periods = analysisPeriods(intervention, defaults);
  const expectedByMetric = new Map(
    intervention.expectedEffects.map((effect) => [effect.metric, effect.direction])
  );

  const metricsToEvaluate = [
    ...expectedByMetric.keys(),
    ...P0_METRICS.filter((m) => !expectedByMetric.has(m)),
  ];

  const teamIds = intervention.affectedTeamIds?.length ? intervention.affectedTeamIds : [];
  const evaluations = [];

  for (const teamId of teamIds) {
    for (const metric of metricsToEvaluate) {
      const [pre, post] = await Promise.all([
        windowValue({ tenantId, teamId, metric, start: periods.preStart, end: periods.preEnd }),
        windowValue({ tenantId, teamId, metric, start: periods.postStart, end: periods.postEnd }),
      ]);

      const expectedDirection = expectedByMetric.get(metric) || 'NOT_SPECIFIED';
      const isExpectedEffect = expectedByMetric.has(metric);

      const evaluationPossible = pre.value !== null && post.value !== null;
      let relativeChange = null;
      let absoluteChange = null;

      if (evaluationPossible) {
        absoluteChange = Number((post.value - pre.value).toFixed(4));
        relativeChange =
          pre.value === 0 ? null : Number(((post.value - pre.value) / Math.abs(pre.value)).toFixed(4));
      }

      const direction = observedDirection(relativeChange, defaults.materialChangeThreshold);
      const materialChange = direction !== 'NO_CHANGE';

      let directionMatched = null;
      if (evaluationPossible && expectedDirection !== 'NOT_SPECIFIED') {
        directionMatched =
          expectedDirection === 'NO_CHANGE' ? direction === 'NO_CHANGE' : direction === expectedDirection;
      }

      const sustainability = evaluationPossible
        ? await assessSustainability({
            tenantId,
            teamId,
            metric,
            intervention,
            defaults,
            preValue: pre.value,
            postValue: post.value,
            periods,
          })
        : { sustained: null, reboundDetected: false, sustainabilityPeriods: [] };

      const unavailableReason = evaluationPossible
        ? ''
        : buildUnavailableReason(pre, post);

      const doc = await InterventionEvaluation.findOneAndUpdate(
        { interventionId: intervention._id, teamId, metric },
        {
          $set: {
            tenantId,
            caseId: intervention.caseId,
            interventionId: intervention._id,
            teamId,
            metric,
            isExpectedEffect,
            prePeriodValue: pre.value,
            postPeriodValue: post.value,
            absoluteChange,
            relativeChange,
            expectedDirection,
            observedDirection: direction,
            directionMatched,
            materialChange,
            sustained: sustainability.sustained,
            reboundDetected: sustainability.reboundDetected,
            sustainabilityPeriods: sustainability.sustainabilityPeriods,
            dataQuality:
              DATA_QUALITY_RANK[pre.quality] < DATA_QUALITY_RANK[post.quality]
                ? pre.quality
                : post.quality,
            dataCoverage: Number(((pre.coverage + post.coverage) / 2).toFixed(4)),
            evaluationPossible,
            unavailableReason,
            analysisPeriod: periods,
            algorithmVersion: ALGORITHM_VERSION,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      evaluations.push(doc);
    }
  }

  intervention.status = 'REVIEWED';
  intervention.reviewDate = intervention.reviewDate || periods.postEnd;
  await intervention.save();

  await recordAudit({
    tenantId,
    actor,
    actorType: actor ? 'USER' : 'SYSTEM',
    action: 'INTERVENTION_EVALUATED',
    objectType: 'ControlIntervention',
    objectId: intervention._id,
    metadata: { evaluations: evaluations.length },
    req,
  });

  const rebounds = evaluations.filter((e) => e.reboundDetected);
  if (rebounds.length) {
    await recordAudit({
      tenantId,
      actorType: 'SYSTEM',
      action: 'REBOUND_DETECTED',
      objectType: 'ControlIntervention',
      objectId: intervention._id,
      metadata: { metrics: rebounds.map((e) => e.metric) },
    });
  }

  return evaluations;
}

function buildUnavailableReason(pre, post) {
  if (pre.suppressedPeriods > 0 || post.suppressedPeriods > 0) {
    return 'Some periods were suppressed by the minimum group size rule, so no comparison is produced.';
  }
  if (pre.periods === 0 && post.periods === 0) {
    return 'No work-pattern data is available for either comparison period.';
  }
  if (pre.periods === 0) return 'No work-pattern data is available for the comparison period.';
  return 'No work-pattern data is available for the post-implementation period.';
}

/**
 * Sustainability window (§18.1).
 *
 * An improvement that returns materially toward the pre-intervention level in
 * the weeks after the post period is reported as "initial improvement was not
 * sustained" — not as a failed control, and not as a success either.
 */
export async function assessSustainability({
  tenantId,
  teamId,
  metric,
  intervention,
  defaults,
  preValue,
  postValue,
  periods,
}) {
  const windows = intervention.sustainabilityPeriods ?? defaults.sustainabilityPeriods;
  if (!windows || preValue === null || postValue === null) {
    return { sustained: null, reboundDetected: false, sustainabilityPeriods: [] };
  }

  const start = periods.postEnd;
  const end = new Date(start.getTime() + windows * 7 * DAY_MS);

  const rows = await TeamWorkPatternMetric.find({
    tenantId,
    teamId,
    metric,
    periodStart: { $gte: start, $lt: end },
    suppressed: false,
  })
    .sort({ periodStart: 1 })
    .lean();

  const usable = rows.filter((row) => typeof row.value === 'number');
  if (usable.length === 0) {
    return { sustained: null, reboundDetected: false, sustainabilityPeriods: [] };
  }

  const initialGain = postValue - preValue;
  const sustainabilityPeriods = usable.map((row) => ({
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    value: row.value,
    relativeChangeVsPre:
      preValue === 0 ? null : Number(((row.value - preValue) / Math.abs(preValue)).toFixed(4)),
  }));

  // No material movement to begin with means there is nothing to sustain.
  if (Math.abs(initialGain) < Math.abs(preValue) * defaults.materialChangeThreshold) {
    return { sustained: null, reboundDetected: false, sustainabilityPeriods };
  }

  // Rebound: the window values give back more than half the initial movement.
  const meanLater = usable.reduce((sum, row) => sum + row.value, 0) / usable.length;
  const retainedFraction = initialGain === 0 ? 1 : (meanLater - preValue) / initialGain;
  const reboundDetected = retainedFraction < defaults.reboundRecoveryFraction;

  return {
    sustained: !reboundDetected,
    reboundDetected,
    sustainabilityPeriods,
  };
}

/**
 * Plain-language rendering of one evaluation, in the permitted grammar of
 * §16.2: describe what was observed and when, never what caused it.
 */
export function describeEvaluation(evaluation, metricLabel) {
  if (!evaluation.evaluationPossible) {
    return `${metricLabel}: ${evaluation.unavailableReason}`;
  }

  const pct = evaluation.relativeChange === null ? null : Math.round(evaluation.relativeChange * 100);
  const magnitude = pct === null ? 'changed' : `${Math.abs(pct)}% ${pct >= 0 ? 'higher' : 'lower'}`;

  let sentence = `After the intervention, ${metricLabel} was ${magnitude} than during the comparison period.`;

  if (evaluation.expectedDirection !== 'NOT_SPECIFIED') {
    sentence += evaluation.directionMatched
      ? ' The observed change is consistent with the intended direction. Other factors may have contributed.'
      : ' The observed change is not in the intended direction.';
  }

  if (evaluation.reboundDetected) {
    sentence += ' Initial improvement was not sustained through the sustainability window.';
  }

  return sentence;
}

export function demandIncreased(metric, relativeChange) {
  if (relativeChange === null || relativeChange === undefined) return false;
  return HIGHER_IS_MORE_DEMAND[metric] ? relativeChange > 0 : relativeChange < 0;
}

export default {
  analysisPeriods,
  postPeriodAvailable,
  evaluateIntervention,
  assessSustainability,
  describeEvaluation,
  demandIncreased,
  resolveEvaluationDefaults,
};
