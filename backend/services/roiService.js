/**
 * ROI Translation Service
 * Converts SignalTrue metrics into dollar-based ROI calculations
 * 
 * Provides:
 * - ROI Settings management
 * - Per-metric savings calculations
 * - Intervention ROI tracking
 * - Drift cost projections
 */

import ROISettings from '../models/roiSettings.js';
import MetricsDaily from '../models/metricsDaily.js';
import Intervention from '../models/intervention.js';
import Team from '../models/team.js';
import DriftEvent from '../models/driftEvent.js';

/**
 * Get or create ROI settings for an organization
 */
export async function getROISettings(orgId) {
  return await ROISettings.getOrCreate(orgId);
}

/**
 * Update ROI settings for an organization
 */
export async function updateROISettings(orgId, updates, userId) {
  let settings = await ROISettings.findOne({ orgId });
  
  if (!settings) {
    settings = new ROISettings({ orgId });
  }
  
  // Apply updates
  const allowedFields = [
    'currency', 'averageSalary', 'averageHourlyCost', 'teamSize',
    'workingDaysPerYear', 'hoursPerDay', 'overheadMultiplier',
    'showROIOverlay', 'roiPeriod'
  ];
  
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      settings[field] = updates[field];
    }
  });
  
  // Update cost factors if provided
  if (updates.costFactors) {
    Object.assign(settings.costFactors, updates.costFactors);
  }
  
  settings.updatedBy = userId;
  
  // Reset derived values to recalculate
  if (updates.averageSalary || updates.workingDaysPerYear || updates.hoursPerDay || updates.overheadMultiplier) {
    settings.averageHourlyCost = null;
    settings.costFactors.meetingHourCost = null;
    settings.costFactors.decisionDelayCostPerDay = null;
    settings.costFactors.focusTimeLossCostPerPct = null;
    settings.costFactors.turnoverCost = null;
  }
  
  await settings.save();
  return settings;
}

/**
 * Calculate Meeting Load savings
 * Based on reduction in meeting hours from baseline
 */
async function calculateMeetingLoadSavings(orgId, settings, periodDays = 30) {
  const teams = await Team.find({ orgId }).lean();
  const teamIds = teams.map(t => t._id);
  
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate }
  }).lean();
  
  if (metrics.length === 0) {
    return { savings: 0, hoursReduced: 0, description: 'No data available' };
  }
  
  // Calculate average meeting hours
  const avgMeetingHours = metrics.reduce((sum, m) => sum + (m.meetingLoadIndex || 0), 0) / metrics.length;
  
  // Baseline is 25 hrs/week (industry average), savings if below
  const baselineMeetingHours = 25;
  const hoursReduced = Math.max(0, baselineMeetingHours - avgMeetingHours);
  
  // Hours per week * team size * weeks in period * hourly cost
  const weeksInPeriod = periodDays / 7;
  const totalHoursReduced = hoursReduced * settings.teamSize * weeksInPeriod;
  const savings = Math.round(totalHoursReduced * settings.costFactors.meetingHourCost);
  
  return {
    savings,
    hoursReduced: Math.round(totalHoursReduced),
    avgMeetingHours: Math.round(avgMeetingHours * 10) / 10,
    baselineMeetingHours,
    description: hoursReduced > 0 
      ? `${Math.round(hoursReduced)} fewer meeting hrs/person/week than industry avg`
      : 'Meeting load at or above industry average'
  };
}

/**
 * Calculate Focus Time savings
 * Based on focus time ratio vs baseline
 */
async function calculateFocusTimeSavings(orgId, settings, periodDays = 30) {
  const teams = await Team.find({ orgId }).lean();
  const teamIds = teams.map(t => t._id);
  
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate }
  }).lean();
  
  if (metrics.length === 0) {
    return { savings: 0, focusTimeGained: 0, description: 'No data available' };
  }
  
  // Calculate average focus time ratio
  const avgFocusRatio = metrics.reduce((sum, m) => sum + (m.focusTimeRatio || 0.5), 0) / metrics.length;
  
  // Baseline is 40% focus time, savings if above
  const baselineFocusRatio = 0.40;
  const focusGainPct = Math.max(0, avgFocusRatio - baselineFocusRatio) * 100;
  
  // Each 1% focus gain = significant productivity boost
  const weeksInPeriod = periodDays / 7;
  const savings = Math.round(focusGainPct * settings.teamSize * weeksInPeriod * settings.costFactors.focusTimeLossCostPerPct);
  
  return {
    savings,
    focusTimeGainedPct: Math.round(focusGainPct),
    avgFocusRatio: Math.round(avgFocusRatio * 100),
    baselineFocusRatio: baselineFocusRatio * 100,
    description: focusGainPct > 0
      ? `${Math.round(focusGainPct)}% more focus time than industry avg`
      : 'Focus time at or below industry average'
  };
}

/**
 * Calculate Response Time savings
 * Based on faster response times reducing decision latency
 */
