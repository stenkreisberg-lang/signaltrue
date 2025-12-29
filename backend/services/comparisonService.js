/**
 * Comparison Service
 * Internal benchmarks ONLY - NOT industry benchmarks
 * Compares: team vs org avg, this month vs last, before vs after intervention
 * All comparisons labeled: "Internal comparison. Not industry benchmark."
 */

import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';
import Intervention from '../models/intervention.js';

/**
 * Compare team to organization average
 * @param {string} teamId - Team to compare
 * @param {string} orgId - Organization ID
 * @param {number} days - Days to look back (default 30)
 * @returns {Object} Comparison data
 */
export async function compareTeamToOrgAverage(teamId, orgId, days = 30) {
  try {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // Get all teams in org
    const orgTeams = await Team.find({ orgId });
    const teamIds = orgTeams.map(t => t._id);
    
    // Get metrics for this team
    const teamMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: startDate }
    }).sort({ date: -1 });
    
    // Get metrics for all org teams
    const allOrgMetrics = await MetricsDaily.find({
      teamId: { $in: teamIds },
      date: { $gte: startDate }
    });
    
    if (teamMetrics.length === 0 || allOrgMetrics.length === 0) {
      return {
        available: false,
        message: 'Insufficient data for comparison'
      };
    }
    
    // Calculate averages
    const teamAvg = calculateMetricAverages(teamMetrics);
    const orgAvg = calculateMetricAverages(allOrgMetrics);
    
    // Calculate deltas
    const comparison = {
      type: 'team_vs_org',
      disclaimer: 'Internal comparison. Not industry benchmark.',
      teamName: orgTeams.find(t => String(t._id) === String(teamId))?.name,
      periodDays: days,
      metrics: {
        meetingLoad: {
          team: teamAvg.meetingLoadIndex,
          org: orgAvg.meetingLoadIndex,
          delta: ((teamAvg.meetingLoadIndex - orgAvg.meetingLoadIndex) / orgAvg.meetingLoadIndex * 100).toFixed(1),
          status: teamAvg.meetingLoadIndex > orgAvg.meetingLoadIndex ? 'above' : 'below'
        },
        afterHoursRate: {
          team: teamAvg.afterHoursRate,
          org: orgAvg.afterHoursRate,
          delta: ((teamAvg.afterHoursRate - orgAvg.afterHoursRate) / orgAvg.afterHoursRate * 100).toFixed(1),
          status: teamAvg.afterHoursRate > orgAvg.afterHoursRate ? 'above' : 'below'
        },
        responseLatency: {
          team: teamAvg.responseMedianMins,
          org: orgAvg.responseMedianMins,
          delta: ((teamAvg.responseMedianMins - orgAvg.responseMedianMins) / orgAvg.responseMedianMins * 100).toFixed(1),
          status: teamAvg.responseMedianMins > orgAvg.responseMedianMins ? 'slower' : 'faster'
        },
        focusTime: {
          team: teamAvg.focusTimeRatio,
          org: orgAvg.focusTimeRatio,
          delta: ((teamAvg.focusTimeRatio - orgAvg.focusTimeRatio) / orgAvg.focusTimeRatio * 100).toFixed(1),
          status: teamAvg.focusTimeRatio > orgAvg.focusTimeRatio ? 'above' : 'below'
        }
      }
    };
    
    return comparison;
  } catch (error) {
    console.error('[ComparisonService] Error in compareTeamToOrgAverage:', error);
    throw error;
  }
}

/**
 * Compare this month vs last month for a team
 * @param {string} teamId - Team to analyze
 * @returns {Object} Month-over-month comparison
 */
export async function compareThisMonthVsLast(teamId) {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: thisMonthStart, $lte: now }
    });
    
    const lastMonthMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    if (thisMonthMetrics.length === 0 || lastMonthMetrics.length === 0) {
      return {
        available: false,
        message: 'Insufficient data for month-over-month comparison'
      };
    }
    
    const thisMonthAvg = calculateMetricAverages(thisMonthMetrics);
    const lastMonthAvg = calculateMetricAverages(lastMonthMetrics);
    
    const comparison = {
      type: 'month_over_month',
      disclaimer: 'Internal comparison. Not industry benchmark.',
      thisMonth: {
        start: thisMonthStart.toISOString().split('T')[0],
        dataPoints: thisMonthMetrics.length
      },
      lastMonth: {
        start: lastMonthStart.toISOString().split('T')[0],
        dataPoints: lastMonthMetrics.length
      },
      metrics: {
        meetingLoad: {
          current: thisMonthAvg.meetingLoadIndex,
          previous: lastMonthAvg.meetingLoadIndex,
          change: ((thisMonthAvg.meetingLoadIndex - lastMonthAvg.meetingLoadIndex) / lastMonthAvg.meetingLoadIndex * 100).toFixed(1),
          trend: thisMonthAvg.meetingLoadIndex > lastMonthAvg.meetingLoadIndex ? 'increasing' : 'decreasing'
        },
        afterHoursRate: {
          current: thisMonthAvg.afterHoursRate,
          previous: lastMonthAvg.afterHoursRate,
          change: ((thisMonthAvg.afterHoursRate - lastMonthAvg.afterHoursRate) / lastMonthAvg.afterHoursRate * 100).toFixed(1),
          trend: thisMonthAvg.afterHoursRate > lastMonthAvg.afterHoursRate ? 'increasing' : 'decreasing'
        },
        responseLatency: {
          current: thisMonthAvg.responseMedianMins,
          previous: lastMonthAvg.responseMedianMins,
          change: ((thisMonthAvg.responseMedianMins - lastMonthAvg.responseMedianMins) / lastMonthAvg.responseMedianMins * 100).toFixed(1),
          trend: thisMonthAvg.responseMedianMins > lastMonthAvg.responseMedianMins ? 'slowing' : 'improving'
        },
        focusTime: {
          current: thisMonthAvg.focusTimeRatio,
          previous: lastMonthAvg.focusTimeRatio,
          change: ((thisMonthAvg.focusTimeRatio - lastMonthAvg.focusTimeRatio) / lastMonthAvg.focusTimeRatio * 100).toFixed(1),
          trend: thisMonthAvg.focusTimeRatio > lastMonthAvg.focusTimeRatio ? 'increasing' : 'decreasing'
        }
      }
    };
    
    return comparison;
  } catch (error) {
    console.error('[ComparisonService] Error in compareThisMonthVsLast:', error);
    throw error;
  }
}

