import mongoose from 'mongoose';

/**
 * Team State Model (Weekly)
 * Diagnosis of overall team health state
 */
const teamStateSchema = new mongoose.Schema({
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
  state: {
    type: String,
    required: true,
    enum: ['healthy', 'strained', 'overloaded', 'breaking']
  },
  confidence: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  summaryText: {
    type: String,
    required: true
  },
  // Link to risks that determined this state
  dominantRisk: {
    type: String,
    enum: ['overload', 'execution', 'retention_strain', 'none']
  }
}, {
  timestamps: true
});

// Compound index for efficient lookups
teamStateSchema.index({ teamId: 1, weekStart: -1 });

export default mongoose.model('TeamState', teamStateSchema);
