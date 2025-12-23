import DecisionClosureRate from '../models/decisionClosureRate.js';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';

/**
 * Decision Closure Rate Calculation Service
 * Calculates whether collaboration produces outcomes with measurable clarity
 */

/**
 * Calculate DCR for a specific time period
 * @param {string} orgId - Organization ID
 * @param {string} teamId - Team ID (optional)
 * @param {Date} startDate - Period start
 * @param {Date} endDate - Period end
 * @returns {Object} DCR calculation result
 */
export async function calculateDCR(orgId, teamId, startDate, endDate) {
  try {
    // Fetch organization to check data sources
    const org = await Organization.findById(orgId);
    if (!org) throw new Error('Organization not found');

    // Initialize components
    const components = {
      meetings: { total: 0, withActionItems: 0, withFollowUpScheduled: 0, withDecisions: 0, closureRate: 0 },
      messages: { total: 0, withResponse: 0, avgResponseTime: 0, responseRate: 0 },
      threads: { total: 0, resolved: 0, abandoned: 0, resolutionRate: 0 }
    };

    let dataSource = {
      slack: false,
      googleCalendar: false,
      microsoftTeams: false
    };

    // Calculate meeting closure rate from calendar data
    if (org.integrations?.google?.accessToken || org.integrations?.microsoft?.accessToken) {
      const meetingData = await calculateMeetingClosure(orgId, teamId, startDate, endDate);
      components.meetings = meetingData.meetings;
      dataSource.googleCalendar = !!org.integrations?.google?.accessToken;
      dataSource.microsoftTeams = !!org.integrations?.microsoft?.accessToken;
    }

    // Calculate message and thread closure rate from Slack data
    if (org.integrations?.slack?.accessToken) {
      const messageData = await calculateMessageClosure(orgId, teamId, startDate, endDate);
      components.messages = messageData.messages;
      components.threads = messageData.threads;
      dataSource.slack = true;
    }

    // Calculate overall DCR score
    const score = calculateOverallScore(components);

    // Detect signals
    const signals = detectSignals(components);

    // Determine trend
    const trend = await calculateTrend(orgId, teamId, score);

    // Get baseline comparison
    const baseline = await getBaselineComparison(orgId, teamId, score);

    // Calculate quality indicators
    const quality = calculateQualityIndicators(components);

    // Determine confidence based on data completeness
    const confidence = determineConfidence(dataSource, components);

    // Create DCR record
    const dcr = new DecisionClosureRate({
      orgId,
      teamId,
      period: { start: startDate, end: endDate },
      score,
      components,
      baseline,
      trend,
      quality,
      signals,
      dataSource,
      confidence
    });

    await dcr.save();
    return dcr;

  } catch (error) {
    console.error('Error calculating DCR:', error);
    throw error;
  }
}

/**
 * Calculate meeting closure rate
 * Meetings with clear outcomes = action items, follow-up scheduled, or decisions documented
 */
async function calculateMeetingClosure(orgId, teamId, startDate, endDate) {
  // TODO: Implement actual calendar data parsing
  // For now, return mock structure
  const meetings = {
    total: 0,
    withActionItems: 0,
    withFollowUpScheduled: 0,
    withDecisions: 0,
    closureRate: 0
  };

  // Calculate closure rate
  if (meetings.total > 0) {
    const closed = meetings.withActionItems + meetings.withFollowUpScheduled + meetings.withDecisions;
    meetings.closureRate = Math.round((closed / meetings.total) * 100);
  }

  return { meetings };
}

/**
 * Calculate message and thread closure rate
 * Messages with response = someone replied within reasonable time
 * Threads resolved = conversation reached conclusion
 */
async function calculateMessageClosure(orgId, teamId, startDate, endDate) {
  // TODO: Implement actual Slack data parsing
  // For now, return mock structure
  const messages = {
    total: 0,
    withResponse: 0,
    avgResponseTime: 0,
    responseRate: 0
  };

  const threads = {
    total: 0,
    resolved: 0,
    abandoned: 0,
    resolutionRate: 0
  };

  // Calculate rates
  if (messages.total > 0) {
    messages.responseRate = Math.round((messages.withResponse / messages.total) * 100);
  }

  if (threads.total > 0) {
    threads.resolutionRate = Math.round((threads.resolved / threads.total) * 100);
  }

  return { messages, threads };
}

/**
 * Calculate overall DCR score from components
 * Weighted average: meetings 40%, messages 30%, threads 30%
 */
function calculateOverallScore(components) {
  const meetingScore = components.meetings.closureRate || 0;
  const messageScore = components.messages.responseRate || 0;
  const threadScore = components.threads.resolutionRate || 0;

  const overallScore = Math.round(
    (meetingScore * 0.4) + (messageScore * 0.3) + (threadScore * 0.3)
  );

  return Math.min(100, Math.max(0, overallScore));
}

