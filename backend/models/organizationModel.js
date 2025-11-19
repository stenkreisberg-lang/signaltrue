// Trigger redeploy to clear Render cache
import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    domain: { type: String },
    logo: { type: String },
    industry: { type: String },
    size: { type: String },
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
      // ...add other settings fields as needed
    },
    // ...add other organization fields as needed
  },
  { timestamps: true }
);

export default mongoose.model("Organization", organizationSchema);