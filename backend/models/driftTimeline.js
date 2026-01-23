import mongoose from 'mongoose';

/**
 * Drift Timeline
 * Helps HR justify early intervention
 * 
 * Shows:
 * - Baseline establishment
 * - First signal detected
 * - Drift escalation
 * - Action taken
 * - Post-action impact
 */
const driftTimelineSchema = new mongoose.Schema({
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
  
  // Timeline identifier
  timelineId: { type: String, required: true, unique: true },
  
  // Timeline status
  status: {
    type: String,
    enum: ['Active', 'Resolved', 'Monitoring'],
    default: 'Active'
  },
  
  // Events in chronological order
  events: [{
    phase: {
      type: String,
      enum: ['Baseline', 'First Signal', 'Escalation', 'Action Taken', 'Post-Action', 'Resolution'],
      required: true
    },
    timestamp: { type: Date, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    
    // Event details
    details: {
      signals: [{
        name: { type: String },
        value: { type: Number },
        change: { type: String }
      }],
      driftState: { type: String },
      capacityStatus: { type: String },
      confidenceLevel: { type: String }
    },
    
    // Action details (if applicable)
    action: {
      playbookId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriftPlaybook' },
      playbookName: { type: String },
      actionTaken: { type: String },
      takenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      expectedEffect: { type: String }
    },
    
    // Impact details (if applicable)
    impact: {
      metricsImproved: [{ type: String }],
      metricsDegraded: [{ type: String }],
      overallEffect: { type: String, enum: ['Positive', 'Neutral', 'Negative'] }
    },
    
    // Metadata
    icon: { type: String }, // emoji for visual timeline
    severity: { type: String, enum: ['info', 'warning', 'critical'] }
  }],
  
  // Summary
  summary: {
    firstDetected: { type: Date },
    daysActive: { type: Number, default: 0 },
    peakDriftState: { type: String },
    actionsTaken: { type: Number, default: 0 },
    currentState: { type: String },
    outcome: { type: String }
  },
  
  // Metadata
  isArchived: { type: Boolean, default: false }
  
}, { timestamps: true });

// Indexes
driftTimelineSchema.index({ teamId: 1, createdAt: -1 });
driftTimelineSchema.index({ orgId: 1, status: 1 });
// timelineId already has unique: true which creates an index

// Update summary before saving
driftTimelineSchema.pre('save', function(next) {
  if (this.events && this.events.length > 0) {
    // Find first detection
    const firstSignal = this.events.find(e => e.phase === 'First Signal');
    if (firstSignal) {
      this.summary.firstDetected = firstSignal.timestamp;
    }
    
    // Calculate days active
    const now = new Date();
    if (this.summary.firstDetected) {
      this.summary.daysActive = Math.floor((now - this.summary.firstDetected) / (1000 * 60 * 60 * 24));
    }
    
    // Count actions
    this.summary.actionsTaken = this.events.filter(e => e.phase === 'Action Taken').length;
    
    // Get current state
    const latestEvent = this.events[this.events.length - 1];
    if (latestEvent.details && latestEvent.details.driftState) {
      this.summary.currentState = latestEvent.details.driftState;
    }
    
    // Find peak drift state
    const driftStateOrder = ['Stable', 'Early Drift', 'Developing Drift', 'Critical Drift'];
    let maxDriftIndex = 0;
    this.events.forEach(e => {
      if (e.details && e.details.driftState) {
        const index = driftStateOrder.indexOf(e.details.driftState);
        if (index > maxDriftIndex) {
          maxDriftIndex = index;
          this.summary.peakDriftState = e.details.driftState;
        }
      }
    });
  }
  
  next();
});

export default mongoose.model('DriftTimeline', driftTimelineSchema);
