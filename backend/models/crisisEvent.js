import mongoose from 'mongoose';

/**
 * Crisis Event Model
 * Detects real-time anomalies requiring immediate intervention
 * Runs every 15 minutes (not daily like drift detection)
 */
const crisisEventSchema = new mongoose.Schema({
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
  
  crisisType: {
    type: String,
    enum: [
      'sudden_sentiment_collapse',
      'communication_shutdown',
      'mass_calendar_cancellation',
      'leadership_departure_shock',
      'conflict_spike'
    ],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Slack anomalies
  slackSignals: [{
    metric: { type: String },
    baseline: { type: Number },
    current: { type: Number },
    deviation: { type: Number }, // % change
    significance: { type: String } // 'low', 'medium', 'high'
  }],
  
  // Calendar anomalies
  calendarSignals: [{
    metric: { type: String },
    baseline: { type: Number },
    current: { type: Number },
    deviation: { type: Number }
  }],
  
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  
  likelyTriggers: [{
    type: String
  }],
  
  recommendedAction: {
    type: String
  },
  
  urgency: {
    type: String,
    enum: ['immediate', 'today', 'this-week'],
    default: 'today'
  },
  
  // Response tracking
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  },
  
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  },
  resolutionNotes: {
    type: String
  }
  
}, { timestamps: true });

// Indexes
crisisEventSchema.index({ teamId: 1, detectedAt: -1 });
crisisEventSchema.index({ orgId: 1, severity: 1, resolved: 1 });
crisisEventSchema.index({ resolved: 1, detectedAt: -1 });

export default mongoose.model('CrisisEvent', crisisEventSchema);
