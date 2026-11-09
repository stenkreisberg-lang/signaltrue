/**
 * Weekly Scheduler Service
 * Orchestrates weekly diagnosis pipeline: metrics → baselines → risks → state → actions
 */

import Team from '../models/team.js';
import CronLog from '../models/cronLog.js';
import {
  calculateOverloadRisk,
  calculateExecutionRisk,
  calculateRetentionStrainRisk,
  determineTeamState,
} from './riskCalculationService.js';
import { generateAction } from './actionGenerationService.js';
import { checkExpiredExperiments } from './experimentTrackingService.js';
import { runWeeklyEngagementStrainJob } from './engagementWeeklyJobService.js';
import { sendWeeklyEngagementReport } from './engagementWeeklyEmailService.js';
import { buildCommunicationGraph } from './communicationGraphService.js';
import {
  ensureManagerCoachingHistoryForOrg,
  runManagerOverloadForOrg,
} from './managerOverloadService.js';
import { createManagerCoachingNotificationsForOrg } from './managerCoachingNotificationService.js';

/**
 * Get the start of the current week (Monday)
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the Monday for the most recently completed week.
 */
function getPreviousWeekStart(date = new Date()) {
  const currentWeekStart = getWeekStart(date);
  currentWeekStart.setDate(currentWeekStart.getDate() - 7);
  return currentWeekStart;
}

function getNextWeeklyRun(date = new Date()) {
  const next = getWeekStart(date);
  next.setHours(5, 30, 0, 0);
  if (next <= date) next.setDate(next.getDate() + 7);
  return next;
}

/**
 * Main weekly job - runs every Monday
 * Processes all teams: calculate risks, determine state, generate actions
 */
async function runWeeklyDiagnosis(weekStart = getPreviousWeekStart()) {
  console.log('[Weekly Diagnosis] Starting weekly diagnosis job...');

  const teams = await Team.find({ isActive: { $ne: false } });

  const results = {
    processed: 0,
    errors: [],
    summary: {
      healthy: 0,
      strained: 0,
      overloaded: 0,
      breaking: 0,
      actionsGenerated: 0,
    },
  };

  for (const team of teams) {
    try {
      await processTeam(team._id, weekStart, results);
      results.processed++;
    } catch (error) {
      console.error(`[Weekly Diagnosis] Error processing team ${team._id}:`, error);
      results.errors.push({
        teamId: team._id,
        teamName: team.name,
        error: error.message,
      });
    }
  }

  console.log('[Weekly Diagnosis] Completed:', results);
  return results;
}

/**
 * Process a single team: calculate all risks, determine state, generate action if needed
 */
async function processTeam(teamId, weekStart, results) {
  console.log(`[Weekly Diagnosis] Processing team ${teamId}...`);

  // Step 1: Calculate all 3 risk types
  const overloadRisk = await calculateOverloadRisk(teamId, weekStart);
  const executionRisk = await calculateExecutionRisk(teamId, weekStart);
  const retentionStrainRisk = await calculateRetentionStrainRisk(teamId, weekStart);

  // Step 2: Determine team state based on risk scores
  const risks = [overloadRisk?.risk, executionRisk?.risk, retentionStrainRisk?.risk].filter(Boolean);
  const teamState = await determineTeamState(teamId, weekStart, risks);

  // Track state in summary
  results.summary[teamState.state]++;

  // Step 3: Generate action if team is strained or worse
  if (['strained', 'overloaded', 'breaking'].includes(teamState.state)) {
    const action = await generateAction(teamId, weekStart);
    if (action) {
      results.summary.actionsGenerated++;
    }
  }

  console.log(
    `[Weekly Diagnosis] Team ${teamId} is ${teamState.state} (confidence: ${teamState.confidence})`
  );
}

/**
 * Complete expired experiments and generate impact
 */
async function runExperimentCompletion() {
  console.log('[Experiment Completion] Checking for expired experiments...');

  const results = await checkExpiredExperiments();

  const completed = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  console.log(`[Experiment Completion] Completed ${completed} experiments, ${failed} errors`);

  return {
    completed,
    failed,
    results,
  };
}

/**
 * Run full weekly cycle: legacy diagnosis + engagement strain scoring + experiment completion
 */
async function runWeeklyCycle(weekStart = getPreviousWeekStart()) {
  console.log('=== STARTING WEEKLY CYCLE ===');

  const diagnosisResults = await runWeeklyDiagnosis(weekStart);
  const experimentResults = await runExperimentCompletion();
  const engagementResults = await runEngagementStrainCycle(weekStart);
  const managerOverloadResults = await runManagerOverloadCycle(weekStart);

  console.log('=== WEEKLY CYCLE COMPLETE ===');

  return {
    diagnosis: diagnosisResults,
    experiments: experimentResults,
    engagement: engagementResults,
    managerOverload: managerOverloadResults,
    timestamp: new Date(),
  };
}

/**
 * Run the manager-overload / span pipeline for all orgs.
 * Builds the ONA communication graph once per org and feeds it into the
 * per-manager SOI computation. See docs/PIVOT_REPORT_SPEC.md §3–§5.
 */
