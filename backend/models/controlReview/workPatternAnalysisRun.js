import mongoose from 'mongoose';

/**
 * Durable lease and completion ledger for the automatic weekly analysis.
 * This is intentionally a scheduler ledger, not a second analytics store.
 */
const workPatternAnalysisRunSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    status: { type: String, enum: ['RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED'], default: 'RUNNING', index: true },
    leaseId: { type: String, default: null },
    leaseExpiresAt: { type: Date, default: null, index: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
    teamResults: { type: mongoose.Schema.Types.Mixed, default: {} },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

workPatternAnalysisRunSchema.index({ tenantId: 1, periodStart: 1 }, { unique: true });

export default mongoose.models.WorkPatternAnalysisRun ||
  mongoose.model('WorkPatternAnalysisRun', workPatternAnalysisRunSchema);
