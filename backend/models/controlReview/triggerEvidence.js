import mongoose from 'mongoose';
import { TRIGGER_TYPES } from './constants.js';

/**
 * TriggerEvidence — the source document or reference that started a case (spec §27.1).
 *
 * Holds a summary and a pointer, never a psychological assessment of a person.
 */
const triggerEvidenceSchema = new mongoose.Schema(
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
    type: { type: String, enum: TRIGGER_TYPES, required: true },
    sourceName: { type: String, required: true },
    sourceDate: { type: Date },
    referenceUrlOrId: { type: String, default: '' },
    summary: { type: String, default: '' },
    attachmentIds: [{ type: String }],
    // Consultation and trigger attachments can carry sensitive worker detail (§23).
    restrictedAccess: { type: Boolean, default: false },
    enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

triggerEvidenceSchema.index({ caseId: 1, createdAt: -1 });

export default mongoose.models.TriggerEvidence ||
  mongoose.model('TriggerEvidence', triggerEvidenceSchema);
