// Trigger redeploy to clear Render cache
import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, sparse: true }, // URL-friendly identifier
    domain: { type: String },
    logo: { type: String },
    industry: { type: String, default: "Other" },
    size: { type: String },
    subscription: {
      plan: { type: String, default: "free" },
      status: { type: String, default: "active" },
    },
    // Pricing tier and feature gating
    subscriptionPlanId: {
      type: String,
      enum: ['team', 'leadership', 'custom', null],
      default: null, // null = free trial or unpaid
      index: true
    },
    subscriptionPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      default: null
    },
    customFeatures: {
      enableBoardReports: { type: Boolean, default: false },
      enableCustomThresholds: { type: Boolean, default: false },
      enableCustomAiPrompts: { type: Boolean, default: false },
      enableQuarterlyReviews: { type: Boolean, default: false }
    },
    subscriptionHistory: [{
      planId: String,
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      action: { type: String, enum: ['upgrade', 'downgrade', 'initial'] }
    }],
    integrations: {
      slack: {
        teamId: String,
        teamName: String,
        accessToken: String,
        botUserId: String,
        installed: { type: Boolean, default: false },
        sync: {
          enabled: { type: Boolean, default: false },
          lastSync: Date,
        },
        lastEmployeeSync: Date, // Track when employees were last synced
      },
      google: {
        scope: String, // 'calendar' or 'gmail'
        refreshToken: String, // encrypted
        accessToken: String, // encrypted
        expiry: Date,
        email: String,
        user: mongoose.Schema.Types.Mixed, // Google user info
        eventsCount: Number,
      },
      googleChat: {
        refreshToken: String, // encrypted
        accessToken: String, // encrypted
        expiry: Date,
        email: String,
        user: mongoose.Schema.Types.Mixed, // Google user info
        spaces: [mongoose.Schema.Types.Mixed], // Chat spaces/rooms
        messagesCount: Number,
        lastPulledAt: Date,
        lastEmployeeSync: Date, // Track when employees were last synced
        sync: {
          enabled: { type: Boolean, default: true },
          lastSync: Date,
          lastStatus: String,
          lastRunAt: Date,
        },
      },
      microsoft: {
        scope: String, // 'outlook' or 'teams'
        refreshToken: String, // encrypted
        accessToken: String, // encrypted
        expiry: Date,
        email: String,
        user: mongoose.Schema.Types.Mixed,
        eventsCount: Number,
        teamsCount: Number,
      },
    },
    settings: {
      onboardingComplete: { type: Boolean, default: false },
    },
    
    // Calibration state
    calibration: {
      isInCalibration: { type: Boolean, default: true },
      calibrationStartDate: { type: Date },
      calibrationEndDate: { type: Date },
      calibrationDay: { type: Number, default: 0 }, // 0-30
      calibrationProgress: { type: Number, default: 0 }, // 0-100
      calibrationConfidence: { 
        type: String, 
        enum: ['Low', 'Medium', 'High'], 
        default: 'Low' 
      },
      dataSourcesConnected: [{
        source: { type: String }, // 'slack', 'google-calendar', etc.
        connectedAt: { type: Date }
      }],
      featuresUnlocked: { type: Boolean, default: false }
    },
    
    // Trial state (30-day trial, no credit card required)
    trial: {
      isActive: { type: Boolean, default: true },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date }, // Calculated as startDate + 30 days
      daysRemaining: { type: Number, default: 30 },
      phase: {
        type: String,
        enum: ['baseline', 'first_signals', 'pattern_recognition', 'pre_close', 'report_delivered', 'expired'],
        default: 'baseline'
      },
      // Track key milestones
      firstSignalsShown: { type: Date },
      patternRecognitionStarted: { type: Date },
      preCloseNotificationSent: { type: Date },
      monthlyReportGenerated: { type: Date },
      monthlyReportViewed: { type: Date },
      ceoSummaryGenerated: { type: Date },
      ceoSummaryShared: { type: Date },
      // Conversion tracking
      paywallActivated: { type: Boolean, default: false },
      paywallActivatedAt: { type: Date },
      upgradeCtaClicked: { type: Date },
      convertedToPaid: { type: Boolean, default: false },
      convertedAt: { type: Date },
      isPilot: { type: Boolean, default: false }
    },
    
    // Pilot program (granted by superadmin)
    pilot: {
      isActive: { type: Boolean, default: false },
      startDate: { type: Date },
      endDate: { type: Date },
      months: { type: Number, default: 6 },
      grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      grantedAt: { type: Date },
      revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      revokedAt: { type: Date }
    },

    // Stripe payment info
    stripeCustomerId: { type: String },
    paymentMethod: {
      last4: { type: String },
      brand: { type: String },
      expiryMonth: { type: Number },
      expiryYear: { type: Number },
      expiryReminderSent: { type: Date }
    },
  },
  { timestamps: true }
);

// Pre-save middleware to calculate trial end date
organizationSchema.pre('save', async function() {
  if (this.trial && this.trial.startDate && !this.trial.endDate) {
    const startDate = new Date(this.trial.startDate);
    this.trial.endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
});

// Virtual for calculating current trial day
organizationSchema.virtual('trial.currentDay').get(function() {
  if (!this.trial?.startDate) return 0;
  const now = new Date();
  const start = new Date(this.trial.startDate);
  const daysDiff = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  return Math.min(Math.max(0, daysDiff), 30);
});

// Method to determine trial phase based on current day
organizationSchema.methods.calculateTrialPhase = function() {
  const currentDay = this.trial?.currentDay || 0;
  
  if (currentDay <= 3) return 'baseline';
  if (currentDay <= 10) return 'first_signals';
  if (currentDay <= 18) return 'pattern_recognition';
  if (currentDay <= 24) return 'pre_close';
  if (currentDay <= 30) return 'report_delivered';
  return 'expired';
};


export default mongoose.model("Organization", organizationSchema);
