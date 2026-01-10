import mongoose from 'mongoose';

const monthlyReportSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
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
  
  // Organization-level health metrics
  orgHealth: {
    avgBDI: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    bdiTrend: {
      type: String,
      enum: ['improving', 'stable', 'deteriorating'],
      required: true
    },
    trendStrength: {
      type: String,
      enum: ['strong', 'moderate', 'weak']
    },
    zoneDistribution: {
      stable: { type: Number, default: 0 },
      stretched: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      recovery: { type: Number, default: 0 }
    },
    teamsAtRisk: {
      type: Number,
      default: 0
    }
  },
  
  // Persistent risks (≥3 weeks in Yellow/Red)
  persistentRisks: [{
    riskType: {
      type: String,
      enum: ['overload', 'execution', 'retention'],
      required: true
    },
    weeksAboveThreshold: {
      type: Number,
      required: true
    },
    avgScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    affectedTeams: [{
      teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
      },
      teamName: String,
      score: Number
    }],
    classification: {
      type: String,
      enum: ['structural', 'episodic'],
      required: true
    }
  }],
  
  // Leadership signals
  leadershipSignals: {
    managerEffectiveness: {
      avgScore: {
        type: Number,
        min: 0,
        max: 100
      },
      managersCriticalCount: {
        type: Number,
        default: 0
      },
      managersNeedCoachingCount: {
        type: Number,
        default: 0
      },
      trend: {
        type: String,
        enum: ['improving', 'stable', 'deteriorating']
      }
    },
    equityScoreAvg: {
      type: Number,
      min: 0,
      max: 100
    },
    equityIssuesCount: {
      type: Number,
      default: 0
    },
    successionCriticalCount: {
      type: Number,
      default: 0
    },
    avgBusFactor: {
      type: Number,
      min: 0
    }
  },
  
  // Execution signals
  executionSignals: {
    executionDragAvg: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    highRiskProjectsCount: {
      type: Number,
      default: 0
    },
    meetingROILowPercent: {
      type: Number,
      min: 0,
      max: 100
    },
    decisionVelocity: {
      type: String,
      enum: ['fast', 'moderate', 'slow']
    },
    networkSiloScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Retention exposure
  retentionExposure: {
    avgAttritionRisk: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    criticalIndividualsCount: {
      type: Number,
      default: 0
    },
    highRiskIndividualsCount: {
      type: Number,
      default: 0
    },
    trend: {
      type: String,
      enum: ['improving', 'stable', 'worsening']
    },
    estimatedTurnoverRisk: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Top structural drivers (aggregated across org)
  topStructuralDrivers: [{
    metric: {
      type: String,
      required: true
    },
    avgDeviation: {
      type: Number,
      required: true
    },
    teamsAffected: {
      type: Number,
      required: true
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium']
    }
  }],
  
  // Recurring crisis patterns
  crisisPatterns: {
    totalCrises: {
      type: Number,
      default: 0
    },
    crisisByType: [{
      type: String,
      count: Number
    }],
    teamsWithRecurringCrises: {
      type: Number,
      default: 0
    }
  },
  
  // AI-generated strategic summary
  aiSummary: {
    narrative: {
      type: String,
      required: true
    },
    keyRisks: [{
      risk: String,
      impact: String,
      costOfInaction: String
    }],
    leadershipDecisionsRequired: [{
      decision: String,
      rationale: String,
      urgency: {
        type: String,
        enum: ['immediate', 'this-quarter', 'strategic']
      }
    }],
    organizationalTrajectory: {
      type: String,
      enum: ['positive', 'stable', 'concerning', 'critical']
    }
  },
  
  // Report metadata
  reportVersion: {
    type: String,
    default: '1.0'
  },
  generatedAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: false
});

// Indexes for efficient querying
monthlyReportSchema.index({ orgId: 1, periodEnd: -1 });
monthlyReportSchema.index({ createdAt: -1 });

// Instance method to get leadership view (filtered)
monthlyReportSchema.methods.getLeadershipView = function() {
  return {
    periodStart: this.periodStart,
    periodEnd: this.periodEnd,
    orgHealth: this.orgHealth,
    persistentRisks: this.persistentRisks.map(risk => ({
      riskType: risk.riskType,
      weeksAboveThreshold: risk.weeksAboveThreshold,
      avgScore: risk.avgScore,
      teamsAffected: risk.affectedTeams.length,
      classification: risk.classification
      // Remove team names and IDs for leadership view
    })),
    leadershipSignals: {
      managerEffectiveness: {
        avgScore: this.leadershipSignals.managerEffectiveness.avgScore,
        managersCriticalCount: this.leadershipSignals.managerEffectiveness.managersCriticalCount,
        trend: this.leadershipSignals.managerEffectiveness.trend
        // Remove individual manager data
      },
      equityScoreAvg: this.leadershipSignals.equityScoreAvg,
      equityIssuesCount: this.leadershipSignals.equityIssuesCount,
      successionCriticalCount: this.leadershipSignals.successionCriticalCount,
      avgBusFactor: this.leadershipSignals.avgBusFactor
    },
    executionSignals: this.executionSignals,
    retentionExposure: {
      avgAttritionRisk: this.retentionExposure.avgAttritionRisk,
      criticalIndividualsCount: this.retentionExposure.criticalIndividualsCount,
      trend: this.retentionExposure.trend,
      estimatedTurnoverRisk: this.retentionExposure.estimatedTurnoverRisk
      // Remove individual names
    },
    topStructuralDrivers: this.topStructuralDrivers,
    crisisPatterns: this.crisisPatterns,
    aiSummary: {
      narrative: this.aiSummary.narrative,
      keyRisks: this.aiSummary.keyRisks,
      leadershipDecisionsRequired: this.aiSummary.leadershipDecisionsRequired,
      organizationalTrajectory: this.aiSummary.organizationalTrajectory
    },
    generatedAt: this.generatedAt
  };
};

// Instance method to determine overall severity
monthlyReportSchema.methods.getOverallSeverity = function() {
  const criticalFactors = [
    this.orgHealth.avgBDI > 65,
    this.orgHealth.zoneDistribution.critical > 2,
    this.retentionExposure.criticalIndividualsCount > 3,
    this.leadershipSignals.managerEffectiveness.managersCriticalCount > 2,
    this.persistentRisks.filter(r => r.classification === 'structural').length > 2
  ];
  
  const criticalCount = criticalFactors.filter(Boolean).length;
  
  if (criticalCount >= 3) return 'critical';
  if (criticalCount >= 2) return 'high';
  if (criticalCount >= 1) return 'medium';
  return 'low';
};

// Static method to get latest report for org
monthlyReportSchema.statics.getLatestForOrg = async function(orgId) {
  return this.findOne({ orgId })
    .sort({ periodEnd: -1 })
    .populate('persistentRisks.affectedTeams.teamId');
};

// Static method to get report history
monthlyReportSchema.statics.getHistoryForOrg = async function(orgId, limit = 12) {
  return this.find({ orgId })
    .sort({ periodEnd: -1 })
    .limit(limit)
    .select('periodStart periodEnd orgHealth retentionExposure executionSignals aiSummary.organizationalTrajectory');
};

const MonthlyReport = mongoose.model('MonthlyReport', monthlyReportSchema);

export default MonthlyReport;
