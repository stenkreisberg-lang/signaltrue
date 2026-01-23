/**
 * Cost of Drift Service
 * Calculates directional cost estimates for organizational drift
 * 
 * Formula (per spec):
 * cost_of_drift = (hours_lost_to_meetings + execution_delay_hours + rework_hours) * avg_hourly_cost
 * 
 * Shows as RANGE, not exact value (to avoid false precision)
 */

import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';
import Organization from '../models/organizationModel.js';

// Default hourly cost if org hasn't configured one
const DEFAULT_HOURLY_COST = 75; // USD

// Cost multipliers for range calculation (show ±20%)
const RANGE_LOW_MULTIPLIER = 0.8;
const RANGE_HIGH_MULTIPLIER = 1.2;

/**
 * Calculate hours lost to excessive meetings
 * Formula: (current_meeting_hours - baseline_meeting_hours) * team_size
 */
function calculateMeetingHoursLost(currentMetrics, baseline, teamSize = 1) {
  if (!currentMetrics || !baseline) return 0;
  
  const currentMeetingHours = currentMetrics.meetingLoadIndex || 0;
  const baselineMeetingHours = baseline.meetingLoadIndex || currentMeetingHours;
  
  // Only count excess over baseline as "lost" time
  const excessHours = Math.max(0, currentMeetingHours - baselineMeetingHours);
  
  return excessHours * teamSize;
}

/**
 * Calculate execution delay hours
 * Based on: tasks delayed, response time slowdown, focus time loss
 */
function calculateExecutionDelayHours(currentMetrics, baseline, teamSize = 1) {
  if (!currentMetrics || !baseline) return 0;
  
  // Focus time erosion (hours per person per week)
  const currentFocusRatio = currentMetrics.focusTimeRatio || 0.5;
  const baselineFocusRatio = baseline.focusTimeRatio || 0.5;
  const WORK_HOURS_PER_WEEK = 40;
  
  const focusLoss = Math.max(0, baselineFocusRatio - currentFocusRatio) * WORK_HOURS_PER_WEEK;
  
  // Response time slowdown (convert to productivity loss estimate)
  const currentResponseTime = currentMetrics.responseMedianMins || 0;
  const baselineResponseTime = baseline.responseMedianMins || currentResponseTime;
  
  // Every 10 min increase in response time = ~1 hour lost per person per week (rough estimate)
  const responseDelay = Math.max(0, currentResponseTime - baselineResponseTime);
  const responseHoursLost = (responseDelay / 10) * 1;
  
  return (focusLoss + responseHoursLost) * teamSize;
}

/**
 * Calculate rework hours
 * Based on: reopened tasks, reassignments, churn indicators
 * NOTE: Full calculation requires Jira/Asana integration (Phase 2)
 */
function calculateReworkHours(currentMetrics, baseline, teamSize = 1) {
  // Placeholder: estimate rework from after-hours activity (proxy for rework/catch-up)
  const afterHoursRate = currentMetrics?.afterHoursRate || 0;
  const baselineAfterHours = baseline?.afterHoursRate || 0;
  
  // Excess after-hours activity often indicates rework/catch-up
  const excessAfterHours = Math.max(0, afterHoursRate - baselineAfterHours);
  
  // Convert percentage to hours (rough estimate)
  const WORK_HOURS_PER_WEEK = 40;
  const reworkHours = (excessAfterHours / 100) * WORK_HOURS_PER_WEEK;
  
  return reworkHours * teamSize;
}

/**
 * Calculate Cost of Drift for a team
 * Returns: { lowEstimate, highEstimate, midpoint, breakdown, weeklyProjection, monthlyProjection }
 */