async function calculateResponseTimeSavings(orgId, settings, periodDays = 30) {
  const teams = await Team.find({ orgId }).lean();
  const teamIds = teams.map(t => t._id);
  
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate }
  }).lean();
  
  if (metrics.length === 0) {
    return { savings: 0, daysReduced: 0, description: 'No data available' };
  }
  
  // Calculate average response time (hours)
  const avgResponseHours = metrics.reduce((sum, m) => sum + (m.responseLatencyTrend || 24), 0) / metrics.length;
  
  // Baseline is 24 hours, savings if faster
  const baselineResponseHours = 24;
  const hoursReduced = Math.max(0, baselineResponseHours - avgResponseHours);
  const daysReduced = hoursReduced / 24;
  
  // Faster decisions compound - each day saved = significant value
  const decisionsPerWeek = 10; // Estimate: 10 meaningful decisions per team per week
  const weeksInPeriod = periodDays / 7;
  const totalDaysSaved = daysReduced * decisionsPerWeek * weeksInPeriod;
  const savings = Math.round(totalDaysSaved * settings.costFactors.decisionDelayCostPerDay * 0.1); // 10% of day cost per decision
  
  return {
    savings,
    daysReduced: Math.round(totalDaysSaved * 10) / 10,
    avgResponseHours: Math.round(avgResponseHours),
    baselineResponseHours,
    description: hoursReduced > 0
      ? `${Math.round(hoursReduced)} hrs faster responses than baseline`
      : 'Response time at or above baseline'
  };
}

/**
 * Calculate Intervention ROI
 * Based on before/after metrics from completed interventions
 */
async function calculateInterventionROI(orgId, settings, periodDays = 90) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  const completedInterventions = await Intervention.find({
    orgId,
    status: 'completed',
    completedAt: { $gte: startDate, $lte: endDate }
  }).lean();
  
  if (completedInterventions.length === 0) {
    return { 
      savings: 0, 
      interventionCount: 0, 
      avgImpact: 0,
      description: 'No completed interventions in this period' 
    };
  }
  
  // Sum up the improvements from interventions
  let totalImprovement = 0;
  let successfulCount = 0;
  
  completedInterventions.forEach(intervention => {
    const delta = intervention.outcomeDelta;
    if (delta?.metricBefore && delta?.metricAfter) {
      const improvement = delta.metricBefore - delta.metricAfter;
      if (improvement > 0) {
        totalImprovement += improvement;
        successfulCount++;
      }
    }
  });
  
  // Convert improvement to dollar value (rough estimate)
  const avgImprovement = successfulCount > 0 ? totalImprovement / successfulCount : 0;
  const savings = Math.round(avgImprovement * settings.costFactors.meetingHourCost * settings.teamSize * 4);
  
  return {
    savings,
    interventionCount: completedInterventions.length,
    successfulCount,
    avgImpact: Math.round(avgImprovement * 100) / 100,
    description: successfulCount > 0
      ? `${successfulCount} successful interventions with measurable impact`
      : 'Interventions completed but no measurable impact yet'
  };
}

/**
 * Calculate total ROI summary
 */
export async function calculateROISummary(orgId, options = {}) {
  const { periodDays = 30 } = options;
  
  const settings = await getROISettings(orgId);
  
  // Calculate all savings categories
  const [meetingLoad, focusTime, responseTime, interventions] = await Promise.all([
    calculateMeetingLoadSavings(orgId, settings, periodDays),
    calculateFocusTimeSavings(orgId, settings, periodDays),
    calculateResponseTimeSavings(orgId, settings, periodDays),
    calculateInterventionROI(orgId, settings, periodDays)
  ]);
  
  const totalSavings = meetingLoad.savings + focusTime.savings + responseTime.savings + interventions.savings;
  
  // Calculate period label
  const periodLabel = periodDays <= 7 ? 'weekly' : periodDays <= 31 ? 'monthly' : 'quarterly';
  
  return {
    success: true,
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    periodDays,
    periodLabel,
    teamSize: settings.teamSize,
    hourlyCost: settings.averageHourlyCost,
    
    breakdown: {
      meetingLoad: {
        ...meetingLoad,
        label: 'Meeting Time Savings',
        icon: '📅'
      },
      focusTime: {
        ...focusTime,
        label: 'Focus Time Gains',
        icon: '🎯'
      },
      responseTime: {
        ...responseTime,
        label: 'Faster Decisions',
        icon: '⚡'
      },
      interventions: {
        ...interventions,
        label: 'Intervention Impact',
        icon: '🔧'
      }
    },
    
    totalSavings,
    totalSavingsFormatted: formatCurrency(totalSavings, settings.currencySymbol),
    
    // Projections
    projections: {
      monthly: formatCurrency(totalSavings * (30 / periodDays), settings.currencySymbol),
      quarterly: formatCurrency(totalSavings * (90 / periodDays), settings.currencySymbol),
      yearly: formatCurrency(totalSavings * (365 / periodDays), settings.currencySymbol)
    }
  };
}

