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
import Team from '../models/team.js';

const finiteValues = (records, key) =>
  records.map((record) => record?.[key]).filter((value) => Number.isFinite(value));

const average = (values) =>
  values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;

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

  if (totalWeight === 0) return null;
  return Math.round(sum / totalWeight);
}

/**
 * Calculate Execution pillar score
 */
async function calculateExecutionScore(teamIds, startDate, endDate) {
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  if (metrics.length === 0) {
    return {
      available: false,
      reason: 'No execution metrics are available for this period.',
      score: null,
      components: {},
      trend: 'stable',
      trendPct: 0,
    };
  }

  const avgMeetingLoad = average(finiteValues(metrics, 'meetingLoadIndex'));
  const avgFocusTime = average(finiteValues(metrics, 'focusTimeRatio'));
  const avgResponseLatency = average(finiteValues(metrics, 'responseLatencyTrend'));

  const components = {
    meetingLoad: normalize(avgMeetingLoad, 0, 40, true), // 0-40 hrs/week, lower is better
    focusTime: normalize(avgFocusTime, 0, 1, false), // 0-1 ratio, higher is better
    flowEfficiency: Number.isFinite(avgFocusTime) ? Math.round(avgFocusTime * 100) : null,
    decisionLatency: normalize(avgResponseLatency, 0, 48, true), // 0-48 hrs, lower is better
  };

  const weights = { meetingLoad: 0.3, focusTime: 0.35, flowEfficiency: 0.2, decisionLatency: 0.15 };
  const score = weightedAverage(components, weights);

  return {
    available: score !== null,
    reason: score === null ? 'No execution components are measurable for this period.' : null,
    score,
    components,
    trend: 'stable',
    trendPct: 0,
  };
}

/**
 * Calculate Innovation pillar score
 * Innovation is unavailable until experiment or idea telemetry is connected.
 */
async function calculateInnovationScore(_orgId, _teamIds, _startDate, _endDate) {
  return {
    available: false,
    reason: 'Innovation telemetry is not connected.',
    score: null,
    components: {
      ideaCaptureRate: null,
      experimentSuccessRate: null,
      innovationThroughput: null,
    },
    trend: 'stable',
    trendPct: 0,
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
    week: weekLabel,
  }).lean();

  // Get daily metrics for after-hours and sentiment
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const avgEnergy = average(finiteValues(energyData, 'energyIndex'));
  const avgAfterHours = average(finiteValues(metrics, 'afterHoursActivityRate'));
  const avgSentiment = average(finiteValues(metrics, 'sentimentToneShift'));
  const avgRecovery = average(finiteValues(metrics, 'engagementRecoveryIndex'));

  const components = {
    energyIndex: Number.isFinite(avgEnergy) ? Math.round(avgEnergy) : null,
    afterHoursRate: normalize(avgAfterHours, 0, 0.5, true), // 0-50% after hours, lower is better
    recoveryIndex: Number.isFinite(avgRecovery) ? Math.round(avgRecovery) : null,
    sentimentScore: Number.isFinite(avgSentiment) ? Math.round(avgSentiment * 100) : null,
  };

  const weights = {
    energyIndex: 0.35,
    afterHoursRate: 0.25,
    recoveryIndex: 0.2,
    sentimentScore: 0.2,
  };
  const score = weightedAverage(components, weights);

  return {
    available: score !== null,
    reason: score === null ? 'No wellbeing components are measurable for this period.' : null,
    score,
    components,
    trend: 'stable',
    trendPct: 0,
  };
}

/**
 * Calculate Culture pillar score
 */
