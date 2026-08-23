/**
 * Intervention Model
 * Tracks actions taken on signals with 14-day follow-up for outcome measurement
 * Enables proof-of-value and retention through measurable change
 */

import mongoose from 'mongoose';

const interventionSchema = new mongoose.Schema(
  {
    // Signal reference (optional — spec allows team-centric interventions without a specific signal)
    signalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SignalV2',
      index: true,
    },
    signalType: {
      type: String,
      enum: [
        'coordination-risk',
        'boundary-erosion',
        'focus-erosion',
        'execution-drag',
        'dependency-spread',
        'morale-volatility',
        'recovery-deficit',
        'handoff-bottleneck',
        // Spec-aligned signal types
        'meeting_load',
        'recovery_erosion',
        'coordination_strain',
        'focus_integrity',
        'team_rhythm_stability',
        'manager_capacity_risk',
        'execution_drag_risk',
        // Signal V2 types
        'recovery_gap_index',
        'focus_fragmentation',
        'meeting_load_drift',
        'responsiveness_pressure',
        'engagement_asymmetry',
        'signal_convergence',
        'context_switching',
        'network_bottleneck',
        'rework_churn',
        'drift_velocity',
      ],
    },

    // Context
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: ['signal', 'manager_coaching', 'control_review'],
      default: 'signal',
      index: true,
    },
    managerHash: { type: String, index: true },
    insightId: { type: String, index: true },
    privateToManager: { type: Boolean, default: false },

    // Spec-aligned intervention type (e.g., 'meeting_reset', 'focus_protection', 'boundary_enforcement')
    interventionType: {
      type: String,
      index: true,
    },

    // Title and description (spec-aligned)
    title: {
      type: String,
    },
    description: {
      type: String,
    },

    // Action taken (legacy field - kept for backward compat)
    actionTaken: {
      type: String,
      // Example: "Remove 1-2 recurring meetings that have low engagement"
    },
    actionType: {
      type: String,
      // Copied from signalTemplates action object
    },
    expectedEffect: {
      type: String,
      // Example: "Reduce meeting load by 15-25%, increase focus time"
    },
    // Structured expected effects (spec-aligned)
    expectedEffectJson: {
      type: mongoose.Schema.Types.Mixed,
    },

    // The observed metric this action intends to move. Keeping this explicit
    // prevents the review job from silently substituting an unrelated proxy.
    targetMetric: { type: String, index: true },
    targetMetricLabel: { type: String },
    targetDirection: {
      type: String,
      enum: ['increase', 'decrease', 'stabilize'],
    },
    targetMetrics: [
      {
        metric: { type: String, required: true },
        label: String,
        unit: String,
        direction: { type: String, enum: ['up', 'down', 'stable'], required: true },
        _id: false,
      },
    ],

    // Decision record: who owns the change and why it was selected.
    decision: {
      ownerName: { type: String },
      ownerRole: { type: String },
      rationale: { type: String },
      hypothesis: { type: String },
      selectedAt: { type: Date },
    },

    reminders: {
      reviewDueNotifiedAt: { type: Date },
    },

    // Optional consultation record for changes that affect team working norms.
    consultation: {
      status: {
        type: String,
        enum: ['not_needed', 'planned', 'completed'],
        default: 'not_needed',
      },
      participantCount: { type: Number, min: 0 },
      notes: { type: String },
      completedAt: { type: Date },
    },

    // Immutable evidence captured when the action starts.
    evidenceSnapshot: {
      value: { type: Number },
      baselineValue: { type: Number },
      deltaPct: { type: Number },
      periodStart: { type: Date },
      periodEnd: { type: Date },
      confidence: { type: Number },
      contributorCount: { type: Number },
      sources: [{ type: String }],
      capturedAt: { type: Date },
    },
    evidenceSnapshots: [
      {
        metric: { type: String, required: true },
        value: Number,
        baseline: Number,
        unit: String,
        coverage: Number,
        confidence: { type: String, enum: ['high', 'medium', 'low'] },
        sources: [String],
        scoringVersion: String,
        dataQualityVersion: String,
        capturedAt: { type: Date, required: true },
        _id: false,
      },
    ],

    governance: {
      measurementVersion: { type: String },
      privacyPolicyVersion: { type: String },
      reviewProtocolVersion: { type: String },
    },

    // Monitored signals — which signals are we watching for improvement
    monitoredSignals: [
      {
        type: String,
        // e.g., ['meeting_load', 'focus_fragmentation', 'recovery_erosion']
      },
    ],

    effort: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
    },
    timeframe: {
      type: String,
      // Example: "1 week", "2 weeks"
    },

    // Timeline
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    // Review date for checking effectiveness (spec field)
    reviewDate: {
      type: Date,
    },
    // End date (when intervention was completed or stopped)
    endDate: {
      type: Date,
    },
    recheckDate: {
      type: Date,
      // Automatically set to startDate + 14 days
      default: function () {
        const date = new Date();
        date.setDate(date.getDate() + 14);
        return date;
      },
    },
    followUpReviewDate: { type: Date },

    reviews: [
      {
        day: { type: Number, enum: [14, 28] },
        dueDate: { type: Date },
        measuredAt: { type: Date },
        metricValue: { type: Number },
        absoluteChange: { type: Number },
        percentChange: { type: Number },
        interpretation: {
          type: String,
          enum: ['improved', 'no_material_change', 'worsened', 'insufficient_data'],
        },
        notes: { type: String },
        result: {
          type: String,
          enum: ['improved', 'unchanged', 'worsened', 'mixed', 'insufficient_data'],
        },
        metricSnapshots: [
          {
            metric: String,
            value: Number,
            baselineValue: Number,
            absoluteChange: Number,
            percentChange: Number,
            direction: { type: String, enum: ['up', 'down', 'stable'] },
            interpretation: {
              type: String,
              enum: ['improved', 'unchanged', 'worsened', 'insufficient_data'],
            },
            coverage: Number,
            confidence: { type: String, enum: ['high', 'medium', 'low'] },
            _id: false,
          },
        ],
        acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        _id: false,
      },
    ],

    // Outcome summary (spec field — human-written summary of what happened)
    outcomeSummary: {
      type: String,
      // Example: "Meeting load reduced, recovery still elevated"
    },

    // Status tracking — extended to include spec statuses
    status: {
      type: String,
      enum: [
        'planned',
        'active',
        'pending-recheck',
        'completed',
        'cancelled',
        'ignored',
        'abandoned',
      ],
      default: 'planned',
      index: true,
    },

    // Outcome measurement (filled after recheck)
    outcomeDelta: {
      metricBefore: {
        type: Number,
        // Value of the metric when action was taken
      },
      metricAfter: {
        type: Number,
        // Value of the metric after 14 days
      },
      percentChange: {
        type: Number,
        // (metricAfter - metricBefore) / metricBefore * 100
      },
      improved: {
        type: Boolean,
        // True if percentChange shows improvement (e.g., negative for meeting load)
      },
      autoComputed: {
        type: Boolean,
        default: false,
        // True if computed automatically, false if manually entered
      },
      computedAt: {
        type: Date,
      },
    },

    // User acknowledgment (hybrid: auto-compute + require acknowledgment)
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    acknowledgedAt: {
      type: Date,
    },
    userNotes: {
      type: String,
      // Optional feedback from user about the outcome
    },

    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
