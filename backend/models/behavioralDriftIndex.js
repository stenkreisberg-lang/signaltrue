import mongoose from 'mongoose';

/**
 * Behavioral Drift Index (BDI) - Enhanced Version
 * Single, named, defensible index that exposes drift instead of scattered signals
 * 
 * Inputs (6 signals):
 * 1. Meeting Load
 * 2. After-Hours Activity
 * 3. Response Time
 * 4. Async Participation
 * 5. Focus Time
 * 6. Collaboration Breadth
 * 
 * Compare current 14-30 day window to learned baseline (first 30 days)
 * Drift triggers when 3 or more signals deviate in the same negative direction
 * 
 * Output States:
 * - Stable: No significant drift detected
 * - Early Drift: 2-3 signals deviating, early warning
 * - Developing Drift: 3-4 signals deviating, sustained pattern
 * - Critical Drift: 4+ signals deviating, urgent intervention needed
 */
const behavioralDriftIndexSchema = new mongoose.Schema({
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
  
  // Time period
  periodStart: { type: Date, required: true, index: true },
  periodEnd: { type: Date, required: true },
  
  // 6 Input Signals (current values)
  signals: {
    meetingLoad: { 
      value: { type: Number, required: true, default: 0 }, // hours per week
      deviating: { type: Boolean, default: false },
      direction: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
    },
    afterHoursActivity: { 
      value: { type: Number, required: true, default: 0 }, // percentage 0-100
      deviating: { type: Boolean, default: false },
      direction: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
    },
    responseTime: { 
      value: { type: Number, required: true, default: 0 }, // hours
      deviating: { type: Boolean, default: false },
      direction: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
    },
    asyncParticipation: { 
      value: { type: Number, required: true, default: 0 }, // message count
      deviating: { type: Boolean, default: false },
      direction: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
    },
    focusTime: { 
      value: { type: Number, required: true, default: 0 }, // hours per week
      deviating: { type: Boolean, default: false },
      direction: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
    },
    collaborationBreadth: { 
      value: { type: Number, required: true, default: 0 }, // unique collaborators
      deviating: { type: Boolean, default: false },
      direction: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' }
    }
  },
  
  // Drift State
  state: {
    type: String,
    enum: ['Stable', 'Early Drift', 'Developing Drift', 'Critical Drift'],
    required: true,
    default: 'Stable'
  },
  
  // Drift metrics
  deviatingSignalsCount: { type: Number, default: 0 },
  negativeSignalsCount: { type: Number, default: 0 },
  driftScore: { type: Number, default: 0 }, // 0-100
  
  // Top drivers (ranked by contribution)
  topDrivers: [{
    signal: { type: String, required: true },
    contribution: { type: Number }, // percentage
    currentValue: { type: Number },
    baselineValue: { type: Number },
    change: { type: String }
  }],
  
  // Context and interpretation
  interpretation: {
    type: String,
    default: 'Behavioral Drift Index shows whether a team\'s working patterns are changing compared to their own historical baseline. It detects early coordination and capacity issues before outcomes are affected.'
  },
  
  // One-sentence summary
  summary: { type: String },
  
  // Baseline (first 30 days)
  baseline: {
    meetingLoad: { type: Number },
    afterHoursActivity: { type: Number },
    responseTime: { type: Number },
    asyncParticipation: { type: Number },
    focusTime: { type: Number },
    collaborationBreadth: { type: Number },
    establishedDate: { type: Date },
    sampleSize: { type: Number } // number of days used for baseline
  },
  
  // Deviation thresholds
  thresholds: {
    meetingLoad: { type: Number, default: 20 }, // percent change
    afterHoursActivity: { type: Number, default: 30 },
    responseTime: { type: Number, default: 25 },
    asyncParticipation: { type: Number, default: 20 },
    focusTime: { type: Number, default: 20 },
    collaborationBreadth: { type: Number, default: 25 }
  },
  
  // Confidence score (from Signal Confidence Score system)
  confidence: {
    score: { type: Number, default: 0 }, // 0-100
    level: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
    confirmingSignals: { type: Number, default: 0 },
    durationDays: { type: Number, default: 0 },
    confounders: [{ type: String }] // e.g., "holiday period", "onboarding spike", "incident"
  },
  
  // Recommended playbooks
  recommendedPlaybooks: [{
    playbookId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriftPlaybook' },
    name: { type: String },
    why: { type: String },
    expectedEffect: { type: String },
    reversibility: { type: String },
    timebound: { type: String }
  }]
  
}, { timestamps: true });

