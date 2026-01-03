import mongoose from 'mongoose';

/**
 * Risk Weekly Model
 * Calculated risk scores for each team, each week
 */
const riskWeeklySchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  weekStart: {
    type: Date,
    required: true,
    index: true
  },
  riskType: {
    type: String,
    required: true,
    enum: ['overload', 'execution', 'retention_strain']
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  band: {
    type: String,
    required: true,
    enum: ['green', 'yellow', 'red']
  },
  confidence: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  // Explanation for UI
  explanation: {
    type: String
  }
}, {
  timestamps: true
});

// Compound indexes
riskWeeklySchema.index({ teamId: 1, weekStart: -1 });
riskWeeklySchema.index({ teamId: 1, riskType: 1, weekStart: -1 });

export default mongoose.model('RiskWeekly', riskWeeklySchema);
