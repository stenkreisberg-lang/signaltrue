// Force redeploy
import cron from "node-cron";
import cors from "cors";
import compression from "compression";
import mongoose from "mongoose";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import dotenv from 'dotenv';
// mongodb-memory-server is now loaded dynamically only when USE_IN_MEMORY_DB=1

// --- ESM-friendly __dirname and __filename ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- Global Error Handlers (must be set up early) ---
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Give time for logs to flush before exiting
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

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
import teamManagementRoutes from "./routes/teams.js";
import employeeSyncRoutes from "./routes/employeeSync.js";
import slackRoutes from "./routes/slackRoutes.js";
import googleChatRoutes from "./routes/googleChatRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";
import calibrationRoutes from "./routes/calibration.js";
import signalsRoutes from "./routes/signals.js";
import actionsRoutes from "./routes/actions.js";
import dcrRoutes from "./routes/dcr.js";
import firstSignalRoutes from "./routes/firstSignal.js";
import interventionsRoutes from "./routes/interventions.js";
import privacyRoutes from "./routes/privacy.js";
import comparisonsRoutes from "./routes/comparisons.js";
import bdiRoutes from "./routes/bdiRoutes.js";
import insightsRoutes from "./routes/insights.js";
import loopClosingRoutes from "./routes/loopClosingRoutes.js";
import learningRoutes from "./routes/learning.js";
import behavioralIntelligenceRoutes from "./routes/behavioralIntelligence.js";
import reportsRoutes from "./routes/reports.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import fitQuestionnaireRoutes from "./routes/fitQuestionnaire.js";
import chatRoutes from "./routes/chat.js";
import assessmentRoutes from "./routes/assessment.js";
import trialRoutes from "./routes/trial.js";
import superadminRoutes from "./routes/superadmin.js";
import passwordResetRoutes from "./routes/passwordReset.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import costOfDriftRoutes from "./routes/costOfDrift.js";
import blogRoutes from "./routes/blog.js";
import managerCoachingRoutes from "./routes/managerCoaching.js";
import driftDiagnosticRoutes from "./routes/drift.js";

// --- Category-King Integration Routes ---
import categoryKingIntegrationsRoutes from "./routes/categoryKingIntegrations.js";
import integrationDashboardRoutes from "./routes/integrationDashboard.js";
import aiCopilotRoutes from "./routes/aiCopilot.js";
import integrationDebugRoutes from "./routes/integrationDebug.js";

// --- Middleware Imports ---
import { authenticateToken } from "./middleware/auth.js";
import auditConsent from "./middleware/consentAudit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { 
  applySecurityMiddleware,
  authLimiter,
  intelligenceLimiter,
  adminLimiter,
  apiLimiter
} from './middleware/security.js';

// --- Service Imports ---
import { refreshAllTeamsFromSlack } from "./services/slackService.js";
import { refreshAllTeamsCalendars } from "./services/calendarService.js";
import { seedMasterAdmin } from './scripts/seed.js';
import { scheduleWeeklyJob } from './services/weeklySchedulerService.js';
import { runCrisisDetection } from './services/crisisDetectionService.js';
import { calculateTeamAttritionRisk } from './services/attritionRiskService.js';
import { calculateManagerEffectiveness } from './services/managerEffectivenessService.js';
import { scheduleIntegrationJobs } from './services/integrationSyncScheduler.js';
import { pullAllConnectedOrgs } from './services/integrationPullService.js';
import Team from './models/team.js';

const app = express();
const PORT = process.env.PORT || 8080;

