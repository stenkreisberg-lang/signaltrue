/**
 * Weekly Scheduler Service
 * Orchestrates weekly diagnosis pipeline: metrics → baselines → risks → state → actions
 */

import Team from '../models/team.js';
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
  const teamState = await determineTeamState(
    teamId,
    weekStart,
    overloadRisk,
    executionRisk,
    retentionStrainRisk
  );

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
    `[Weekly Diagnosis] Team ${teamId} is ${teamState.state} (confidence: ${teamState.confidence}%)`
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

  console.log('=== WEEKLY CYCLE COMPLETE ===');

  return {
    diagnosis: diagnosisResults,
    experiments: experimentResults,
    engagement: engagementResults,
    timestamp: new Date(),
  };
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

      // Send weekly email digest after scoring — non-fatal if it fails
      sendWeeklyEngagementReport(orgId, weekStart.toISOString().split('T')[0]).catch((err) =>
        console.error(`[EngagementStrain] Email send failed for org ${orgId}:`, err.message)
      );
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
function scheduleWeeklyJob() {
  function scheduleNext() {
    const nextRun = getNextWeeklyRun();
    const delay = nextRun - new Date();

    console.log(`[Scheduler] Next weekly diagnosis scheduled for ${nextRun.toISOString()}`);

    setTimeout(async () => {
      await runWeeklyCycle();
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
