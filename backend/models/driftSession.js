import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * DriftSession Model
 * Stores behavioral drift diagnostic sessions including answers, scores, and lead capture
 */
const driftSessionSchema = new mongoose.Schema({
  // Unique session identifier (UUID)
  sessionId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    required: true,
    index: true
  },
  
  // Diagnostic answers (JSONB equivalent)
  answers: {
    company_size: {
      type: String,
      enum: ['1-25', '26-80', '81-250', '251-1000', '1000+']
    },
    work_mode: {
      type: String,
      enum: ['on-site', 'hybrid', 'remote']
    },
    meeting_time: {
      type: String,
      enum: ['lt20', '20-40', '40-60', 'gt60']
    },
    back_to_back: {
      type: String,
      enum: ['rare', 'sometimes', 'often', 'daily']
    },
    response_expectations: {
      type: String,
      enum: ['flex', 'same_day', 'hours', 'minutes']
    },
    interruptions: {
      type: String,
      enum: ['low', 'moderate', 'high', 'constant']
    },
    manager_urgency: {
      type: String,
      enum: ['rare', 'monthly', 'weekly', 'daily']
    },
    recovery_gaps: {
      type: String,
      enum: ['often', 'sometimes', 'rare', 'never']
    }
  },
  
  // Computed scores
  score: {
    totalScore: {
      type: Number,
      min: 0,
      max: 100
    },
    category: {
      type: String,
      enum: ['Stable', 'Early Drift', 'Active Drift', 'Critical Drift']
    },
    subScores: {
      meeting_pressure: Number,
      response_pressure: Number,
      focus_fragmentation: Number,
      recovery_deficit: Number,
      urgency_culture: Number
    },
    findings: [String]
  },
  
  // Lead capture
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email format']
  },
  
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  unlockedAt: {
    type: Date,
    default: null
  },
  
  // UTM tracking
  utm: {
    utm_source: String,
    utm_medium: String,
    utm_campaign: String,
    utm_content: String,
    utm_term: String,
    referrer: String
  },
  
  // Consent
  consentMarketing: {
    type: Boolean,
    default: true
  },
  
  // Privacy / abuse protection
  ipHash: {
    type: String,
    default: null
  },
  
  // User agent for analytics
  userAgent: String
  
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Indexes for efficient queries
driftSessionSchema.index({ email: 1 });
driftSessionSchema.index({ createdAt: -1 });
driftSessionSchema.index({ 'score.category': 1 });

// Virtual for checking if session is unlocked
driftSessionSchema.virtual('isUnlocked').get(function() {
  return Boolean(this.email && this.unlockedAt);
});

// Method to unlock session
driftSessionSchema.methods.unlock = function(email, consentMarketing = true) {
  this.email = email;
  this.consentMarketing = consentMarketing;
  this.unlockedAt = new Date();
  return this.save();
};

// Static method to find by session ID
driftSessionSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId });
};

// Ensure virtuals are included when converting to JSON
driftSessionSchema.set('toJSON', { virtuals: true });
driftSessionSchema.set('toObject', { virtuals: true });

export default mongoose.model('DriftSession', driftSessionSchema);
