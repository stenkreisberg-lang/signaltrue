import WeeklyReport from '../models/weeklyReport.js';
import TeamState from '../models/teamState.js';
import CrisisEvent from '../models/crisisEvent.js';
import Action from '../models/action.js';
import Team from '../models/team.js';
import { generateWeeklyRecommendations } from './aiRecommendationContext.js';

/**
 * Weekly Report Service
 * 
 * Generates tactical weekly reports by comparing current vs previous week.
 * ONLY includes new or worsening risks - filters out stable/improving metrics.
 * 
 * Triggered: After TeamState calculation (Sunday 11 PM)
 */

const RISK_INCREASE_THRESHOLD = 10; // Only report if risk increased by ≥10 points
const YELLOW_THRESHOLD = 35;
const RED_THRESHOLD = 65;

/**
 * Generate weekly report for a specific team
 */
export async function generateWeeklyReportForTeam(teamId) {
  try {
    // Get current and previous TeamState
    const teamStates = await TeamState.find({ teamId })
      .sort({ weekEnd: -1 })
      .limit(2)
      .populate('teamId');
    
    if (teamStates.length === 0) {
      console.log(`No TeamState found for team ${teamId}`);
      return null;
    }
    
    const currentState = teamStates[0];
    const previousState = teamStates.length > 1 ? teamStates[1] : null;
    
    // Calculate period
    const periodEnd = currentState.weekEnd;
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 7);
    
    // Calculate BDI delta
    const bdiCurrent = currentState.bdi || 0;
    const bdiPrevious = previousState?.bdi || bdiCurrent;
    const bdiDelta = bdiCurrent - bdiPrevious;
    
    // Check zone change
    const zone = currentState.zone || 'Stable';
    const previousZone = previousState?.zone;
    const zoneChanged = zone !== previousZone;
    
    // Identify new or worsening risks
    const newRisks = identifyNewOrWorseningRisks(currentState, previousState);
    
    // Get active or resolved crises (last 7 days)
    const crises = await CrisisEvent.find({
      teamId,
      detectedAt: { $gte: periodStart, $lte: periodEnd }
    }).sort({ detectedAt: -1 });
    
    const activeCrises = crises.map(crisis => ({
      crisisId: crisis._id,
      type: crisis.type,
      severity: crisis.severity,
      status: crisis.status,
      detectedAt: crisis.detectedAt,
      resolvedAt: crisis.resolvedAt
    }));
    
    // Get top risk drivers (max 3)
    const topDrivers = getTopDrivers(currentState, previousState);
    
    // Check if action is needed
    const noActionNeeded = checkIfNoActionNeeded(
      bdiDelta,
      newRisks,
      activeCrises,
      zone
    );
    
    // Generate AI recommendations (1-3 max, only if action needed)
    let recommendations = [];
    if (!noActionNeeded) {
      recommendations = await generateWeeklyRecommendations(
        currentState,
        previousState,
        newRisks,
        activeCrises,
        topDrivers
      );
    }
    
    // Create weekly report
    const weeklyReport = new WeeklyReport({
      teamId,
      periodStart,
      periodEnd,
      bdiCurrent,
      bdiDelta,
      zone,
      zoneChanged,
      previousZone,
      newRisks,
      activeCrises,
      topDrivers,
      recommendations,
      noActionNeeded,
      noActionReason: noActionNeeded ? generateNoActionReason(zone, bdiDelta) : undefined
    });
    
    await weeklyReport.save();
    
    console.log(`✅ Weekly report generated for team ${currentState.teamId.name}`);
    return weeklyReport;
    
  } catch (error) {
    console.error(`Error generating weekly report for team ${teamId}:`, error);
    throw error;
  }
}

/**
 * Identify risks that are NEW or WORSENING (≥10 point increase)
 */