/**
 * Detect behavioral signals from components
 */
function detectSignals(components) {
  const signals = [];

  // Long meetings with low closure
  if (components.meetings.total > 10 && components.meetings.closureRate < 40) {
    signals.push({
      type: 'long-meetings-low-output',
      severity: 'high',
      description: 'Many meetings without clear outcomes'
    });
  }

  // High message volume with low response
  if (components.messages.total > 100 && components.messages.responseRate < 50) {
    signals.push({
      type: 'orphaned-messages',
      severity: 'medium',
      description: 'Messages not receiving responses'
    });
  }

  // High thread abandonment
  if (components.threads.total > 20 && components.threads.abandoned > components.threads.resolved) {
    signals.push({
      type: 'abandoned-threads',
      severity: 'high',
      description: 'Conversations dying without resolution'
    });
  }

  return signals;
}

/**
 * Calculate trend by comparing to previous periods
 */
async function calculateTrend(orgId, teamId, currentScore) {
  try {
    const query = { orgId };
    if (teamId) query.teamId = teamId;

    // Get last 4 weeks of DCR data
    const historicalDCR = await DecisionClosureRate
      .find(query)
      .sort({ 'period.end': -1 })
      .limit(5)
      .select('score period');

    if (historicalDCR.length < 2) {
      return { direction: 'stable', velocity: 0, sustained: 0 };
    }

    // Calculate velocity (change per week)
    const previousScore = historicalDCR[1].score;
    const delta = currentScore - previousScore;
    
    let direction = 'stable';
    if (delta > 5) direction = 'improving';
    else if (delta < -5) direction = 'declining';

    // Count sustained days
    let sustained = 0;
    for (let i = 1; i < historicalDCR.length; i++) {
      if (
        (direction === 'improving' && historicalDCR[i].score < historicalDCR[i-1].score) ||
        (direction === 'declining' && historicalDCR[i].score > historicalDCR[i-1].score)
      ) {
        sustained += 7; // assuming weekly calculations
      } else {
        break;
      }
    }

    return { direction, velocity: delta, sustained };

  } catch (error) {
    console.error('Error calculating trend:', error);
    return { direction: 'stable', velocity: 0, sustained: 0 };
  }
}

/**
 * Get baseline comparison
 */
async function getBaselineComparison(orgId, teamId, currentScore) {
  try {
    const query = { orgId };
    if (teamId) query.teamId = teamId;

    // Get average DCR from last 30 days (baseline)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const baselineData = await DecisionClosureRate
      .find({ ...query, 'period.end': { $gte: thirtyDaysAgo } })
      .select('score');

    if (baselineData.length === 0) {
      return { score: null, delta: null, deltaPercent: null };
    }

    const baselineScore = Math.round(
      baselineData.reduce((sum, d) => sum + d.score, 0) / baselineData.length
    );

    const delta = currentScore - baselineScore;
    const deltaPercent = baselineScore > 0 
      ? Math.round((delta / baselineScore) * 100) 
      : 0;

    return { score: baselineScore, delta, deltaPercent };

  } catch (error) {
    console.error('Error calculating baseline:', error);
    return { score: null, delta: null, deltaPercent: null };
  }
}

/**
 * Calculate quality indicators
 */
function calculateQualityIndicators(components) {
  return {
    avgMeetingDuration: null, // TODO: implement from calendar data
    avgThreadLength: null, // TODO: implement from Slack data
    decisionToActionTime: null, // TODO: implement from cross-platform data
    reopenedThreads: 0 // TODO: implement from Slack data
  };
}

/**
 * Determine confidence level based on data completeness
 */
function determineConfidence(dataSource, components) {
  let dataPoints = 0;
  let totalPossible = 3; // meetings, messages, threads

  if (dataSource.slack || dataSource.googleCalendar || dataSource.microsoftTeams) {
    if (components.meetings.total > 0) dataPoints++;
    if (components.messages.total > 0) dataPoints++;
    if (components.threads.total > 0) dataPoints++;
  }

  const completeness = dataPoints / totalPossible;
  
  if (completeness >= 0.66) return 'High';
  if (completeness >= 0.33) return 'Medium';
  return 'Low';
}

/**
 * Get latest DCR for organization or team
 */
export async function getLatestDCR(orgId, teamId = null) {
  const query = { orgId };
  if (teamId) query.teamId = teamId;

  return await DecisionClosureRate
    .findOne(query)
    .sort({ 'period.end': -1 });
}

/**
 * Get DCR history for trending
 */
export async function getDCRHistory(orgId, teamId = null, days = 30) {
  const query = { orgId };
  if (teamId) query.teamId = teamId;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await DecisionClosureRate
    .find({ ...query, 'period.end': { $gte: startDate } })
    .sort({ 'period.end': 1 })
    .select('score period trend baseline');
}
