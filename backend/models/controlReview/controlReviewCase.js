import mongoose from 'mongoose';
import { TRIGGER_TYPES, CASE_STATUSES, CLOSED_STATUSES } from './constants.js';

/**
 * ControlReviewCase — the core product object (spec §5).
 *
 * A case links a known or suspected work-design issue to an organisational
 * action, and carries the review from trigger through to a documented human
 * decision. A case may start from a SignalTrue pattern or from any external
 * source; neither path is privileged.
 */
const controlReviewCaseSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    caseNumber: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    trigger: {
      type: {
        type: String,
        enum: TRIGGER_TYPES,
        required: true,
        index: true,
      },
      // Free-text pointer to the originating artefact (survey name, HSR minute,
      // audit finding). For SIGNALTRUE_PATTERN this holds the PatternFinding id.
      reference: { type: String, default: '' },
      date: { type: Date, required: true },
      patternFindingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PatternFinding',
        default: null,
      },
    },

    teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true }],

    caseOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    status: {
      type: String,
      enum: CASE_STATUSES,
      default: 'OPENED',
      index: true,
    },

    initialEvidenceSummary: { type: String, default: '' },

    // §13 — investigation record.
    investigation: {
      whatIsKnown: { type: String, default: '' },
      whatIsUncertain: { type: String, default: '' },
      whyReviewIsNeeded: { type: String, default: '' },
      openQuestions: [{ type: String }],
      consultationNeeded: { type: String, default: '' },
      workPatternSummary: { type: String, default: '' },
      contextConsidered: { type: String, default: '' },
      updatedAt: { type: Date },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    // Metrics the customer chose to monitor for this case (§8 step 6).
    monitoredMetrics: [{ type: String }],

    // §19 — consultation may be recorded as not applicable, with a reason.
    consultationNotApplicable: {
      isNotApplicable: { type: Boolean, default: false },
      reason: { type: String, default: '' },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recordedAt: { type: Date },
    },

    // §6 — closure is always a human act. Never written by a scheduler.
    organisationDecision: { type: String, default: '' },
    decisionNotes: { type: String, default: '' },
    decisionRecordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    decisionRecordedAt: { type: Date, default: null },
    nextReviewDate: { type: Date, default: null },

    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

controlReviewCaseSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });
controlReviewCaseSchema.index({ tenantId: 1, caseNumber: 1 }, { unique: true });

controlReviewCaseSchema.virtual('isClosed').get(function isClosed() {
  return CLOSED_STATUSES.includes(this.status);
});

controlReviewCaseSchema.set('toJSON', { virtuals: true });
controlReviewCaseSchema.set('toObject', { virtuals: true });

export default mongoose.models.ControlReviewCase ||
  mongoose.model('ControlReviewCase', controlReviewCaseSchema);
