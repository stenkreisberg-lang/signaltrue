/**
 * Attrition Risk Service
 * Detects individual flight risk from behavioral collapse patterns
 * Uses only Slack + Google Calendar/Outlook data (no surveys)
 */

import AttritionRisk from '../models/attritionRisk.js';
import MetricsDaily from '../models/metricsDaily.js';
import User from '../models/user.js';
import Team from '../models/team.js';

/**
 * Calculate attrition risk for a single user
 */
export async function calculateAttritionRisk(userId, teamId) {
  try {
    // Get user's historical metrics (30-day baseline vs last 7 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Baseline period: days 8-30
    const baselineMetrics = await getIndividualMetrics(userId, teamId, thirtyDaysAgo, sevenDaysAgo);
    
    // Current period: last 7 days
    const currentMetrics = await getIndividualMetrics(userId, teamId, sevenDaysAgo, new Date());
    
    if (!baselineMetrics || !currentMetrics) {
      return null; // Not enough data
    }
    
    // Analyze Slack signals
    const slackSignals = analyzeSlackSignals(baselineMetrics.slack, currentMetrics.slack);
    
    // Analyze Calendar signals
    const calendarSignals = analyzeCalendarSignals(baselineMetrics.calendar, currentMetrics.calendar);
    
    // Calculate weighted risk score
    const riskScore = calculateRiskScore(slackSignals, calendarSignals);
    
    // Build behavioral indicators array
    const behavioralIndicators = buildIndicators(slackSignals, calendarSignals);
    
    // Determine prediction window
    const predictedExitWindow = predictExitWindow(riskScore, slackSignals, calendarSignals);
    
    // Determine confidence
    const confidence = determineConfidence(slackSignals, calendarSignals);
    
    // Check for existing risk record
    let riskRecord = await AttritionRisk.findOne({ userId, outcome: 'pending' })
      .sort({ createdAt: -1 });
    
    if (riskRecord) {
      // Update existing
      riskRecord.riskScore = riskScore;
      riskRecord.slackSignals = slackSignals;
      riskRecord.calendarSignals = calendarSignals;
      riskRecord.behavioralIndicators = behavioralIndicators;
      riskRecord.predictedExitWindow = predictedExitWindow;
      riskRecord.confidence = confidence;
      riskRecord.lastUpdated = new Date();
      
      // Update days in high risk
      if (riskScore >= 60) {
        const daysSinceFirst = Math.floor((Date.now() - riskRecord.firstDetected.getTime()) / (24 * 60 * 60 * 1000));
        riskRecord.daysInHighRisk = daysSinceFirst;
      }
    } else {
      // Create new
      riskRecord = new AttritionRisk({
        userId,
        teamId,
        orgId: (await User.findById(userId)).orgId,
        riskScore,
        slackSignals,
        calendarSignals,
        behavioralIndicators,
        predictedExitWindow,
        confidence,
        firstDetected: new Date()
      });
    }
    
    riskRecord.calculateRiskLevel();
    
    // Auto-notify HR if critical and not yet notified
    if (riskRecord.shouldNotifyHR()) {
      riskRecord.hrNotified = true;
      riskRecord.hrNotifiedAt = new Date();
      // TODO: Trigger HR notification email/Slack
    }
    
    await riskRecord.save();
    
    return riskRecord;
  } catch (error) {
    console.error('[Attrition Risk] Error calculating risk:', error);
    throw error;
  }
}

/**
 * Get individual user metrics for a time period
 */
async function getIndividualMetrics(userId, teamId, startDate, endDate) {
  // Note: This assumes you're storing individual-level metrics
  // If you only have team-level, you'll need to add individual tracking
  
  // Placeholder: In production, query individual Slack/Calendar metrics
  // For now, return mock structure
  return {
    slack: {
      messageCount: 45,
      responseTimeHours: 2.5,
      uniqueContacts: 15,
      emojiCount: 20,
      threadParticipation: 12
    },
    calendar: {
      meetingsAccepted: 20,
      meetingsDeclined: 1,
      recurringMeetings: 8,
      oneOnOneCount: 2
    }
  };
}

/**
 * Analyze Slack behavioral signals
 */
