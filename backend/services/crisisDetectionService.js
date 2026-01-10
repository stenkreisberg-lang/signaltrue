/**
 * Crisis Detection Service
 * Real-time anomaly detection (runs every 15 minutes)
 * Detects same-day disasters requiring immediate intervention
 */

import CrisisEvent from '../models/crisisEvent.js';
import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';

/**
 * Run crisis detection for all teams
 * Should be called every 15 minutes via cron
 */
export async function runCrisisDetection() {
  console.log('[Crisis Detection] Starting real-time anomaly scan...');
  
  try {
    const teams = await Team.find({ isActive: true });
    const crises = [];
    
    for (const team of teams) {
      const crisis = await detectTeamCrisis(team._id);
      if (crisis) {
        crises.push(crisis);
      }
    }
    
    console.log(`[Crisis Detection] Detected ${crises.length} crises`);
    return crises;
  } catch (error) {
    console.error('[Crisis Detection] Error:', error);
    throw error;
  }
}

/**
 * Detect crisis for a single team
 */
export async function detectTeamCrisis(teamId) {
  try {
    // Get baseline (7-day avg) and current (last 6 hours)
    const baseline = await getBaselineMetrics(teamId);
    const current = await getCurrentMetrics(teamId);
    
    if (!baseline || !current) {
      return null; // Not enough data
    }
    
    // Analyze Slack anomalies
    const slackSignals = analyzeSlackAnomalies(baseline.slack, current.slack);
    
    // Analyze Calendar anomalies
    const calendarSignals = analyzeCalendarAnomalies(baseline.calendar, current.calendar);
    
    // Determine if this is a crisis
    const isCrisis = isSignificantCrisis(slackSignals, calendarSignals);
    
    if (!isCrisis) {
      return null;
    }
    
    // Classify crisis type
    const crisisType = classifyCrisisType(slackSignals, calendarSignals);
    
    // Calculate severity
    const severity = calculateSeverity(slackSignals, calendarSignals);
    
    // Calculate confidence
    const confidenceScore = calculateConfidence(slackSignals, calendarSignals);
    
    // Identify likely triggers
    const likelyTriggers = identifyTriggers(slackSignals, calendarSignals, crisisType);
    
    // Generate recommended action
    const recommendedAction = getRecommendedAction(crisisType, severity);
    
    // Determine urgency
    const urgency = severity === 'critical' ? 'immediate' : 'today';
    
    // Check if we already detected this crisis recently (avoid duplicate alerts)
    const recentCrisis = await CrisisEvent.findOne({
      teamId,
      crisisType,
      resolved: false,
      detectedAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } // last 6 hours
    });
    
    if (recentCrisis) {
      // Update existing crisis
      recentCrisis.slackSignals = slackSignals;
      recentCrisis.calendarSignals = calendarSignals;
      recentCrisis.confidenceScore = confidenceScore;
      recentCrisis.severity = severity;
      await recentCrisis.save();
      return recentCrisis;
    }
    
    // Create new crisis event
    const team = await Team.findById(teamId);
    const crisis = new CrisisEvent({
      teamId,
      orgId: team.orgId || team.organizationId,
      crisisType,
      severity,
      slackSignals,
      calendarSignals,
      confidenceScore,
      likelyTriggers,
      recommendedAction,
      urgency
    });
    
    await crisis.save();
    
    // TODO: Send immediate notification to HR/leadership
    console.log(`[Crisis Detection] ⚠️ ${severity.toUpperCase()} crisis detected for team ${teamId}: ${crisisType}`);
    
    return crisis;
  } catch (error) {
    console.error('[Crisis Detection] Error detecting team crisis:', error);
    return null;
  }
}

/**
 * Get 7-day baseline metrics
 */
async function getBaselineMetrics(teamId) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  // Placeholder - in production, aggregate from MetricsDaily
  return {
    slack: {
      messageVolume: 180, // per day
      negativeEmoji: 2, // per day
      threadAbandonment: 1, // per day
      sentimentScore: 0.65 // -1 to 1
    },
    calendar: {
      meetingCancellations: 1, // per day
      declineRate: 5, // %
      calendarPurges: 0 // per day
    }
  };
}

/**
 * Get current metrics (last 6 hours, extrapolated to daily rate)
 */
