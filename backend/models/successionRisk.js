import mongoose from 'mongoose';

/**
 * Succession Risk Model
 * Tracks bus factor and succession risk from Q&A patterns in Slack
 */
const successionRiskSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Individual at risk
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Succession risk assessment
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
  
  // Knowledge areas
  knowledgeAreas: [{
    topic: { type: String },
    questionVolume: { type: Number },
    uniqueDependents: { type: Number },
    backupCount: { type: Number }
  }],
  
  // Dependency metrics
  dependencyMetrics: {
    totalQuestions: { type: Number },
    uniqueQuestioners: { type: Number },
    questionersAsPercentOfTeam: { type: Number },
    averageResponseTime: { type: Number }
  },
  
  // Succession readiness
  successors: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readinessScore: { type: Number },
    knowledgeOverlap: { type: Number }
  }],
  
  busFactor: {
    type: Number, // how many people would break the team if lost
    min: 1
  },
  
  recommendations: [{
    type: String
  }],
  
  lastAnalyzed: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

successionRiskSchema.index({ teamId: 1, userId: 1 }, { unique: true });
successionRiskSchema.index({ riskScore: -1 });

export default mongoose.model('SuccessionRisk', successionRiskSchema);