export async function calculateCostOfDrift(teamId, options = {}) {
  const { 
    periodDays = 7,
    hourlyCost = null // Will use org config or default
  } = options;
  
  try {
    const team = await Team.findById(teamId).populate('orgId');
    if (!team) {
      throw new Error('Team not found');
    }
    
    // Get hourly cost from org config, options, or default
    const org = team.orgId;
    const avgHourlyCost = hourlyCost || org?.costConfig?.avgHourlyCost || DEFAULT_HOURLY_COST;
    
    // Get team size
    const teamSize = team.metadata?.actualSize || 10; // Default to 10 if not set
    
    // Get baseline
    const baseline = team.baseline?.signals || {};
    
    // Get recent metrics
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    
    const recentMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: since }
    }).sort({ date: -1 });
    
    if (recentMetrics.length === 0) {
      return {
        hasData: false,
        message: 'Insufficient data to calculate cost of drift'
      };
    }
    
    // Average recent metrics
    const currentMetrics = averageMetrics(recentMetrics);
    
    // Calculate component hours
    const meetingHoursLost = calculateMeetingHoursLost(currentMetrics, baseline, teamSize);
    const executionDelayHours = calculateExecutionDelayHours(currentMetrics, baseline, teamSize);
    const reworkHours = calculateReworkHours(currentMetrics, baseline, teamSize);
    
    const totalHoursLost = meetingHoursLost + executionDelayHours + reworkHours;
    
    // Calculate cost (per week)
    const weeklyCost = totalHoursLost * avgHourlyCost;
    
    // Calculate ranges
    const lowEstimate = Math.round(weeklyCost * RANGE_LOW_MULTIPLIER);
    const highEstimate = Math.round(weeklyCost * RANGE_HIGH_MULTIPLIER);
    const midpoint = Math.round(weeklyCost);
    
    // Monthly projection (4 weeks)
    const monthlyLow = lowEstimate * 4;
    const monthlyHigh = highEstimate * 4;
    
    return {
      hasData: true,
      teamId,
      teamName: team.name,
      periodDays,
      avgHourlyCost,
      teamSize,
      
      // Weekly cost range
      weeklyEstimate: {
        low: lowEstimate,
        high: highEstimate,
        midpoint,
        formatted: `$${lowEstimate.toLocaleString()} - $${highEstimate.toLocaleString()}`
      },
      
      // Monthly projection
      monthlyProjection: {
        low: monthlyLow,
        high: monthlyHigh,
        formatted: `$${monthlyLow.toLocaleString()} - $${monthlyHigh.toLocaleString()}`
      },
      
      // Breakdown by category
      breakdown: {
        meetingOverhead: {
          hours: Math.round(meetingHoursLost * 10) / 10,
          cost: Math.round(meetingHoursLost * avgHourlyCost),
          percentage: totalHoursLost > 0 ? Math.round((meetingHoursLost / totalHoursLost) * 100) : 0
        },
        executionDelay: {
          hours: Math.round(executionDelayHours * 10) / 10,
          cost: Math.round(executionDelayHours * avgHourlyCost),
          percentage: totalHoursLost > 0 ? Math.round((executionDelayHours / totalHoursLost) * 100) : 0
        },
        rework: {
          hours: Math.round(reworkHours * 10) / 10,
          cost: Math.round(reworkHours * avgHourlyCost),
          percentage: totalHoursLost > 0 ? Math.round((reworkHours / totalHoursLost) * 100) : 0
        }
      },
      
      totalHoursLost: Math.round(totalHoursLost * 10) / 10,
      
      // Interpretation
      interpretation: generateInterpretation(weeklyCost, totalHoursLost),
      
      calculatedAt: new Date()
    };
    
  } catch (error) {
    console.error('[CostOfDrift] Error calculating cost:', error);
    throw error;
  }
}

/**
 * Calculate Cost of Drift for entire organization
 */
