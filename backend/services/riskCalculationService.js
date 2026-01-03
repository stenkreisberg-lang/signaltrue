/**
 * Risk Calculation Service
 * Implements the diagnosis, decision & impact layer logic
 * 
 * Key responsibilities:
 * - Calculate metric deviations from baseline
 * - Compute risk scores (overload, execution, retention strain)
 * - Determine team state
 * - Generate recommended actions
 */

import TeamState from '../models/teamState.js';
import RiskWeekly from '../models/riskWeekly.js';
import RiskDriver from '../models/riskDriver.js';
import MetricsDaily from '../models/metricsDaily.js';
import Baseline from '../models/baseline.js';

/**
 * Map metric keys to MetricsDaily fields
 */
const METRIC_FIELD_MAP = {
  'after_hours_activity': 'afterHoursRate',
  'meeting_load': 'meetingLoadIndex',
  'back_to_back_meetings': 'meetingHoursWeek',
  'focus_time': 'focusTimeRatio',
  'response_time': 'responseMedianMins',
  'participation_drift': 'uniqueContacts',
  'meeting_fragmentation': 'meetingHoursWeek'
};

/**
 * Fetch current metrics for a team (last 7 days average)
 */
async function getCurrentMetrics(teamId) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const metrics = {};
  
  for (const [metricKey, fieldName] of Object.entries(METRIC_FIELD_MAP)) {
    const dailyMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: startDate, $lte: endDate }
    }).select(fieldName).lean();
    
    const values = dailyMetrics.map(m => m[fieldName]).filter(v => v != null);
    metrics[metricKey] = values.length > 0 
      ? values.reduce((sum, v) => sum + v, 0) / values.length 
      : 0;
  }
  
  return metrics;
}

/**
 * Fetch baseline means for a team
 */
async function getBaselines(teamId) {
  const baseline = await Baseline.findOne({ teamId }).lean();
  const baselines = {};
  
  if (baseline && baseline.metrics) {
    for (const metricKey of Object.keys(METRIC_FIELD_MAP)) {
      baselines[metricKey] = baseline.metrics[metricKey]?.mean || 0;
    }
  }
  
  return baselines;
}

/**
 * Normalize and clamp deviation to [-1, +1]
 */
function calculateDeviation(currentValue, baselineMean, isHigherBetter = false) {
  if (!baselineMean || baselineMean === 0) return 0;
  
  let deviation = (currentValue - baselineMean) / baselineMean;
  
  // For metrics where higher is better (e.g., focus_time), invert the deviation
  if (isHigherBetter) {
    deviation = -deviation;
  }
  
  // Clamp to [-1, +1]
  return Math.max(-1, Math.min(1, deviation));
}

/**
 * Determine risk band based on score
 */
function getRiskBand(score) {
  if (score < 35) return 'green';
  if (score < 65) return 'yellow';
  return 'red';
}

/**
 * Calculate Overload Risk
 * 
 * Formula:
 * overload_risk =
 *   0.35 * deviation(after_hours_activity) +
 *   0.30 * deviation(meeting_load) +
 *   0.20 * deviation(back_to_back_meetings) +
 *   0.15 * adjusted_deviation(focus_time)
 */