// Indexes
behavioralDriftIndexSchema.index({ teamId: 1, periodStart: -1 });
behavioralDriftIndexSchema.index({ orgId: 1, periodStart: -1 });
behavioralDriftIndexSchema.index({ state: 1, periodStart: -1 });

// Calculate drift before saving
behavioralDriftIndexSchema.pre('save', function(next) {
  if (!this.baseline || !this.baseline.establishedDate) {
    // Can't calculate drift without baseline
    this.state = 'Stable';
    this.summary = 'Baseline being established';
    return next();
  }
  
  const signals = this.signals;
  const baseline = this.baseline;
  const thresholds = this.thresholds;
  
  let deviatingCount = 0;
  let negativeCount = 0;
  const drivers = [];
  
  // Check each signal for deviation
  const signalKeys = ['meetingLoad', 'afterHoursActivity', 'responseTime', 'asyncParticipation', 'focusTime', 'collaborationBreadth'];
  
  signalKeys.forEach(key => {
    const current = signals[key].value;
    const base = baseline[key];
    
    if (base && base > 0) {
      const percentChange = ((current - base) / base) * 100;
      const threshold = thresholds[key];
      
      // Determine if deviating
      if (Math.abs(percentChange) > threshold) {
        signals[key].deviating = true;
        deviatingCount++;
        
        // Determine direction (what's negative depends on signal)
        let direction = 'neutral';
        if (key === 'meetingLoad' || key === 'afterHoursActivity' || key === 'responseTime') {
          // Higher is negative
          direction = percentChange > 0 ? 'negative' : 'positive';
        } else {
          // Lower is negative (focusTime, asyncParticipation, collaborationBreadth)
          direction = percentChange < 0 ? 'negative' : 'positive';
        }
        
        signals[key].direction = direction;
        
        if (direction === 'negative') {
          negativeCount++;
        }
        
        // Add to drivers
        drivers.push({
          signal: key,
          contribution: Math.abs(percentChange),
          currentValue: current,
          baselineValue: base,
          change: `${percentChange > 0 ? '+' : ''}${Math.round(percentChange)}%`
        });
      } else {
        signals[key].deviating = false;
        signals[key].direction = 'neutral';
      }
    }
  });
  
  // Sort drivers by contribution
  drivers.sort((a, b) => b.contribution - a.contribution);
  this.topDrivers = drivers.slice(0, 3);
  
  this.deviatingSignalsCount = deviatingCount;
  this.negativeSignalsCount = negativeCount;
  
  // Calculate drift score (weighted by negative signals)
  this.driftScore = Math.min(Math.round((negativeCount / 6) * 100), 100);
  
  // Determine state
  if (negativeCount === 0 || negativeCount === 1) {
    this.state = 'Stable';
  } else if (negativeCount === 2) {
    this.state = 'Early Drift';
  } else if (negativeCount === 3 || negativeCount === 4) {
    this.state = 'Developing Drift';
  } else {
    this.state = 'Critical Drift';
  }
  
  // Generate summary
  if (negativeCount === 0) {
    this.summary = 'No significant drift detected. Team working patterns remain stable compared to baseline.';
  } else {
    const topDriver = this.topDrivers[0];
    this.summary = `${negativeCount} signal${negativeCount > 1 ? 's' : ''} showing negative drift, led by ${topDriver.signal} (${topDriver.change}).`;
  }
  
  next();
});

export default mongoose.model('BehavioralDriftIndex', behavioralDriftIndexSchema);
