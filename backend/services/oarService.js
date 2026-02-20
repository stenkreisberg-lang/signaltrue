/**
 * OAR (Organizational Agility Rating) Calculation Service
 * 
 * Calculates a composite 0-100 score from SignalTrue's existing metrics:
 * - Execution: Meeting Load, Focus Time, Response Latency
 * - Innovation: (derived from experiment/idea tracking if available)
 * - Wellbeing: Energy Index, After-Hours, Sentiment
 * - Culture: Network Breadth, Equity, Collaboration
 */

import OARScore from '../models/oarScore.js';
import MetricsDaily from '../models/metricsDaily.js';
import TeamEnergyIndex from '../models/teamEnergyIndex.js';
import TeamState from '../models/teamState.js';
import Team from '../models/team.js';

/**
 * Normalize a value to 0-100 scale
 * @param {number} value - Raw value
 * @param {number} min - Minimum expected value
 * @param {number} max - Maximum expected value
 * @param {boolean} inverse - If true, lower raw values = higher score
 */
function normalize(value, min, max, inverse = false) {
  if (value === null || value === undefined) return null;
  
  // Clamp to range
  const clamped = Math.max(min, Math.min(max, value));
  
  // Normalize to 0-1
  let normalized = (clamped - min) / (max - min);
  
  // Inverse if lower is better
  if (inverse) {
    normalized = 1 - normalized;
  }
  
  return Math.round(normalized * 100);
}

/**
 * Calculate weighted average, ignoring null values
 */
function weightedAverage(components, weights) {
  let totalWeight = 0;
  let sum = 0;
  
  for (const [key, value] of Object.entries(components)) {
    if (value !== null && value !== undefined && weights[key]) {
      sum += value * weights[key];
      totalWeight += weights[key];
    }
  }
  
  if (totalWeight === 0) return 50; // Default to middle score
  return Math.round(sum / totalWeight);
}

/**
 * Calculate Execution pillar score
 */
async function calculateExecutionScore(teamIds, startDate, endDate) {
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate }
  }).lean();
  
  if (metrics.length === 0) {
    return { score: 50, components: {}, trend: 'stable', trendPct: 0 };
  }
  
  // Aggregate metrics
  const avgMeetingLoad = metrics.reduce((sum, m) => sum + (m.meetingLoadIndex || 0), 0) / metrics.length;
  const avgFocusTime = metrics.reduce((sum, m) => sum + (m.focusTimeRatio || 0), 0) / metrics.length;
  const avgResponseLatency = metrics.reduce((sum, m) => sum + (m.responseLatencyTrend || 0), 0) / metrics.length;
  
  const components = {
    meetingLoad: normalize(avgMeetingLoad, 0, 40, true), // 0-40 hrs/week, lower is better
    focusTime: normalize(avgFocusTime, 0, 1, false), // 0-1 ratio, higher is better
    flowEfficiency: avgFocusTime ? Math.round(avgFocusTime * 100) : 50,
    decisionLatency: normalize(avgResponseLatency, 0, 48, true) // 0-48 hrs, lower is better
  };
  
  const weights = { meetingLoad: 0.3, focusTime: 0.35, flowEfficiency: 0.2, decisionLatency: 0.15 };
  const score = weightedAverage(components, weights);
  
  return { score, components, trend: 'stable', trendPct: 0 };
}

/**
 * Calculate Innovation pillar score
 * Based on available experiment/idea data, defaults to baseline if not available
 */
async function calculateInnovationScore(orgId, teamIds, startDate, endDate) {
  // For now, return a baseline score
  // This can be enhanced when innovation tracking is added
  return {
    score: 50,
    components: {
      ideaCaptureRate: null,
      experimentSuccessRate: null,
      innovationThroughput: null
    },
    trend: 'stable',
    trendPct: 0
  };
}

/**
 * Calculate Wellbeing pillar score
 */
