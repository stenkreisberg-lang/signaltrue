import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cron from "node-cron";
import projectRoutes from "./routes/projects.js";
import analyticsRoutes from "./routes/analytics.js";
import teamRoutes from "./routes/teamRoutes.js";
import slackRoutes from "./routes/slackRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import authRoutes from "./routes/auth.js";
import teamMembersRoutes from "./routes/teamMembers.js";
import organizationRoutes from "./routes/organizations.js";
import benchmarkRoutes from "./routes/benchmarkRoutes.js";
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
import programRoutes from "./routes/programRoutes.js";
import timelineRoutes from "./routes/timelineRoutes.js";
import { refreshAllTeamsFromSlack } from "./services/slackService.js";
import { refreshAllTeamsCalendars } from "./services/calendarService.js";
import { sendWeeklySummaries } from "./services/notificationService.js";
import { refreshExpiringIntegrationTokens } from "./services/tokenService.js";
import { pullAllConnectedOrgs } from "./services/integrationPullService.js";
import { upsertDailyMetricsFromTeam } from "./services/baselineService.js";
import { buildBaselinesForAllTeams } from "./services/baselineService.js";
import { detectDriftForAllTeams } from "./services/driftService.js";
import { updateEnergyIndexForTeam } from "./services/energyIndexService.js";
import { sendDriftAlerts } from "./services/alertService.js";
import Team from "./models/team.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

dotenv.config();

const app = express();
app.use(cors());
// Stripe webhook requires the raw body; register raw parser BEFORE json parser for that path only
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple test route
app.get("/", (req, res) => {
  res.send("SignalTrue backend is running 🚀");
});

// Connect to MongoDB when a connection string is provided and not running tests.
// Tests manage their own in-memory MongoDB connection to avoid clobbering state.
if (process.env.MONGO_URI && process.env.NODE_ENV !== "test") {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.error("❌ MongoDB connection error:", err));
}

const PORT = process.env.PORT || 8080;

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
await fs.mkdir(uploadsDir, { recursive: true });

// Serve static files from uploads directory
app.use("/uploads", express.static(uploadsDir));

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/team-members", teamMembersRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", teamRoutes);
app.use("/api", slackRoutes);
app.use("/api", historyRoutes);
app.use("/api", calendarRoutes);
app.use("/api", notificationRoutes);
app.use("/api/benchmarks", benchmarkRoutes);
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
app.use("/api", programRoutes);
app.use("/api", timelineRoutes);

// Schedule Slack + Calendar data refresh daily at 2 AM
if (process.env.NODE_ENV !== "test") {
  // Slack refresh (if configured)
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

  // Calendar refresh (if configured)
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    cron.schedule('0 2 * * *', async () => {
      console.log('⏰ Running scheduled Calendar data refresh...');
      try {
        await refreshAllTeamsCalendars();
      } catch (err) {
        console.error('❌ Scheduled Calendar refresh failed:', err.message);
      }
    });
    console.log('⏰ Cron job scheduled: Calendar refresh daily at 2 AM');
  }

  // Weekly summaries (every Monday at 9 AM)
  if (process.env.SLACK_BOT_TOKEN || process.env.EMAIL_HOST) {
    cron.schedule('0 9 * * 1', async () => {
      console.log('⏰ Running scheduled weekly summaries...');
      try {
        await sendWeeklySummaries({
          includeSlack: !!process.env.SLACK_BOT_TOKEN,
          includeEmail: !!process.env.EMAIL_HOST,
        });
      } catch (err) {
        console.error('❌ Scheduled weekly summaries failed:', err.message);
      }
    });
    console.log('⏰ Cron job scheduled: Weekly summaries every Monday at 9 AM');
  }

  // Token refresh for Google/Microsoft every hour
  if (process.env.GOOGLE_CLIENT_ID || process.env.MS_APP_CLIENT_ID) {
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running scheduled token refresh for integrations...');
      try {
        await refreshExpiringIntegrationTokens();
      } catch (err) {
        console.error('❌ Scheduled token refresh failed:', err.message);
      }
    });
    console.log('⏰ Cron job scheduled: Integration token refresh every hour');
  }

  // Unified daily metrics, baseline, drift, energy, alert job at 3:30 AM
  cron.schedule('30 3 * * *', async () => {
    console.log('⏰ Running unified daily metrics, baseline, drift, energy, alert job...');
    try {
      // 1. Pull provider data
      await pullAllConnectedOrgs();
      // 2. Update daily metrics for all teams
      const teams = await Team.find({});
      for (const team of teams) {
        await upsertDailyMetricsFromTeam(team);
        await updateEnergyIndexForTeam(team);
      }
      // 3. Refresh baselines
      await buildBaselinesForAllTeams();
      // 4. Detect drift
      await detectDriftForAllTeams();
      // 5. Send drift alerts
      await sendDriftAlerts();
    } catch (err) {
      console.error('❌ Unified daily job failed:', err.message);
    }
  });
  console.log('⏰ Cron job scheduled: Unified daily metrics/baseline/drift/energy/alert at 3:30 AM');
}

// Listen only when not running under tests
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Uploads directory: ${uploadsDir}`);
  });
}

export default app;
