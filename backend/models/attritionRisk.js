import mongoose from 'mongoose';

/**
 * Attrition Risk Model
 * Tracks individual flight risk based on behavioral collapse patterns
 * Privacy-aware: HR sees full details, managers see aggregated team risk
 */
const attritionRiskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
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
  
  // Overall risk score
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  
  // Slack behavioral indicators
  slackSignals: {
    messageVolumeDrop: {
      baseline: { type: Number },
      current: { type: Number },
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    responseTimeIncrease: {
      baselineHours: { type: Number },
      currentHours: { type: Number },
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    networkShrinkage: {
      baselineContacts: { type: Number },
      currentContacts: { type: Number },
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    emojiUsageDrop: {
      baseline: { type: Number },
      current: { type: Number },
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    threadParticipationDrop: {
      baseline: { type: Number },
      current: { type: Number },
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    }
  },
  
  // Calendar behavioral indicators
  calendarSignals: {
    meetingDeclineRate: {
      baseline: { type: Number },
      current: { type: Number },
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    calendarPurge: {
      recurringDeleted: { type: Number, default: 0 },
      detected: { type: Boolean, default: false }
    },
    oneOnOneCancellations: {
      count: { type: Number, default: 0 },
      timeframe: { type: String, default: '2 weeks' },
      detected: { type: Boolean, default: false }
    },
    workingHoursCleared: {
      detected: { type: Boolean, default: false }
    }
  },
  
  // Aggregated analysis
  behavioralIndicators: [{
    signal: { type: String },
    value: { type: String },
    weight: { type: Number },
    contribution: { type: Number }
  }],
  
  // Prediction
  predictedExitWindow: {
    type: String,
    enum: ['30-60 days', '60-90 days', '90-180 days', 'unknown']
  },
  confidence: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Time tracking
  daysInHighRisk: {
    type: Number,
    default: 0
  },
  firstDetected: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Intervention tracking
  hrNotified: {
    type: Boolean,
    default: false
  },
  hrNotifiedAt: {
    type: Date
  },
  interventionTaken: {
    type: Boolean,
    default: false
  },
  interventionNotes: {
    type: String
  },
  
  // Outcome tracking (for learning)
  outcome: {
    type: String,
    enum: ['stayed', 'departed', 'pending'],
    default: 'pending'
  },
  departureDate: {
    type: Date
  }
  
}, { timestamps: true });

// Indexes
attritionRiskSchema.index({ userId: 1, createdAt: -1 });
attritionRiskSchema.index({ teamId: 1, riskLevel: 1 });
attritionRiskSchema.index({ orgId: 1, riskScore: -1 });
attritionRiskSchema.index({ outcome: 1 });

// Methods
attritionRiskSchema.methods.calculateRiskLevel = function() {
  if (this.riskScore >= 80) {
    this.riskLevel = 'critical';
  } else if (this.riskScore >= 60) {
    this.riskLevel = 'high';
  } else if (this.riskScore >= 40) {
    this.riskLevel = 'medium';
  } else {
    this.riskLevel = 'low';
  }
};

attritionRiskSchema.methods.shouldNotifyHR = function() {
  return this.riskLevel === 'critical' && !this.hrNotified;
};

export default mongoose.model('AttritionRisk', attritionRiskSchema);
