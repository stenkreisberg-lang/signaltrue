import mongoose from 'mongoose';

/**
 * Risk Drivers Model
 * Tracks which metrics contribute to each risk score (traceability)
 */
const riskDriverSchema = new mongoose.Schema({
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
  metricKey: {
    type: String,
    required: true
  },
  contributionWeight: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  deviation: {
    type: Number,
    required: true
  },
  explanationText: {
    type: String
  }
}, {
  timestamps: true
});

// Compound index
riskDriverSchema.index({ teamId: 1, weekStart: -1, riskType: 1 });

export default mongoose.model('RiskDriver', riskDriverSchema);
