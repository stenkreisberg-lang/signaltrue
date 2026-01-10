import mongoose from 'mongoose';

/**
 * Network Health Model
 * Detects silos, bottlenecks, and knowledge concentration from Slack collaboration patterns
 */
const networkHealthSchema = new mongoose.Schema({
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
  
  // Overall network health
  healthScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  healthLevel: {
    type: String,
    enum: ['excellent', 'good', 'needs-attention', 'critical'],
    required: true
  },
  
  // Silo detection
  silos: [{
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    isolationScore: { type: Number },
    crossTeamInteractionRate: { type: Number }
  }],
  
  // Bottleneck detection
  bottlenecks: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    incomingQuestionRate: { type: Number },
    uniqueQuestioners: { type: Number },
    averageResponseTime: { type: Number },
    bottleneckSeverity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  }],
  
  // Knowledge concentration (bus factor)
  knowledgeRisks: [{
    topic: { type: String },
    expertUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dependencyRate: { type: Number },
    backupExpertCount: { type: Number },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    }
  }],
  
  // Network metrics
  metrics: {
    averageConnectionsPerPerson: { type: Number },
    crossFunctionalInteractions: { type: Number },
    centralizedDecisionMaking: { type: Boolean },
    isolatedMembers: { type: Number }
  },
  
  recommendations: [{
    type: String
  }],
  
  lastAnalyzed: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

networkHealthSchema.index({ healthScore: 1 });

export default mongoose.model('NetworkHealth', networkHealthSchema);
