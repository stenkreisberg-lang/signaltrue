/**
 * Organizational Agility Rating (OAR) Model
 * Single composite score 0-100 with four sub-pillars
 */

import mongoose from 'mongoose';

const oarScoreSchema = new mongoose.Schema({
  // Organization reference
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Optional team-level OAR (null = org-wide)
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null,
    index: true
  },
  
  // Period tracking
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  periodLabel: {
    type: String, // e.g., '2026-W08', '2026-02'
    required: true
  },
  
  // Main OAR score (0-100)
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  
  // Four sub-pillars (each 0-100)
  pillars: {
    execution: {
      score: { type: Number, min: 0, max: 100, default: 50 },
      components: {
        decisionLatency: { type: Number }, // Lower is better
        focusTime: { type: Number }, // Higher is better
        flowEfficiency: { type: Number }, // Higher is better
        meetingLoad: { type: Number } // Lower is better
      },
      trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
      trendPct: { type: Number, default: 0 }
    },
    innovation: {
      score: { type: Number, min: 0, max: 100, default: 50 },
      components: {
        ideaCaptureRate: { type: Number },
        experimentSuccessRate: { type: Number },
        innovationThroughput: { type: Number }
      },
      trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
      trendPct: { type: Number, default: 0 }
    },
    wellbeing: {
      score: { type: Number, min: 0, max: 100, default: 50 },
      components: {
        energyIndex: { type: Number },
        afterHoursRate: { type: Number },
        recoveryIndex: { type: Number },
        sentimentScore: { type: Number }
      },
      trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
      trendPct: { type: Number, default: 0 }
    },
    culture: {
      score: { type: Number, min: 0, max: 100, default: 50 },
      components: {
        collaborationIndex: { type: Number },
        networkBreadth: { type: Number },
        responsiveness: { type: Number },
        equityScore: { type: Number }
      },
      trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' },
      trendPct: { type: Number, default: 0 }
    }
  },
  
  // Pillar weights (should sum to 1.0)
  weights: {
    execution: { type: Number, default: 0.30 },
    innovation: { type: Number, default: 0.20 },
    wellbeing: { type: Number, default: 0.30 },
    culture: { type: Number, default: 0.20 }
  },
  
  // Overall trend
  trend: {
    type: String,
    enum: ['up', 'down', 'stable'],
    default: 'stable'
  },
  trendPct: {
    type: Number,
    default: 0
  },
  
  // Previous score for comparison
  previousScore: {
    type: Number,
    default: null
  },
  
  // Health zone classification
  zone: {
    type: String,
    enum: ['critical', 'at-risk', 'stable', 'thriving'],
    default: 'stable'
  },
  
  // Data quality indicator
  dataQuality: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  metricsAvailable: {
    type: Number,
    default: 0
  },
  
  // Calculation metadata
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  calculationMethod: {
    type: String,
    enum: ['automated', 'manual', 'hybrid'],
    default: 'automated'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
oarScoreSchema.index({ orgId: 1, periodStart: -1 });
oarScoreSchema.index({ orgId: 1, teamId: 1, periodStart: -1 });
oarScoreSchema.index({ teamId: 1, periodStart: -1 });

// Static method to get zone from score
oarScoreSchema.statics.getZone = function(score) {
  if (score >= 75) return 'thriving';
  if (score >= 55) return 'stable';
  if (score >= 35) return 'at-risk';
  return 'critical';
};

// Static method to get trend direction
oarScoreSchema.statics.getTrend = function(current, previous) {
  if (!previous) return { direction: 'stable', pct: 0 };
  const diff = current - previous;
  const pct = previous > 0 ? Math.round((diff / previous) * 100) : 0;
  if (diff > 2) return { direction: 'up', pct };
  if (diff < -2) return { direction: 'down', pct };
  return { direction: 'stable', pct };
};

export default mongoose.model('OARScore', oarScoreSchema);
