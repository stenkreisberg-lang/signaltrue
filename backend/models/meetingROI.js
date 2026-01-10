import mongoose from 'mongoose';

/**
 * Enhanced Meeting ROI Model
 * Measures meeting effectiveness by analyzing post-meeting Slack behavior
 */
const meetingROISchema = new mongoose.Schema({
  meetingId: {
    type: String, // Google Calendar event ID
    required: true,
    index: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Meeting details
  meetingTitle: {
    type: String,
    required: true
  },
  meetingDate: {
    type: Date,
    required: true
  },
  durationMinutes: {
    type: Number,
    required: true
  },
  attendeeCount: {
    type: Number,
    required: true
  },
  
  // ROI assessment
  roiScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  roiLevel: {
    type: String,
    enum: ['excellent', 'good', 'poor', 'waste'],
    required: true
  },
  
  // Post-meeting behavior signals
  postMeetingSignals: {
    slackActivityIncrease: {
      beforeRate: { type: Number }, // messages/hour before meeting
      afterRate: { type: Number }, // messages/hour in 4h after meeting
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    actionItemKeywords: {
      count: { type: Number },
      keywords: [{ type: String }],
      detected: { type: Boolean, default: false }
    },
    followUpQuestions: {
      count: { type: Number },
      detected: { type: Boolean, default: false }
    },
    documentCreation: {
      count: { type: Number }, // new docs/files shared
      detected: { type: Boolean, default: false }
    },
    decisionMade: {
      detected: { type: Boolean, default: false },
      confidence: { type: String, enum: ['low', 'medium', 'high'] }
    }
  },
  
  // Negative signals
  negativeSignals: {
    noFollowUp: {
      detected: { type: Boolean, default: false }
    },
    confusionKeywords: {
      count: { type: Number },
      keywords: [{ type: String }],
      detected: { type: Boolean, default: false }
    },
    repeatMeetingScheduled: {
      detected: { type: Boolean, default: false },
      daysUntilRepeat: { type: Number }
    }
  },
  
  verdict: {
    type: String
  },
  recommendations: [{
    type: String
  }],
  
  lastAnalyzed: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

meetingROISchema.index({ teamId: 1, meetingDate: -1 });
meetingROISchema.index({ roiScore: -1 });

export default mongoose.model('MeetingROI', meetingROISchema);
