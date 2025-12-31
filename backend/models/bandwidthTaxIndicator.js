import mongoose from 'mongoose';

/**
 * Bandwidth Tax Indicator (BTI)
 * Detects cognitive overload masked by responsiveness
 * 
 * Triggers:
 * - Faster response times (paradoxically negative when combined with other signals)
 * - Rising after-hours activity
 * - Shrinking uninterrupted focus blocks
 * 
 * States:
 * - Low tax: Sustainable cognitive load, healthy focus patterns
 * - Moderate tax: Increasing interruptions, some capacity strain
 * - Severe tax: Cognitive overload, decision quality at risk
 */
const bandwidthTaxIndicatorSchema = new mongoose.Schema({
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
  
  // Raw inputs
  avgResponseTimeHours: { type: Number, required: true, default: 0 },
  afterHoursActivityPercent: { type: Number, required: true, default: 0 }, // 0-100
  avgFocusBlockMinutes: { type: Number, required: true, default: 120 }, // average uninterrupted block
  interruptionsPerDay: { type: Number, required: true, default: 0 },
  
  // Calculated bandwidth tax score (0-100, higher = worse)
  bandwidthTaxScore: { type: Number, required: true, default: 0 },
  
  // BTI State
  state: {
    type: String,
    enum: ['Low tax', 'Moderate tax', 'Severe tax'],
    required: true,
    default: 'Low tax'
  },
  
  // Triggers detected
  triggers: [{
    name: { type: String, required: true },
    detected: { type: Boolean, default: false },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    description: { type: String }
  }],
  
  // Drivers (what's consuming bandwidth)
  drivers: [{
    name: { type: String, required: true },
    contribution: { type: Number }, // percentage
    value: { type: Number },
    change: { type: String }
  }],
  
  // Context and interpretation
  interpretation: {
    type: String,
    default: 'Bandwidth Tax reflects how much cognitive capacity is consumed by constant interruptions and urgency. High tax reduces decision quality even when output appears stable.'
  },
  
  // Impact indicators
  impactIndicators: {
    decisionQualityRisk: { type: Boolean, default: false },
    sustainabilityRisk: { type: Boolean, default: false },
    burnoutRisk: { type: Boolean, default: false }
  },
  
  // Recommended actions
  recommendedActions: [{
    action: { type: String },
    expectedEffect: { type: String },
    reversibility: { type: String },
    timebound: { type: String }
  }],
  
  // Baseline comparison
  baseline: {
    bandwidthTaxScore: { type: Number },
    state: { type: String },
    date: { type: Date }
  },
  
  // Deviation from baseline
  deviation: {
    absolute: { type: Number },
    percent: { type: Number },
    trend: { type: String, enum: ['improving', 'stable', 'worsening'] }
  }
  
}, { timestamps: true });

// Indexes for efficient queries
bandwidthTaxIndicatorSchema.index({ teamId: 1, periodStart: -1 });
bandwidthTaxIndicatorSchema.index({ orgId: 1, periodStart: -1 });
bandwidthTaxIndicatorSchema.index({ state: 1, periodStart: -1 });

// Calculate bandwidth tax before saving
bandwidthTaxIndicatorSchema.pre('save', function(next) {
  // Calculate bandwidth tax score (weighted composite)
  let score = 0;
  
  // Response time paradox: faster responses under load = bad (25% weight)
  if (this.avgResponseTimeHours < 2 && this.afterHoursActivityPercent > 20) {
    score += 25;
  } else if (this.avgResponseTimeHours < 4) {
    score += 15;
  }
  
  // After-hours activity (30% weight)
  score += (this.afterHoursActivityPercent / 100) * 30;
  
  // Focus block degradation (30% weight)
  if (this.avgFocusBlockMinutes < 30) {
    score += 30;
  } else if (this.avgFocusBlockMinutes < 60) {
    score += 20;
  } else if (this.avgFocusBlockMinutes < 90) {
    score += 10;
  }
  
  // Interruptions (15% weight)
  if (this.interruptionsPerDay > 20) {
    score += 15;
  } else if (this.interruptionsPerDay > 10) {
    score += 10;
  } else if (this.interruptionsPerDay > 5) {
    score += 5;
  }
  
  this.bandwidthTaxScore = Math.min(Math.round(score), 100);
  
  // Determine state
  if (this.bandwidthTaxScore < 30) {
    this.state = 'Low tax';
  } else if (this.bandwidthTaxScore >= 30 && this.bandwidthTaxScore < 60) {
    this.state = 'Moderate tax';
  } else {
    this.state = 'Severe tax';
  }
  
  // Set impact indicators
  this.impactIndicators.decisionQualityRisk = this.bandwidthTaxScore >= 60;
  this.impactIndicators.sustainabilityRisk = this.bandwidthTaxScore >= 50;
  this.impactIndicators.burnoutRisk = this.bandwidthTaxScore >= 70;
  
  next();
});

export default mongoose.model('BandwidthTaxIndicator', bandwidthTaxIndicatorSchema);