function identifyNewOrWorseningRisks(currentState, previousState) {
  const risks = [];
  
  const riskTypes = [
    { type: 'overload', current: currentState.overloadRisk, previous: previousState?.overloadRisk },
    { type: 'execution', current: currentState.executionDrag, previous: previousState?.executionDrag },
    { type: 'retention', current: currentState.retentionStrain, previous: previousState?.retentionStrain }
  ];
  
  riskTypes.forEach(({ type, current, previous }) => {
    const currentScore = current || 0;
    const previousScore = previous || 0;
    const delta = currentScore - previousScore;
    
    // Include if:
    // 1. Score increased by ≥10 points
    // 2. Crossed into Yellow (≥35) or Red (≥65) zone
    const isNew = previousScore < YELLOW_THRESHOLD && currentScore >= YELLOW_THRESHOLD;
    const isWorsening = delta >= RISK_INCREASE_THRESHOLD;
    
    if (isNew || isWorsening) {
      risks.push({
        type,
        score: currentScore,
        delta,
        previousScore,
        isNew
      });
    }
  });
  
  return risks;
}

/**
 * Get top 1-3 risk drivers (metrics with highest deviation)
 */
function getTopDrivers(currentState, previousState) {
  const drivers = currentState.topDrivers || [];
  
  // Filter and rank by deviation magnitude
  const rankedDrivers = drivers
    .map(driver => ({
      metric: driver.metric,
      deviation: driver.deviation,
      impact: Math.abs(driver.deviation) >= 0.5 ? 'high' : 'medium'
    }))
    .sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
    .slice(0, 3);
  
  return rankedDrivers;
}

/**
 * Determine if no action is needed
 */
function checkIfNoActionNeeded(bdiDelta, newRisks, activeCrises, zone) {
  // Action needed if:
  // - Zone is Critical
  // - BDI increased significantly (≥5 points)
  // - Any new/worsening risks
  // - Active crises
  
  if (zone === 'Critical') return false;
  if (bdiDelta >= 5) return false;
  if (newRisks.length > 0) return false;
  if (activeCrises.length > 0) return false;
  
  return true;
}

/**
 * Generate reason why no action is needed
 */
function generateNoActionReason(zone, bdiDelta) {
  if (zone === 'Stable' && bdiDelta <= 0) {
    return 'Team remains stable with improving or steady health metrics';
  }
  if (zone === 'Recovery' && bdiDelta < 0) {
    return 'Team in recovery phase, metrics improving as expected';
  }
  return 'All metrics stable or improving, no intervention required this week';
}

/**
 * Generate weekly reports for all teams in an organization
 */
export async function generateWeeklyReportsForOrg(orgId) {
  try {
    const teams = await Team.find({ organizationId: orgId });
    
    const results = {
      success: 0,
      failed: 0,
      noAction: 0,
      reports: []
    };
    
    for (const team of teams) {
      try {
        const report = await generateWeeklyReportForTeam(team._id);
        if (report) {
          results.reports.push(report);
          if (report.noActionNeeded) {
            results.noAction++;
          } else {
            results.success++;
          }
        }
      } catch (error) {
        console.error(`Failed to generate report for team ${team.name}:`, error.message);
        results.failed++;
      }
    }
    
    console.log(`\n📊 Weekly Report Generation Summary for Org ${orgId}:`);
    console.log(`   ✅ Action required: ${results.success}`);
    console.log(`   ℹ️  No action needed: ${results.noAction}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    
    return results;
    
  } catch (error) {
    console.error('Error generating weekly reports for org:', error);
    throw error;
  }
}

/**
 * Get latest weekly report for a team
 */
export async function getLatestWeeklyReport(teamId) {
  return WeeklyReport.getLatestForTeam(teamId);
}

/**
 * Get weekly report history for a team
 */
export async function getWeeklyReportHistory(teamId, limit = 12) {
  return WeeklyReport.getHistoryForTeam(teamId, limit);
}

export default {
  generateWeeklyReportForTeam,
  generateWeeklyReportsForOrg,
  getLatestWeeklyReport,
  getWeeklyReportHistory
};