function analyzeSlackSignals(baseline, current) {
  const signals = {
    messageVolumeDrop: {
      baseline: baseline.messageCount,
      current: current.messageCount,
      percentChange: ((current.messageCount - baseline.messageCount) / baseline.messageCount) * 100,
      detected: false
    },
    responseTimeIncrease: {
      baselineHours: baseline.responseTimeHours,
      currentHours: current.responseTimeHours,
      percentChange: ((current.responseTimeHours - baseline.responseTimeHours) / baseline.responseTimeHours) * 100,
      detected: false
    },
    networkShrinkage: {
      baselineContacts: baseline.uniqueContacts,
      currentContacts: current.uniqueContacts,
      percentChange: ((current.uniqueContacts - baseline.uniqueContacts) / baseline.uniqueContacts) * 100,
      detected: false
    },
    emojiUsageDrop: {
      baseline: baseline.emojiCount,
      current: current.emojiCount,
      percentChange: ((current.emojiCount - baseline.emojiCount) / baseline.emojiCount) * 100,
      detected: false
    },
    threadParticipationDrop: {
      baseline: baseline.threadParticipation,
      current: current.threadParticipation,
      percentChange: ((current.threadParticipation - baseline.threadParticipation) / baseline.threadParticipation) * 100,
      detected: false
    }
  };
  
  // Detect concerning patterns
  if (signals.messageVolumeDrop.percentChange <= -50) signals.messageVolumeDrop.detected = true;
  if (signals.responseTimeIncrease.percentChange >= 200) signals.responseTimeIncrease.detected = true;
  if (signals.networkShrinkage.percentChange <= -40) signals.networkShrinkage.detected = true;
  if (signals.emojiUsageDrop.percentChange <= -60) signals.emojiUsageDrop.detected = true;
  if (signals.threadParticipationDrop.percentChange <= -70) signals.threadParticipationDrop.detected = true;
  
  return signals;
}

/**
 * Analyze Calendar behavioral signals
 */
function analyzeCalendarSignals(baseline, current) {
  const signals = {
    meetingDeclineRate: {
      baseline: (baseline.meetingsDeclined / (baseline.meetingsAccepted + baseline.meetingsDeclined)) * 100,
      current: (current.meetingsDeclined / (current.meetingsAccepted + current.meetingsDeclined)) * 100,
      percentChange: 0,
      detected: false
    },
    calendarPurge: {
      recurringDeleted: baseline.recurringMeetings - current.recurringMeetings,
      detected: false
    },
    oneOnOneCancellations: {
      count: baseline.oneOnOneCount - current.oneOnOneCount,
      timeframe: '2 weeks',
      detected: false
    },
    workingHoursCleared: {
      detected: false // Requires calendar metadata
    }
  };
  
  signals.meetingDeclineRate.percentChange = signals.meetingDeclineRate.current - signals.meetingDeclineRate.baseline;
  
  // Detect concerning patterns
  if (signals.meetingDeclineRate.current >= 30) signals.meetingDeclineRate.detected = true;
  if (signals.calendarPurge.recurringDeleted >= 4) signals.calendarPurge.detected = true;
  if (signals.oneOnOneCancellations.count >= 2) signals.oneOnOneCancellations.detected = true;
  
  return signals;
}

/**
 * Calculate weighted risk score
 */
