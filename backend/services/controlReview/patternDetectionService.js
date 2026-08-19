/**
 * PatternFinding and review recommendation (spec §9).
 *
 * Detection is one trigger into the product, not the product. The strongest
 * thing this layer may say is "persistent work-pattern change, review may be
 * warranted" — never a psychological or legal label, and never an auto-opened
 * case.
 *
 * The thresholds are configurable pilot hypotheses. They are not scientific or
 * legal risk thresholds and must be validated against pilot data.
 */

import SignalObservation from '../../models/controlReview/signalObservation.js';
import PatternFinding from '../../models/controlReview/patternFinding.js';
import ContextEvent from '../../models/controlReview/contextEvent.js';
import HsDeploymentConfig from '../../models/controlReview/deploymentConfig.js';
import {
  PATTERN_DEFAULTS,
  DATA_QUALITY_RANK,
  METRIC_LABELS,
  ALGORITHM_VERSION,
} from '../../models/controlReview/constants.js';
import { recordAudit } from './auditService.js';

// The four candidate signals for the initial combined pattern (§9.1).
const CANDIDATE_SIGNALS = [
  'MEETING_LOAD',
  'UNINTERRUPTED_CALENDAR_AVAILABILITY',
  'AFTER_HOURS_ACTIVITY',
  'COORDINATION_CHANNEL_LOAD',
];

export async function resolveThresholds(tenantId) {
  try {
    const config = await HsDeploymentConfig.findOne({ tenantId })
      .select('patternThresholds')
      .lean();
    return { ...PATTERN_DEFAULTS, ...(config?.patternThresholds || {}) };
  } catch {
    return { ...PATTERN_DEFAULTS };
  }
}

function meetsQuality(observation, thresholds) {
  return (
    DATA_QUALITY_RANK[observation.dataQuality] >= DATA_QUALITY_RANK[thresholds.minimumDataQuality]
  );
}

function formatChange(observation) {
  const label = METRIC_LABELS[observation.metric] || observation.metric;
  if (observation.relativeChange === null || observation.relativeChange === undefined) {
    return `${label} ${observation.direction === 'UP' ? 'higher' : 'lower'} than baseline`;
  }
  const pct = Math.round(observation.relativeChange * 100);
  return `${label} ${pct > 0 ? '+' : ''}${pct}%`;
}

/**
 * A single signal may justify review on its own when the change is both very
 * large and persistent — a second signal is not always available (§9.1).
 */
function isSevereSingleSignal(observation, thresholds) {
  if (observation.status !== 'DEVIATION_OBSERVED') return false;
  if (!meetsQuality(observation, thresholds)) return false;
  if (observation.persistencePeriods < thresholds.severeSingleSignalPersistence) return false;

  const deviationSevere =
    Math.abs(observation.robustDeviationScore ?? 0) >= thresholds.severeSingleSignalDeviation;
  const relativeSevere =
    Math.abs(observation.relativeChange ?? 0) >= thresholds.severeSingleSignalRelativeChange;

  return deviationSevere && relativeSevere;
}

/**
 * Evaluate one team and one period, creating or updating a PatternFinding when
 * the configured recommendation conditions are met.
 */