async function calculateWellbeingScore(teamIds, startDate, endDate) {
  // Get Energy Index data
  const weekLabel = getWeekLabel(endDate);
  const energyData = await TeamEnergyIndex.find({
    teamId: { $in: teamIds },
    week: weekLabel
  }).lean();
  
  // Get daily metrics for after-hours and sentiment
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate }
  }).lean();
  
  let avgEnergy = 50;
  if (energyData.length > 0) {
    avgEnergy = energyData.reduce((sum, e) => sum + (e.energyIndex || 0), 0) / energyData.length;
  }
  
  let avgAfterHours = 0;
  let avgSentiment = 0.5;
  let avgRecovery = 50;
  
  if (metrics.length > 0) {
    avgAfterHours = metrics.reduce((sum, m) => sum + (m.afterHoursActivityRate || 0), 0) / metrics.length;
    avgSentiment = metrics.reduce((sum, m) => sum + (m.sentimentToneShift || 0.5), 0) / metrics.length;
    avgRecovery = metrics.reduce((sum, m) => sum + (m.engagementRecoveryIndex || 50), 0) / metrics.length;
  }
  
  const components = {
    energyIndex: Math.round(avgEnergy),
    afterHoursRate: normalize(avgAfterHours, 0, 0.5, true), // 0-50% after hours, lower is better
    recoveryIndex: Math.round(avgRecovery),
    sentimentScore: Math.round(avgSentiment * 100) // 0-1 to 0-100
  };
  
  const weights = { energyIndex: 0.35, afterHoursRate: 0.25, recoveryIndex: 0.2, sentimentScore: 0.2 };
  const score = weightedAverage(components, weights);
  
  return { score, components, trend: 'stable', trendPct: 0 };
}

/**
 * Calculate Culture pillar score
 */
async function calculateCultureScore(teamIds, startDate, endDate) {
  // Get team state data for network health and equity
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekStart: { $gte: startDate, $lte: endDate }
  }).sort({ weekStart: -1 }).lean();
  
  // Get daily metrics for collaboration
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate }
  }).lean();
  
  let avgNetworkBreadth = 50;
  let avgEquity = 50;
  
  if (teamStates.length > 0) {
    const latestStates = {};
    teamStates.forEach(ts => {
      if (!latestStates[ts.teamId.toString()]) {
        latestStates[ts.teamId.toString()] = ts;
      }
    });
    
    const stateValues = Object.values(latestStates);
    avgEquity = stateValues.reduce((sum, s) => sum + (s.intelligenceScores?.equityScore || 50), 0) / stateValues.length;
    
    // Silo score is inverse (higher = worse), so invert it
    const avgSilo = stateValues.reduce((sum, s) => sum + (s.intelligenceScores?.networkHealth?.siloScore || 50), 0) / stateValues.length;
    avgNetworkBreadth = 100 - avgSilo;
  }
  
  let avgCollaboration = 50;
  let avgResponsiveness = 50;
  
  if (metrics.length > 0) {
    avgCollaboration = metrics.reduce((sum, m) => sum + (m.collaborationNetworkBreadth || 50), 0) / metrics.length;
    avgResponsiveness = normalize(
      metrics.reduce((sum, m) => sum + (m.responseLatencyTrend || 24), 0) / metrics.length,
      0, 48, true
    );
  }
  
  const components = {
    collaborationIndex: Math.round(avgCollaboration),
    networkBreadth: Math.round(avgNetworkBreadth),
    responsiveness: avgResponsiveness,
    equityScore: Math.round(avgEquity)
  };
  
  const weights = { collaborationIndex: 0.3, networkBreadth: 0.25, responsiveness: 0.2, equityScore: 0.25 };
  const score = weightedAverage(components, weights);
  
  return { score, components, trend: 'stable', trendPct: 0 };
}

/**
 * Get week label from date
 */
