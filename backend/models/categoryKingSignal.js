import mongoose from 'mongoose';

/**
 * CategoryKingSignal model - Research-backed causal signals
 * 
 * Per Category-King spec:
 * - Translates "activity exhaust" into Demand → Recovery → Progress signals
 * - Based on JD-R model (Job Demands-Resources)
 * - Each signal has severity (0-100), confidence (0-100), explanation, actions
 */

const categoryKingSignalSchema = new mongoose.Schema({
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
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Date range this signal covers
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  
  // Signal identification
  signalType: {
    type: String,
    required: true,
    enum: [
      // Sprint 1: Jira/Asana signals
      'execution_stagnation',
      'rework_spiral',
      'overcommitment_risk',
      'wip_overload',
      
      // Sprint 2: Gmail/Meet signals
      'boundary_erosion',
      'panic_coordination',
      'meeting_fatigue',
      'response_drift',
      
      // Sprint 3: Notion signals
      'decision_churn',
      'documentation_decay',
      'cognitive_overload',
      
      // Sprint 4: CRM signals
      'external_pressure_injection',
      'escalation_cascade',
      'handoff_spike',
      
      // Cross-source composite signals
      'recovery_collapse',
      'work_aging_pressure',
      'systemic_overload',
      
      // Basecamp signals (optional)
      'passive_disengagement',
      'async_breakdown'
    ],
    index: true
  },
  
  // Signal category for grouping
  signalCategory: {
    type: String,
    required: true,
    enum: ['demand', 'recovery', 'progress', 'external_pressure', 'coordination'],
    index: true
  },
  
  // Human-readable title
  title: {
    type: String,
    required: true
  },
  
  // Severity (0-100) - computed from robust-z scores
  severity: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Severity level for display
  severityLevel: {
    type: String,
    enum: ['low', 'moderate', 'elevated', 'high', 'critical'],
    default: 'moderate'
  },
  
  // Confidence (0-100) - based on data coverage and triangulation
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Confidence breakdown
  confidenceFactors: {
    dataSourcesCoverage: { type: Number, default: 0 },   // 0-25 points
    userMappingCoverage: { type: Number, default: 0 },   // 0-25 points
    triangulation: { type: Number, default: 0 },         // 0-25 points (>=2 sources agree)
    trendConsistency: { type: Number, default: 0 }       // 0-25 points (persists 14+ days)
  },
  
  // Plain language explanation (templated, no content)
  explanation: {
    type: String,
    required: true
  },
  
  // What changed (numeric deltas)
  whatChanged: [{
    metric: String,
    label: String,
    previousValue: Number,
    currentValue: Number,
    delta: Number,
    deltaPercent: Number,
    direction: { type: String, enum: ['up', 'down', 'stable'] }
  }],
  
  // Likely drivers (top 2 sources)
  drivers: [{
    source: String,          // 'jira', 'gmail', etc.
    contribution: Number,    // 0-100 percentage
    description: String
  }],
  
  // Recommended action playbook (3 bullets per spec)
  recommendedActions: [{
    action: String,
    priority: { type: Number, min: 1, max: 3 },
    effort: { type: String, enum: ['low', 'medium', 'high'] },
    expectedImpact: String,
    timeframe: String        // e.g., "1-2 weeks"
  }],
  
  // Watchlist (teams/users impacted)
  watchlist: {
    teams: [{
      teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      teamName: String,
      severity: Number
    }],
    users: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      displayName: String,
      severity: Number
    }]
  },
  
  // Research backing (for credibility)
  researchBacking: {
    model: String,           // e.g., 'JD-R model', 'Meeting fatigue research'
    citation: String,        // Brief reference
    link: String             // Optional URL to research
  },
  
  // Trigger conditions (what caused this signal to fire)
  triggerConditions: [{
    metric: String,
    operator: { type: String, enum: ['>=', '<=', '>', '<', '==', 'rising', 'falling'] },
    threshold: Number,
    actualValue: Number,
    met: Boolean
  }],
  
  // Data sources that contributed to this signal
  sources: [{
    type: String,
    enum: ['jira', 'asana', 'gmail', 'meet', 'notion', 'hubspot', 'pipedrive', 'basecamp', 'slack', 'calendar']
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'in_progress', 'resolved', 'dismissed'],
    default: 'active',
    index: true
  },
  
  // Tracking
  firstDetectedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  acknowledgedAt: Date,
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dismissedAt: Date,
  dismissedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dismissedReason: String,
  
  // Trend data (for showing persistence)
  trendDays: {
    type: Number,
    default: 0
  },
  isRising: Boolean,
  isSustained: Boolean      // True if persists 14+ days
  
}, { timestamps: true });

// Indexes for common queries
categoryKingSignalSchema.index({ orgId: 1, status: 1, severity: -1 });
categoryKingSignalSchema.index({ orgId: 1, teamId: 1, status: 1 });
categoryKingSignalSchema.index({ orgId: 1, signalType: 1, status: 1 });
categoryKingSignalSchema.index({ orgId: 1, signalCategory: 1, status: 1 });

// Pre-save hook to update lastUpdatedAt and compute severityLevel
categoryKingSignalSchema.pre('save', function(next) {
  this.lastUpdatedAt = new Date();
  
  // Compute severity level from score
  if (this.severity >= 80) {
    this.severityLevel = 'critical';
  } else if (this.severity >= 65) {
    this.severityLevel = 'high';
  } else if (this.severity >= 50) {
    this.severityLevel = 'elevated';
  } else if (this.severity >= 35) {
    this.severityLevel = 'moderate';
  } else {
    this.severityLevel = 'low';
  }
  
  next();
});

export default mongoose.model('CategoryKingSignal', categoryKingSignalSchema);
