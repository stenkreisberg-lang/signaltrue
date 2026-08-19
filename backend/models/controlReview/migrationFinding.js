import mongoose from 'mongoose';
import { P0_METRICS, DATA_QUALITY, ALGORITHM_VERSION } from './constants.js';

/**
 * MigrationFinding — demand that may have moved rather than reduced (spec §27.2).
 *
 * The wording throughout is "possible". A control can improve the metric it
 * targeted while the same demand reappears in another channel, another time of
 * day, or another team. Flagging that is the point; asserting it is not.
 */
const migrationFindingSchema = new mongoose.Schema(
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
    interventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ControlIntervention',
      required: true,
      index: true,
    },

    migrationType: {
      type: String,
      enum: ['CHANNEL', 'TIME', 'TEAM'],
      default: 'CHANNEL',
    },

    sourceMetric: { type: String, enum: P0_METRICS, required: true },
    sourceChange: { type: Number, required: true },
    sourceTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },

    destinationMetric: { type: String, enum: P0_METRICS, required: true },
    destinationChange: { type: Number, required: true },
    destinationTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },

    affectedTeamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],

    periodStart: { type: Date },
    periodEnd: { type: Date },

    // Magnitude band for triage order only — not a risk rating.
    severity: { type: String, enum: ['LOW', 'MODERATE', 'HIGH'], default: 'MODERATE' },

    dataQuality: { type: String, enum: DATA_QUALITY, default: 'INSUFFICIENT' },

    status: {
      type: String,
      enum: ['OPEN', 'UNDER_INVESTIGATION', 'EXPLAINED_BY_CONTEXT', 'ACTIONED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    investigationNotes: { type: String, default: '' },
    investigationQuestions: [{ type: String }],
    summary: { type: String, default: '' },

    algorithmVersion: { type: String, default: ALGORITHM_VERSION },
  },
  { timestamps: true }
);

migrationFindingSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default mongoose.models.MigrationFinding ||
  mongoose.model('MigrationFinding', migrationFindingSchema);