async function getCurrentMetrics(teamId) {
  // Placeholder - in production, query real-time from Slack/Calendar APIs
  return {
    slack: {
      messageVolume: 22, // extrapolated to daily: 88
      negativeEmoji: 24, // extrapolated to daily: 96
      threadAbandonment: 8, // extrapolated: 32
      sentimentScore: -0.42 // crisis
    },
    calendar: {
      meetingCancellations: 9, // extrapolated: 36
      declineRate: 45, // %
      calendarPurges: 4 // extrapolated: 16
    }
  };
}

/**
 * Analyze Slack anomalies
 */
function analyzeSlackAnomalies(baseline, current) {
  const signals = [];
  
  // Message volume drop
  const msgDeviation = ((current.messageVolume * 4 - baseline.messageVolume) / baseline.messageVolume) * 100;
  if (Math.abs(msgDeviation) >= 50) {
    signals.push({
      metric: 'message_volume',
      baseline: baseline.messageVolume,
      current: current.messageVolume * 4,
      deviation: msgDeviation,
      significance: Math.abs(msgDeviation) >= 70 ? 'high' : 'medium'
    });
  }
  
  // Negative emoji spike
  const emojiDeviation = ((current.negativeEmoji * 4 - baseline.negativeEmoji) / baseline.negativeEmoji) * 100;
  if (emojiDeviation >= 300) {
    signals.push({
      metric: 'negative_emoji_spike',
      baseline: baseline.negativeEmoji,
      current: current.negativeEmoji * 4,
      deviation: emojiDeviation,
      significance: emojiDeviation >= 500 ? 'high' : 'medium'
    });
  }
  
  // Thread abandonment
  const threadDeviation = ((current.threadAbandonment * 4 - baseline.threadAbandonment) / baseline.threadAbandonment) * 100;
  if (threadDeviation >= 200) {
    signals.push({
      metric: 'thread_abandonment',
      baseline: baseline.threadAbandonment,
      current: current.threadAbandonment * 4,
      deviation: threadDeviation,
      significance: 'medium'
    });
  }
  
  // Sentiment collapse
  const sentimentDrop = ((current.sentimentScore - baseline.sentimentScore) / baseline.sentimentScore) * 100;
  if (sentimentDrop <= -100) {
    signals.push({
      metric: 'sentiment_score',
      baseline: baseline.sentimentScore,
      current: current.sentimentScore,
      deviation: sentimentDrop,
      significance: 'high'
    });
  }
  
  return signals;
}

/**
 * Analyze Calendar anomalies
 */
function analyzeCalendarAnomalies(baseline, current) {
  const signals = [];
  
  // Meeting cancellations spike
  const cancelDeviation = ((current.meetingCancellations * 4 - baseline.meetingCancellations) / baseline.meetingCancellations) * 100;
  if (cancelDeviation >= 300) {
    signals.push({
      metric: 'meeting_cancellations',
      baseline: baseline.meetingCancellations,
      current: current.meetingCancellations * 4,
      deviation: cancelDeviation
    });
  }
  
  // Decline rate spike
  const declineChange = current.declineRate - baseline.declineRate;
  if (declineChange >= 25) {
    signals.push({
      metric: 'decline_rate_spike',
      baseline: baseline.declineRate,
      current: current.declineRate,
      deviation: declineChange
    });
  }
  
  // Calendar purge
  if (current.calendarPurges >= 3) {
    signals.push({
      metric: 'calendar_purge',
      baseline: baseline.calendarPurges,
      current: current.calendarPurges * 4,
      deviation: 1000 // extreme
    });
  }
  
  return signals;
}

/**
 * Determine if this is a significant crisis
 */
function isSignificantCrisis(slackSignals, calendarSignals) {
  const highSignificanceCount = slackSignals.filter(s => s.significance === 'high').length;
  const totalSignals = slackSignals.length + calendarSignals.length;
  
  // Crisis if 2+ high-significance signals OR 4+ total signals
  return highSignificanceCount >= 2 || totalSignals >= 4;
}

/**
 * Classify crisis type
 */
