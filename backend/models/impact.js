import mongoose from 'mongoose';

/**
 * Impact Model
 * Learning from completed experiments
 */
const impactSchema = new mongoose.Schema({
  experimentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experiment',
    required: true,
    index: true
  },
  result: {
    type: String,
    required: true,
    enum: ['positive', 'neutral', 'negative']
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
  nextStep: {
    type: String,
    required: true
  },
  // Metric deltas
  metricChanges: [{
    metricKey: String,
    preMean: Number,
    postMean: Number,
    delta: Number,
    percentChange: Number
  }]
}, {
  timestamps: true
});

export default mongoose.model('Impact', impactSchema);
