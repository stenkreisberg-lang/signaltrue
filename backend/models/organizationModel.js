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
  },
  { timestamps: true }
);


export default mongoose.model("Organization", organizationSchema);
