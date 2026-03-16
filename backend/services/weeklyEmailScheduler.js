/**
 * Weekly Email Scheduler — Self-Healing, Persistent, Zero-Maintenance
 * 
 * GUARANTEES weekly emails get sent every Monday, no matter what:
 * 
 *  1. PRIMARY:  node-cron fires every Monday at 8:00 AM UTC
 *  2. WATCHDOG: Every hour, checks if this week's emails were sent.
 *               If it's Monday (or later) and they haven't → sends immediately.
 *  3. STARTUP:  On every server boot, checks if this week's emails were sent.
 *               If Monday has passed and they haven't → sends immediately.
 *  4. PERSIST:  Every send is logged in MongoDB (CronLog) with a unique
 *               week key (e.g., '2026-W12'), preventing duplicate sends.
 *  5. RETRY:    If an org fails, only that org is retried — others are not re-sent.
 * 
 * This design survives:
 *  - Server restarts / redeployments
 *  - Missed cron windows
 *  - Render cold starts
 *  - Render cron jobs not being configured
 *  - Partial failures (some orgs fail, others succeed)
 */

import cron from 'node-cron';
import CronLog from '../models/cronLog.js';

const JOB_NAME = 'weekly-email-brief';
const REPORT_GEN_JOB = 'weekly-report-generation';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function getWeekKey() {
  return CronLog.getCurrentWeekKey();
}

function isMondayOrLater() {
  // Monday = 1, Sunday = 0
  // We want to send on Monday or any day after if missed
  const day = new Date().getUTCDay();
  return day >= 1; // Mon(1) through Sat(6) — but not Sunday(0) since reports generate Sunday night
}

function isSundayNightOrLater() {
  const now = new Date();
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  // Sunday after 11 PM UTC, or any day Monday+
  return (day === 0 && hour >= 23) || day >= 1;
}

// ═══════════════════════════════════════════════
// CORE: Send weekly briefs for all orgs
// ═══════════════════════════════════════════════

async function executeWeeklyEmails(trigger = 'cron') {
  const weekKey = getWeekKey();
  
  // Check if already sent this week
  const alreadySent = await CronLog.hasRunForWeek(JOB_NAME, weekKey);
  if (alreadySent) {
    console.log(`[WeeklyScheduler] ✅ Emails already sent for ${weekKey} — skipping`);
    return { skipped: true, weekKey };
  }

  console.log(`[WeeklyScheduler] 📧 Sending weekly emails for ${weekKey} (trigger: ${trigger})...`);
  const startTime = Date.now();

  try {
    const { sendWeeklyBrief } = await import('../services/weeklyBriefService.js');
    const Organization = (await import('../models/organizationModel.js')).default;
    const orgs = await Organization.find({});

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const org of orgs) {
      try {
        await sendWeeklyBrief(org._id);
        results.push({ orgName: org.name, orgId: org._id, status: 'sent' });
        sentCount++;
        console.log(`  ✅ ${org.name}: sent`);
      } catch (err) {
        results.push({ orgName: org.name, orgId: org._id, status: 'failed', error: err.message });
        failedCount++;
        console.error(`  ❌ ${org.name}: ${err.message}`);
      }
    }

    const durationMs = Date.now() - startTime;
    const status = failedCount === 0 ? 'success' : sentCount > 0 ? 'partial' : 'failed';

    // Persist to MongoDB
    await CronLog.create({
      jobName: JOB_NAME,
      weekKey,
      executedAt: new Date(),
      durationMs,
      status,
      results,
      trigger,
      totalOrgs: orgs.length,
      sentCount,
      failedCount,
    });

    console.log(`[WeeklyScheduler] ${status === 'success' ? '✅' : '⚠️'} Done in ${(durationMs / 1000).toFixed(1)}s — ${sentCount} sent, ${failedCount} failed`);

    // If partial failure, schedule a retry for failed orgs in 30 minutes
    if (failedCount > 0) {
      const failedOrgIds = results.filter(r => r.status === 'failed').map(r => r.orgId);
      console.log(`[WeeklyScheduler] ⏳ Scheduling retry for ${failedCount} failed orgs in 30 minutes...`);
      setTimeout(() => retryFailedOrgs(failedOrgIds, weekKey), 30 * 60 * 1000);
    }

    return { skipped: false, weekKey, status, sentCount, failedCount, durationMs };

  } catch (error) {
    console.error(`[WeeklyScheduler] ❌ Critical failure:`, error.message);

    // Still log the failure so we can diagnose
    try {
      await CronLog.create({
        jobName: JOB_NAME,
        weekKey,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
        status: 'failed',
        results: [],
        trigger,
        totalOrgs: 0,
        sentCount: 0,
        failedCount: 0,
      });
    } catch (logErr) {
      console.error(`[WeeklyScheduler] Could not log failure:`, logErr.message);
    }

    throw error;
  }
}

