/**
 * ControlReviewCase lifecycle (spec §5, §6, §8).
 *
 * A case may start from a SignalTrue pattern or from a survey, an HSR concern,
 * an audit or a manager's worry — none of those paths is privileged. The
 * product has to work when SignalTrue did not discover the issue.
 *
 * Nothing here ever closes a case. Status may advance to DECISION_REQUIRED
 * automatically; the closing statuses are reachable only through
 * `recordDecision`, which requires a human actor (§6).
 */

import ControlReviewCase from '../../models/controlReview/controlReviewCase.js';
import TriggerEvidence from '../../models/controlReview/triggerEvidence.js';
import PatternFinding from '../../models/controlReview/patternFinding.js';
import ContextEvent from '../../models/controlReview/contextEvent.js';
import {
  CLOSED_STATUSES,
  TRIGGER_TYPES,
  METRIC_LABELS,
} from '../../models/controlReview/constants.js';
import { recordAudit } from './auditService.js';

// Which metrics are worth watching given how the case arrived. A recommendation
// the customer can override, not a fixed mapping (§8 step 6).
const METRIC_RECOMMENDATIONS = {
  PSYCHOSOCIAL_SURVEY: ['MEETING_LOAD', 'AFTER_HOURS_ACTIVITY', 'UNINTERRUPTED_CALENDAR_AVAILABILITY'],
  FORMAL_RISK_ASSESSMENT: ['MEETING_LOAD', 'AFTER_HOURS_ACTIVITY', 'COORDINATION_CHANNEL_LOAD'],
  WORKER_CONSULTATION: ['MEETING_LOAD', 'UNINTERRUPTED_CALENDAR_AVAILABILITY', 'AFTER_HOURS_ACTIVITY'],
  HSR_CONCERN: ['AFTER_HOURS_ACTIVITY', 'MEETING_LOAD', 'COORDINATION_CHANNEL_LOAD'],
  HAZARD_REPORT: ['AFTER_HOURS_ACTIVITY', 'COORDINATION_CHANNEL_LOAD'],
  INCIDENT: ['AFTER_HOURS_ACTIVITY', 'COORDINATION_CHANNEL_LOAD'],
  MANAGER_CONCERN: ['MANAGEMENT_LAYER_COORDINATION_LOAD', 'MEETING_LOAD', 'AFTER_HOURS_ACTIVITY'],
  ORG_CHANGE: ['COORDINATION_CHANNEL_LOAD', 'MEETING_LOAD', 'AFTER_HOURS_ACTIVITY'],
  EXTERNAL_CONSULTANT: ['MEETING_LOAD', 'UNINTERRUPTED_CALENDAR_AVAILABILITY'],
  AUDIT: ['MEETING_LOAD', 'AFTER_HOURS_ACTIVITY'],
  REGULATOR: ['MEETING_LOAD', 'AFTER_HOURS_ACTIVITY', 'COORDINATION_CHANNEL_LOAD'],
  CLAIM_OR_ABSENCE_PATTERN: ['AFTER_HOURS_ACTIVITY', 'MEETING_LOAD'],
  SIGNALTRUE_PATTERN: [],
  OTHER: ['MEETING_LOAD', 'AFTER_HOURS_ACTIVITY'],
};

export function recommendMetrics(triggerType) {
  return METRIC_RECOMMENDATIONS[triggerType] || METRIC_RECOMMENDATIONS.OTHER;
}

async function nextCaseNumber(tenantId) {
  const last = await ControlReviewCase.findOne({ tenantId })
    .sort({ createdAt: -1 })
    .select('caseNumber')
    .lean();

  const lastNumber = Number(String(last?.caseNumber || '').replace(/\D/g, '')) || 100;
  return `CR-${lastNumber + 1}`;
}

/**
 * Open a case from any trigger source.
 *
 * When a PatternFinding is supplied the case is pre-populated from it, but the
 * finding itself never opens the case — a person does (§8.1).
 */
