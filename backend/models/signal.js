import mongoose from 'mongoose';

/**
 * Signal model - represents a detected deviation from baseline
 * Includes severity, confidence, drivers, consequences, and recommended actions
 */
const signalSchema = new mongoose.Schema({
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
  
  // Signal identification
  signalType: { 
    type: String, 
    required: true,
    enum: [
      'meeting-load-spike',
      'after-hours-creep',
      'focus-erosion',
      'response-delay-increase',
      'message-volume-drop',
      'recovery-deficit',
      'sentiment-decline',
      'handoff-bottleneck'
    ]
  },
  title: { type: String, required: true },
  
  // Severity and confidence
  severity: { 
    type: String, 
    enum: ['Informational', 'Risk', 'Critical'], 
    default: 'Informational',
    index: true
  },
  confidence: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  },
  confidenceScore: { type: Number, min: 0, max: 100 }, // 0-100
  
  // Time-to-impact
  timeToImpact: {
    value: { type: Number }, // in days
    estimate: { type: String }, // human-readable, e.g., "2-4 weeks"
  },
  
  // Deviation data
  deviation: {
    startDate: { type: Date, required: true },
    currentValue: { type: Number, required: true },
    baselineValue: { type: Number, required: true },
    delta: { type: Number, required: true }, // absolute difference
    deltaPercent: { type: Number }, // percentage difference
    sustainedDays: { type: Number, default: 0 }, // how long deviation has persisted
    threshold: { type: Number } // threshold that was crossed
  },
  
  // What happened (drivers)
  drivers: [{
    name: { type: String, required: true },
    contribution: { type: Number }, // percentage contribution to deviation
    metric: { type: String },
    change: { type: String } // human-readable change description
  }],
  
  // What usually breaks next (consequence)
  consequence: {
    statement: { type: String, required: true }, // e.g., "This pattern tends to precede focus erosion and decision delays."
    relatedMetrics: [{ type: String }], // metrics likely to be affected
    historicalFrequency: { type: Number } // how often this consequence has occurred historically (%)
  },
  
  // Recommended trade-off actions
  recommendedActions: [{
    action: { type: String, required: true },
    expectedEffect: { type: String },
    effort: { type: String, enum: ['Low', 'Medium', 'High'] },
    timeframe: { type: String }, // e.g., "1-2 weeks"
    isInactionOption: { type: Boolean, default: false }, // marks "do nothing" option
    inactionCost: { type: String } // cost of inaction
  }],
  
  // Ownership and status
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  status: { 
    type: String, 
    enum: ['Open', 'Acknowledged', 'In Progress', 'Resolved', 'Ignored'], 
    default: 'Open',
    index: true
  },
  dueDate: { type: Date },
  
  // Action tracking
  selectedAction: { type: String }, // which action was selected
  actionStartDate: { type: Date },
  actionCompletionDate: { type: Date },
  
  // Post-action learning
  outcome: {
    rating: { type: String, enum: ['Worked', 'Partially Worked', 'Did Not Work'] },
    timeToNormalization: { type: Number }, // days until metrics returned to baseline
    notes: { type: String },
    recordedAt: { type: Date }
  },
  
  // Metadata
  firstDetected: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  ignoredAt: { type: Date },
  ignoredReason: { type: String }
  
}, { timestamps: true });

// Indexes for common queries
signalSchema.index({ orgId: 1, teamId: 1, status: 1 });
signalSchema.index({ orgId: 1, severity: 1, status: 1 });
signalSchema.index({ owner: 1, status: 1 });

// Update lastUpdated on save
signalSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model('Signal', signalSchema);
