import mongoose from 'mongoose';

/**
 * Silence Risk Indicator (SRI)
 * Detects reduced voice and communication friction without claiming psychological safety
 * 
 * Proxies Used:
 * - Declining async contributions (messages, threads, reactions)
 * - Narrowing collaboration network (fewer unique interactions)
 * - Slower upward responses (responses to leadership)
 * - Flattening sentiment variance (less emotional range in comms)
 * 
 * States:
 * - Low Silence Risk: Healthy communication patterns, diverse collaboration
 * - Rising Silence Risk: Early signs of withdrawal or friction
 * - High Silence Risk: Significant reduction in voice and contribution
 */
const silenceRiskIndicatorSchema = new mongoose.Schema({
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
  
  // Raw inputs (proxies for silence)
  asyncContributionCount: { type: Number, required: true, default: 0 }, // messages, threads, reactions
  uniqueCollaborators: { type: Number, required: true, default: 0 }, // number of unique people interacted with
  upwardResponseTimeHours: { type: Number, required: true, default: 0 }, // response time to leadership
  sentimentVariance: { type: Number, required: true, default: 0.5 }, // 0-1, higher = more emotional range
  
  // Calculated silence risk score (0-100, higher = worse)
  silenceRiskScore: { type: Number, required: true, default: 0 },
  
  // SRI State
  state: {
    type: String,
    enum: ['Low Silence Risk', 'Rising Silence Risk', 'High Silence Risk'],
    required: true,
    default: 'Low Silence Risk'
  },
  
  // Proxies detected
  proxies: [{
    name: { type: String, required: true },
    detected: { type: Boolean, default: false },
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    description: { type: String }
  }],
  
  // Drivers (what's driving silence)
  drivers: [{
    name: { type: String, required: true },
    contribution: { type: Number }, // percentage
    value: { type: Number },
    change: { type: String }
  }],
  
  // Context and interpretation
  interpretation: {
    type: String,
    default: 'Silence Risk highlights patterns where people contribute less or avoid sharing input, often before issues surface openly.'
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
    asyncContributionCount: { type: Number },
    uniqueCollaborators: { type: Number },
    upwardResponseTimeHours: { type: Number },
    sentimentVariance: { type: Number },
    silenceRiskScore: { type: Number },
    state: { type: String },
    date: { type: Date }
  },
  
  // Deviation from baseline
  deviation: {
    asyncContributionChange: { type: Number }, // percentage
    collaborationNetworkChange: { type: Number }, // percentage
    upwardResponseChange: { type: Number }, // percentage
    sentimentVarianceChange: { type: Number }, // percentage
    trend: { type: String, enum: ['improving', 'stable', 'worsening'] }
  }
  
}, { timestamps: true });

// Indexes for efficient queries
silenceRiskIndicatorSchema.index({ teamId: 1, periodStart: -1 });
silenceRiskIndicatorSchema.index({ orgId: 1, periodStart: -1 });
silenceRiskIndicatorSchema.index({ state: 1, periodStart: -1 });

// Calculate silence risk before saving
silenceRiskIndicatorSchema.pre('save', function(next) {
  // Calculate silence risk score (weighted composite)
  let score = 0;
  
  // Declining async contributions (30% weight)
  if (this.baseline && this.baseline.asyncContributionCount) {
    const contributionChange = ((this.asyncContributionCount - this.baseline.asyncContributionCount) / this.baseline.asyncContributionCount) * 100;
    this.deviation.asyncContributionChange = contributionChange;
    
    if (contributionChange < -30) {
      score += 30;
    } else if (contributionChange < -15) {
      score += 20;
    } else if (contributionChange < -5) {
      score += 10;
    }
  }
  
  // Narrowing collaboration network (30% weight)
  if (this.baseline && this.baseline.uniqueCollaborators) {
    const networkChange = ((this.uniqueCollaborators - this.baseline.uniqueCollaborators) / this.baseline.uniqueCollaborators) * 100;
    this.deviation.collaborationNetworkChange = networkChange;
    
    if (networkChange < -25) {
      score += 30;
    } else if (networkChange < -15) {
      score += 20;
    } else if (networkChange < -5) {
      score += 10;
    }
  }
  
  // Slower upward responses (25% weight)
  if (this.baseline && this.baseline.upwardResponseTimeHours) {
    const responseChange = ((this.upwardResponseTimeHours - this.baseline.upwardResponseTimeHours) / this.baseline.upwardResponseTimeHours) * 100;
    this.deviation.upwardResponseChange = responseChange;
    
    if (responseChange > 50) {
      score += 25;
    } else if (responseChange > 25) {
      score += 15;
    } else if (responseChange > 10) {
      score += 8;
    }
  }
  
  // Flattening sentiment variance (15% weight)
  if (this.baseline && this.baseline.sentimentVariance) {
    const varianceChange = ((this.sentimentVariance - this.baseline.sentimentVariance) / this.baseline.sentimentVariance) * 100;
    this.deviation.sentimentVarianceChange = varianceChange;
    
    if (varianceChange < -40) {
      score += 15;
    } else if (varianceChange < -20) {
      score += 10;
    } else if (varianceChange < -10) {
      score += 5;
    }
  }
  
  this.silenceRiskScore = Math.min(Math.round(score), 100);
  
  // Determine state
  if (this.silenceRiskScore < 30) {
    this.state = 'Low Silence Risk';
  } else if (this.silenceRiskScore >= 30 && this.silenceRiskScore < 60) {
    this.state = 'Rising Silence Risk';
  } else {
    this.state = 'High Silence Risk';
  }
  
  // Determine trend
  if (this.silenceRiskScore < 20) {
    this.deviation.trend = 'improving';
  } else if (this.silenceRiskScore >= 60) {
    this.deviation.trend = 'worsening';
  } else {
    this.deviation.trend = 'stable';
  }
  
  next();
});

export default mongoose.model('SilenceRiskIndicator', silenceRiskIndicatorSchema);
