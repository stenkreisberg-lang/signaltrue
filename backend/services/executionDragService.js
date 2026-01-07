/**
 * Execution Drag Indicator Service
 * Detects when coordination overhead eats execution capacity
 * 
 * Measures:
 * - Message volume growth
 * - Meeting count growth
 * - Response time slowdown
 * 
 * Output:
 * - Execution Drag = coordination growth – response efficiency
 * - Warning state indicator
 */

import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

/**
 * Execution Drag thresholds
 */
const DRAG_THRESHOLDS = {
  LOW: 0,       // Drag <= 0 = efficient
  MODERATE: 10, // Drag 0-10 = moderate drag
  HIGH: 20      // Drag > 20 = high drag
};

/**
 * Calculate growth rate between two periods
 * @param {number} previous - Previous period value
 * @param {number} current - Current period value
 * @returns {number} - Growth rate as percentage
 */
function calculateGrowthRate(previous, current) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate coordination load from metrics
 * Coordination = meetings + message volume
 * @param {Object} metrics - Period metrics
 * @returns {number} - Coordination load score
 */
function calculateCoordinationLoad(metrics) {
  const meetingWeight = 2; // Meetings are heavier coordination
  const messageWeight = 1;
  
  const meetingLoad = (metrics.meetingCount || 0) * meetingWeight;
  const messageLoad = (metrics.messageVolume || 0) / 100 * messageWeight; // Normalize
  
  return meetingLoad + messageLoad;
}

/**
 * Calculate response efficiency
 * Efficiency = faster responses + fewer context switches
 * @param {Object} metrics - Period metrics
 * @returns {number} - Efficiency score (higher = better)
 */
function calculateResponseEfficiency(metrics) {
  // Lower response time = higher efficiency
  const responseTimeScore = Math.max(0, 100 - (metrics.avgResponseMinutes || 0));
  
  // Lower fragmentation = higher efficiency
  const fragmentationScore = Math.max(0, 100 - (metrics.fragmentation || 0) * 5);
  
  return (responseTimeScore + fragmentationScore) / 2;
}

/**
 * Calculate execution capacity
 * Capacity = focus time available × efficiency
 * @param {Object} metrics - Period metrics
 * @returns {number} - Capacity score
 */
function calculateExecutionCapacity(metrics) {
  const focusTimeRatio = metrics.focusTimeRatio || 0.5;
  const efficiency = calculateResponseEfficiency(metrics);
  
  return focusTimeRatio * efficiency;
}

/**
 * Determine drag state
 * @param {number} drag - Execution drag value
 * @returns {string} - 'efficient' | 'moderate' | 'high'
 */
function determineDragState(drag) {
  if (drag <= DRAG_THRESHOLDS.LOW) return 'efficient';
  if (drag <= DRAG_THRESHOLDS.MODERATE) return 'moderate';
  return 'high';
}

/**
 * Generate explanation message
 * @param {number} drag - Execution drag value
 * @param {string} state - Drag state
 * @param {Object} trends - Trend data
 * @returns {string} - Human-readable explanation
 */
function generateDragExplanation(drag, state, trends) {
  if (state === 'efficient') {
    return 'Execution capacity is keeping pace with coordination demands';
  }
  
  const causes = [];
  
  if (trends.meetingGrowth > 10) {
    causes.push('meeting volume increase');
  }
  if (trends.messageGrowth > 15) {
    causes.push('message traffic growth');
  }
  if (trends.responseTimeChange > 10) {
    causes.push('slower response times');
  }
  
  if (causes.length === 0) {
    causes.push('coordination overhead');
  }
  
  const causeText = causes.join(' and ');
  
  if (state === 'moderate') {
    return `Coordination cost is growing faster than capacity due to ${causeText}`;
  }
  
  return `Significant execution drag detected. ${causeText.charAt(0).toUpperCase() + causeText.slice(1)} is consuming execution capacity`;
}

/**
 * Compute Execution Drag for a team
 * @param {string} teamId - Team ID
 * @param {Object} currentPeriod - Current period metrics
 * @param {Object} previousPeriod - Previous period metrics for comparison
 * @returns {Object} - Complete execution drag analysis
 */