export async function openCase({
  tenantId,
  actor,
  title,
  description = '',
  triggerType,
  triggerReference = '',
  triggerDate,
  patternFindingId = null,
  teamIds = [],
  caseOwner = null,
  initialEvidenceSummary = '',
  monitoredMetrics = null,
  triggerEvidence = null,
  req = null,
}) {
  if (!TRIGGER_TYPES.includes(triggerType)) {
    throw new Error(`Unknown trigger type: ${triggerType}`);
  }

  let resolvedTeamIds = teamIds;
  let resolvedSummary = initialEvidenceSummary;
  let finding = null;

  if (patternFindingId) {
    finding = await PatternFinding.findOne({ _id: patternFindingId, tenantId }).lean();
    if (!finding) throw new Error('Pattern finding not found');
    if (resolvedTeamIds.length === 0) resolvedTeamIds = [finding.teamId];
    if (!resolvedSummary) resolvedSummary = finding.summary;
  }

  const caseNumber = await nextCaseNumber(tenantId);

  const created = await ControlReviewCase.create({
    tenantId,
    caseNumber,
    title,
    description,
    trigger: {
      type: triggerType,
      reference: triggerReference,
      date: triggerDate ? new Date(triggerDate) : new Date(),
      patternFindingId: patternFindingId || null,
    },
    teamIds: resolvedTeamIds,
    caseOwner: caseOwner || actor.userId,
    status: 'OPENED',
    initialEvidenceSummary: resolvedSummary,
    monitoredMetrics:
      monitoredMetrics ||
      (finding ? finding.signals.map((s) => s.metric) : recommendMetrics(triggerType)),
    openedAt: new Date(),
  });

  if (triggerEvidence) {
    await addTriggerEvidence({
      tenantId,
      caseId: created._id,
      actor,
      ...triggerEvidence,
      type: triggerEvidence.type || triggerType,
    });
  }

  if (finding) {
    await PatternFinding.updateOne(
      { _id: finding._id },
      { $set: { status: 'CASE_OPENED', caseId: created._id } }
    );
  }

  await recordAudit({
    tenantId,
    actor,
    action: 'CASE_OPENED',
    objectType: 'ControlReviewCase',
    objectId: created._id,
    metadata: { caseNumber, triggerType, teamIds: resolvedTeamIds.map(String) },
    req,
  });

  return created;
}

export async function addTriggerEvidence({
  tenantId,
  caseId,
  actor,
  type,
  sourceName,
  sourceDate = null,
  referenceUrlOrId = '',
  summary = '',
  attachmentIds = [],
  restrictedAccess = false,
  req = null,
}) {
  const evidence = await TriggerEvidence.create({
    tenantId,
    caseId,
    type,
    sourceName,
    sourceDate: sourceDate ? new Date(sourceDate) : null,
    referenceUrlOrId,
    summary,
    attachmentIds,
    restrictedAccess,
    enteredBy: actor.userId,
  });

  await recordAudit({
    tenantId,
    actor,
    action: 'TRIGGER_EVIDENCE_ADDED',
    objectType: 'ControlReviewCase',
    objectId: caseId,
    metadata: { sourceName, type },
    req,
  });

  return evidence;
}

/** Record the investigation (§13). Advances OPENED to INVESTIGATING. */
export async function saveInvestigation({ tenantId, caseId, actor, investigation, req = null }) {
  const existing = await ControlReviewCase.findOne({ _id: caseId, tenantId });
  if (!existing) throw new Error('Case not found');
  assertOpen(existing);

  existing.investigation = {
    ...(existing.investigation?.toObject?.() || existing.investigation || {}),
    ...investigation,
    updatedAt: new Date(),
    updatedBy: actor.userId,
  };

  if (existing.status === 'OPENED') existing.status = 'INVESTIGATING';
  await existing.save();

  await recordAudit({
    tenantId,
    actor,
    action: 'INVESTIGATION_UPDATED',
    objectType: 'ControlReviewCase',
    objectId: existing._id,
    req,
  });

  return existing;
}

/**
 * Advance status. Closing statuses are refused here; they belong to
 * `recordDecision`, which is the only human-gated path (§6).
 */
