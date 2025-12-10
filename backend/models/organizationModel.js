// Trigger redeploy to clear Render cache
import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
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
      },
    },
    settings: {
      onboardingComplete: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Organization", organizationSchema);