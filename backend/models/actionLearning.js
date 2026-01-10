import mongoose from 'mongoose';

/**
 * Action Learning Model
 * Stores outcomes from completed experiments to improve future recommendations
 * This data feeds into AI to learn what works for different team profiles
 */
const actionLearningSchema = new mongoose.Schema({
  // Link to original experiment
  experimentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experiment',
    required: true,
    index: true
  },
  
  // Team context at time of action
  teamProfile: {
    industry: { type: String, required: true },
    function: { 
      type: String, 
      required: true,
      enum: ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Support', 'Operations', 'Other']
    },
    size: { 
      type: String, 
      required: true,
      enum: ['1-5', '6-10', '11-20', '21-50', '50+']
    },
    actualSize: { type: Number }
  },
  
  // Problem context
  riskType: { 
    type: String, 
    required: true,
    enum: ['overload', 'execution', 'retention_strain'],
    index: true
  },
  topDrivers: [String], // e.g., ['meeting_load', 'after_hours_activity']
  
  // Action taken
  action: {
    title: { type: String, required: true },
    duration: { type: Number }, // weeks
    generatedBy: { 
      type: String, 
      enum: ['template', 'ai'], 
      default: 'template' 
    }
  },
  
  // Outcome
  outcome: { 
    type: String, 
    required: true,
    enum: ['positive', 'neutral', 'negative'],
    index: true
  },
  
  // Metric impact (what actually changed)
  metricImpact: [{
    metricKey: { type: String, required: true },
    preMean: { type: Number },
    postMean: { type: Number },
    delta: { type: Number },
    percentChange: { type: Number }
  }],
  
  // Confidence in this learning
  confidence: { 
    type: String, 
    required: true,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  // Metadata
  recordedAt: { type: Date, default: Date.now, index: true },
  notes: { type: String } // Optional human notes
}, {
  timestamps: true
});

// Compound indexes for efficient querying
actionLearningSchema.index({ 
  'teamProfile.industry': 1, 
  'teamProfile.function': 1,
  riskType: 1,
  outcome: 1
});

actionLearningSchema.index({
  riskType: 1,
  outcome: 1,
  recordedAt: -1
});

export default mongoose.model('ActionLearning', actionLearningSchema);