export async function computeExecutionDrag(teamId, currentPeriod, previousPeriod) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  // If no previous period, fetch from history
  if (!previousPeriod) {
    const historicalMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    }).sort({ date: 1 });
    
    if (historicalMetrics.length >= 7) {
      const midpoint = Math.floor(historicalMetrics.length / 2);
      const firstHalf = historicalMetrics.slice(0, midpoint);
      const secondHalf = historicalMetrics.slice(midpoint);
      
      previousPeriod = aggregateMetrics(firstHalf);
      currentPeriod = currentPeriod || aggregateMetrics(secondHalf);
    }
  }

  // Calculate coordination growth
  const prevCoordination = calculateCoordinationLoad(previousPeriod || {});
  const currCoordination = calculateCoordinationLoad(currentPeriod || {});
  const coordinationGrowth = calculateGrowthRate(prevCoordination, currCoordination);

  // Calculate execution capacity change
  const prevCapacity = calculateExecutionCapacity(previousPeriod || {});
  const currCapacity = calculateExecutionCapacity(currentPeriod || {});
  const capacityChange = calculateGrowthRate(prevCapacity, currCapacity);

  // Execution Drag = coordination growth - capacity growth
  // Positive drag = coordination outpacing execution
  const executionDrag = coordinationGrowth - capacityChange;

  // Calculate individual trends
  const trends = {
    meetingGrowth: calculateGrowthRate(
      previousPeriod?.meetingCount || 0,
      currentPeriod?.meetingCount || 0
    ),
    messageGrowth: calculateGrowthRate(
      previousPeriod?.messageVolume || 0,
      currentPeriod?.messageVolume || 0
    ),
    responseTimeChange: calculateGrowthRate(
      previousPeriod?.avgResponseMinutes || 0,
      currentPeriod?.avgResponseMinutes || 0
    ),
    focusTimeChange: calculateGrowthRate(
      previousPeriod?.focusTimeRatio || 0.5,
      currentPeriod?.focusTimeRatio || 0.5
    )
  };

  // Determine state
  const dragState = determineDragState(executionDrag);

  // Generate explanation
  const explanation = generateDragExplanation(executionDrag, dragState, trends);

  return {
    teamId,
    orgId: team.orgId,
    calculatedAt: new Date(),
    
    executionDrag: Math.round(executionDrag * 10) / 10,
    dragState,
    explanation,
    
    // Breakdown
    coordinationGrowth: Math.round(coordinationGrowth * 10) / 10,
    capacityChange: Math.round(capacityChange * 10) / 10,
    
    // Detailed trends
    trends: {
      meetingGrowth: Math.round(trends.meetingGrowth * 10) / 10,
      messageGrowth: Math.round(trends.messageGrowth * 10) / 10,
      responseTimeChange: Math.round(trends.responseTimeChange * 10) / 10,
      focusTimeChange: Math.round(trends.focusTimeChange * 10) / 10
    },
    
    // Period data for visualization
    currentPeriod: {
      coordination: Math.round(currCoordination * 10) / 10,
      capacity: Math.round(currCapacity * 10) / 10
    },
    previousPeriod: {
      coordination: Math.round(prevCoordination * 10) / 10,
      capacity: Math.round(prevCapacity * 10) / 10
    },
    
    hasData: !!(currentPeriod && previousPeriod)
  };
}

/**
 * Aggregate daily metrics into period summary
 * @param {Array} dailyMetrics - Array of MetricsDaily documents
 * @returns {Object} - Aggregated metrics
 */
function aggregateMetrics(dailyMetrics) {
  if (!dailyMetrics || dailyMetrics.length === 0) {
    return {
      meetingCount: 0,
      messageVolume: 0,
      avgResponseMinutes: 0,
      focusTimeRatio: 0.5,
      fragmentation: 0
    };
  }

  const sum = dailyMetrics.reduce((acc, m) => ({
    meetingHours: acc.meetingHours + (m.meetingHoursWeek || 0),
    responseTime: acc.responseTime + (m.responseMedianMins || 0),
    focusRatio: acc.focusRatio + (m.focusTimeRatio || 0),
    afterHours: acc.afterHours + (m.afterHoursRate || 0)
  }), { meetingHours: 0, responseTime: 0, focusRatio: 0, afterHours: 0 });

  const count = dailyMetrics.length;

  return {
    meetingCount: Math.round(sum.meetingHours / 2), // Estimate meetings from hours
    messageVolume: sum.afterHours * 10, // Proxy from after-hours activity
    avgResponseMinutes: sum.responseTime / count,
    focusTimeRatio: sum.focusRatio / count,
    fragmentation: sum.responseTime / 10 // Proxy
  };
}

/**
 * Get drag state color
 * @param {string} state - Drag state
 * @returns {string} - CSS color
 */
export function getDragStateColor(state) {
  switch (state) {
    case 'efficient': return '#22c55e';
    case 'moderate': return '#eab308';
    case 'high': return '#ef4444';
    default: return '#6b7280';
  }
}

/**
 * Compute historical execution drag trend
 * @param {string} teamId - Team ID
 * @param {number} weeks - Number of weeks to analyze
 * @returns {Array} - Weekly drag values
 */
export async function getExecutionDragHistory(teamId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  const metrics = await MetricsDaily.find({
    teamId,
    date: { $gte: startDate }
  }).sort({ date: 1 });

  // Group by week
  const byWeek = {};
  metrics.forEach(m => {
    const weekNum = Math.floor((new Date(m.date) - startDate) / (7 * 24 * 60 * 60 * 1000));
    if (!byWeek[weekNum]) byWeek[weekNum] = [];
    byWeek[weekNum].push(m);
  });

  // Calculate drag for each week
  const weeklyDrag = [];
  const weekNums = Object.keys(byWeek).map(Number).sort((a, b) => a - b);

  for (let i = 1; i < weekNums.length; i++) {
    const prevWeek = aggregateMetrics(byWeek[weekNums[i - 1]]);
    const currWeek = aggregateMetrics(byWeek[weekNums[i]]);

    const prevCoord = calculateCoordinationLoad(prevWeek);
    const currCoord = calculateCoordinationLoad(currWeek);
    const coordGrowth = calculateGrowthRate(prevCoord, currCoord);

    const prevCap = calculateExecutionCapacity(prevWeek);
    const currCap = calculateExecutionCapacity(currWeek);
    const capChange = calculateGrowthRate(prevCap, currCap);

    weeklyDrag.push({
      week: weekNums[i],
      date: new Date(startDate.getTime() + weekNums[i] * 7 * 24 * 60 * 60 * 1000),
      drag: Math.round((coordGrowth - capChange) * 10) / 10,
      coordinationGrowth: Math.round(coordGrowth * 10) / 10,
      capacityChange: Math.round(capChange * 10) / 10
    });
  }

  return weeklyDrag;
}

export default {
  computeExecutionDrag,
  getExecutionDragHistory,
  getDragStateColor,
  DRAG_THRESHOLDS
};
