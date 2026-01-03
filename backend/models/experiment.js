import mongoose from 'mongoose';

/**
 * Experiment Model
 * Tracks controlled interventions with hypothesis and success metrics
 */
const experimentSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  actionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamAction',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  hypothesis: {
    type: String,
    required: true
  },
  successMetrics: [{
    metricKey: String,
    expectedDirection: {
      type: String,
      enum: ['decrease', 'increase', 'stable']
    }
  }],
  status: {
    type: String,
    required: true,
    enum: ['running', 'completed'],
    default: 'running'
  },
  // Pre-experiment baseline
  preMetrics: {
    type: Map,
    of: Number
  },
  // Post-experiment metrics
  postMetrics: {
    type: Map,
    of: Number
  }
}, {
  timestamps: true
});

experimentSchema.index({ teamId: 1, status: 1 });
experimentSchema.index({ actionId: 1 });

export default mongoose.model('Experiment', experimentSchema);