export async function calculateOverloadRisk(teamId, weekStart) {
  // Fetch current metrics and baselines
  const metrics = await getCurrentMetrics(teamId);
  const baselines = await getBaselines(teamId);
  
  const weights = {
    after_hours_activity: 0.35,
    meeting_load: 0.30,
    back_to_back_meetings: 0.20,
    focus_time: 0.15
  };
  
  const deviations = {};
  let score = 0;
  const drivers = [];
  
  for (const [metricKey, weight] of Object.entries(weights)) {
    const currentValue = metrics[metricKey] || 0;
    const baselineMean = baselines[metricKey] || 0;
    const isHigherBetter = metricKey === 'focus_time';
    
    const deviation = calculateDeviation(currentValue, baselineMean, isHigherBetter);
    deviations[metricKey] = deviation;
    
    // Only positive deviations contribute to risk
    const contributionScore = Math.max(0, deviation) * weight;
    score += contributionScore;
    
    // Store driver if it contributes
    if (deviation > 0.1) {
      drivers.push({
        teamId,
        weekStart,
        riskType: 'overload',
        metricKey,
        contributionWeight: weight,
        deviation,
        explanationText: getDeviationExplanation(metricKey, deviation, currentValue, baselineMean)
      });
    }
  }
  
  // Convert to 0-100 scale
  score = Math.round(score * 100);
  
  const band = getRiskBand(score);
  const confidence = determineConfidence(baselines);
  
  // Save risk
  const risk = await RiskWeekly.findOneAndUpdate(
    { teamId, weekStart, riskType: 'overload' },
    {
      score,
      band,
      confidence,
      explanation: getOverloadExplanation(score, band, drivers)
    },
    { upsert: true, new: true }
  );
  
  // Save drivers
  await RiskDriver.deleteMany({ teamId, weekStart, riskType: 'overload' });
  if (drivers.length > 0) {
    await RiskDriver.insertMany(drivers);
  }
  
  return { risk, drivers };
}

/**
 * Calculate Execution Risk
 * 
 * Formula:
 * execution_risk =
 *   0.30 * deviation(response_time) +
 *   0.25 * deviation(participation_drift) +
 *   0.25 * deviation(meeting_fragmentation) +
 *   0.20 * adjusted_deviation(focus_time)
 */
export async function calculateExecutionRisk(teamId, weekStart) {
  // Fetch current metrics and baselines
  const metrics = await getCurrentMetrics(teamId);
  const baselines = await getBaselines(teamId);
  
  const weights = {
    response_time: 0.30,
    participation_drift: 0.25,
    meeting_fragmentation: 0.25,
    focus_time: 0.20
  };
  
  const deviations = {};
  let score = 0;
  const drivers = [];
  
  for (const [metricKey, weight] of Object.entries(weights)) {
    const currentValue = metrics[metricKey] || 0;
    const baselineMean = baselines[metricKey] || 0;
    const isHigherBetter = metricKey === 'focus_time';
    
    const deviation = calculateDeviation(currentValue, baselineMean, isHigherBetter);
    deviations[metricKey] = deviation;
    
    const contributionScore = Math.max(0, deviation) * weight;
    score += contributionScore;
    
    if (deviation > 0.1) {
      drivers.push({
        teamId,
        weekStart,
        riskType: 'execution',
        metricKey,
        contributionWeight: weight,
        deviation,
        explanationText: getDeviationExplanation(metricKey, deviation, currentValue, baselineMean)
      });
    }
  }
  
  score = Math.round(score * 100);
  const band = getRiskBand(score);
  const confidence = determineConfidence(baselines);
  
  const risk = await RiskWeekly.findOneAndUpdate(
    { teamId, weekStart, riskType: 'execution' },
    {
      score,
      band,
      confidence,
      explanation: getExecutionExplanation(score, band, drivers)
    },
    { upsert: true, new: true }
  );
  
  await RiskDriver.deleteMany({ teamId, weekStart, riskType: 'execution' });
  if (drivers.length > 0) {
    await RiskDriver.insertMany(drivers);
  }
  
  return { risk, drivers };
}

/**
 * Calculate Retention Strain Risk
 * 
 * Formula (based on 3-week trend slopes):
 * retention_strain_risk =
 *   0.40 * slope(after_hours_activity) +
 *   0.30 * slope(meeting_load) +
 *   0.30 * slope(response_time)
 */
