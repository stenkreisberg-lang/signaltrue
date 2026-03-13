/**
 * Intervention Model
 * Tracks actions taken on signals with 14-day follow-up for outcome measurement
 * Enables proof-of-value and retention through measurable change
 */

import mongoose from 'mongoose';

const interventionSchema = new mongoose.Schema({
  // Signal reference (optional — spec allows team-centric interventions without a specific signal)
  signalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalV2',
    index: true
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
      'execution_drag_risk'
    ]
  },
  
  // Context
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Spec-aligned intervention type (e.g., 'meeting_reset', 'focus_protection', 'boundary_enforcement')
  interventionType: {
    type: String,
    index: true
  },
  
  // Title and description (spec-aligned)
  title: {
    type: String
  },
  description: {
    type: String
  },
  
  // Action taken (legacy field - kept for backward compat)
  actionTaken: {
    type: String
    // Example: "Remove 1-2 recurring meetings that have low engagement"
  },
  actionType: {
    type: String
    // Copied from signalTemplates action object
  },
  expectedEffect: {
    type: String
    // Example: "Reduce meeting load by 15-25%, increase focus time"
  },
  // Structured expected effects (spec-aligned)
  expectedEffectJson: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Monitored signals — which signals are we watching for improvement
  monitoredSignals: [{
    type: String
    // e.g., ['meeting_load', 'focus_fragmentation', 'recovery_erosion']
  }],
  
  effort: {
    type: String,
    enum: ['Low', 'Medium', 'High']
  },
  timeframe: {
    type: String
    // Example: "1 week", "2 weeks"
  },
  
  // Timeline
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  // Review date for checking effectiveness (spec field)
  reviewDate: {
    type: Date
  },
  // End date (when intervention was completed or stopped)
  endDate: {
    type: Date
  },
  recheckDate: {
    type: Date,
    // Automatically set to startDate + 14 days
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date;
    }
  },
  
  // Outcome summary (spec field — human-written summary of what happened)
  outcomeSummary: {
    type: String
    // Example: "Meeting load reduced, recovery still elevated"
  },
  
  // Status tracking — extended to include spec statuses
  status: {
    type: String,
    enum: ['planned', 'active', 'pending-recheck', 'completed', 'cancelled', 'ignored', 'abandoned'],
    default: 'planned',
    index: true
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
      default: false
      // True if computed automatically, false if manually entered
    },
    computedAt: {
      type: Date
    }
  },
  
  // User acknowledgment (hybrid: auto-compute + require acknowledgment)
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  },
  userNotes: {
    type: String
    // Optional feedback from user about the outcome
  },
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
}, { timestamps: true });

// Indexes for efficient queries
interventionSchema.index({ teamId: 1, status: 1 });
interventionSchema.index({ orgId: 1, recheckDate: 1 });
interventionSchema.index({ recheckDate: 1, status: 1 });

// Method: Mark as pending recheck (triggered by cron after 14 days)
interventionSchema.methods.markForRecheck = async function() {
  this.status = 'pending-recheck';
  await this.save();
};

// Method: Compute outcome delta
interventionSchema.methods.computeOutcome = async function(currentMetricValue) {
  if (!this.outcomeDelta.metricBefore) {
    throw new Error('Baseline metric not set');
  }
  
  const before = this.outcomeDelta.metricBefore;
  const after = currentMetricValue;
  const percentChange = ((after - before) / before) * 100;
  
  // Determine if improved (depends on signal type)
  const improvementIsNegative = [
    'coordination-risk', // Lower meeting load = better
    'boundary-erosion',  // Lower after-hours = better
    'execution-drag'     // Lower response time = better
  ].includes(this.signalType);
  
  const improved = improvementIsNegative ? percentChange < 0 : percentChange > 0;
  
  this.outcomeDelta = {
    metricBefore: before,
    metricAfter: after,
    percentChange: Math.round(percentChange * 10) / 10, // Round to 1 decimal
    improved,
    autoComputed: true,
    computedAt: new Date()
  };
  
  await this.save();
  return this.outcomeDelta;
};

export default mongoose.model('Intervention', interventionSchema);
