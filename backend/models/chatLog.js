import mongoose from 'mongoose';

/**
 * ChatLog Schema
 * Internal logging for chat interactions (no PII)
 */
const chatLogSchema = new mongoose.Schema({
  // Anonymous session ID
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // User question (sanitized)
  question: {
    type: String,
    required: true
  },
  
  // Retrieved document sources
  retrievedSources: [{
    source: String,
    section: String,
    relevanceScore: Number
  }],
  
  // Overall confidence score
  confidenceScore: {
    type: Number,
    min: 0,
    max: 1
  },
  
  // Response type
  responseType: {
    type: String,
    enum: ['answered', 'refused', 'lead_capture', 'error'],
    required: true
  },
  
  // Was lead captured
  leadCaptured: {
    type: Boolean,
    default: false
  },
  
  // Processing time in ms
  processingTime: {
    type: Number
  },
  
  // Model used
  model: {
    type: String,
    default: 'gpt-4.1'
  }
}, {
  timestamps: true
});

// Index for analytics
chatLogSchema.index({ createdAt: -1 });
chatLogSchema.index({ responseType: 1 });

export default mongoose.model('ChatLog', chatLogSchema);
