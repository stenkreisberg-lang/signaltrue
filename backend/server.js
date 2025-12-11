// Force redeploy
import cron from "node-cron";
import cors from "cors";
import mongoose from "mongoose";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// --- ESM-friendly __dirname and __filename ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- Environment Variable Validation ---
const REQUIRED_ENV_VARS = ['JWT_SECRET'];
if (process.env.USE_IN_MEMORY_DB !== '1') {
  REQUIRED_ENV_VARS.push('MONGO_URI');
}

const missingRequired = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missingRequired.length > 0) {
  console.error('❌ Missing REQUIRED environment variables, server cannot start:', missingRequired.join(', '));
  process.exit(1);
}

const OPTIONAL_ENV_VARS = [
  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SLACK_BOT_TOKEN',
  'GOOGLE_SERVICE_ACCOUNT', 'STRIPE_SECRET_KEY', 'FRONTEND_URL'
];
const missingOptional = OPTIONAL_ENV_VARS.filter((key) => !process.env[key]);
if (missingOptional.length > 0) {
  console.warn('⚠️ Missing OPTIONAL environment variables, some features may be disabled:', missingOptional.join(', '));
}

// --- Route Imports ---
import consentAuditRoutes from "./routes/consentAudit.js";
import driftEventsRoutes from "./routes/driftEvents.js";
import benchmarksRoutes from "./routes/benchmarks.js";
import narrativeRoutes from "./routes/narrativeRoutes.js";
import focusRoutes from "./routes/focusRoutes.js";
import forecastRoutes from "./routes/forecastRoutes.js";
import leaderRoutes from "./routes/leaderRoutes.js";
import outcomesRoutes from "./routes/outcomesRoutes.js";
import resilienceRoutes from "./routes/resilienceRoutes.js";
import integrationsRoutes from "./routes/integrations.js";
import billingRoutes from "./routes/billing.js";
import stripeWebhookRoutes from "./routes/stripe-webhook.js";
import adminRoutes from "./routes/adminRoutes.js";
import exportRoutes from "./routes/exportRoutes.js";
import adminExportRoutes from "./routes/adminExport.js";
import adminCleanupRoutes from "./routes/adminCleanup.js";
import programRoutes from "./routes/programRoutes.js";
import timelineRoutes from "./routes/timelineRoutes.js";
import onboardingRoutes from "./routes/onboarding.js";
import oauthRoutes from "./routes/oauth.js";
import invitesRoutes from "./routes/invites.js";
import playbookRoutes from "./routes/playbook.js";
import oneOnOneRoutes from "./routes/oneOnOne.js";
import weeklyBriefRoutes from "./routes/weeklyBrief.js";
import authRoutes from "./routes/auth.js";
import teamMembersRoutes from "./routes/teamMembers.js";
import organizationRoutes from "./routes/organizations.js";
import projectRoutes from "./routes/projects.js";
import analyticsRoutes from "./routes/analytics.js";
import teamRoutes from "./routes/teamRoutes.js";
import slackRoutes from "./routes/slackRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";

// --- Middleware Imports ---
import { authenticateToken } from "./middleware/auth.js";
import auditConsent from "./middleware/consentAudit.js";

// --- Service Imports ---
import { refreshAllTeamsFromSlack } from "./services/slackService.js";
import { seedMasterAdmin } from './scripts/seed.js';

const app = express();
const PORT = process.env.PORT || 8080;

async function main() {
  try {
    // --- Database Connection ---
    if (process.env.NODE_ENV !== "test") {
      if (process.env.USE_IN_MEMORY_DB === "1") {
        console.log("Attempting to start in-memory MongoDB...");
        const mem = await MongoMemoryServer.create();
        const uri = mem.getUri();
        await mongoose.connect(uri);
        console.log("✅ In-memory MongoDB started and connected.");
        mongoose.connection.on('error', err => {
          console.error('Mongoose connection error:', err);
        });
      } else if (process.env.MONGO_URI) {
        console.log("Attempting to connect to MongoDB Atlas...");
        await mongoose.connect(process.env.MONGO_URI);
        mongoose.connection.on('command', (event) => {
          console.debug(JSON.stringify(event, null, 2));
        });
        console.log("✅ MongoDB connected");
        mongoose.connection.on('error', err => {
          console.error('Mongoose connection error:', err);
        });
      } else {
        console.error("❌ No MONGO_URI provided and USE_IN_MEMORY_DB is not '1'. Database connection failed.");
        process.exit(1);
      }
    }

    // --- Seed Database (for development) ---
    if (process.env.NODE_ENV !== 'production') {
      await seedMasterAdmin();
    }

    // --- Express Middleware ---
    app.use(cors({ origin: '*' })); // Allow all origins for development
    app.set('trust proxy', 1);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

    // --- Static Assets ---
    const uploadsDir = path.join(__dirname, "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    app.use("/uploads", express.static(uploadsDir));

    // --- API Routes ---
    app.get("/", (req, res) => res.send("SignalTrue backend is running 🚀"));
    app.use("/api/admin-export", adminExportRoutes);
    app.use("/api/benchmarks", benchmarksRoutes);
    app.use("/api/oneonone", oneOnOneRoutes);
    app.use("/api/playbook", playbookRoutes);
    app.use("/api/weekly-brief", weeklyBriefRoutes);
    app.use("/auth", oauthRoutes);
    app.use("/api/invites", invitesRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/team-members", teamMembersRoutes);
    app.use("/api/organizations", organizationRoutes);
    app.use("/api/projects", projectRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/teams", teamRoutes);
    app.use("/api/slack", slackRoutes);
    app.use("/api/history", historyRoutes);
    app.use("/api/narrative", narrativeRoutes);
    app.use("/api/focus", focusRoutes);
    app.use("/api/forecast", forecastRoutes);
    app.use("/api/leader", leaderRoutes);
    app.use("/api/outcomes", outcomesRoutes);
    app.use("/api/resilience", resilienceRoutes);
    app.use("/api", integrationsRoutes);
    app.use("/api", billingRoutes);
    app.use("/api", stripeWebhookRoutes);
    app.use("/api", adminRoutes);
    app.use("/api", exportRoutes);
    app.use("/api", adminCleanupRoutes);
    app.use("/api", programRoutes);
    app.use("/api", timelineRoutes);
    app.use("/api", onboardingRoutes);
    app.use('/api/drift-events', driftEventsRoutes);
    app.use('/api/consent-audit', authenticateToken, auditConsent, consentAuditRoutes);

    // --- Cron Jobs ---
    if (process.env.NODE_ENV !== "test") {
      if (process.env.SLACK_BOT_TOKEN) {
        cron.schedule('0 2 * * *', async () => {
          console.log('⏰ Running scheduled Slack data refresh...');
          try {
            await refreshAllTeamsFromSlack();
          } catch (err) {
            console.error('❌ Scheduled Slack refresh failed:', err.message);
          }
        });
        console.log('⏰ Cron job scheduled: Slack refresh daily at 2 AM');
      }
    }

    // --- Start Server ---
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

main();

export default app;