function getWeekLabel(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const days = Math.floor((d - firstDayOfYear) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Calculate OAR score for an organization
 */
export async function calculateOrgOAR(orgId, options = {}) {
  const {
    periodDays = 7,
    weights = { execution: 0.30, innovation: 0.20, wellbeing: 0.30, culture: 0.20 }
  } = options;
  
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const periodLabel = getWeekLabel(endDate);
  
  // Get all teams in the org
  const teams = await Team.find({ orgId }).select('_id').lean();
  const teamIds = teams.map(t => t._id);
  
  if (teamIds.length === 0) {
    return {
      score: 50,
      zone: 'stable',
      pillars: {
        execution: { score: 50, components: {}, trend: 'stable', trendPct: 0 },
        innovation: { score: 50, components: {}, trend: 'stable', trendPct: 0 },
        wellbeing: { score: 50, components: {}, trend: 'stable', trendPct: 0 },
        culture: { score: 50, components: {}, trend: 'stable', trendPct: 0 }
      },
      dataQuality: 'low',
      metricsAvailable: 0
    };
  }
  
  // Calculate each pillar
  const [execution, innovation, wellbeing, culture] = await Promise.all([
    calculateExecutionScore(teamIds, startDate, endDate),
    calculateInnovationScore(orgId, teamIds, startDate, endDate),
    calculateWellbeingScore(teamIds, startDate, endDate),
    calculateCultureScore(teamIds, startDate, endDate)
  ]);
  
  // Calculate composite score
  const compositeScore = Math.round(
    execution.score * weights.execution +
    innovation.score * weights.innovation +
    wellbeing.score * weights.wellbeing +
    culture.score * weights.culture
  );
  
  // Get previous score for trend
  const previousOAR = await OARScore.findOne({
    orgId,
    teamId: null,
    periodEnd: { $lt: startDate }
  }).sort({ periodEnd: -1 }).lean();
  
  const trend = OARScore.getTrend(compositeScore, previousOAR?.score);
  
  // Determine zone
  const zone = OARScore.getZone(compositeScore);
  
  // Count available metrics
  const metricsAvailable = [
    execution.components.meetingLoad,
    execution.components.focusTime,
    wellbeing.components.energyIndex,
    wellbeing.components.sentimentScore,
    culture.components.collaborationIndex
  ].filter(m => m !== null && m !== undefined).length;
  
  const dataQuality = metricsAvailable >= 4 ? 'high' : metricsAvailable >= 2 ? 'medium' : 'low';
  
  // Save to database
  const oarScore = await OARScore.findOneAndUpdate(
    { orgId, teamId: null, periodLabel },
    {
      orgId,
      teamId: null,
      periodStart: startDate,
      periodEnd: endDate,
      periodLabel,
      score: compositeScore,
      pillars: {
        execution: { ...execution },
        innovation: { ...innovation },
        wellbeing: { ...wellbeing },
        culture: { ...culture }
      },
      weights,
      trend: trend.direction,
      trendPct: trend.pct,
      previousScore: previousOAR?.score || null,
      zone,
      dataQuality,
      metricsAvailable,
      calculatedAt: new Date(),
      calculationMethod: 'automated'
    },
    { upsert: true, new: true }
  );
  
  return oarScore;
}

/**
 * Calculate OAR score for a specific team
 */
export async function calculateTeamOAR(teamId, options = {}) {
  const {
    periodDays = 7,
    weights = { execution: 0.30, innovation: 0.20, wellbeing: 0.30, culture: 0.20 }
  } = options;
  
  const team = await Team.findById(teamId).lean();
  if (!team) {
    throw new Error('Team not found');
  }
  
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const periodLabel = getWeekLabel(endDate);
  
  // Calculate each pillar for single team
  const [execution, innovation, wellbeing, culture] = await Promise.all([
    calculateExecutionScore([teamId], startDate, endDate),
    calculateInnovationScore(team.orgId, [teamId], startDate, endDate),
    calculateWellbeingScore([teamId], startDate, endDate),
    calculateCultureScore([teamId], startDate, endDate)
  ]);
  
  // Calculate composite score
  const compositeScore = Math.round(
    execution.score * weights.execution +
    innovation.score * weights.innovation +
    wellbeing.score * weights.wellbeing +
    culture.score * weights.culture
  );
  
  // Get previous score for trend
  const previousOAR = await OARScore.findOne({
    teamId,
    periodEnd: { $lt: startDate }
  }).sort({ periodEnd: -1 }).lean();
  
  const trend = OARScore.getTrend(compositeScore, previousOAR?.score);
  const zone = OARScore.getZone(compositeScore);
  
  const metricsAvailable = [
    execution.components.meetingLoad,
    execution.components.focusTime,
    wellbeing.components.energyIndex,
    wellbeing.components.sentimentScore,
    culture.components.collaborationIndex
  ].filter(m => m !== null && m !== undefined).length;
  
  const dataQuality = metricsAvailable >= 4 ? 'high' : metricsAvailable >= 2 ? 'medium' : 'low';
  
  // Save to database
  const oarScore = await OARScore.findOneAndUpdate(
    { orgId: team.orgId, teamId, periodLabel },
    {
      orgId: team.orgId,
      teamId,
      periodStart: startDate,
      periodEnd: endDate,
      periodLabel,
      score: compositeScore,
      pillars: {
        execution: { ...execution },
        innovation: { ...innovation },
        wellbeing: { ...wellbeing },
        culture: { ...culture }
      },
      weights,
      trend: trend.direction,
      trendPct: trend.pct,
      previousScore: previousOAR?.score || null,
      zone,
      dataQuality,
      metricsAvailable,
      calculatedAt: new Date(),
      calculationMethod: 'automated'
    },
    { upsert: true, new: true }
  );
  
  return oarScore;
}

/**
 * Get OAR history for trend visualization
 */
export async function getOARHistory(orgId, options = {}) {
  const { teamId = null, limit = 12 } = options;
  
  const query = { orgId };
  if (teamId) {
    query.teamId = teamId;
  } else {
    query.teamId = null;
  }
  
  const history = await OARScore.find(query)
    .sort({ periodEnd: -1 })
    .limit(limit)
    .lean();
  
  return history.reverse(); // Return in chronological order
}

export default {
  calculateOrgOAR,
  calculateTeamOAR,
  getOARHistory
};
