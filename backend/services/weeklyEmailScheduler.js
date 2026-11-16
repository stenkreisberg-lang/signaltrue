/**
 * Weekly Email Scheduler — Self-Healing, Persistent, Zero-Maintenance
 *
 * Attempts weekly HR emails on or after the configured safe Monday window:
 *
 *  1. PRIMARY:  node-cron polls the 09:00 Europe/Tallinn Monday window
 *  2. WATCHDOG: Every hour, checks if this week's emails were sent.
 *               If the Tallinn Monday window opened and they haven't → sends.
 *  3. STARTUP:  On every server boot, checks if this week's emails were sent.
 *               If the Tallinn Monday window opened and they haven't → sends.
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
import { ensureWeeklyCycleComplete } from './weeklySchedulerService.js';

const JOB_NAME = 'weekly-email-brief';
const REPORT_GEN_JOB = 'weekly-report-generation';
const SITE_ANALYTICS_JOB = 'weekly-site-analytics-report';

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function getWeekKey() {
  return CronLog.getCurrentWeekKey();
}

export function isMondayOrLater(date = new Date()) {
  // Never dispatch a Monday HR email before 09:00 in Tallinn.
  // The weekly scoring cycle starts at 05:30 UTC and must complete first.
  // Use IANA timezone rules to account for EU daylight saving changes.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Tallinn',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value;
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  if (day <= 0) return false;
  if (day > 1) return true;
  return Number(get('hour')) * 60 + Number(get('minute')) >= 9 * 60;
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

// Single-flight for overlapping hourly checks in one server process.
// WeeklyBriefDispatch separately guards duplicate provider delivery.
let weeklyEmailRunPromise = null;
async function executeWeeklyEmails(trigger = 'cron') {
  if (weeklyEmailRunPromise) return weeklyEmailRunPromise;
  weeklyEmailRunPromise = executeWeeklyEmailsOnce(trigger)
    .finally(() => { weeklyEmailRunPromise = null; });
  return weeklyEmailRunPromise;
}
async function isWeeklyEmailComplete(weekKey) {
  const run = await CronLog.findOne({ jobName: JOB_NAME, weekKey })
    .select('status').lean();
  return run?.status === 'success';
}
async function executeWeeklyEmailsOnce(trigger) {
  const weekKey = getWeekKey();
  const previous = await CronLog.findOne({ jobName: JOB_NAME, weekKey }).lean();
  if (previous?.status === 'success') {
    console.log(`[WeeklyScheduler] All weekly emails confirmed for ${weekKey}`);
    return { skipped: true, weekKey };
  }
  // A partial run is not complete. Retry only organisations that were not sent.
  const sentOrgIds = new Set((previous?.results || [])
    .filter(item => item.status === 'sent')
    .map(item => String(item.orgId)));

  // No customer mail is dispatched unless the measurement cycle completes.
  await ensureWeeklyCycleComplete();
  const started = Date.now();
  const { sendWeeklyBrief } = await import('../services/weeklyBriefService.js');
  const { default: Organization, ACTIVE_ORG_FILTER } =
    await import('../models/organizationModel.js');
  const orgs = await Organization.find(ACTIVE_ORG_FILTER);
  const results = [];

  for (const org of orgs) {
    if (sentOrgIds.has(String(org._id))) {
      results.push({ orgName: org.name, orgId: org._id, status: 'sent' });
      continue;
    }
    try {
      const delivery = await sendWeeklyBrief(org._id);
      if (delivery?.skipped && delivery.reason !== 'already_sent') {
        throw new Error('Delivery skipped without a confirmed send');
      }
      results.push({ orgName: org.name, orgId: org._id, status: 'sent' });
      console.log(`[WeeklyScheduler] ${org.name}: sent or already confirmed`);
    } catch (error) {
      results.push({
        orgName: org.name, orgId: org._id, status: 'failed',
        error: String(error?.message || 'unknown_delivery_failure').slice(0, 250),
      });
      console.error(`[WeeklyScheduler] ${org.name}: ${error.message}`);
    }
  }
  const sentCount = results.filter(result => result.status === 'sent').length;
  const failedCount = results.length - sentCount;
  const status = failedCount === 0 ? 'success' : sentCount > 0 ? 'partial' : 'failed';

  // The unique week record retains per-org failures across Render restarts.
  await CronLog.findOneAndUpdate(
    { jobName: JOB_NAME, weekKey },
    { $set: {
      executedAt: new Date(), durationMs: Date.now() - started,
      status, results, trigger, totalOrgs: orgs.length,
      sentCount, failedCount,
    } },
    { upsert: true, new: true },
  );
  console.log(
    `[WeeklyScheduler] ${weekKey}: sent=${sentCount}, failed=${failedCount}, status=${status}`
  );
  return { skipped: false, weekKey, status, sentCount, failedCount };
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

  console.log(
    `[WeeklyScheduler] 📊 Generating weekly reports for ${weekKey} (trigger: ${trigger})...`
  );
  const startTime = Date.now();

  try {
    const { generateWeeklyReportsForOrg } = await import('../services/weeklyReportService.js');
    const { default: Organization, ACTIVE_ORG_FILTER } = await import(
      '../models/organizationModel.js'
    );
    const orgs = await Organization.find(ACTIVE_ORG_FILTER);

    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const org of orgs) {
      try {
        const r = await generateWeeklyReportsForOrg(org._id);
        results.push({
          orgName: org.name,
          orgId: org._id,
          status: 'sent',
          recipientCount: r.success + r.noAction,
        });
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

    console.log(
      `[WeeklyScheduler] ${status === 'success' ? '✅' : '⚠️'} Reports done in ${(durationMs / 1000).toFixed(1)}s`
    );
    return { skipped: false, weekKey, status, sentCount, failedCount };
  } catch (error) {
    console.error(`[WeeklyScheduler] ❌ Report generation critical failure:`, error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════
// CORE: Send weekly GA4 site analytics report to SignalTrue admin
// ═══════════════════════════════════════════════

async function executeWeeklySiteAnalyticsReport(trigger = 'cron') {
  const weekKey = getWeekKey();

  const alreadySent = await CronLog.hasRunForWeek(SITE_ANALYTICS_JOB, weekKey);
  if (alreadySent) {
    console.log(`[WeeklyScheduler] Site analytics report already sent for ${weekKey} — skipping`);
    return { skipped: true, weekKey };
  }

  console.log(
    `[WeeklyScheduler] Sending weekly site analytics report for ${weekKey} (trigger: ${trigger})...`
  );
  const startTime = Date.now();

  try {
    const { sendWeeklySiteAnalyticsReport } = await import('./siteAnalyticsEmailService.js');
    const result = await sendWeeklySiteAnalyticsReport(trigger);
    const durationMs = Date.now() - startTime;

    await CronLog.create({
      jobName: SITE_ANALYTICS_JOB,
      weekKey,
      executedAt: new Date(),
      durationMs,
      status: 'success',
      results: [
        {
          orgName: 'SignalTrue site',
          status: 'sent',
          recipientCount: 1,
        },
      ],
      trigger,
      totalOrgs: 1,
      sentCount: 1,
      failedCount: 0,
    });

    console.log(
      `[WeeklyScheduler] Site analytics report sent to ${result.recipientEmail} in ${(durationMs / 1000).toFixed(1)}s`
    );

    return {
      skipped: false,
      weekKey,
      status: 'success',
      sentCount: 1,
      failedCount: 0,
      durationMs,
      ...result,
    };
  } catch (error) {
    console.error(`[WeeklyScheduler] Site analytics report failed:`, error.message);

    try {
      await CronLog.create({
        jobName: SITE_ANALYTICS_JOB,
        weekKey,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
        status: 'failed',
        results: [
          {
            orgName: 'SignalTrue site',
            status: 'failed',
            error: error.message,
            recipientCount: 0,
          },
        ],
        trigger,
        totalOrgs: 1,
        sentCount: 0,
        failedCount: 1,
      });
    } catch (logErr) {
      console.error(`[WeeklyScheduler] Could not log site analytics failure:`, logErr.message);
    }

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
      const emailsSent = await isWeeklyEmailComplete(getWeekKey());
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

  const [
    lastEmailRun,
    lastReportRun,
    lastSiteAnalyticsRun,
    emailThisWeek,
    reportThisWeek,
    siteAnalyticsThisWeek,
  ] = await Promise.all([
    CronLog.getLastSuccessfulRun(JOB_NAME),
    CronLog.getLastSuccessfulRun(REPORT_GEN_JOB),
    CronLog.getLastSuccessfulRun(SITE_ANALYTICS_JOB),
    isWeeklyEmailComplete(weekKey),
    CronLog.hasRunForWeek(REPORT_GEN_JOB, weekKey),
    CronLog.hasRunForWeek(SITE_ANALYTICS_JOB, weekKey),
  ]);

  // Determine next scheduled send
  const now = new Date();
  const nextMonday = new Date(now);
  const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
  nextMonday.setUTCDate(now.getUTCDate() + (emailThisWeek ? daysUntilMonday : 0));
  nextMonday.setUTCHours(8, 0, 0, 0);

  const nextSiteAnalyticsMonday = new Date(now);
  nextSiteAnalyticsMonday.setUTCDate(
    now.getUTCDate() + (siteAnalyticsThisWeek ? daysUntilMonday : 0)
  );
  nextSiteAnalyticsMonday.setUTCHours(7, 30, 0, 0);

  return {
    currentWeek: weekKey,
    weeklyEmails: {
      sentThisWeek: emailThisWeek,
      lastRun: lastEmailRun
        ? {
            weekKey: lastEmailRun.weekKey,
            executedAt: lastEmailRun.executedAt,
            status: lastEmailRun.status,
            trigger: lastEmailRun.trigger,
            sentCount: lastEmailRun.sentCount,
            failedCount: lastEmailRun.failedCount,
          }
        : null,
      nextScheduled: emailThisWeek ? nextMonday.toISOString() : 'Pending (will send on next check)',
    },
    weeklyReports: {
      generatedThisWeek: reportThisWeek,
      lastRun: lastReportRun
        ? {
            weekKey: lastReportRun.weekKey,
            executedAt: lastReportRun.executedAt,
            status: lastReportRun.status,
          }
        : null,
    },
    siteAnalyticsReport: {
      sentThisWeek: siteAnalyticsThisWeek,
      recipientEmail: process.env.SITE_ANALYTICS_REPORT_EMAIL || 'sten.kreisberg@signaltrue.ai',
      lastRun: lastSiteAnalyticsRun
        ? {
            weekKey: lastSiteAnalyticsRun.weekKey,
            executedAt: lastSiteAnalyticsRun.executedAt,
            status: lastSiteAnalyticsRun.status,
            trigger: lastSiteAnalyticsRun.trigger,
            sentCount: lastSiteAnalyticsRun.sentCount,
            failedCount: lastSiteAnalyticsRun.failedCount,
          }
        : null,
      nextScheduled: siteAnalyticsThisWeek
        ? nextSiteAnalyticsMonday.toISOString()
        : 'Pending (will send on next Monday 7:30 AM UTC)',
    },
    health: emailThisWeek
      ? '✅ On track'
      : isMondayOrLater()
        ? '⚠️ Emails pending — watchdog will send soon'
        : '⏳ Waiting for Monday',
  };
}

// ═══════════════════════════════════════════════
// MANUAL TRIGGER (for the API endpoint)
// ═══════════════════════════════════════════════

export async function manualTriggerWeeklyEmails() {
  return executeWeeklyEmails('manual-api');
}

export async function manualTriggerWeeklySiteAnalyticsReport() {
  return executeWeeklySiteAnalyticsReport('manual-api');
}

// ═══════════════════════════════════════════════
// INIT: Start all scheduled jobs
// ═══════════════════════════════════════════════

export function initWeeklyEmailScheduler() {
  console.log('[WeeklyScheduler] 🚀 Initializing self-healing weekly email scheduler...');
  // Manager intelligence is explicitly gated by MANAGER_INTELLIGENCE_EMAIL_ENABLED.
  // Local tenant time is checked inside the job; never send by a fixed UTC 08:30.
  cron.schedule('30 * * * *', async () => {
    try {
      const { runScheduledManagerDigests } = await import('./managerWeeklyDeliveryService.js');
      await runScheduledManagerDigests();
    } catch (error) {
      console.error('[ManagerIntelligence] Scheduled digest failed:', error.message);
    }
  });


  // ── PRIMARY: Monday at 09:00 Europe/Tallinn, DST-aware ──
  // Poll at 06:00 and 07:00 UTC for summer and winter. Never send before scoring.
  cron.schedule('0 6,7,8,9,10 * * 1', async () => {
    if (!isMondayOrLater()) return;
    console.log('[WeeklyScheduler] Monday Tallinn-local delivery window opened');
    try {
      await executeWeeklyEmails('cron');
    } catch (err) {
      console.error('[WeeklyScheduler] Cron execution error:', err.message);
    }
  });
  console.log('[WeeklyScheduler] Primary cron: Monday 09:00 Europe/Tallinn, after weekly scoring');

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

  // ── SITE ANALYTICS REPORT: Monday at 7:30 AM UTC ──
  cron.schedule('30 7 * * 1', async () => {
    console.log('[WeeklyScheduler] ⏰ Monday 7:30 AM site analytics cron triggered');
    try {
      await executeWeeklySiteAnalyticsReport('cron');
    } catch (err) {
      console.error('[WeeklyScheduler] Site analytics cron error:', err.message);
    }
  });
  console.log('[WeeklyScheduler] ⏰ Site analytics report cron: Monday 7:30 AM UTC');

  // ── WATCHDOG: Every hour, check if emails were missed ──
  cron.schedule('0 * * * *', async () => {
    if (!isMondayOrLater()) return; // Only check Mon–Sat

    try {
      const weekKey = getWeekKey();
      const alreadySent = await isWeeklyEmailComplete(weekKey);
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

  console.log(
    '[WeeklyScheduler] Scheduler initialized: weekly send and persisted retry enabled.'
  );
}