function calculateRiskScore(slackSignals, calendarSignals) {
  let score = 0;
  
  // Slack signals (60% of total weight)
  if (slackSignals.messageVolumeDrop.detected) score += 15;
  if (slackSignals.responseTimeIncrease.detected) score += 12;
  if (slackSignals.networkShrinkage.detected) score += 10;
  if (slackSignals.emojiUsageDrop.detected) score += 8;
  if (slackSignals.threadParticipationDrop.detected) score += 15;
  
  // Calendar signals (40% of total weight)
  if (calendarSignals.meetingDeclineRate.detected) score += 12;
  if (calendarSignals.calendarPurge.detected) score += 10;
  if (calendarSignals.oneOnOneCancellations.detected) score += 8;
  if (calendarSignals.workingHoursCleared.detected) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Build behavioral indicators array
 */
function buildIndicators(slackSignals, calendarSignals) {
  const indicators = [];
  
  if (slackSignals.messageVolumeDrop.detected) {
    indicators.push({
      signal: 'message_volume_drop',
      value: `${slackSignals.messageVolumeDrop.percentChange.toFixed(0)}%`,
      weight: 0.15,
      contribution: 15
    });
  }
  
  if (slackSignals.responseTimeIncrease.detected) {
    indicators.push({
      signal: 'response_time_increase',
      value: `${slackSignals.responseTimeIncrease.baselineHours}hrs → ${slackSignals.responseTimeIncrease.currentHours}hrs`,
      weight: 0.12,
      contribution: 12
    });
  }
  
  if (slackSignals.networkShrinkage.detected) {
    indicators.push({
      signal: 'network_shrinkage',
      value: `${slackSignals.networkShrinkage.baselineContacts} → ${slackSignals.networkShrinkage.currentContacts} contacts`,
      weight: 0.10,
      contribution: 10
    });
  }
  
  if (calendarSignals.calendarPurge.detected) {
    indicators.push({
      signal: 'calendar_purge',
      value: `${calendarSignals.calendarPurge.recurringDeleted} recurring meetings deleted`,
      weight: 0.10,
      contribution: 10
    });
  }
  
  return indicators.sort((a, b) => b.contribution - a.contribution);
}

/**
 * Predict exit window based on severity
 */
function predictExitWindow(riskScore, slackSignals, calendarSignals) {
  if (riskScore >= 80 && calendarSignals.calendarPurge.detected) {
    return '30-60 days'; // Calendar purge = actively planning exit
  } else if (riskScore >= 60) {
    return '60-90 days';
  } else if (riskScore >= 40) {
    return '90-180 days';
  }
  return 'unknown';
}

/**
 * Determine confidence level
 */
function determineConfidence(slackSignals, calendarSignals) {
  let detectedCount = 0;
  
  Object.values(slackSignals).forEach(signal => {
    if (signal.detected) detectedCount++;
  });
  
  Object.values(calendarSignals).forEach(signal => {
    if (signal.detected) detectedCount++;
  });
  
  if (detectedCount >= 5) return 'high';
  if (detectedCount >= 3) return 'medium';
  return 'low';
}

/**
 * Calculate attrition risk for all users in a team
 */
export async function calculateTeamAttritionRisk(teamId) {
  try {
    const team = await Team.findById(teamId).populate('members');
    if (!team) return null;
    
    const results = [];
    
    for (const userId of team.members) {
      const risk = await calculateAttritionRisk(userId, teamId);
      if (risk) results.push(risk);
    }
    
    return results;
  } catch (error) {
    console.error('[Attrition Risk] Error calculating team risk:', error);
    throw error;
  }
}

/**
 * Get high-risk individuals across org (for HR dashboard)
 */
export async function getHighRiskIndividuals(orgId, minRiskScore = 60) {
  try {
    const highRisk = await AttritionRisk.find({
      orgId,
      riskScore: { $gte: minRiskScore },
      outcome: 'pending'
    })
    .populate('userId', 'name email')
    .populate('teamId', 'name')
    .sort({ riskScore: -1 });
    
    return highRisk;
  } catch (error) {
    console.error('[Attrition Risk] Error fetching high risk individuals:', error);
    throw error;
  }
}

/**
 * Get aggregated team risk summary (for managers - privacy-preserving)
 */
export async function getTeamRiskSummary(teamId) {
  try {
    const risks = await AttritionRisk.find({
      teamId,
      outcome: 'pending'
    });
    
    const summary = {
      totalMembers: risks.length,
      criticalRisk: risks.filter(r => r.riskLevel === 'critical').length,
      highRisk: risks.filter(r => r.riskLevel === 'high').length,
      mediumRisk: risks.filter(r => r.riskLevel === 'medium').length,
      lowRisk: risks.filter(r => r.riskLevel === 'low').length,
      avgRiskScore: risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length || 0,
      message: null
    };
    
    if (summary.criticalRisk > 0) {
      summary.message = `${summary.criticalRisk} team member(s) at critical flight risk - contact HR immediately`;
    } else if (summary.highRisk > 0) {
      summary.message = `${summary.highRisk} team member(s) showing concerning disengagement patterns`;
    } else {
      summary.message = 'No high-risk flight patterns detected';
    }
    
    return summary;
  } catch (error) {
    console.error('[Attrition Risk] Error calculating team summary:', error);
    throw error;
  }
}

export default {
  calculateAttritionRisk,
  calculateTeamAttritionRisk,
  getHighRiskIndividuals,
  getTeamRiskSummary
};