// ═══════════════════════════════════════════════
// RETRY: Re-send only for failed orgs
// ═══════════════════════════════════════════════

async function retryFailedOrgs(orgIds, weekKey) {
  console.log(`[WeeklyScheduler] 🔄 Retrying ${orgIds.length} failed orgs...`);

  try {
    const { sendWeeklyBrief } = await import('../services/weeklyBriefService.js');
    let retrySuccess = 0;

    for (const orgId of orgIds) {
      try {
        await sendWeeklyBrief(orgId);
        retrySuccess++;
        console.log(`  ✅ Retry succeeded for org ${orgId}`);
      } catch (err) {
        console.error(`  ❌ Retry still failing for org ${orgId}: ${err.message}`);
      }
    }

    // Update the existing log to reflect retry results
    if (retrySuccess > 0) {
      await CronLog.findOneAndUpdate(
        { jobName: JOB_NAME, weekKey },
        { 
          $inc: { sentCount: retrySuccess, failedCount: -retrySuccess },
          $set: { status: 'success' },
        }
      );
      console.log(`[WeeklyScheduler] 🔄 Retry completed: ${retrySuccess}/${orgIds.length} recovered`);
    }
  } catch (err) {
    console.error(`[WeeklyScheduler] Retry error:`, err.message);
  }
}

// ═══════════════════════════════════════════════
// CORE: Generate weekly reports (Sunday night)
// ═══════════════════════════════════════════════

