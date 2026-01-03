/**
 * Weekly Scheduler Service
 * Orchestrates weekly diagnosis pipeline: metrics → baselines → risks → state → actions
 */

import Team from '../models/team.js';
import {
  calculateOverloadRisk,
  calculateExecutionRisk,
  calculateRetentionStrainRisk,
  determineTeamState
} from './riskCalculationService.js';
import { generateAction } from './actionGenerationService.js';
import { checkExpiredExperiments } from './experimentTrackingService.js';

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
 * Main weekly job - runs every Monday
 * Processes all teams: calculate risks, determine state, generate actions
 */
async function runWeeklyDiagnosis() {
  console.log('[Weekly Diagnosis] Starting weekly diagnosis job...');
  
  const weekStart = getWeekStart();
  const teams = await Team.find({ isActive: true });
  
  const results = {
    processed: 0,
    errors: [],
    summary: {
      healthy: 0,
      strained: 0,
      overloaded: 0,
      breaking: 0,
      actionsGenerated: 0
    }
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
        error: error.message
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
  
  console.log(`[Weekly Diagnosis] Team ${teamId} is ${teamState.state} (confidence: ${teamState.confidence}%)`);
}

/**
 * Complete expired experiments and generate impact
 */
async function runExperimentCompletion() {
  console.log('[Experiment Completion] Checking for expired experiments...');
  
  const results = await checkExpiredExperiments();
  
  const completed = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;
  
  console.log(`[Experiment Completion] Completed ${completed} experiments, ${failed} errors`);
  
  return {
    completed,
    failed,
    results
  };
}

/**
 * Run full weekly cycle: diagnosis + experiment completion
 */
async function runWeeklyCycle() {
  console.log('=== STARTING WEEKLY CYCLE ===');
  
  const diagnosisResults = await runWeeklyDiagnosis();
  const experimentResults = await runExperimentCompletion();
  
  console.log('=== WEEKLY CYCLE COMPLETE ===');
  
  return {
    diagnosis: diagnosisResults,
    experiments: experimentResults,
    timestamp: new Date()
  };
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
      actionsGenerated: 0
    }
  };
  
  await processTeam(teamId, weekStart, results);
  
  return results;
}

/**
 * Schedule the weekly job (call this on server startup)
 * Runs every Monday at 1 AM
 */
function scheduleWeeklyJob() {
  // Calculate milliseconds until next Monday 1 AM
  function getNextMonday() {
    const now = new Date();
    const next = new Date(now);
    next.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    next.setHours(1, 0, 0, 0);
    
    if (next <= now) {
      next.setDate(next.getDate() + 7);
    }
    
    return next;
  }
  
  function scheduleNext() {
    const nextRun = getNextMonday();
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
  diagnoseSingleTeam,
  scheduleWeeklyJob,
  getWeekStart
};
