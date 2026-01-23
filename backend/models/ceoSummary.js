import mongoose from 'mongoose';

/**
 * CEO Executive Summary Model
 * 
 * Stores shareable CEO one-pager summaries that HR can forward to leadership.
 * Privacy-first: No individual names, team-level patterns only (min 5 people).
 */
const ceoSummarySchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Link to the monthly report this summary is based on
  monthlyReportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonthlyReport',
    required: true
  },
  
  // Period this summary covers
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Who generated this summary
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Section 1: What we observed this month
  observations: {
    meetingLoadChange: {
      direction: { type: String, enum: ['increased', 'decreased', 'stable'] },
      percentChange: Number,
      summary: String // e.g., "Meeting hours increased 15% across engineering teams"
    },
    afterHoursWork: {
      direction: { type: String, enum: ['increased', 'decreased', 'stable'] },
      percentChange: Number,
      summary: String // e.g., "After-hours activity up in 3 of 5 product teams"
    },
    coordinationPressure: {
      direction: { type: String, enum: ['increased', 'decreased', 'stable'] },
      areasAffected: [String], // e.g., ["Product", "Engineering"]
      summary: String // e.g., "Cross-team coordination bottlenecks detected"
    },
    additionalObservations: [String] // Additional bullet points
  },
  
  // Section 2: Why this matters (plain language)
  significance: {
    summary: {
      type: String,
      default: 'Sustained workload and coordination pressure increase delivery risk, attrition risk, and leadership blind spots.'
    },
    riskFactors: [{
      type: { type: String, enum: ['delivery', 'attrition', 'coordination', 'burnout'] },
      severity: { type: String, enum: ['low', 'medium', 'high'] },
      description: String
    }]
  },
  
  // Section 3: Direction of risk
  riskDirection: {
    overall: {
      type: String,
      enum: ['improving', 'stable', 'worsening'],
      required: true
    },
    trendConfidence: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    explanation: {
      type: String,
      default: 'These are early signals. They typically appear before performance or retention issues become visible.'
    }
  },
  
  // Section 4: What this is (and is not) - Privacy assurance
  privacyStatement: {
    teamLevelOnly: { type: Boolean, default: true },
    minTeamSize: { type: Number, default: 5 },
    noContentAccess: { type: Boolean, default: true },
    noIndividualMonitoring: { type: Boolean, default: true },
    notASurvey: { type: Boolean, default: true },
    notSentimentAnalysis: { type: Boolean, default: true }
  },
  
  // Footer
  footer: {
    type: String,
    default: 'This summary is based on real behavioral workload patterns, not opinions.'
  },
  
  // Sharing tracking
  shareToken: {
    type: String,
    unique: true,
    sparse: true
  },
  shareTokenExpiry: {
    type: Date
  },
  sharedWith: [{
    email: String,
    sharedAt: { type: Date, default: Date.now },
    viewedAt: Date
  }],
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
  },
  lastViewedAt: Date
  
}, {
  timestamps: true
});

// shareToken already has unique: true which creates an index

// Generate a unique share token
ceoSummarySchema.methods.generateShareToken = function(expiryDays = 30) {
  const crypto = require('crypto');
  this.shareToken = crypto.randomBytes(32).toString('hex');
  this.shareTokenExpiry = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  return this.shareToken;
};

// Check if share token is valid
ceoSummarySchema.methods.isShareTokenValid = function() {
  if (!this.shareToken || !this.shareTokenExpiry) return false;
  return new Date() < this.shareTokenExpiry;
};

// Static method to find by share token
ceoSummarySchema.statics.findByShareToken = async function(token) {
  const summary = await this.findOne({ 
    shareToken: token,
    shareTokenExpiry: { $gt: new Date() }
  });
  return summary;
};

const CeoSummary = mongoose.model('CeoSummary', ceoSummarySchema);

export default CeoSummary;
