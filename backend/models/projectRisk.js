import mongoose from 'mongoose';

/**
 * Project Risk Model
 * Infers project/goal health from meeting titles and Slack patterns
 * No integration with Jira/Linear - purely behavioral
 */
const projectRiskSchema = new mongoose.Schema({
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    index: true
  },
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Inferred project name
  projectName: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['calendar_meeting_title', 'slack_channel', 'recurring_meeting'],
    required: true
  },
  
  // Risk assessment
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  
  // Calendar-based signals
  calendarSignals: {
    emergencyMeetingsSpike: {
      baseline: { type: Number },
      current: { type: Number },
      detected: { type: Boolean, default: false }
    },
    meetingDurationIncrease: {
      baselineMinutes: { type: Number },
      currentMinutes: { type: Number },
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    externalMeetingsIncrease: {
      count: { type: Number },
      detected: { type: Boolean, default: false }
    }
  },
  
  // Slack-based signals
  slackSignals: {
    escalationKeywords: {
      count: { type: Number },
      keywords: [{ type: String }],
      detected: { type: Boolean, default: false }
    },
    questionResponseTime: {
      baselineHours: { type: Number },
      currentHours: { type: Number },
      detected: { type: Boolean, default: false }
    },
    afterHoursSpike: {
      percentChange: { type: Number },
      detected: { type: Boolean, default: false }
    },
    deadlineMentions: {
      count: { type: Number },
      detected: { type: Boolean, default: false }
    }
  },
  
  prediction: {
    type: String
  },
  confidence: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  
  recommendedActions: [{
    type: String
  }],
  
  lastAnalyzed: {
    type: Date,
    default: Date.now
  }
  
}, { timestamps: true });

projectRiskSchema.index({ teamId: 1, projectName: 1 });
projectRiskSchema.index({ riskScore: -1 });

export default mongoose.model('ProjectRisk', projectRiskSchema);
