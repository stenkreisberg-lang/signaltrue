import mongoose from 'mongoose';
import { DATA_QUALITY, ALGORITHM_VERSION } from './constants.js';

/**
 * PatternFinding — a combined, persistent change in a team's own work pattern (spec §9).
 *
 * This recommends that a human look, and nothing more. It never labels legal or
 * psychological risk, and it never opens a case by itself.
 */
const patternFindingSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },

    type: { type: String, default: 'WORK_DEMAND_CHANGE' },

    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true },

    contributingObservations: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'SignalObservation' },
    ],

    // Denormalised for display so the feed does not need a join.
    signals: [
      {
        metric: { type: String },
        relativeChange: { type: Number },
        robustDeviationScore: { type: Number },
        direction: { type: String },
        persistencePeriods: { type: Number },
        _id: false,
      },
    ],

    persistencePeriods: { type: Number, default: 0 },
    dataQuality: { type: String, enum: DATA_QUALITY, default: 'INSUFFICIENT' },

    // SEVERE_SINGLE_SIGNAL is the configurable exception path from §9.1.
    recommendationBasis: {
      type: String,
      enum: ['MULTI_SIGNAL', 'SEVERE_SINGLE_SIGNAL'],
      default: 'MULTI_SIGNAL',
    },

    // Context overlapping the period. Shown, never used to auto-dismiss (§37).
    overlappingContextEventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContextEvent' }],

    summary: { type: String, default: '' },

    status: {
      type: String,
      enum: ['REVIEW_RECOMMENDED', 'CASE_OPENED', 'DISMISSED'],
      default: 'REVIEW_RECOMMENDED',
      index: true,
    },
    dismissedReason: { type: String, default: '' },
    dismissedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ControlReviewCase',
      default: null,
      index: true,
    },

    thresholds: { type: mongoose.Schema.Types.Mixed, default: {} },
    algorithmVersion: { type: String, default: ALGORITHM_VERSION },
  },
  { timestamps: true }
);

patternFindingSchema.index({ tenantId: 1, teamId: 1, periodStart: 1 }, { unique: true });
patternFindingSchema.index({ tenantId: 1, status: 1, periodStart: -1 });

export default mongoose.models.PatternFinding ||
  mongoose.model('PatternFinding', patternFindingSchema);
