/**
 * Control / Intervention management (spec §15).
 *
 * Recording a control without saying what you expect it to change is what makes
 * a review unfalsifiable afterwards, so expected effects are required before
 * the control leaves planning — and are timestamped, so it is visible that they
 * were set before the post period, not after it (§15.1).
 */

import ControlIntervention from '../../models/controlReview/controlIntervention.js';
import ControlReviewCase from '../../models/controlReview/controlReviewCase.js';
import {
  EVALUATION_DEFAULTS,
  METRIC_LABELS,
  INTERVENTION_TYPES,
} from '../../models/controlReview/constants.js';
import { recordAudit } from './auditService.js';
import { assertOpen } from './controlReviewCaseService.js';
import { analysisPeriods, resolveEvaluationDefaults } from './interventionEvaluationService.js';

// Which metrics a control type would plausibly move, offered as a starting
// point when the user records expected effects. Always editable.
const SUGGESTED_EFFECTS = {
  MEETING_PRACTICE: [
    { metric: 'MEETING_LOAD', direction: 'DECREASE' },
    { metric: 'UNINTERRUPTED_CALENDAR_AVAILABILITY', direction: 'INCREASE' },
    { metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' },
  ],
  WORKLOAD: [
    { metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' },
    { metric: 'COORDINATION_CHANNEL_LOAD', direction: 'DECREASE' },
  ],
  STAFFING: [
    { metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' },
    { metric: 'MEETING_LOAD', direction: 'DECREASE' },
  ],
  DEADLINES: [{ metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' }],
  PRIORITIES: [
    { metric: 'COORDINATION_CHANNEL_LOAD', direction: 'DECREASE' },
    { metric: 'UNINTERRUPTED_CALENDAR_AVAILABILITY', direction: 'INCREASE' },
  ],
  MANAGER_SUPPORT: [{ metric: 'MANAGEMENT_LAYER_COORDINATION_LOAD', direction: 'DECREASE' }],
  WORKING_HOURS: [{ metric: 'AFTER_HOURS_ACTIVITY', direction: 'DECREASE' }],
  ROLE_CLARITY: [{ metric: 'COORDINATION_CHANNEL_LOAD', direction: 'DECREASE' }],
  TEAM_STRUCTURE: [{ metric: 'COORDINATION_CHANNEL_LOAD', direction: 'DECREASE' }],
  PROCESS: [{ metric: 'COORDINATION_CHANNEL_LOAD', direction: 'DECREASE' }],
  CROSS_TEAM_COORDINATION: [
    { metric: 'MEETING_LOAD', direction: 'DECREASE' },
    { metric: 'COORDINATION_CHANNEL_LOAD', direction: 'DECREASE' },
  ],
  OTHER: [],
};

export function suggestExpectedEffects(interventionType) {
  return (SUGGESTED_EFFECTS[interventionType] || []).map((effect) => ({
    ...effect,
    metricLabel: METRIC_LABELS[effect.metric],
  }));
}

export async function planIntervention({
  tenantId,
  caseId,
  actor,
  name,
  description = '',
  interventionType,
  owner = null,
  affectedTeamIds = null,
  implementationDate,
  implementationBufferDays = null,
  prePeriodDays = null,
  postPeriodDays = null,
  sustainabilityPeriods = null,
  expectedEffects = [],
  req = null,
}) {
  if (!INTERVENTION_TYPES.includes(interventionType)) {
    throw new Error(`Unknown control type: ${interventionType}`);
  }
  if (!expectedEffects.length) {
    throw new Error(
      'Record what you expect to change if this action works before planning the control (spec §15.1).'
    );
  }

  const caseDoc = await ControlReviewCase.findOne({ _id: caseId, tenantId });
  if (!caseDoc) throw new Error('Case not found');
  assertOpen(caseDoc);

  const defaults = await resolveEvaluationDefaults(tenantId);

  const intervention = await ControlIntervention.create({
    tenantId,
    caseId,
    name,
    description,
    interventionType,
    owner: owner || actor.userId,
    affectedTeamIds: affectedTeamIds || caseDoc.teamIds,
    implementationDate: new Date(implementationDate),
    implementationBufferDays: implementationBufferDays ?? defaults.implementationBufferDays,
    prePeriodDays: prePeriodDays ?? defaults.prePeriodDays,
    postPeriodDays: postPeriodDays ?? defaults.postPeriodDays,
    sustainabilityPeriods: sustainabilityPeriods ?? defaults.sustainabilityPeriods,
    expectedEffects,
    expectedEffectsRecordedAt: new Date(),
    expectedEffectsRecordedBy: actor.userId,
    status: 'PLANNED',
    createdBy: actor.userId,
  });

  const periods = analysisPeriods(intervention, defaults);
  intervention.reviewDate = periods.postEnd;
  await intervention.save();

  caseDoc.status = 'ACTION_PLANNED';
  await caseDoc.save();

  await recordAudit({
    tenantId,
    actor,
    action: 'INTERVENTION_PLANNED',
    objectType: 'ControlIntervention',
    objectId: intervention._id,
    metadata: {
      caseId: String(caseId),
      name,
      expectedEffects: expectedEffects.map((e) => `${e.metric}:${e.direction}`),
    },
    req,
  });

  return intervention;
}

/**
 * Expected effects may be revised while the control is still planned. Once
 * implementation is confirmed they are frozen, because editing them after the
 * fact is exactly the hindsight bias §15.1 is guarding against.
 */
export async function updateExpectedEffects({
  tenantId,
  interventionId,
  actor,
  expectedEffects,
  req = null,
}) {
  const intervention = await ControlIntervention.findOne({ _id: interventionId, tenantId });
  if (!intervention) throw new Error('Control not found');

  if (intervention.implementationConfirmed) {
    throw new Error(
      'Expected effects are frozen once implementation is confirmed, so the review remains a test of what was predicted.'
    );
  }

  intervention.expectedEffects = expectedEffects;
  intervention.expectedEffectsRecordedAt = new Date();
  intervention.expectedEffectsRecordedBy = actor.userId;
  await intervention.save();

  await recordAudit({
    tenantId,
    actor,
    action: 'EXPECTED_EFFECTS_UPDATED',
    objectType: 'ControlIntervention',
    objectId: intervention._id,
    metadata: { expectedEffects: expectedEffects.map((e) => `${e.metric}:${e.direction}`) },
    req,
  });

  return intervention;
}

export async function confirmImplementation({
  tenantId,
  interventionId,
  actor,
  implementationDate = null,
  req = null,
}) {
  const intervention = await ControlIntervention.findOne({ _id: interventionId, tenantId });
  if (!intervention) throw new Error('Control not found');

  if (implementationDate) intervention.implementationDate = new Date(implementationDate);
  intervention.implementationConfirmed = true;
  intervention.status = 'IMPLEMENTED';

  const defaults = await resolveEvaluationDefaults(tenantId);
  intervention.reviewDate = analysisPeriods(intervention, defaults).postEnd;
  await intervention.save();

  await ControlReviewCase.updateOne(
    { _id: intervention.caseId, tenantId },
    { $set: { status: 'IMPLEMENTED' } }
  );

  await recordAudit({
    tenantId,
    actor,
    action: 'INTERVENTION_IMPLEMENTED',
    objectType: 'ControlIntervention',
    objectId: intervention._id,
    metadata: { implementationDate: intervention.implementationDate },
    req,
  });

  return intervention;
}

/** Controls whose post period has filled and are ready for human review. */
export async function findReviewDue({ tenantId, now = new Date() }) {
  return ControlIntervention.find({
    tenantId,
    status: { $in: ['IMPLEMENTED', 'MONITORING', 'REVIEW_DUE'] },
    reviewDate: { $lte: now },
  })
    .sort({ reviewDate: 1 })
    .lean();
}

export const DEFAULT_PERIODS = EVALUATION_DEFAULTS;

export default {
  suggestExpectedEffects,
  planIntervention,
  updateExpectedEffects,
  confirmImplementation,
  findReviewDue,
  DEFAULT_PERIODS,
};
