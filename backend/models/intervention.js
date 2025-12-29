/**
 * Intervention Model
 * Tracks actions taken on signals with 14-day follow-up for outcome measurement
 * Enables proof-of-value and retention through measurable change
 */

import mongoose from 'mongoose';

const interventionSchema = new mongoose.Schema({
  // Signal reference
  signalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SignalV2',
    required: true,
    index: true
  },
  signalType: {
    type: String,
    required: true,
    enum: [
      'coordination-risk',
      'boundary-erosion',
      'focus-erosion',
      'execution-drag',
      'dependency-spread',
      'morale-volatility',
      'recovery-deficit',
      'handoff-bottleneck'
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
  
  // Action taken
  actionTaken: {
    type: String,
    required: true
    // Example: "Remove 1-2 recurring meetings that have low engagement"
  },
  actionType: {
    type: String,
    required: true
    // Copied from signalTemplates action object
  },
  expectedEffect: {
    type: String,
    required: true
    // Example: "Reduce meeting load by 15-25%, increase focus time"
  },
  effort: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    required: true
  },
  timeframe: {
    type: String,
    required: true
    // Example: "1 week", "2 weeks"
  },
  
  // Timeline
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  recheckDate: {
    type: Date,
    required: true,
    // Automatically set to startDate + 14 days
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 14);
      return date;
    }
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['active', 'pending-recheck', 'completed', 'ignored', 'abandoned'],
    default: 'active',
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
