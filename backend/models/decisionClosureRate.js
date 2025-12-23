import mongoose from 'mongoose';

/**
 * Decision Closure Rate (DCR) - Core Capability Indicator
 * Measures whether collaboration produces outcomes with measurable clarity
 * 
 * Calculation: (Meetings with clear next step + Messages with response) / Total collaboration events
 * High DCR = collaboration is generating clarity
 * Low DCR = activity without outcomes (coordination theater)
 */
const decisionClosureRateSchema = new mongoose.Schema({
  orgId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Organization',
    required: true,
    index: true
  },
  teamId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Team',
    index: true
  },
  
  // Time period for calculation
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
  },
  
  // DCR Score (0-100)
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Calculation components
  components: {
    // Meetings with clear outcomes
    meetings: {
      total: { type: Number, default: 0 },
      withActionItems: { type: Number, default: 0 },
      withFollowUpScheduled: { type: Number, default: 0 },
      withDecisions: { type: Number, default: 0 },
      closureRate: { type: Number, default: 0 } // percentage
    },
    
    // Messages with responses
    messages: {
      total: { type: Number, default: 0 },
      withResponse: { type: Number, default: 0 },
      avgResponseTime: { type: Number }, // in hours
      responseRate: { type: Number, default: 0 } // percentage
    },
    
    // Thread resolution
    threads: {
      total: { type: Number, default: 0 },
      resolved: { type: Number, default: 0 },
      abandoned: { type: Number, default: 0 },
      resolutionRate: { type: Number, default: 0 } // percentage
    }
  },
  
  // Baseline comparison
  baseline: {
    score: { type: Number },
    delta: { type: Number }, // difference from baseline
    deltaPercent: { type: Number } // percentage difference
  },
  
  // Trend analysis
  trend: {
    direction: { type: String, enum: ['improving', 'stable', 'declining'] },
    velocity: { type: Number }, // rate of change per week
    sustained: { type: Number } // days trend has been sustained
  },
  
  // Quality indicators
  quality: {
    avgMeetingDuration: { type: Number }, // minutes
    avgThreadLength: { type: Number }, // number of messages
    decisionToActionTime: { type: Number }, // hours from decision to first action
    reopenedThreads: { type: Number } // decisions that got revisited
  },
  
  // Behavioral signals (what drives the score)
  signals: [{
    type: { type: String }, // e.g., 'long-meetings-low-output', 'orphaned-threads'
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    description: { type: String }
  }],
  
  // Metadata
  dataSource: {
    slack: { type: Boolean, default: false },
    googleCalendar: { type: Boolean, default: false },
    microsoftTeams: { type: Boolean, default: false }
  },
  
  confidence: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  },
  
}, { timestamps: true });

// Indexes for efficient queries
decisionClosureRateSchema.index({ orgId: 1, 'period.start': -1 });
decisionClosureRateSchema.index({ teamId: 1, 'period.start': -1 });
decisionClosureRateSchema.index({ score: 1 });
decisionClosureRateSchema.index({ createdAt: -1 });

// Virtual for human-readable interpretation
decisionClosureRateSchema.virtual('interpretation').get(function() {
  if (this.score >= 75) return 'High clarity: Collaboration is producing clear outcomes';
  if (this.score >= 50) return 'Moderate clarity: Some coordination theater present';
  return 'Low clarity: High risk of coordination theater';
});

export default mongoose.model('DecisionClosureRate', decisionClosureRateSchema);
