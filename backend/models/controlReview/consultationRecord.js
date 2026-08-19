import mongoose from 'mongoose';
import { CONSULTATION_METHODS } from './constants.js';

/**
 * ConsultationRecord — what workers said and what happened next (spec §14).
 *
 * Deliberately not a survey platform. The record has to show that workers were
 * asked, what they said, how management responded, whether their views changed
 * the decision, and whether anything went back to them.
 */
const consultationRecordSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ControlReviewCase',
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    method: { type: String, enum: CONSULTATION_METHODS, required: true },

    // Described as a group, never as a list of named participants.
    groupDescription: { type: String, default: '' },
    participantCount: { type: Number, default: null },
    hsrInvolved: { type: Boolean, default: false },

    questions: [{ type: String }],
    workerViews: [{ type: String }],
    managementResponse: [{ type: String }],
    decisionImpact: [{ type: String }],

    feedbackBackToWorkers: {
      provided: { type: Boolean, default: false },
      date: { type: Date },
      description: { type: String, default: '' },
    },

    summary: { type: String, default: '' },
    keyThemes: [{ type: String }],

    // §18.2 — worker experience is kept beside the metrics, never merged into them.
    workerReportedDirection: {
      type: String,
      enum: ['IMPROVED', 'UNCHANGED', 'WORSENED', 'NOT_ASSESSED'],
      default: 'NOT_ASSESSED',
    },

    // Follow-up after a control is implemented (§16), as opposed to the
    // consultation that informed the control.
    isPostInterventionFollowUp: { type: Boolean, default: false, index: true },
    interventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ControlIntervention',
      default: null,
    },

    attachmentIds: [{ type: String }],
    // Consultation attachments may carry identifiable worker detail (§23).
    restrictedAccess: { type: Boolean, default: true },

    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

consultationRecordSchema.index({ caseId: 1, date: -1 });

export default mongoose.models.ConsultationRecord ||
  mongoose.model('ConsultationRecord', consultationRecordSchema);