async function runManagerOverloadCycle(weekStart) {
  console.log('[ManagerOverload] Starting weekly manager-overload scoring...');
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const teams = await Team.find({ isActive: { $ne: false } })
    .select('orgId')
    .lean();
  const orgIds = [...new Set(teams.map((t) => String(t.orgId)).filter(Boolean))];

  const results = { processed: 0, suppressed: 0, errors: 0, orgs: orgIds.length };

  for (const orgId of orgIds) {
    try {
      const graph = await buildCommunicationGraph(orgId, weekStartStr);
      const result = await runManagerOverloadForOrg(orgId, weekStartStr, { graph });
      results.processed += result.processed ?? 0;
      results.suppressed += result.suppressed ?? 0;
      results.errors += result.errors?.length ?? 0;
      const history = await ensureManagerCoachingHistoryForOrg(orgId, weekStartStr);
      results.backfilled = (results.backfilled || 0) + history.backfilled;
      const notifications = await createManagerCoachingNotificationsForOrg(orgId);
      results.notifications = (results.notifications || 0) + notifications.insightsCreated;
    } catch (err) {
      console.error(`[ManagerOverload] Error processing org ${orgId}:`, err.message);
      results.errors++;
    }
  }

  console.log('[ManagerOverload] Cycle complete:', results);
  return results;
}

/**
 * Run Engagement Strain scoring for all orgs.
 * Collects the distinct set of orgIds from active teams and fires one job per org.
 */
async function runEngagementStrainCycle(weekStart) {
  console.log('[EngagementStrain] Starting weekly engagement strain scoring...');

  const teams = await Team.find({ isActive: { $ne: false } })
    .select('orgId')
    .lean();
  const orgIds = [...new Set(teams.map((t) => String(t.orgId)).filter(Boolean))];

  const results = { processed: 0, suppressed: 0, errors: 0, orgs: orgIds.length };

  for (const orgId of orgIds) {
    try {
      const result = await runWeeklyEngagementStrainJob(orgId, weekStart);
      results.processed += result.processed ?? 0;
      results.suppressed += result.suppressed ?? 0;
      results.errors += result.errors?.length ?? 0;

      // The consolidated HR brief already includes eligible team patterns.
      // Do not send a second legacy manager/admin digest by default.
      if (process.env.LEGACY_ENGAGEMENT_EMAIL_ENABLED === 'true') {
        sendWeeklyEngagementReport(orgId, weekStart.toISOString().split('T')[0]).catch((err) =>
          console.error(`[EngagementStrain] Legacy email send failed for org ${orgId}:`, err.message)
        );
      }
    } catch (err) {
      console.error(`[EngagementStrain] Error processing org ${orgId}:`, err.message);
      results.errors++;
    }
  }

  console.log('[EngagementStrain] Cycle complete:', results);
  return results;
}

/**
 * On-demand diagnosis for a single team (for testing or manual triggers)
 */
async function diagnoseSingleTeam(teamId, weekStart = null) {
  if (!weekStart) {
    weekStart = getWeekStart();
  }

  const results = {
    processed: 0,
    errors: [],
    summary: {
      healthy: 0,
      strained: 0,
      overloaded: 0,
      breaking: 0,
      actionsGenerated: 0,
    },
  };

  await processTeam(teamId, weekStart, results);

  return results;
}

/**
 * Schedule the weekly job (call this on server startup)
 * Runs every Monday at 5:30 AM, after daily ingestion and aggregation.
 */
// One shared promise prevents the Monday scheduler and the email watchdog
// from starting competing scoring runs inside the production server.
let weeklyCyclePromise = null;
export async function ensureWeeklyCycleComplete() {
  const weekKey = CronLog.getCurrentWeekKey();
  const jobName = 'weekly-measurement-cycle';
  if (await CronLog.hasRunForWeek(jobName, weekKey)) return { alreadyCompleted: true };
  if (!weeklyCyclePromise) {
    weeklyCyclePromise = (async () => {
      const started = Date.now();
      const cycle = await runWeeklyCycle();
      const failed = (cycle.diagnosis?.errors?.length || 0) +
        (cycle.engagement?.errors || 0) + (cycle.managerOverload?.errors || 0);
      // The cycle must complete before customer report generation. Source-specific
      // failures are visible and individually validated by the brief service.
      await CronLog.findOneAndUpdate(
        { jobName, weekKey },
        { $set: { status: failed ? 'partial' : 'success',
          executedAt: new Date(), durationMs: Date.now() - started,
          trigger: 'cron', failedCount: failed } },
        { upsert: true, new: true }
      );
      console.info('[WeeklyCycle] Completed before customer delivery', { weekKey, failed });
      return { alreadyCompleted: false, failed };
    })().finally(() => { weeklyCyclePromise = null; });
  }
  return weeklyCyclePromise;
}
function scheduleWeeklyJob() {
  function scheduleNext() {
    const nextRun = getNextWeeklyRun();
    const delay = nextRun - new Date();

    console.log(`[Scheduler] Next weekly diagnosis scheduled for ${nextRun.toISOString()}`);

    setTimeout(async () => {
      try {
        await ensureWeeklyCycleComplete();
      } catch (error) {
        console.error('[WeeklyCycle] Pre-report scoring failed:', error.message);
      }
      scheduleNext(); // Schedule next run
    }, delay);
  }

  scheduleNext();
}

export {
  runWeeklyDiagnosis,
  runExperimentCompletion,
  runWeeklyCycle,
  runEngagementStrainCycle,
  diagnoseSingleTeam,
  scheduleWeeklyJob,
  getWeekStart,
  getPreviousWeekStart,
  getNextWeeklyRun,
};
