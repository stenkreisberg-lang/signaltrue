import mongoose from 'mongoose';

/**
 * Manager Effectiveness Model
 * Measures manager quality through behavioral outcomes (no 360 surveys)
 * Tracks team health, 1:1 consistency, responsiveness, meeting load
 */
const managerEffectivenessSchema = new mongoose.Schema({
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Overall effectiveness score
  effectivenessScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  effectivenessLevel: {
    type: String,
    enum: ['excellent', 'good', 'needs-improvement', 'critical'],
    required: true
  },
  
  // Calendar metrics (from Google/Outlook)
  calendarMetrics: {
    oneOnOneConsistency: {
      type: Number, // 0-1 score (1 = perfect consistency)
      min: 0,
      max: 1
    },
    oneOnOneFrequency: {
      type: String, // "weekly", "biweekly", "monthly"
    },
    expectedOneOnOnes: {
      type: Number // based on team size
    },
    actualOneOnOnes: {
      type: Number
    },
    teamMeetingLoad: {
      type: Number, // hours per week
    },
    lastMinuteCancellations: {
      type: Number // count in last 30 days
    }
  },
  
  // Slack metrics
  slackMetrics: {
    responseToTeamHours: {
      type: Number // avg hours to respond to direct reports
    },
    messageToTeamRatio: {
      type: Number // % of messages sent to team vs others
    },
    recognitionRate: {
      type: Number // kudos/thanks per week
    },
    escalationBypass: {
      type: Number // times team escalated over manager
    }
  },
  
  // Team outcome metrics
  teamOutcomes: {
    teamHealthTrend: {
      type: Number // % change in team BDI/drift
    },
    teamRetention: {
      type: Number // % (12-month rolling)
    },
    teamAttritionRisk: {
      type: Number // avg risk score of team members
    },
    teamEngagement: {
      type: Number // derived from participation metrics
    }
  },
  
  // Comparative benchmarks
  benchmarks: {
    orgAvgEffectiveness: {
      type: Number
    },
    orgAvgTeamHealth: {
      type: Number
    },
    orgAvgRetention: {
      type: Number
    }
  },
  
  // Analysis
  strengths: [{
    area: { type: String },
    score: { type: Number },
    description: { type: String }
  }],
  
  improvementAreas: [{
    area: { type: String },
    score: { type: Number },
    impact: { type: String },
    recommendation: { type: String }
  }],
  
  verdict: {
    type: String
  },
  
  // Coaching tracking
  coachingRecommended: {
    type: Boolean,
    default: false
  },
  coachingTopics: [{
    type: String
  }],
  
  lastReviewDate: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

// Indexes
managerEffectivenessSchema.index({ managerId: 1, createdAt: -1 });
managerEffectivenessSchema.index({ orgId: 1, effectivenessScore: 1 });
managerEffectivenessSchema.index({ effectivenessLevel: 1 });

// Methods
managerEffectivenessSchema.methods.calculateEffectivenessLevel = function() {
  if (this.effectivenessScore >= 80) {
    this.effectivenessLevel = 'excellent';
  } else if (this.effectivenessScore >= 65) {
    this.effectivenessLevel = 'good';
  } else if (this.effectivenessScore >= 45) {
    this.effectivenessLevel = 'needs-improvement';
  } else {
    this.effectivenessLevel = 'critical';
  }
};

export default mongoose.model('ManagerEffectiveness', managerEffectivenessSchema);