function classifyCrisisType(slackSignals, calendarSignals) {
  const hasNegativeEmojiSpike = slackSignals.some(s => s.metric === 'negative_emoji_spike');
  const hasSentimentCollapse = slackSignals.some(s => s.metric === 'sentiment_score');
  const hasMessageDrop = slackSignals.some(s => s.metric === 'message_volume' && s.deviation < 0);
  const hasCalendarPurge = calendarSignals.some(s => s.metric === 'calendar_purge');
  const hasCancellations = calendarSignals.some(s => s.metric === 'meeting_cancellations');
  
  if (hasSentimentCollapse && hasNegativeEmojiSpike) {
    return 'sudden_sentiment_collapse';
  } else if (hasMessageDrop && hasCancellations) {
    return 'communication_shutdown';
  } else if (hasCalendarPurge && hasCancellations) {
    return 'leadership_departure_shock';
  } else if (hasCancellations) {
    return 'mass_calendar_cancellation';
  } else if (hasNegativeEmojiSpike) {
    return 'conflict_spike';
  }
  
  return 'sudden_sentiment_collapse';
}

/**
 * Calculate severity
 */
function calculateSeverity(slackSignals, calendarSignals) {
  const highCount = slackSignals.filter(s => s.significance === 'high').length;
  const totalDeviations = [...slackSignals, ...calendarSignals].reduce((sum, s) => sum + Math.abs(s.deviation), 0);
  
  if (highCount >= 3 || totalDeviations >= 2000) {
    return 'critical';
  } else if (highCount >= 2 || totalDeviations >= 1000) {
    return 'high';
  } else if (totalDeviations >= 500) {
    return 'medium';
  }
  return 'low';
}

/**
 * Calculate confidence score
 */
function calculateConfidence(slackSignals, calendarSignals) {
  const signalCount = slackSignals.length + calendarSignals.length;
  const highSignificance = slackSignals.filter(s => s.significance === 'high').length;
  
  let confidence = 40; // base
  confidence += signalCount * 10; // +10 per signal
  confidence += highSignificance * 15; // +15 per high-significance signal
  
  return Math.min(confidence, 100);
}

/**
 * Identify likely triggers
 */
function identifyTriggers(slackSignals, calendarSignals, crisisType) {
  const triggers = [];
  
  if (crisisType === 'sudden_sentiment_collapse') {
    triggers.push('Layoff announcement', 'Organizational restructuring', 'Leadership change');
  } else if (crisisType === 'communication_shutdown') {
    triggers.push('Manager departure', 'Team conflict', 'Major setback');
  } else if (crisisType === 'leadership_departure_shock') {
    triggers.push('Manager resignation', 'Executive departure');
  } else if (crisisType === 'mass_calendar_cancellation') {
    triggers.push('Urgent company event', 'Crisis response', 'Emergency meeting');
  } else if (crisisType === 'conflict_spike') {
    triggers.push('Team disagreement', 'Project failure', 'Interpersonal conflict');
  }
  
  return triggers;
}

/**
 * Get recommended action
 */
function getRecommendedAction(crisisType, severity) {
  if (severity === 'critical') {
    return 'Immediate leadership intervention required - contact team within 2 hours';
  } else if (severity === 'high') {
    return 'Urgent manager check-in needed - schedule team conversation today';
  } else {
    return 'Monitor closely and schedule check-in within 24 hours';
  }
}

/**
 * Get active crises for org
 */
export async function getActiveCrises(orgId) {
  try {
    const crises = await CrisisEvent.find({
      orgId,
      resolved: false,
      detectedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // last 24 hours
    })
    .populate('teamId', 'name')
    .sort({ severity: -1, detectedAt: -1 });
    
    return crises;
  } catch (error) {
    console.error('[Crisis Detection] Error fetching active crises:', error);
    throw error;
  }
}

/**
 * Acknowledge crisis
 */
export async function acknowledgeCrisis(crisisId, userId) {
  try {
    const crisis = await CrisisEvent.findById(crisisId);
    if (!crisis) return null;
    
    crisis.acknowledged = true;
    crisis.acknowledgedBy = userId;
    crisis.acknowledgedAt = new Date();
    
    await crisis.save();
    return crisis;
  } catch (error) {
    console.error('[Crisis Detection] Error acknowledging crisis:', error);
    throw error;
  }
}

/**
 * Resolve crisis
 */
export async function resolveCrisis(crisisId, userId, notes) {
  try {
    const crisis = await CrisisEvent.findById(crisisId);
    if (!crisis) return null;
    
    crisis.resolved = true;
    crisis.resolvedAt = new Date();
    crisis.resolutionNotes = notes;
    
    await crisis.save();
    return crisis;
  } catch (error) {
    console.error('[Crisis Detection] Error resolving crisis:', error);
    throw error;
  }
}

export default {
  runCrisisDetection,
  detectTeamCrisis,
  getActiveCrises,
  acknowledgeCrisis,
  resolveCrisis
};
