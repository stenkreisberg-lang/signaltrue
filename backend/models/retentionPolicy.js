/**
 * RetentionPolicy Model
 *
 * Stores per-org configurable data retention windows.
 * The purge service reads this to determine how long to keep each data type.
 *
 * Defaults:
 *   rawEventRetentionDays   = 90   (WorkEvent, IntegrationMetricsDaily raw rows)
 *   metricsRetentionDays    = 730  (MetricsDaily, aggregated metrics — 2 years)
 *   auditLogRetentionDays   = 1825 (ScoringAuditLog — 5 years for compliance)
 *   chatLogRetentionDays    = 30   (ChatLog — shortest window, public bot questions)
 */

import mongoose from 'mongoose';

const retentionPolicySchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },

    // WorkEvent and IntegrationMetricsDaily raw rows
    rawEventRetentionDays: { type: Number, default: 90, min: 30 },

    // MetricsDaily aggregated records
    metricsRetentionDays: { type: Number, default: 730, min: 90 },

    // ScoringAuditLog entries
    auditLogRetentionDays: { type: Number, default: 1825, min: 365 },

    // ChatLog (public chatbot interactions)
    chatLogRetentionDays: { type: Number, default: 30, min: 7 },

    // DocumentChunk embeddings (only delete if source doc removed)
    documentChunkRetentionDays: { type: Number, default: 3650, min: 365 },

    // Tracking
    lastPurgeAt: { type: Date },
    nextScheduledPurgeAt: { type: Date },
    lastPurgeSummary: { type: Object, default: {} }, // { collection: count, ... }
  },
  { timestamps: true }
);

export default mongoose.model('RetentionPolicy', retentionPolicySchema);