interventionSchema.index({ teamId: 1, status: 1 });
interventionSchema.index({ orgId: 1, recheckDate: 1 });
interventionSchema.index({ recheckDate: 1, status: 1 });
interventionSchema.index({ orgId: 1, managerHash: 1, createdAt: -1 });
interventionSchema.index(
  { orgId: 1, managerHash: 1, insightId: 1 },
  { unique: true, partialFilterExpression: { source: 'manager_coaching' } }
);

// Manager-coaching experiments are private by default. Generic intervention,
// reporting and organization-wide queries must never receive them. The private
// coaching API opts in explicitly with source='manager_coaching' and separately
// verifies the authenticated manager identity.
interventionSchema.pre(/^find/, function () {
  const filter = this.getFilter();
  if (filter.source !== 'manager_coaching' && filter.privateToManager === undefined) {
    this.where({ privateToManager: { $ne: true } });
  }
});

// Method: Mark as pending recheck (triggered by cron after 14 days)
interventionSchema.methods.markForRecheck = async function () {
  this.status = 'pending-recheck';
  await this.save();
};

// Method: Compute outcome delta
interventionSchema.methods.computeOutcome = async function (currentMetricValue) {
  if (this.outcomeDelta?.metricBefore == null) {
    throw new Error('Baseline metric not set');
  }

  const before = this.outcomeDelta.metricBefore;
  const after = currentMetricValue;
  const absoluteChange = after - before;
  const percentChange = before === 0 ? null : (absoluteChange / Math.abs(before)) * 100;

  const direction = this.targetDirection || 'decrease';
  const improved =
    direction === 'increase'
      ? absoluteChange > 0
      : direction === 'stabilize'
        ? Math.abs(percentChange || absoluteChange) < 5
        : absoluteChange < 0;
  const materialChange =
    percentChange == null ? Math.abs(absoluteChange) > 0 : Math.abs(percentChange) >= 5;
  const interpretation = !materialChange
    ? 'no_material_change'
    : improved
      ? 'improved'
      : 'worsened';

  this.outcomeDelta = {
    metricBefore: before,
    metricAfter: after,
    percentChange: percentChange == null ? null : Math.round(percentChange * 10) / 10,
    improved,
    autoComputed: true,
    computedAt: new Date(),
  };

  const measuredAt = new Date();
  const elapsedDays = Math.max(0, Math.round((measuredAt - this.startDate) / 86400000));
  const reviewDay = elapsedDays >= 21 ? 28 : 14;
  this.reviews = (this.reviews || []).filter((review) => review.day !== reviewDay);
  this.reviews.push({
    day: reviewDay,
    dueDate: reviewDay === 28 ? this.followUpReviewDate : this.recheckDate,
    measuredAt,
    metricValue: after,
    absoluteChange: Math.round(absoluteChange * 10) / 10,
    percentChange: percentChange == null ? null : Math.round(percentChange * 10) / 10,
    interpretation,
  });

  await this.save();
  return this.outcomeDelta;
};

export default mongoose.model('Intervention', interventionSchema);
