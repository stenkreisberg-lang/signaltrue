/**
 * TeamSizeGate Model
 *
 * Records every analytics suppression event triggered by the privacy gate.
 * Used for operational visibility, compliance audits, and debugging.
 * Append-only — never updated.
 */

import mongoose from 'mongoose';

const teamSizeGateSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    // The endpoint or service that triggered the gate check
    endpoint: {
      type: String,
      required: true,
    },
    reportedSize: {
      type: Number,
    },
    minRequired: {
      type: Number,
      default: 1,
    },
    reason: { type: String },
    suppressedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: false }
);

teamSizeGateSchema.index({ teamId: 1, suppressedAt: -1 });
teamSizeGateSchema.index({ orgId: 1, suppressedAt: -1 });

export default mongoose.model('TeamSizeGate', teamSizeGateSchema);
