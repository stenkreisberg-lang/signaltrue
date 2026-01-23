import mongoose from 'mongoose';

/**
 * Action model - tracks actions taken in response to signals
 * Includes ownership, status, outcomes, and learning loop data
 */
const actionSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true,
    index: true
  },
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team',
    required: true,
    index: true
  },
  signalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Signal',
    required: true,
    index: true
  },
  
  // Action details
  action: { type: String, required: true },
  description: { type: String },
  
  // Expected outcomes
  expectedEffect: { type: String },
  effort: { type: String, enum: ['Low', 'Medium', 'High'] },
  timeframe: { type: String }, // e.g., "1-2 weeks"
  
  // Ownership
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  assignedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  
  // Status tracking
  status: { 
    type: String, 
    enum: ['Open', 'Acknowledged', 'In Progress', 'Completed', 'Blocked', 'Cancelled'], 
    default: 'Open',
    index: true
  },
  
  // Dates
  createdDate: { type: Date, default: Date.now },
  dueDate: { type: Date },
  startDate: { type: Date },
  completionDate: { type: Date },
  
  // Blocking issues
  blockedReason: { type: String },
  blockedDate: { type: Date },
  
  // Pre-action baseline (for measuring effectiveness)
  preActionBaseline: {
    metricName: { type: String },
    value: { type: Number },
    timestamp: { type: Date }
  },
  
  // Post-action metrics
  postActionMetrics: [{
    metricName: { type: String },
    value: { type: Number },
    timestamp: { type: Date },
    daysAfterCompletion: { type: Number }
  }],
  
  // Outcome and learning
  outcome: {
    rating: { 
      type: String, 
      enum: ['Worked', 'Partially Worked', 'Did Not Work', 'Too Early To Tell'] 
    },
    timeToNormalization: { type: Number }, // days until metrics returned to baseline
    metricsImproved: [{ type: String }], // which metrics improved
    metricsUnaffected: [{ type: String }], // which metrics didn't change
    unexpectedEffects: { type: String }, // unintended consequences
    notes: { type: String },
    recordedAt: { type: Date },
    recordedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    }
  },
  
  // Learning telemetry for improving recommendations
  telemetry: {
    actionType: { type: String }, // categorize action for ML
    contextTags: [{ type: String }], // additional context
    effectivenessScore: { type: Number, min: 0, max: 10 }, // derived from outcome
    wouldRecommendAgain: { type: Boolean }
  },
  
  // Notes and updates
  updates: [{
    note: { type: String },
    author: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User'
    },
    timestamp: { type: Date, default: Date.now }
  }]
  
}, { timestamps: true });

// Indexes for common queries
actionSchema.index({ orgId: 1, teamId: 1, status: 1 });
actionSchema.index({ owner: 1, status: 1 });
// signalId already has index: true in field definition
actionSchema.index({ status: 1, dueDate: 1 });

export default mongoose.model('Action', actionSchema);