export async function calculateOrgCostOfDrift(orgId, options = {}) {
  try {
    const teams = await Team.find({ orgId });
    
    const teamCosts = await Promise.all(
      teams.map(team => calculateCostOfDrift(team._id, options))
    );
    
    // Filter out teams without data
    const validCosts = teamCosts.filter(c => c.hasData);
    
    if (validCosts.length === 0) {
      return {
        hasData: false,
        message: 'Insufficient data to calculate organization cost of drift'
      };
    }
    
    // Aggregate costs
    const totalWeeklyLow = validCosts.reduce((sum, c) => sum + c.weeklyEstimate.low, 0);
    const totalWeeklyHigh = validCosts.reduce((sum, c) => sum + c.weeklyEstimate.high, 0);
    const totalMonthlyLow = validCosts.reduce((sum, c) => sum + c.monthlyProjection.low, 0);
    const totalMonthlyHigh = validCosts.reduce((sum, c) => sum + c.monthlyProjection.high, 0);
    
    // Find highest-cost teams
    const sortedByImpact = [...validCosts].sort((a, b) => 
      b.weeklyEstimate.midpoint - a.weeklyEstimate.midpoint
    );
    
    return {
      hasData: true,
      orgId,
      teamsAnalyzed: validCosts.length,
      
      weeklyEstimate: {
        low: totalWeeklyLow,
        high: totalWeeklyHigh,
        formatted: `$${totalWeeklyLow.toLocaleString()} - $${totalWeeklyHigh.toLocaleString()}`
      },
      
      monthlyProjection: {
        low: totalMonthlyLow,
        high: totalMonthlyHigh,
        formatted: `$${totalMonthlyLow.toLocaleString()} - $${totalMonthlyHigh.toLocaleString()}`
      },
      
      // Top 3 teams by drift cost
      highestImpactTeams: sortedByImpact.slice(0, 3).map(c => ({
        teamId: c.teamId,
        teamName: c.teamName,
        weeklyEstimate: c.weeklyEstimate.formatted,
        primaryDriver: getPrimaryDriver(c.breakdown)
      })),
      
      teamBreakdown: validCosts,
      
      calculatedAt: new Date()
    };
    
  } catch (error) {
    console.error('[CostOfDrift] Error calculating org cost:', error);
    throw error;
  }
}

/**
 * Helper: Average metrics from array
 */
function averageMetrics(metricsArray) {
  if (!metricsArray || metricsArray.length === 0) return {};
  
  const sum = metricsArray.reduce((acc, m) => ({
    meetingLoadIndex: (acc.meetingLoadIndex || 0) + (m.meetingLoadIndex || 0),
    focusTimeRatio: (acc.focusTimeRatio || 0) + (m.focusTimeRatio || 0),
    responseMedianMins: (acc.responseMedianMins || 0) + (m.responseMedianMins || 0),
    afterHoursRate: (acc.afterHoursRate || 0) + (m.afterHoursRate || 0)
  }), {});
  
  const count = metricsArray.length;
  return {
    meetingLoadIndex: sum.meetingLoadIndex / count,
    focusTimeRatio: sum.focusTimeRatio / count,
    responseMedianMins: sum.responseMedianMins / count,
    afterHoursRate: sum.afterHoursRate / count
  };
}

/**
 * Helper: Get primary driver from breakdown
 */
function getPrimaryDriver(breakdown) {
  const drivers = [
    { name: 'Meeting overhead', value: breakdown.meetingOverhead.percentage },
    { name: 'Execution delay', value: breakdown.executionDelay.percentage },
    { name: 'Rework', value: breakdown.rework.percentage }
  ];
  
  return drivers.sort((a, b) => b.value - a.value)[0]?.name || 'Unknown';
}

/**
 * Helper: Generate interpretation text
 */
function generateInterpretation(weeklyCost, totalHours) {
  if (weeklyCost === 0) {
    return 'No significant drift detected. Team is operating efficiently.';
  }
  
  if (weeklyCost < 1000) {
    return 'Low organizational friction. Minor optimization opportunities exist.';
  }
  
  if (weeklyCost < 5000) {
    return 'Moderate drift impact. Consider reviewing coordination patterns.';
  }
  
  if (weeklyCost < 15000) {
    return 'Significant drift cost. Intervention recommended to prevent further escalation.';
  }
  
  return 'Critical drift impact. Immediate attention required to restore execution efficiency.';
}

export default {
  calculateCostOfDrift,
  calculateOrgCostOfDrift
};
