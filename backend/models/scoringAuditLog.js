/**
 * ScoringAuditLog Model
 *
 * Immutable, append-only record of every scoring engine run.
 * Provides full auditability: what inputs were used, what weights,
 * what outputs were produced, whether the privacy gate passed.
 *
 * NEVER update documents in this collection — always insert new ones.
 */

import mongoose from 'mongoose';

const scoringAuditLogSchema = new mongoose.Schema(
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
    runAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    trigger: {
      type: String,
      enum: ['cron', 'manual', 'api', 'integration_push'],
      required: true,
    },
    scoreType: {
      type: String,
      enum: ['bdi', 'overload', 'execution', 'retention_strain', 'composite_drift', 'full_run'],
      required: true,
    },
    scoringVersion: {
      type: String,
      required: true,
    },

    // Snapshot of the raw inputs fed into the scoring run
    inputSnapshot: {
      weekStart: Date,
      metricsUsed: { type: Object, default: {} },    // { metricKey: value, ... }
      baselines: { type: Object, default: {} },       // { metricKey: baselineMean, ... }
      baselineConfidence: { type: Number },           // 0–1
      teamSize: { type: Number },
    },

    // Outputs produced
    outputSnapshot: {
      scores: { type: Object, default: {} },          // { bdi: 72, overload: 48, ... }
      bands: { type: Object, default: {} },           // { overload: 'yellow', ... }
      state: String,                                  // 'healthy' | 'strained' | ...
      drivers: { type: Array, default: [] },
    },

    // Weights used in this run (snapshot for reproducibility)
    weights: { type: Object, default: {} },

    // Privacy gate result
    privacyGatePassed: { type: Boolean, required: true },
    privacySuppressed: { type: Boolean, default: false },

    // Performance
    durationMs: { type: Number },

    // Error message if the run failed
    error: { type: String },
  },
  {
    // No auto-timestamps — runAt is the canonical timestamp
    timestamps: false,
    collection: 'scoringauditlogs',
  }
);

// Compound indexes for common query patterns
scoringAuditLogSchema.index({ teamId: 1, runAt: -1 });
scoringAuditLogSchema.index({ orgId: 1, runAt: -1 });
scoringAuditLogSchema.index({ scoreType: 1, runAt: -1 });

export default mongoose.model('ScoringAuditLog', scoringAuditLogSchema);