export async function calculateRetentionStrainRisk(teamId, weekStart) {
  // Fetch 3 weeks of metrics history
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 21); // 3 weeks
  
  const metricsHistory = await MetricsDaily.find({
    teamId,
    date: { $gte: startDate, $lte: endDate }
  }).sort({ date: 1 }).lean();
  
  const baselines = await getBaselines(teamId);
  
  const weights = {
    after_hours_activity: 0.40,
    meeting_load: 0.30,
    response_time: 0.30
  };
  
  const slopes = {};
  let score = 0;
  const drivers = [];
  
  for (const [metricKey, weight] of Object.entries(weights)) {
    const slope = calculateTrendSlope(metricsHistory, metricKey);
    slopes[metricKey] = slope;
    
    // Positive slope (increasing trend) contributes to retention strain
    const contributionScore = Math.max(0, slope) * weight;
    score += contributionScore;
    
    if (slope > 0.1) {
      drivers.push({
        teamId,
        weekStart,
        riskType: 'retention_strain',
        metricKey,
        contributionWeight: weight,
        deviation: slope,
        explanationText: getTrendExplanation(metricKey, slope)
      });
    }
  }
  
  score = Math.round(score * 100);
  const band = getRiskBand(score);
  const confidence = determineConfidence(baselines);
  
  const risk = await RiskWeekly.findOneAndUpdate(
    { teamId, weekStart, riskType: 'retention_strain' },
    {
      score,
      band,
      confidence,
      explanation: getRetentionStrainExplanation(score, band, drivers)
    },
    { upsert: true, new: true }
  );
  
  await RiskDriver.deleteMany({ teamId, weekStart, riskType: 'retention_strain' });
  if (drivers.length > 0) {
    await RiskDriver.insertMany(drivers);
  }
  
  return { risk, drivers };
}

/**
 * Calculate 3-week trend slope for a metric
 */
function calculateTrendSlope(metricsHistory, metricKey) {
  // metricsHistory should be array of last 3 weeks
  if (!metricsHistory || metricsHistory.length < 2) return 0;
  
  const fieldName = METRIC_FIELD_MAP[metricKey];
  if (!fieldName) return 0;
  
  const values = metricsHistory.map(m => m[fieldName] || 0);
  
  // Simple linear regression slope
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = values;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Normalize slope
  const meanY = sumY / n;
  return meanY !== 0 ? slope / meanY : 0;
}

/**
 * Determine Team State based on risk scores
 * 
 * Logic:
 * - healthy: all risks < 35
 * - strained: any risk ≥ 35
 * - overloaded: overload_risk ≥ 65
 * - breaking: execution_risk ≥ 65 for 2+ weeks
 */
export async function determineTeamState(teamId, weekStart, risks, previousStates = []) {
  const overloadRisk = risks.find(r => r.riskType === 'overload');
  const executionRisk = risks.find(r => r.riskType === 'execution');
  const retentionRisk = risks.find(r => r.riskType === 'retention_strain');
  
  let state = 'healthy';
  let summaryText = 'Team patterns are within normal range.';
  let dominantRisk = 'none';
  
  // Check for breaking state (execution risk high for 2+ weeks)
  const recentExecutionRisks = await RiskWeekly.find({
    teamId,
    riskType: 'execution',
    weekStart: { $lte: weekStart },
    score: { $gte: 65 }
  }).sort({ weekStart: -1 }).limit(2);
  
  if (recentExecutionRisks.length >= 2) {
    state = 'breaking';
    summaryText = 'Coordination patterns have degraded significantly for multiple weeks.';
    dominantRisk = 'execution';
  }
  // Check for overloaded state
  else if (overloadRisk && overloadRisk.score >= 65) {
    state = 'overloaded';
    summaryText = 'Work intensity is exceeding the team\'s ability to recover.';
    dominantRisk = 'overload';
  }
  // Check for strained state
  else if ((overloadRisk && overloadRisk.score >= 35) ||
           (executionRisk && executionRisk.score >= 35) ||
           (retentionRisk && retentionRisk.score >= 35)) {
    state = 'strained';
    
    // Determine which risk is dominant
    const maxRisk = [overloadRisk, executionRisk, retentionRisk]
      .filter(r => r)
      .sort((a, b) => b.score - a.score)[0];
    
    dominantRisk = maxRisk.riskType;
    
    if (dominantRisk === 'overload') {
      summaryText = 'Coordination pressure is rising compared to normal patterns.';
    } else if (dominantRisk === 'execution') {
      summaryText = 'Team coordination efficiency is declining.';
    } else {
      summaryText = 'Sustained pressure patterns may increase exit risk.';
    }
  }
  
  // Determine confidence
  const confidence = risks.every(r => r.confidence === 'high') ? 'high' :
                     risks.some(r => r.confidence === 'low') ? 'low' : 'medium';
  
  const teamState = await TeamState.findOneAndUpdate(
    { teamId, weekStart },
    {
      state,
      confidence,
      summaryText,
      dominantRisk
    },
    { upsert: true, new: true }
  );
  
  return teamState;
}

