/**
 * Consultation Record (spec §14).
 *
 * Not a survey platform. The record has to answer four questions: were workers
 * asked, what did they say, how did management respond, and did it change the
 * decision — plus whether anything went back to the people who were consulted.
 */

import ConsultationRecord from '../../models/controlReview/consultationRecord.js';
import ControlReviewCase from '../../models/controlReview/controlReviewCase.js';
import { recordAudit } from './auditService.js';
import { assertOpen } from './controlReviewCaseService.js';

// §13.1 — starting points for a targeted conversation, not a fixed script.
export const SUGGESTED_QUESTIONS = [
  'Has workload changed recently?',
  'Have deadlines or priorities changed?',
  'Has staffing or capacity changed?',
  'Have recurring meetings increased?',
  'Have new cross-team dependencies appeared?',
  'Has work begun moving outside normal schedules?',
  'Is the change expected to be temporary?',
  'What are workers experiencing that the metadata cannot show?',
  'What change do workers believe would materially improve the situation?',
];

export async function recordConsultation({
  tenantId,
  caseId,
  actor,
  date,
  method,
  groupDescription = '',
  participantCount = null,
  hsrInvolved = false,
  questions = [],
  workerViews = [],
  managementResponse = [],
  decisionImpact = [],
  feedbackBackToWorkers = null,
  summary = '',
  keyThemes = [],
  workerReportedDirection = 'NOT_ASSESSED',
  isPostInterventionFollowUp = false,
  interventionId = null,
  attachmentIds = [],
  restrictedAccess = true,
  req = null,
}) {
  const caseDoc = await ControlReviewCase.findOne({ _id: caseId, tenantId });
  if (!caseDoc) throw new Error('Case not found');
  assertOpen(caseDoc);

  const record = await ConsultationRecord.create({
    tenantId,
    caseId,
    date: date ? new Date(date) : new Date(),
    method,
    groupDescription,
    participantCount,
    hsrInvolved,
    questions,
    workerViews,
    managementResponse,
    decisionImpact,
    feedbackBackToWorkers: feedbackBackToWorkers || { provided: false },
    summary,
    keyThemes,
    workerReportedDirection,
    isPostInterventionFollowUp,
    interventionId,
    attachmentIds,
    restrictedAccess,
    conductedBy: actor.userId,
  });

  if (caseDoc.status === 'OPENED' || caseDoc.status === 'INVESTIGATING') {
    caseDoc.status = 'CONSULTING';
    await caseDoc.save();
  }

  await recordAudit({
    tenantId,
    actor,
    action: 'CONSULTATION_RECORDED',
    objectType: 'ConsultationRecord',
    objectId: record._id,
    metadata: {
      caseId: String(caseId),
      method,
      hsrInvolved,
      isPostInterventionFollowUp,
    },
    req,
  });

  return record;
}

export async function recordFeedbackToWorkers({
  tenantId,
  consultationId,
  actor,
  description,
  date = null,
  req = null,
}) {
  const record = await ConsultationRecord.findOneAndUpdate(
    { _id: consultationId, tenantId },
    {
      $set: {
        'feedbackBackToWorkers.provided': true,
        'feedbackBackToWorkers.date': date ? new Date(date) : new Date(),
        'feedbackBackToWorkers.description': description,
      },
    },
    { new: true }
  );

  await recordAudit({
    tenantId,
    actor,
    action: 'CONSULTATION_FEEDBACK_RECORDED',
    objectType: 'ConsultationRecord',
    objectId: consultationId,
    req,
  });

  return record;
}

export async function listConsultations({ tenantId, caseId, includeRestricted = true }) {
  const records = await ConsultationRecord.find({ tenantId, caseId }).sort({ date: -1 }).lean();
  if (includeRestricted) return records;

  // Callers without consultation-detail access get the shape, not the content.
  return records.map((record) =>
    record.restrictedAccess
      ? {
          _id: record._id,
          caseId: record.caseId,
          date: record.date,
          method: record.method,
          hsrInvolved: record.hsrInvolved,
          restricted: true,
          summary: 'Consultation detail is restricted for this role.',
        }
      : record
  );
}

export default {
  SUGGESTED_QUESTIONS,
  recordConsultation,
  recordFeedbackToWorkers,
  listConsultations,
};
