import mongoose from 'mongoose';

/**
 * ChatLead Schema
 * Stores leads captured from chat interactions
 */
const chatLeadSchema = new mongoose.Schema({
  // Lead email
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  
  // Question that triggered lead capture
  question: {
    type: String,
    required: true
  },
  
  // Lead trigger type
  triggerType: {
    type: String,
    enum: ['pilot', 'pricing', 'rollout', 'usage', 'contact'],
    required: true
  },
  
  // Session information (anonymous)
  sessionId: {
    type: String,
    required: true
  },
  
  // Notification status
  notified: {
    type: Boolean,
    default: false
  },
  
  // Additional context
  context: {
    questionCount: Number,
    topicsDiscussed: [String]
  }
}, {
  timestamps: true
});

// Index for querying leads
chatLeadSchema.index({ createdAt: -1 });
chatLeadSchema.index({ email: 1 });
chatLeadSchema.index({ notified: 1 });

export default mongoose.model('ChatLead', chatLeadSchema);