/**
 * Helper functions for explanations
 */
function getDeviationExplanation(metricKey, deviation, currentValue, baselineMean) {
  const percentChange = Math.round(Math.abs(deviation) * 100);
  const direction = deviation > 0 ? 'higher' : 'lower';
  
  const metricNames = {
    after_hours_activity: 'After-hours activity',
    meeting_load: 'Meeting load',
    back_to_back_meetings: 'Back-to-back meetings',
    focus_time: 'Focus time',
    response_time: 'Response time',
    participation_drift: 'Participation drift',
    meeting_fragmentation: 'Meeting fragmentation'
  };
  
  return `${metricNames[metricKey]} is ${percentChange}% ${direction} than baseline`;
}

function getTrendExplanation(metricKey, slope) {
  const trendStrength = Math.abs(slope) > 0.3 ? 'strongly' : 'gradually';
  const direction = slope > 0 ? 'increasing' : 'decreasing';
  
  const metricNames = {
    after_hours_activity: 'After-hours activity',
    meeting_load: 'Meeting load',
    response_time: 'Response time'
  };
  
  return `${metricNames[metricKey]} has been ${trendStrength} ${direction} over the past 3 weeks`;
}

function getOverloadExplanation(score, band, drivers) {
  if (band === 'green') {
    return 'Work intensity is within normal range.';
  }
  
  const topDrivers = drivers
    .sort((a, b) => (b.deviation * b.contributionWeight) - (a.deviation * a.contributionWeight))
    .slice(0, 2);
  
  if (topDrivers.length === 0) {
    return 'Work intensity is elevated but manageable.';
  }
  
  const driverTexts = topDrivers.map(d => d.explanationText).join('. ');
  return `${driverTexts}.`;
}

function getExecutionExplanation(score, band, drivers) {
  if (band === 'green') {
    return 'Coordination patterns are efficient.';
  }
  
  const topDrivers = drivers
    .sort((a, b) => (b.deviation * b.contributionWeight) - (a.deviation * a.contributionWeight))
    .slice(0, 2);
  
  if (topDrivers.length === 0) {
    return 'Coordination efficiency is slightly reduced.';
  }
  
  const driverTexts = topDrivers.map(d => d.explanationText).join('. ');
  return `${driverTexts}.`;
}

function getRetentionStrainExplanation(score, band, drivers) {
  if (band === 'green') {
    return 'Pressure patterns are stable.';
  }
  
  const topDrivers = drivers
    .sort((a, b) => (b.deviation * b.contributionWeight) - (a.deviation * a.contributionWeight))
    .slice(0, 2);
  
  if (topDrivers.length === 0) {
    return 'Some sustained pressure detected.';
  }
  
  const driverTexts = topDrivers.map(d => d.explanationText).join('. ');
  return `${driverTexts}.`;
}

function determineConfidence(baselines) {
  // If we have solid baselines, confidence is medium/high
  // If baselines are sparse or recent, confidence is low
  const hasBaselines = Object.values(baselines).some(v => v > 0);
  return hasBaselines ? 'medium' : 'low';
}

export default {
  calculateOverloadRisk,
  calculateExecutionRisk,
  calculateRetentionStrainRisk,
  determineTeamState
};