/**
 * Compare before vs after intervention
 * @param {string} interventionId - Intervention to analyze
 * @returns {Object} Before/after comparison
 */
export async function compareBeforeAfterIntervention(interventionId) {
  try {
    const intervention = await Intervention.findById(interventionId);
    if (!intervention) {
      throw new Error('Intervention not found');
    }
    
    const { teamId, signalType, startDate, metricBefore, metricAfter } = intervention;
    
    if (!metricAfter) {
      return {
        available: false,
        message: 'Intervention outcome not yet measured. Recheck after 14 days.'
      };
    }
    
    // Get 7 days before intervention start
    const beforeStart = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const beforeMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: beforeStart, $lt: startDate }
    });
    
    // Get 7 days after recheck (current)
    const afterStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const afterMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: afterStart }
    });
    
    const beforeAvg = calculateMetricAverages(beforeMetrics);
    const afterAvg = calculateMetricAverages(afterMetrics);
    
    // Map signal type to metric field
    const metricFieldMap = {
      'coordination-risk': 'meetingLoadIndex',
      'boundary-erosion': 'afterHoursRate',
      'execution-drag': 'responseMedianMins',
      'focus-erosion': 'focusTimeRatio'
    };
    
    const field = metricFieldMap[signalType] || 'meetingLoadIndex';
    const beforeValue = beforeAvg[field];
    const afterValue = afterAvg[field];
    const change = ((afterValue - beforeValue) / beforeValue * 100).toFixed(1);
    
    const comparison = {
      type: 'before_after_intervention',
      disclaimer: 'Internal comparison. Not industry benchmark.',
      interventionId,
      signalType,
      actionTaken: intervention.actionTaken,
      periodDays: 7,
      metric: field,
      before: {
        value: beforeValue,
        period: `${beforeStart.toISOString().split('T')[0]} to ${startDate.toISOString().split('T')[0]}`,
        dataPoints: beforeMetrics.length
      },
      after: {
        value: afterValue,
        period: `${afterStart.toISOString().split('T')[0]} to now`,
        dataPoints: afterMetrics.length
      },
      change: parseFloat(change),
      improved: intervention.outcomeDelta?.improved || false,
      interpretation: change < 0 ? 'Metric decreased (likely improved)' : 'Metric increased'
    };
    
    return comparison;
  } catch (error) {
    console.error('[ComparisonService] Error in compareBeforeAfterIntervention:', error);
    throw error;
  }
}

/**
 * Helper: Calculate average metrics from array of MetricsDaily documents
 */
function calculateMetricAverages(metrics) {
  if (metrics.length === 0) {
    return {
      meetingLoadIndex: 0,
      afterHoursRate: 0,
      responseMedianMins: 0,
      focusTimeRatio: 0
    };
  }
  
  const sum = metrics.reduce((acc, m) => ({
    meetingLoadIndex: acc.meetingLoadIndex + (m.meetingLoadIndex || 0),
    afterHoursRate: acc.afterHoursRate + (m.afterHoursRate || 0),
    responseMedianMins: acc.responseMedianMins + (m.responseMedianMins || 0),
    focusTimeRatio: acc.focusTimeRatio + (m.focusTimeRatio || 0)
  }), {
    meetingLoadIndex: 0,
    afterHoursRate: 0,
    responseMedianMins: 0,
    focusTimeRatio: 0
  });
  
  return {
    meetingLoadIndex: (sum.meetingLoadIndex / metrics.length).toFixed(2),
    afterHoursRate: (sum.afterHoursRate / metrics.length).toFixed(2),
    responseMedianMins: (sum.responseMedianMins / metrics.length).toFixed(2),
    focusTimeRatio: (sum.focusTimeRatio / metrics.length).toFixed(2)
  };
}
