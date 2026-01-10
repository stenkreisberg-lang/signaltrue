import mongoose from 'mongoose';

/**
 * Equity Signals Model
 * Detects unequal treatment from behavioral patterns (no surveys/self-reports)
 * Measures: response time equity, participation equity, workload equity
 */
const equitySignalSchema = new mongoose.Schema({
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
  
  // Overall equity score
  equityScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  equityLevel: {
    type: String,
    enum: ['excellent', 'good', 'needs-attention', 'critical'],
    required: true
  },
  
  // Response time equity
  responseTimeEquity: {
    averageResponseTime: { type: Number }, // hours
    standardDeviation: { type: Number },
    inequityDetected: { type: Boolean, default: false },
    affectedUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      avgResponseTime: { type: Number },
      deviationFromMean: { type: Number }
    }]
  },
  
  // Participation equity
  participationEquity: {
    averageMeetingInvites: { type: Number },
    standardDeviation: { type: Number },
    inequityDetected: { type: Boolean, default: false },
    underincludedUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      meetingInvites: { type: Number },
      percentBelowAverage: { type: Number }
    }]
  },
  
  // Workload equity
  workloadEquity: {
    averageMeetingHours: { type: Number },
    standardDeviation: { type: Number },
    inequityDetected: { type: Boolean, default: false },
    overloadedUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      meetingHours: { type: Number },
      percentAboveAverage: { type: Number }
    }]
  },
  
  // Voice equity (Slack message volume)
  voiceEquity: {
    averageMessageCount: { type: Number },
    standardDeviation: { type: Number },
    inequityDetected: { type: Boolean, default: false },
    silencedUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      messageCount: { type: Number },
      percentBelowAverage: { type: Number }
    }]
  },
  
  recommendations: [{
    type: String
  }],
  
  lastAnalyzed: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

equitySignalSchema.index({ equityScore: 1 });

export default mongoose.model('EquitySignal', equitySignalSchema);