async function main() {
  try {
    // --- Database Connection ---
    if (process.env.NODE_ENV !== "test") {
      if (process.env.USE_IN_MEMORY_DB === "1") {
        console.log("Attempting to start in-memory MongoDB...");
        // Dynamic import - only loads the package when actually needed
        const { MongoMemoryServer } = await import('mongodb-memory-server');
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
    const whitelist = ['https://signaltrue.ai', 'https://www.signaltrue.ai'];
    const corsOptions = {
      origin: function (origin, callback) {
        if (process.env.NODE_ENV !== 'production' || !origin || whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    };
    app.use(cors(corsOptions));
    app.set('trust proxy', 1);
    
    // --- Response Compression (gzip) ---
    app.use(compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
      level: 6 // Balance between speed and compression ratio
    }));
    
    // --- Security Middleware ---
    // Apply core security (headers, sanitization, monitoring)
    applySecurityMiddleware(app);
    
    // Apply rate limiting to auth endpoints
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    
    // Apply rate limiting to intelligence endpoints
    app.use('/api/intelligence', intelligenceLimiter);
    
    // Apply rate limiting to admin endpoints
    app.use('/api/admin', adminLimiter);
    
    // Apply general rate limiting to all API routes
    app.use('/api/', apiLimiter);
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

    // --- Static Assets ---
    const uploadsDir = path.join(__dirname, "uploads");
    await fs.mkdir(uploadsDir, { recursive: true });
    app.use("/uploads", express.static(uploadsDir));

    // --- API Routes ---
    app.get("/", (req, res) => res.send("SignalTrue backend is running 🚀"));
    
    // Health check endpoint for monitoring
    app.get("/api/health", async (req, res) => {
      try {
        const dbState = mongoose.connection.readyState;
        const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';
        
        res.json({
          status: dbState === 1 ? 'healthy' : 'degraded',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          database: dbStatus,
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
          }
        });
      } catch (error) {
        res.status(503).json({ status: 'unhealthy', error: error.message });
      }
    });
    
    app.use("/api/admin-export", adminExportRoutes);
    app.use("/api/benchmarks", benchmarksRoutes);
    app.use("/api/oneonone", oneOnOneRoutes);
    app.use("/api/playbook", playbookRoutes);
    app.use("/api/weekly-brief", weeklyBriefRoutes);
    app.use("/api", oauthRoutes);
    app.use("/api/invites", invitesRoutes);
    app.use("/api/auth", authRoutes);
    app.use("/api/team-members", teamMembersRoutes);
    app.use("/api/organizations", organizationRoutes);
    app.use("/api/projects", projectRoutes);
    app.use("/api/analytics", analyticsRoutes);
    app.use("/api/teams", teamRoutes);
    app.use("/api/team-management", teamManagementRoutes);
    app.use("/api/employee-sync", employeeSyncRoutes);
    app.use("/api/slack", slackRoutes);
    app.use("/api/google-chat", googleChatRoutes);
    app.use("/api/history", historyRoutes);
    app.use("/api/calibration", calibrationRoutes);
    app.use("/api/signals", signalsRoutes);
    app.use("/api/actions", actionsRoutes);
    app.use("/api/dcr", dcrRoutes);
    app.use("/api/first-signal", firstSignalRoutes);
    app.use("/api/interventions", interventionsRoutes);
    app.use("/api/privacy", privacyRoutes);
    app.use("/api/comparisons", comparisonsRoutes);
    app.use("/api/bdi", bdiRoutes);
    app.use("/api/indices", bdiRoutes);
    app.use("/api/capacity", bdiRoutes);
    app.use("/api/timeline", bdiRoutes);
    app.use("/api/playbooks", bdiRoutes);
    app.use("/api/dashboard", bdiRoutes);
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
    app.use('/api/insights', insightsRoutes);
    app.use('/api/loop-closing', loopClosingRoutes);
    app.use('/api/learning', learningRoutes);
    app.use('/api/intelligence', behavioralIntelligenceRoutes);
    app.use('/api/reports', reportsRoutes);
    app.use('/api/subscriptions', subscriptionRoutes);
    app.use('/api/fit-questionnaire', fitQuestionnaireRoutes);
    
    // --- AI Chat Assistant (public, no auth required) ---
    app.use('/api/chat', chatRoutes);
    
    // --- Assessment & Cost Calculator (public, no auth required) ---
    app.use('/api/assessment', assessmentRoutes);
    
    // --- Drift Diagnostic Routes (public, no auth required) ---
    app.use('/api/drift', driftDiagnosticRoutes);
    
    // --- Trial Management (mixed auth - some public, some protected) ---
    app.use('/api/trial', trialRoutes);
    
    // --- Superadmin Routes (master_admin only) ---
    app.use('/api/superadmin', superadminRoutes);
    
    // --- Integration Debug Routes (superadmin only) ---
    app.use('/api/debug', integrationDebugRoutes);
    
    // --- Password Reset Routes (public, no auth required) ---
    app.use('/api/auth', passwordResetRoutes);
    
    // --- Calendar Routes ---
    app.use('/api', calendarRoutes);
    
    // --- Cost of Drift Routes (Executive ROI view) ---
    app.use('/api/cost-of-drift', costOfDriftRoutes);
    
    // --- Blog Routes (public read, API key for write) ---
    app.use('/api/blog', blogRoutes);
    
    // --- Manager Coaching Routes ---
    app.use('/api/manager-coaching', managerCoachingRoutes);
    
    // --- Category-King Integration Routes ---
    app.use('/api/integrations-v2', categoryKingIntegrationsRoutes);
    app.use('/api/integration-dashboard', integrationDashboardRoutes);
    app.use('/api/ai', aiCopilotRoutes);
    
    // --- Analytics Tracking (public, no auth required) ---
    app.post('/api/analytics/track', (req, res) => {
      const { event, data, timestamp } = req.body;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Analytics Track] ${event}`, data);
      }
      // TODO: Forward to analytics provider (Segment, Mixpanel, etc.)
      res.json({ success: true });
    });

    // --- 404 Handler - Must come after all route definitions ---
    app.use(notFoundHandler);

    // --- Global Error Handler - Must be last middleware ---
    app.use(errorHandler);

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
      
      // Calendar data sync - daily at 2:30 AM
      cron.schedule('30 2 * * *', async () => {
        console.log('⏰ Running scheduled Calendar data refresh...');
        try {
          await refreshAllTeamsCalendars();
          console.log('✅ Calendar refresh completed');
        } catch (err) {
          console.error('❌ Scheduled Calendar refresh failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Calendar refresh daily at 2:30 AM');
      
      // Microsoft/Google integration sync - every 15 minutes from 6am-10pm
      cron.schedule('*/15 6-22 * * *', async () => {
        console.log('⏰ Running scheduled integration data pull (Google/Microsoft)...');
        try {
          await pullAllConnectedOrgs();
          console.log('✅ Integration data pull completed');
        } catch (err) {
          console.error('❌ Integration data pull failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Integration data pull every 15 minutes (6am-10pm)');
      
      // Start weekly diagnosis scheduler (runs every Monday at 1 AM)
      scheduleWeeklyJob();
      
      // Start Category-King integration sync scheduler
      scheduleIntegrationJobs();
      
      // Crisis detection - every 15 minutes (real-time anomaly detection)
      cron.schedule('*/15 * * * *', async () => {
        console.log('⏰ Running crisis detection...');
        try {
          await runCrisisDetection();
        } catch (err) {
          console.error('❌ Crisis detection failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Crisis detection every 15 minutes');
      
      // Attrition risk calculation - daily at 3 AM
      cron.schedule('0 3 * * *', async () => {
        console.log('⏰ Running attrition risk calculation...');
        try {
          const teams = await Team.find({ isActive: true });
          for (const team of teams) {
            await calculateTeamAttritionRisk(team._id);
          }
          console.log('✅ Attrition risk calculation completed');
        } catch (err) {
          console.error('❌ Attrition risk calculation failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Attrition risk daily at 3 AM');
      
      // Manager effectiveness - monthly on 1st at 4 AM
      cron.schedule('0 4 1 * *', async () => {
        console.log('⏰ Running manager effectiveness calculation...');
        try {
          const teams = await Team.find({ isActive: true });
          for (const team of teams) {
            if (team.managerId) {
              await calculateManagerEffectiveness(team.managerId, team._id);
            }
          }
          console.log('✅ Manager effectiveness calculation completed');
        } catch (err) {
          console.error('❌ Manager effectiveness calculation failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Manager effectiveness monthly on 1st at 4 AM');
      
      // Project risk analysis - daily at 2 AM
      cron.schedule('0 2 * * *', async () => {
        console.log('⏰ Running project risk analysis...');
        try {
          const { analyzeTeamProjects } = await import('./services/projectRiskService.js');
          const teams = await Team.find({ isActive: true });
          for (const team of teams) {
            await analyzeTeamProjects(team._id);
          }
          console.log('✅ Project risk analysis completed');
        } catch (err) {
          console.error('❌ Project risk analysis failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Project risk daily at 2 AM');
      
      // Network health analysis - weekly on Sundays at 5 AM
      cron.schedule('0 5 * * 0', async () => {
        console.log('⏰ Running network health analysis...');
        try {
          const { analyzeNetworkHealth } = await import('./services/networkHealthService.js');
          const teams = await Team.find({ isActive: true });
          for (const team of teams) {
            await analyzeNetworkHealth(team._id);
          }
          console.log('✅ Network health analysis completed');
        } catch (err) {
          console.error('❌ Network health analysis failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Network health weekly on Sundays at 5 AM');
      
      // Succession risk analysis - monthly on 15th at 3 AM
      cron.schedule('0 3 15 * *', async () => {
        console.log('⏰ Running succession risk analysis...');
        try {
          const { analyzeTeamSuccessionRisk } = await import('./services/successionRiskService.js');
          const teams = await Team.find({ isActive: true });
          for (const team of teams) {
            await analyzeTeamSuccessionRisk(team._id);
          }
          console.log('✅ Succession risk analysis completed');
        } catch (err) {
          console.error('❌ Succession risk analysis failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Succession risk monthly on 15th at 3 AM');
      
      // Equity signals analysis - weekly on Mondays at 6 AM
      cron.schedule('0 6 * * 1', async () => {
        console.log('⏰ Running equity signals analysis...');
        try {
          const { analyzeTeamEquity } = await import('./services/equitySignalsService.js');
          const teams = await Team.find({ isActive: true });
          for (const team of teams) {
            await analyzeTeamEquity(team._id);
          }
          console.log('✅ Equity signals analysis completed');
        } catch (err) {
          console.error('❌ Equity signals analysis failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Equity signals weekly on Mondays at 6 AM');
      
      // Outlook signals analysis - daily at 4 AM
      cron.schedule('0 4 * * *', async () => {
        console.log('⏰ Running Outlook signals analysis...');
        try {
          const { analyzeTeamOutlookSignals } = await import('./services/outlookSignalsService.js');
          const teams = await Team.find({ isActive: true });
          for (const team of teams) {
            await analyzeTeamOutlookSignals(team._id);
          }
          console.log('✅ Outlook signals analysis completed');
        } catch (err) {
          console.error('❌ Outlook signals analysis failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Outlook signals daily at 4 AM');
      
      // Weekly reports generation - Sunday at 11:30 PM (after TeamState calculation)
      cron.schedule('30 23 * * 0', async () => {
        console.log('⏰ Generating weekly reports for all organizations...');
        try {
          const { generateWeeklyReportsForOrg } = await import('./services/weeklyReportService.js');
          const Organization = (await import('./models/organizationModel.js')).default;
          const orgs = await Organization.find({ isActive: true });
          
          for (const org of orgs) {
            try {
              const results = await generateWeeklyReportsForOrg(org._id);
              console.log(`  ✅ ${org.name}: ${results.success} action required, ${results.noAction} stable`);
            } catch (err) {
              console.error(`  ❌ Failed for ${org.name}:`, err.message);
            }
          }
          console.log('✅ Weekly reports generation completed');
        } catch (err) {
          console.error('❌ Weekly reports generation failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Weekly reports generation Sunday at 11:30 PM');
      
      // Monthly reports generation - 1st of month at 4:00 AM
      cron.schedule('0 4 1 * *', async () => {
        console.log('⏰ Generating monthly reports for all organizations...');
        try {
          const { generateMonthlyReportForOrg } = await import('./services/monthlyReportService.js');
          const Organization = (await import('./models/organizationModel.js')).default;
          const orgs = await Organization.find({ isActive: true });
          
          for (const org of orgs) {
            try {
              const report = await generateMonthlyReportForOrg(org._id);
              if (report) {
                console.log(`  ✅ ${org.name}: BDI ${report.orgHealth.avgBDI.toFixed(1)}/100 (${report.orgHealth.bdiTrend})`);
              }
            } catch (err) {
              console.error(`  ❌ Failed for ${org.name}:`, err.message);
            }
          }
          console.log('✅ Monthly reports generation completed');
        } catch (err) {
          console.error('❌ Monthly reports generation failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Monthly reports generation 1st of month at 4:00 AM');
      
      // Card expiry reminder - daily at 9 AM
      cron.schedule('0 9 * * *', async () => {
        console.log('⏰ Checking for expiring payment methods...');
        try {
          const { checkExpiringCards } = await import('./services/cardExpiryReminderService.js');
          const result = await checkExpiringCards();
          console.log(`✅ Card expiry check completed: ${result.reminded} reminders sent`);
        } catch (err) {
          console.error('❌ Card expiry check failed:', err.message);
        }
      });
      console.log('⏰ Cron job scheduled: Card expiry reminder daily at 9 AM');
    }

    // --- Start Server ---
    if (process.env.NODE_ENV !== "test") {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    }

  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

main();

export default app;