export async function setStatus({ tenantId, caseId, actor, status, req = null }) {
  if (CLOSED_STATUSES.includes(status)) {
    throw new Error('A case can only be closed through a recorded organisation decision.');
  }

  const updated = await ControlReviewCase.findOneAndUpdate(
    { _id: caseId, tenantId },
    { $set: { status } },
    { returnDocument: 'after' }
  );
  if (!updated) throw new Error('Case not found');

  await recordAudit({
    tenantId,
    actor,
    action: 'CASE_STATUS_CHANGED',
    objectType: 'ControlReviewCase',
    objectId: updated._id,
    metadata: { status },
    req,
  });

  return updated;
}

/**
 * Record the organisation's decision (§6, §36.17).
 *
 * This is the only way a case closes, and it always carries the person who
 * decided. SignalTrue may recommend a closure status; it may not apply one.
 */
export async function recordDecision({
  tenantId,
  caseId,
  actor,
  status,
  organisationDecision,
  decisionNotes = '',
  nextReviewDate = null,
  req = null,
}) {
  if (!actor?.userId) {
    throw new Error('A case decision must be recorded by a person.');
  }
  if (!organisationDecision) {
    throw new Error('An organisation decision must be recorded.');
  }

  const isClosure = CLOSED_STATUSES.includes(status);
  const update = {
    status,
    organisationDecision,
    decisionNotes,
    decisionRecordedBy: actor.userId,
    decisionRecordedAt: new Date(),
    nextReviewDate: nextReviewDate ? new Date(nextReviewDate) : null,
  };

  if (isClosure) {
    update.closedAt = new Date();
    update.closedBy = actor.userId;
  }

  const updated = await ControlReviewCase.findOneAndUpdate(
    { _id: caseId, tenantId },
    { $set: update },
    { returnDocument: 'after' }
  );
  if (!updated) throw new Error('Case not found');

  await recordAudit({
    tenantId,
    actor,
    action: isClosure ? 'CASE_CLOSED' : 'DECISION_RECORDED',
    objectType: 'ControlReviewCase',
    objectId: updated._id,
    metadata: { status, organisationDecision },
    req,
  });

  return updated;
}

/** Record that consultation is not applicable, with the reason (§4, §19). */
export async function recordConsultationNotApplicable({
  tenantId,
  caseId,
  actor,
  reason,
  req = null,
}) {
  if (!reason) throw new Error('A reason is required when consultation is not applicable.');

  const updated = await ControlReviewCase.findOneAndUpdate(
    { _id: caseId, tenantId },
    {
      $set: {
        'consultationNotApplicable.isNotApplicable': true,
        'consultationNotApplicable.reason': reason,
        'consultationNotApplicable.recordedBy': actor.userId,
        'consultationNotApplicable.recordedAt': new Date(),
      },
    },
    { returnDocument: 'after' }
  );

  await recordAudit({
    tenantId,
    actor,
    action: 'CONSULTATION_MARKED_NOT_APPLICABLE',
    objectType: 'ControlReviewCase',
    objectId: caseId,
    metadata: { reason },
    req,
  });

  return updated;
}

/** Context events overlapping a case's teams and a date range (§12). */
export async function overlappingContext({ tenantId, teamIds, from, to }) {
  return ContextEvent.find({
    tenantId,
    startDate: { $lte: to },
    endDate: { $gte: from },
    $or: [{ teamIds: { $in: teamIds } }, { teamIds: { $size: 0 } }],
  })
    .sort({ startDate: 1 })
    .lean();
}

export function assertOpen(caseDoc) {
  if (CLOSED_STATUSES.includes(caseDoc.status)) {
    throw new Error('This case is closed. Reopen it before recording further work.');
  }
}

export function describeMonitoredMetrics(metrics = []) {
  return metrics.map((m) => METRIC_LABELS[m] || m);
}

export default {
  openCase,
  addTriggerEvidence,
  saveInvestigation,
  setStatus,
  recordDecision,
  recordConsultationNotApplicable,
  overlappingContext,
  recommendMetrics,
  describeMonitoredMetrics,
};
