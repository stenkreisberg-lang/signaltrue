import mongoose from 'mongoose';

const weeklyReportSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  periodStart: {
    type: Date,
    required: true,
    index: true
  },
  periodEnd: {
    type: Date,
    required: true,
    index: true
  },
  
  // BDI tracking
  bdiCurrent: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  bdiDelta: {
    type: Number,
    required: true
  },
  
  // Zone tracking
  zone: {
    type: String,
    enum: ['Stable', 'Stretched', 'Critical', 'Recovery'],
    required: true
  },
  zoneChanged: {
    type: Boolean,
    default: false
  },
  previousZone: {
    type: String,
    enum: ['Stable', 'Stretched', 'Critical', 'Recovery']
  },
  
  // New or worsening risks only
  newRisks: [{
    type: {
      type: String,
      enum: ['overload', 'execution', 'retention'],
      required: true
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    delta: {
      type: Number,
      required: true
    },
    previousScore: {
      type: Number,
      required: true
    },
    isNew: {
      type: Boolean,
      default: false
    }
  }],
  
  // Active or resolved crises this week
  activeCrises: [{
    crisisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CrisisEvent'
    },
    type: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'moderate'],
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      required: true
    },
    detectedAt: {
      type: Date,
      required: true
    },
    resolvedAt: Date
  }],
  
  // Top 1-3 risk drivers
  topDrivers: [{
    metric: {
      type: String,
      required: true
    },
    deviation: {
      type: Number,
      required: true
    },
    impact: {
      type: String,
      enum: ['high', 'medium'],
      required: true
    }
  }],
  
  // 1-3 AI recommendations (max)
  recommendations: [{
    actionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Action'
    },
    title: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium'],
      required: true
    },
    category: {
      type: String,
      enum: ['overload', 'execution', 'retention', 'crisis', 'network', 'equity'],
      required: true
    },
    expectedImpact: String
  }],
  
  // Flag if no action needed
  noActionNeeded: {
    type: Boolean,
    default: false
  },
  noActionReason: String,
  
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: false
});

// Indexes for efficient querying
weeklyReportSchema.index({ teamId: 1, periodEnd: -1 });
weeklyReportSchema.index({ createdAt: -1 });

// Instance method to check if report shows improvement
weeklyReportSchema.methods.showsImprovement = function() {
  return this.bdiDelta < 0 && this.newRisks.length === 0 && this.activeCrises.length === 0;
};

// Instance method to get severity
weeklyReportSchema.methods.getSeverity = function() {
  if (this.zone === 'Critical' || this.activeCrises.some(c => c.severity === 'critical')) {
    return 'critical';
  }
  if (this.newRisks.length >= 2 || this.bdiDelta >= 15) {
    return 'high';
  }
  if (this.newRisks.length === 1 || this.bdiDelta >= 5) {
    return 'medium';
  }
  return 'low';
};

// Static method to get latest report for team
weeklyReportSchema.statics.getLatestForTeam = async function(teamId) {
  return this.findOne({ teamId })
    .sort({ periodEnd: -1 })
    .populate('recommendations.actionId')
    .populate('activeCrises.crisisId');
};

// Static method to get report history
weeklyReportSchema.statics.getHistoryForTeam = async function(teamId, limit = 12) {
  return this.find({ teamId })
    .sort({ periodEnd: -1 })
    .limit(limit)
    .select('periodStart periodEnd bdiCurrent bdiDelta zone zoneChanged newRisks activeCrises');
};

const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);

export default WeeklyReport;