export async function evaluateTeamPeriod({ tenantId, teamId, periodStart, actor = null }) {
  const thresholds = await resolveThresholds(tenantId);

  const observations = await SignalObservation.find({
    tenantId,
    teamId,
    periodStart,
    metric: { $in: CANDIDATE_SIGNALS },
  }).lean();

  if (observations.length === 0) return null;

  const qualifying = observations.filter(
    (observation) =>
      observation.status === 'DEVIATION_OBSERVED' &&
      meetsQuality(observation, thresholds) &&
      observation.persistencePeriods >= thresholds.persistencePeriods
  );

  let basis = null;
  let contributing = [];

  if (qualifying.length >= thresholds.minimumSignals) {
    basis = 'MULTI_SIGNAL';
    contributing = qualifying;
  } else {
    const severe = observations.find((observation) => isSevereSingleSignal(observation, thresholds));
    if (severe) {
      basis = 'SEVERE_SINGLE_SIGNAL';
      contributing = [severe];
    }
  }

  if (!basis) {
    // Nothing recommended. An existing finding for this period is left alone;
    // human dispositions are not overwritten by a later recalculation.
    return null;
  }

  const periodEnd = contributing[0].periodEnd;

  // Context is attached so a reviewer sees it beside the change. It never
  // suppresses the finding — that judgement is the customer's (§37).
  const overlappingContext = await ContextEvent.find({
    tenantId,
    startDate: { $lte: periodEnd },
    endDate: { $gte: periodStart },
    $or: [{ teamIds: teamId }, { teamIds: { $size: 0 } }],
  })
    .select('_id name eventType startDate endDate')
    .lean();

  const persistence = Math.min(...contributing.map((o) => o.persistencePeriods));
  const dataQuality = contributing.reduce(
    (worst, o) => (DATA_QUALITY_RANK[o.dataQuality] < DATA_QUALITY_RANK[worst] ? o.dataQuality : worst),
    'GOOD'
  );

  const summary = buildSummary({ contributing, persistence, overlappingContext, basis });

  const existing = await PatternFinding.findOne({ tenantId, teamId, periodStart }).lean();
  if (existing && existing.status !== 'REVIEW_RECOMMENDED') {
    return PatternFinding.findById(existing._id);
  }

  const finding = await PatternFinding.findOneAndUpdate(
    { tenantId, teamId, periodStart },
    {
      $set: {
        tenantId,
        teamId,
        type: 'WORK_DEMAND_CHANGE',
        periodStart,
        periodEnd,
        contributingObservations: contributing.map((o) => o._id),
        signals: contributing.map((o) => ({
          metric: o.metric,
          relativeChange: o.relativeChange,
          robustDeviationScore: o.robustDeviationScore,
          direction: o.direction,
          persistencePeriods: o.persistencePeriods,
        })),
        persistencePeriods: persistence,
        dataQuality,
        recommendationBasis: basis,
        overlappingContextEventIds: overlappingContext.map((c) => c._id),
        summary,
        status: 'REVIEW_RECOMMENDED',
        thresholds,
        algorithmVersion: ALGORITHM_VERSION,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (!existing) {
    await recordAudit({
      tenantId,
      actorType: 'SYSTEM',
      actor,
      action: 'PATTERN_REVIEW_RECOMMENDED',
      objectType: 'PatternFinding',
      objectId: finding._id,
      metadata: { teamId: String(teamId), basis, persistence },
    });
  }

  return finding;
}

function buildSummary({ contributing, persistence, overlappingContext, basis }) {
  const changes = contributing.map(formatChange).join('; ');
  const contextClause = overlappingContext.length
    ? ` Overlapping recorded context: ${overlappingContext.map((c) => c.name).join(', ')}.`
    : ' No matching Context Event is recorded.';
  const basisClause =
    basis === 'SEVERE_SINGLE_SIGNAL'
      ? ' Recommended on a single large, persistent change because a second signal was not available.'
      : '';

  return `Persistent work-pattern change over ${persistence} weekly periods. ${changes}.${contextClause}${basisClause} Review may be warranted.`;
}

/** Human disposition: a finding is dismissed by a person, with a reason. */
export async function dismissFinding({ tenantId, findingId, reason, actor }) {
  const finding = await PatternFinding.findOneAndUpdate(
    { _id: findingId, tenantId },
    { $set: { status: 'DISMISSED', dismissedReason: reason, dismissedBy: actor?.userId || null } },
    { new: true }
  );

  if (finding) {
    await recordAudit({
      tenantId,
      actor,
      action: 'PATTERN_FINDING_DISMISSED',
      objectType: 'PatternFinding',
      objectId: finding._id,
      metadata: { reason },
    });
  }

  return finding;
}

export default {
  CANDIDATE_SIGNALS,
  resolveThresholds,
  evaluateTeamPeriod,
  dismissFinding,
};