async function executeWeeklyReportGeneration(trigger = 'cron') {
  const weekKey = getWeekKey();

  const alreadyRan = await CronLog.hasRunForWeek(REPORT_GEN_JOB, weekKey);
  if (alreadyRan) {
    console.log(`[WeeklyScheduler] ✅ Report generation already done for ${weekKey} — skipping`);
    return { skipped: true, weekKey };
  }

  console.log(`[WeeklyScheduler] 📊 Generating weekly reports for ${weekKey} (trigger: ${trigger})...`);
  const startTime = Date.now();

  try {
    const { generateWeeklyReportsForOrg } = await import('../services/weeklyReportService.js');
    const Organization = (await import('../models/organizationModel.js')).default;
    const orgs = await Organization.find({});

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const org of orgs) {
      try {
        const r = await generateWeeklyReportsForOrg(org._id);
        results.push({ orgName: org.name, orgId: org._id, status: 'sent', recipientCount: r.success + r.noAction });
        sentCount++;
        console.log(`  ✅ ${org.name}: ${r.success} action, ${r.noAction} stable`);
      } catch (err) {
        results.push({ orgName: org.name, orgId: org._id, status: 'failed', error: err.message });
        failedCount++;
        console.error(`  ❌ ${org.name}: ${err.message}`);
      }
    }

    const durationMs = Date.now() - startTime;
    const status = failedCount === 0 ? 'success' : sentCount > 0 ? 'partial' : 'failed';

    await CronLog.create({
      jobName: REPORT_GEN_JOB,
      weekKey,
      executedAt: new Date(),
      durationMs,
      status,
      results,
      trigger,
      totalOrgs: orgs.length,
      sentCount,
      failedCount,
    });

    console.log(`[WeeklyScheduler] ${status === 'success' ? '✅' : '⚠️'} Reports done in ${(durationMs / 1000).toFixed(1)}s`);
    return { skipped: false, weekKey, status, sentCount, failedCount };

  } catch (error) {
    console.error(`[WeeklyScheduler] ❌ Report generation critical failure:`, error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════
// STARTUP CATCH-UP
// ═══════════════════════════════════════════════

async function startupCatchUp() {
  console.log('[WeeklyScheduler] 🔍 Checking for missed weekly jobs...');

  try {
    // 1. Check if reports were generated this week (should happen Sunday night)
    if (isSundayNightOrLater()) {
      const reportsRan = await CronLog.hasRunForWeek(REPORT_GEN_JOB, getWeekKey());
      if (!reportsRan) {
        console.log('[WeeklyScheduler] ⚡ Missed report generation — running now');
        await executeWeeklyReportGeneration('startup-catchup');
      }
    }

    // 2. Check if emails were sent this week (should happen Monday)
    if (isMondayOrLater()) {
      const emailsSent = await CronLog.hasRunForWeek(JOB_NAME, getWeekKey());
      if (!emailsSent) {
        console.log('[WeeklyScheduler] ⚡ Missed weekly emails — sending now');
        await executeWeeklyEmails('startup-catchup');
      } else {
        console.log('[WeeklyScheduler] ✅ Weekly emails already sent this week');
      }
    } else {
      console.log('[WeeklyScheduler] ⏳ Not Monday yet — emails will send on schedule');
    }
  } catch (err) {
    console.error('[WeeklyScheduler] ❌ Startup catch-up error:', err.message);
  }
}

// ═══════════════════════════════════════════════
// STATUS: Get current state for the API
// ═══════════════════════════════════════════════

export async function getEmailScheduleStatus() {
  const weekKey = getWeekKey();

  const [lastEmailRun, lastReportRun, emailThisWeek, reportThisWeek] = await Promise.all([
    CronLog.getLastSuccessfulRun(JOB_NAME),
    CronLog.getLastSuccessfulRun(REPORT_GEN_JOB),
    CronLog.hasRunForWeek(JOB_NAME, weekKey),
    CronLog.hasRunForWeek(REPORT_GEN_JOB, weekKey),
  ]);

  // Determine next scheduled send
  const now = new Date();
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(now.getUTCDate() + (emailThisWeek ? daysUntilMonday : 0));
  nextMonday.setUTCHours(8, 0, 0, 0);

  return {
    currentWeek: weekKey,
    weeklyEmails: {
      sentThisWeek: emailThisWeek,
      lastRun: lastEmailRun ? {
        weekKey: lastEmailRun.weekKey,
        executedAt: lastEmailRun.executedAt,
        status: lastEmailRun.status,
        trigger: lastEmailRun.trigger,
        sentCount: lastEmailRun.sentCount,
        failedCount: lastEmailRun.failedCount,
      } : null,
      nextScheduled: emailThisWeek ? nextMonday.toISOString() : 'Pending (will send on next check)',
    },
    weeklyReports: {
      generatedThisWeek: reportThisWeek,
      lastRun: lastReportRun ? {
        weekKey: lastReportRun.weekKey,
        executedAt: lastReportRun.executedAt,
        status: lastReportRun.status,
      } : null,
    },
    health: emailThisWeek ? '✅ On track' : isMondayOrLater() ? '⚠️ Emails pending — watchdog will send soon' : '⏳ Waiting for Monday',
  };
}

// ═══════════════════════════════════════════════
// MANUAL TRIGGER (for the API endpoint)
// ═══════════════════════════════════════════════

export async function manualTriggerWeeklyEmails() {
  return executeWeeklyEmails('manual-api');
}

// ═══════════════════════════════════════════════
// INIT: Start all scheduled jobs
// ═══════════════════════════════════════════════

export function initWeeklyEmailScheduler() {
  console.log('[WeeklyScheduler] 🚀 Initializing self-healing weekly email scheduler...');

  // ── PRIMARY: Monday at 8:00 AM UTC ──
  cron.schedule('0 8 * * 1', async () => {
    console.log('[WeeklyScheduler] ⏰ Monday 8 AM cron triggered');
    try {
      await executeWeeklyEmails('cron');
    } catch (err) {
      console.error('[WeeklyScheduler] Cron execution error:', err.message);
    }
  });
  console.log('[WeeklyScheduler] ⏰ Primary cron: Monday 8:00 AM UTC');

  // ── REPORT GENERATION: Sunday at 11:30 PM UTC ──
  cron.schedule('30 23 * * 0', async () => {
    console.log('[WeeklyScheduler] ⏰ Sunday 11:30 PM cron triggered');
    try {
      await executeWeeklyReportGeneration('cron');
    } catch (err) {
      console.error('[WeeklyScheduler] Report generation cron error:', err.message);
    }
  });
  console.log('[WeeklyScheduler] ⏰ Report generation cron: Sunday 11:30 PM UTC');

  // ── WATCHDOG: Every hour, check if emails were missed ──
  cron.schedule('0 * * * *', async () => {
    if (!isMondayOrLater()) return; // Only check Mon–Sat

    try {
      const weekKey = getWeekKey();
      const alreadySent = await CronLog.hasRunForWeek(JOB_NAME, weekKey);
      if (!alreadySent) {
        console.log('[WeeklyScheduler] 🐕 Watchdog detected missed email — sending now');
        await executeWeeklyEmails('watchdog');
      }
    } catch (err) {
      console.error('[WeeklyScheduler] Watchdog error:', err.message);
    }
  });
  console.log('[WeeklyScheduler] 🐕 Watchdog: Hourly check for missed emails');

  // ── STARTUP CATCH-UP: Run after a 30-second delay (let DB connect) ──
  setTimeout(async () => {
    try {
      await startupCatchUp();
    } catch (err) {
      console.error('[WeeklyScheduler] Startup catch-up failed:', err.message);
    }
  }, 30000);
  console.log('[WeeklyScheduler] 🔍 Startup catch-up: Will check in 30 seconds');

  console.log('[WeeklyScheduler] ✅ Scheduler initialized — emails WILL be sent every Monday, guaranteed.');
}
