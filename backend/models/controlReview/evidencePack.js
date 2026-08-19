import mongoose from 'mongoose';
import { ALGORITHM_VERSION } from './constants.js';

/**
 * EvidencePack — the generated review record (spec §20).
 *
 * Stores a frozen snapshot of everything the pack asserted, so a pack produced
 * six months ago can still be reconciled against the calculations behind it.
 */
const evidencePackSchema = new mongoose.Schema(
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
    caseNumber: { type: String, default: '' },
    version: { type: Number, default: 1 },

    format: { type: String, enum: ['PDF'], default: 'PDF' },
    fileName: { type: String, default: '' },
    byteLength: { type: Number, default: 0 },

    // The seventeen sections of §20 as rendered, plus the values behind them.
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    completenessAtGeneration: { type: mongoose.Schema.Types.Mixed, default: {} },

    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    generatedAt: { type: Date, default: Date.now, index: true },

    algorithmVersion: { type: String, default: ALGORITHM_VERSION },
  },
  { timestamps: true }
);

evidencePackSchema.index({ caseId: 1, version: -1 });

export default mongoose.models.EvidencePack || mongoose.model('EvidencePack', evidencePackSchema);
