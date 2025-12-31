import mongoose from 'mongoose';

/**
 * Capacity Status (Enhanced with Driver Explanations)
 * Makes Green / Yellow / Red actionable and defensible
 * 
 * Always shows drivers behind capacity state
 * Includes one-sentence explanation
 */
const capacityStatusSchema = new mongoose.Schema({
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
  
  // Capacity Status (Green / Yellow / Red)
  status: {
    type: String,
    enum: ['Green', 'Yellow', 'Red'],
    required: true,
    default: 'Green'
  },
  
  // Capacity score (0-100)
  capacityScore: { type: Number, required: true, default: 100 },
  
  // Drivers (what's affecting capacity)
  drivers: [{
    name: { type: String, required: true },
    direction: { type: String, enum: ['positive', 'negative'], required: true },
    contribution: { type: Number }, // percentage contribution
    value: { type: Number },
    change: { type: String }, // e.g., "↑ 25%", "↓ 15%"
    icon: { type: String } // e.g., "📅", "⏰", "💬"
  }],
  
  // One-sentence explanation
  explanation: {
    type: String,
    required: true
  },
  
  // Detailed interpretation
  interpretation: {
    type: String,
    default: 'Capacity reflects the team\'s ability to sustain current workload without long-term strain. Changes are driven by observable working patterns, not self-reported sentiment.'
  },
  
  // Input metrics
  metrics: {
    meetingLoad: { type: Number, default: 0 },
    focusTime: { type: Number, default: 0 },
    afterHoursActivity: { type: Number, default: 0 },
    responseTime: { type: Number, default: 0 },
    collaborationBreadth: { type: Number, default: 0 },
    asyncParticipation: { type: Number, default: 0 }
  },
  
  // Baseline comparison
  baseline: {
    capacityScore: { type: Number },
    status: { type: String },
    date: { type: Date }
  },
  
  // Deviation from baseline
  deviation: {
    absolute: { type: Number },
    percent: { type: Number },
    trend: { type: String, enum: ['improving', 'stable', 'declining'] }
  },
  
  // Recommended actions
  recommendedActions: [{
    action: { type: String },
    expectedEffect: { type: String },
    timebound: { type: String }
  }],
  
  // Warning flags
  warnings: [{
    type: { type: String },
    severity: { type: String, enum: ['info', 'warning', 'critical'] },
    message: { type: String }
  }]
  
}, { timestamps: true });

// Indexes
capacityStatusSchema.index({ teamId: 1, periodStart: -1 });
capacityStatusSchema.index({ orgId: 1, periodStart: -1 });
capacityStatusSchema.index({ status: 1, periodStart: -1 });

// Calculate capacity status before saving
capacityStatusSchema.pre('save', function(next) {
  const m = this.metrics;
  
  // Calculate capacity score (weighted composite)
  let score = 100;
  const drivers = [];
  
  // Meeting load impact (negative if > 15 hrs/week)
  if (m.meetingLoad > 15) {
    const impact = Math.min((m.meetingLoad - 15) * 2, 30);
    score -= impact;
    drivers.push({
      name: 'Meeting Load',
      direction: 'negative',
      contribution: impact,
      value: m.meetingLoad,
      change: `${m.meetingLoad.toFixed(1)} hrs/week`,
      icon: '📅'
    });
  }
  
  // Focus time impact (negative if < 10 hrs/week)
  if (m.focusTime < 10) {
    const impact = Math.min((10 - m.focusTime) * 2, 25);
    score -= impact;
    drivers.push({
      name: 'Focus Time',
      direction: 'negative',
      contribution: impact,
      value: m.focusTime,
      change: `${m.focusTime.toFixed(1)} hrs/week`,
      icon: '🎯'
    });
  }
  
  // After-hours activity impact (negative if > 20%)
  if (m.afterHoursActivity > 20) {
    const impact = Math.min((m.afterHoursActivity - 20) * 1.5, 25);
    score -= impact;
    drivers.push({
      name: 'After-Hours Activity',
      direction: 'negative',
      contribution: impact,
      value: m.afterHoursActivity,
      change: `${m.afterHoursActivity.toFixed(0)}%`,
      icon: '⏰'
    });
  }
  
  // Response time impact (negative if > 8 hrs)
  if (m.responseTime > 8) {
    const impact = Math.min((m.responseTime - 8) * 1, 15);
    score -= impact;
    drivers.push({
      name: 'Response Time',
      direction: 'negative',
      contribution: impact,
      value: m.responseTime,
      change: `${m.responseTime.toFixed(1)} hrs`,
      icon: '💬'
    });
  }
  
  // Sort drivers by contribution
  drivers.sort((a, b) => b.contribution - a.contribution);
  this.drivers = drivers.slice(0, 3);
  
  this.capacityScore = Math.max(Math.round(score), 0);
  
  // Determine status
  if (this.capacityScore >= 75) {
    this.status = 'Green';
  } else if (this.capacityScore >= 50) {
    this.status = 'Yellow';
  } else {
    this.status = 'Red';
  }
  
  // Generate explanation
  if (this.status === 'Green') {
    this.explanation = 'Team capacity is healthy. Working patterns are sustainable.';
  } else if (this.status === 'Yellow') {
    if (this.drivers.length > 0) {
      const topDriver = this.drivers[0];
      this.explanation = `Capacity under moderate strain, driven by ${topDriver.name} (${topDriver.change}).`;
    } else {
      this.explanation = 'Capacity under moderate strain. Monitor for further changes.';
    }
  } else {
    if (this.drivers.length > 0) {
      const topDrivers = this.drivers.slice(0, 2).map(d => d.name).join(' and ');
      this.explanation = `Capacity under severe strain, driven by ${topDrivers}. Intervention recommended.`;
    } else {
      this.explanation = 'Capacity under severe strain. Immediate intervention recommended.';
    }
  }
  
  // Set trend
  if (this.baseline && this.baseline.capacityScore) {
    const change = this.capacityScore - this.baseline.capacityScore;
    this.deviation.absolute = change;
    this.deviation.percent = (change / this.baseline.capacityScore) * 100;
    
    if (change > 5) {
      this.deviation.trend = 'improving';
    } else if (change < -5) {
      this.deviation.trend = 'declining';
    } else {
      this.deviation.trend = 'stable';
    }
  }
  
  next();
});

export default mongoose.model('CapacityStatus', capacityStatusSchema);