async function calculateCultureScore(teamIds, startDate, endDate) {
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate },
  }).lean();

  const avgCollaboration = average(finiteValues(metrics, 'collaborationNetworkBreadth'));
  const avgResponseLatency = average(finiteValues(metrics, 'responseLatencyTrend'));

  const components = {
    collaborationIndex: Number.isFinite(avgCollaboration) ? Math.round(avgCollaboration) : null,
    networkBreadth: null,
    responsiveness: normalize(avgResponseLatency, 0, 48, true),
    equityScore: null,
  };

  const weights = {
    collaborationIndex: 0.3,
    networkBreadth: 0.25,
    responsiveness: 0.2,
    equityScore: 0.25,
  };
  const score = weightedAverage(components, weights);

  return {
    available: score !== null,
    reason: score === null ? 'No culture components are measurable for this period.' : null,
    score,
    components,
    trend: 'stable',
    trendPct: 0,
  };
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
    weights = { execution: 0.3, innovation: 0.2, wellbeing: 0.3, culture: 0.2 },
  } = options;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const periodLabel = getWeekLabel(endDate);

  // Get all teams in the org
  const teams = await Team.find({ orgId }).select('_id').lean();
  const teamIds = teams.map((t) => t._id);

  if (teamIds.length === 0) {
    return {
      available: false,
      reason: 'No teams are configured for this organization.',
      score: null,
      zone: null,
      pillars: {
        execution: { available: false, score: null, components: {} },
        innovation: { available: false, score: null, components: {} },
        wellbeing: { available: false, score: null, components: {} },
        culture: { available: false, score: null, components: {} },
      },
      dataQuality: 'low',
      metricsAvailable: 0,
    };
  }

  // Calculate each pillar
  const [execution, innovation, wellbeing, culture] = await Promise.all([
    calculateExecutionScore(teamIds, startDate, endDate),
    calculateInnovationScore(orgId, teamIds, startDate, endDate),
    calculateWellbeingScore(teamIds, startDate, endDate),
    calculateCultureScore(teamIds, startDate, endDate),
  ]);

  // Calculate composite score
  const compositeScore = weightedAverage(
    {
      execution: execution.score,
      innovation: innovation.score,
      wellbeing: wellbeing.score,
      culture: culture.score,
    },
    weights
  );

  if (compositeScore === null) {
    return {
      available: false,
      reason: 'No OAR inputs are measurable for this period.',
      score: null,
      zone: null,
      pillars: { execution, innovation, wellbeing, culture },
      weights,
      periodLabel,
      periodStart: startDate,
      periodEnd: endDate,
      dataQuality: 'low',
      metricsAvailable: 0,
      calculatedAt: new Date(),
    };
  }

  // Get previous score for trend
  const previousOAR = await OARScore.findOne({
    orgId,
    teamId: null,
    periodEnd: { $lt: startDate },
  })
    .sort({ periodEnd: -1 })
    .lean();

  const trend = OARScore.getTrend(compositeScore, previousOAR?.score);

  // Determine zone
  const zone = OARScore.getZone(compositeScore);

  // Count available metrics
  const metricsAvailable = [
    execution.components.meetingLoad,
    execution.components.focusTime,
    wellbeing.components.energyIndex,
    wellbeing.components.sentimentScore,
    culture.components.collaborationIndex,
  ].filter((m) => m !== null && m !== undefined).length;

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
      available: true,
      reason: null,
      score: compositeScore,
      pillars: {
        execution: { ...execution },
        innovation: { ...innovation },
        wellbeing: { ...wellbeing },
        culture: { ...culture },
      },
      weights,
      trend: trend.direction,
      trendPct: trend.pct,
      previousScore: previousOAR?.score ?? null,
      zone,
      dataQuality,
      metricsAvailable,
      calculatedAt: new Date(),
      calculationMethod: 'automated',
    },
    { upsert: true, returnDocument: 'after' }
  );

  return oarScore;
}

/**
 * Calculate OAR score for a specific team
 */
export async function calculateTeamOAR(teamId, options = {}) {
  const {
    periodDays = 7,
    weights = { execution: 0.3, innovation: 0.2, wellbeing: 0.3, culture: 0.2 },
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
    calculateCultureScore([teamId], startDate, endDate),
  ]);

  // Calculate composite score
  const compositeScore = weightedAverage(
    {
      execution: execution.score,
      innovation: innovation.score,
      wellbeing: wellbeing.score,
      culture: culture.score,
    },
    weights
  );

  if (compositeScore === null) {
    return {
      available: false,
      reason: 'No OAR inputs are measurable for this period.',
      score: null,
      zone: null,
      pillars: { execution, innovation, wellbeing, culture },
      weights,
      periodLabel,
      periodStart: startDate,
      periodEnd: endDate,
      dataQuality: 'low',
      metricsAvailable: 0,
      calculatedAt: new Date(),
    };
  }

  // Get previous score for trend
  const previousOAR = await OARScore.findOne({
    teamId,
    periodEnd: { $lt: startDate },
  })
    .sort({ periodEnd: -1 })
    .lean();

  const trend = OARScore.getTrend(compositeScore, previousOAR?.score);
  const zone = OARScore.getZone(compositeScore);

  const metricsAvailable = [
    execution.components.meetingLoad,
    execution.components.focusTime,
    wellbeing.components.energyIndex,
    wellbeing.components.sentimentScore,
    culture.components.collaborationIndex,
  ].filter((m) => m !== null && m !== undefined).length;

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
      available: true,
      reason: null,
      score: compositeScore,
      pillars: {
        execution: { ...execution },
        innovation: { ...innovation },
        wellbeing: { ...wellbeing },
        culture: { ...culture },
      },
      weights,
      trend: trend.direction,
      trendPct: trend.pct,
      previousScore: previousOAR?.score ?? null,
      zone,
      dataQuality,
      metricsAvailable,
      calculatedAt: new Date(),
      calculationMethod: 'automated',
    },
    { upsert: true, returnDocument: 'after' }
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

  const history = await OARScore.find(query).sort({ periodEnd: -1 }).limit(limit).lean();

  return history.reverse(); // Return in chronological order
}

export default {
  calculateOrgOAR,
  calculateTeamOAR,
  getOARHistory,
};