/**
 * Calculate drift cost projection
 * Shows estimated cost if drift continues uncorrected
 */
export async function calculateDriftCostProjection(orgId, options = {}) {
  const { projectionDays = 30 } = options;
  
  const settings = await getROISettings(orgId);
  
  // Get active drift events
  const activeDrifts = await DriftEvent.find({
    orgId,
    status: { $in: ['active', 'acknowledged'] }
  }).lean();
  
  if (activeDrifts.length === 0) {
    return {
      success: true,
      hasDrift: false,
      projectedCost: 0,
      message: 'No active drift detected'
    };
  }
  
  // Calculate projected cost based on drift severity
  let totalProjectedCost = 0;
  const driftCosts = [];
  
  for (const drift of activeDrifts) {
    let costPerDay = 0;
    
    switch (drift.metricType) {
      case 'meetingLoadIndex':
        // Excess meeting hours * team * hourly cost
        costPerDay = (drift.magnitude || 2) * settings.teamSize * settings.costFactors.meetingHourCost / 7;
        break;
      case 'focusTimeRatio':
        // Lost focus time cost
        costPerDay = (drift.magnitude || 5) * settings.teamSize * settings.costFactors.focusTimeLossCostPerPct / 7;
        break;
      case 'responseLatencyTrend':
        // Decision delay cost
        costPerDay = (drift.magnitude || 1) * settings.costFactors.decisionDelayCostPerDay / 24;
        break;
      case 'afterHoursActivityRate':
        // Burnout risk cost (potential turnover)
        costPerDay = settings.costFactors.turnoverCost * 0.001; // 0.1% turnover risk per day
        break;
      default:
        costPerDay = settings.averageHourlyCost * settings.teamSize * 0.5; // Default estimate
    }
    
    const projectedCost = Math.round(costPerDay * projectionDays);
    
    driftCosts.push({
      metricType: drift.metricType,
      teamId: drift.teamId,
      magnitude: drift.magnitude,
      dailyCost: Math.round(costPerDay),
      projectedCost,
      description: `${drift.metricType} drift could cost ${formatCurrency(projectedCost, settings.currencySymbol)} over ${projectionDays} days`
    });
    
    totalProjectedCost += projectedCost;
  }
  
  return {
    success: true,
    hasDrift: true,
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    projectionDays,
    activeDriftCount: activeDrifts.length,
    driftCosts,
    totalProjectedCost,
    totalProjectedCostFormatted: formatCurrency(totalProjectedCost, settings.currencySymbol),
    message: `At current drift trajectory, estimated ${projectionDays}-day cost: ${formatCurrency(totalProjectedCost, settings.currencySymbol)}`
  };
}

/**
 * Format currency value
 */
function formatCurrency(value, symbol = '$') {
  if (value >= 1000000) {
    return `${symbol}${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${symbol}${(value / 1000).toFixed(1)}K`;
  } else {
    return `${symbol}${Math.round(value)}`;
  }
}

/**
 * Get ROI dashboard banner data
 */
export async function getROIDashboardBanner(orgId) {
  const settings = await getROISettings(orgId);
  
  if (!settings.showROIOverlay) {
    return { show: false };
  }
  
  const periodDays = settings.roiPeriod === 'weekly' ? 7 
    : settings.roiPeriod === 'monthly' ? 30 
    : settings.roiPeriod === 'quarterly' ? 90 
    : 365;
  
  const summary = await calculateROISummary(orgId, { periodDays });
  const driftProjection = await calculateDriftCostProjection(orgId, { projectionDays: 30 });
  
  return {
    show: true,
    currency: settings.currency,
    currencySymbol: settings.currencySymbol,
    period: settings.roiPeriod,
    
    tiles: [
      {
        id: 'meeting-savings',
        label: 'Meeting Savings',
        value: summary.breakdown.meetingLoad.savings,
        formatted: formatCurrency(summary.breakdown.meetingLoad.savings, settings.currencySymbol),
        icon: '📅'
      },
      {
        id: 'focus-savings',
        label: 'Focus Time Gains',
        value: summary.breakdown.focusTime.savings,
        formatted: formatCurrency(summary.breakdown.focusTime.savings, settings.currencySymbol),
        icon: '🎯'
      },
      {
        id: 'decision-savings',
        label: 'Decision Speed',
        value: summary.breakdown.responseTime.savings,
        formatted: formatCurrency(summary.breakdown.responseTime.savings, settings.currencySymbol),
        icon: '⚡'
      },
      {
        id: 'total-savings',
        label: 'Total Savings',
        value: summary.totalSavings,
        formatted: summary.totalSavingsFormatted,
        icon: '💰',
        highlight: true
      }
    ],
    
    driftWarning: driftProjection.hasDrift ? {
      show: true,
      message: driftProjection.message,
      cost: driftProjection.totalProjectedCostFormatted
    } : null
  };
}

export default {
  getROISettings,
  updateROISettings,
  calculateROISummary,
  calculateDriftCostProjection,
  getROIDashboardBanner
};
