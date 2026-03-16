/**
 * CronLog Model
 * 
 * Persists the execution history of scheduled jobs in MongoDB.
 * This is the backbone of the self-healing email scheduler —
 * it lets the system detect missed runs and catch up automatically.
 */

import mongoose from 'mongoose';

const cronLogSchema = new mongoose.Schema({
  // Unique key for the job, e.g. 'weekly-email-brief', 'weekly-report-generation'
  jobName: {
    type: String,
    required: true,
    index: true,
  },

  // ISO week key like '2026-W12' — prevents duplicate sends for the same week
  weekKey: {
    type: String,
    required: true,
  },

  // When the job ran
  executedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },

  // How long it took (ms)
  durationMs: {
    type: Number,
  },

  // 'success' | 'partial' | 'failed'
  status: {
    type: String,
    enum: ['success', 'partial', 'failed'],
    required: true,
  },

  // Per-org results
  results: [{
    orgName: String,
    orgId: mongoose.Schema.Types.ObjectId,
    status: { type: String, enum: ['sent', 'failed', 'skipped'] },
    error: String,
    recipientCount: Number,
  }],

  // Who/what triggered it: 'cron', 'startup-catchup', 'manual-api', 'retry'
  trigger: {
    type: String,
    enum: ['cron', 'startup-catchup', 'manual-api', 'retry', 'watchdog'],
    default: 'cron',
  },

  // Summary counts
  totalOrgs: Number,
  sentCount: Number,
  failedCount: Number,

}, { timestamps: true });

// Compound unique index: one log per job per week
cronLogSchema.index({ jobName: 1, weekKey: 1 }, { unique: true });

/**
 * Get the latest successful run for a job
 */
cronLogSchema.statics.getLastSuccessfulRun = async function(jobName) {
  return this.findOne({ jobName, status: { $in: ['success', 'partial'] } })
    .sort({ executedAt: -1 })
    .lean();
};

/**
 * Check if a job has already run for a specific week
 */
cronLogSchema.statics.hasRunForWeek = async function(jobName, weekKey) {
  const existing = await this.findOne({ jobName, weekKey, status: { $in: ['success', 'partial'] } }).lean();
  return !!existing;
};

/**
 * Get current ISO week key (e.g., '2026-W12')
 */
cronLogSchema.statics.getCurrentWeekKey = function() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now - jan1) / 86400000);
  const weekNum = Math.ceil((days + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
};

export default mongoose.model('CronLog', cronLogSchema);
