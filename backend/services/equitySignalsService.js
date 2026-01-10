/**
 * Equity Signals Service
 * Detects inequitable treatment from behavioral patterns (no surveys)
 * Tracks: response time equity, participation equity, workload equity, voice equity
 */

import EquitySignal from '../models/equitySignal.js';
import Team from '../models/team.js';
import User from '../models/user.js';

/**
 * Analyze equity for a team
 */
export async function analyzeTeamEquity(teamId) {
  try {
    const team = await Team.findById(teamId).populate('members');
    
    if (!team || !team.members) {
      throw new Error('Team not found or has no members');
    }
    
    // Get behavioral data
    const behavioralData = await getBehavioralData(teamId);
    
    // Analyze response time equity
    const responseTimeEquity = analyzeResponseTimeEquity(behavioralData);
    
    // Analyze participation equity
    const participationEquity = analyzeParticipationEquity(behavioralData);
    
    // Analyze workload equity
    const workloadEquity = analyzeWorkloadEquity(behavioralData);
    
    // Analyze voice equity
    const voiceEquity = analyzeVoiceEquity(behavioralData);
    
    // Calculate overall equity score
    const equityScore = calculateEquityScore(
      responseTimeEquity,
      participationEquity,
      workloadEquity,
      voiceEquity
    );
    const equityLevel = getEquityLevel(equityScore);
    
    // Generate recommendations
    const recommendations = generateRecommendations(
      responseTimeEquity,
      participationEquity,
      workloadEquity,
      voiceEquity
    );
    
    // Save or update
    let equity = await EquitySignal.findOne({ teamId });
    
    if (equity) {
      Object.assign(equity, {
        equityScore,
        equityLevel,
        responseTimeEquity,
        participationEquity,
        workloadEquity,
        voiceEquity,
        recommendations,
        lastAnalyzed: new Date()
      });
    } else {
      equity = new EquitySignal({
        teamId,
        orgId: team.orgId || team.organizationId,
        equityScore,
        equityLevel,
        responseTimeEquity,
        participationEquity,
        workloadEquity,
        voiceEquity,
        recommendations
      });
    }
    
    await equity.save();
    return equity;
  } catch (error) {
    console.error('[Equity Signals] Error analyzing:', error);
    throw error;
  }
}

/**
 * Get behavioral data from Slack and Calendar
 */
async function getBehavioralData(teamId) {
  // Placeholder - query Slack + Google Calendar APIs
  
  return {
    responseTimesPerUser: {
      'user1': 2.5, // hours
      'user2': 8.2,
      'user3': 3.1,
      'user4': 12.5,
      'user5': 2.8
    },
    meetingInvitesPerUser: {
      'user1': 45,
      'user2': 12,
      'user3': 42,
      'user4': 8,
      'user5': 38
    },
    meetingHoursPerUser: {
      'user1': 18,
      'user2': 12,
      'user3': 15,
      'user4': 35,
      'user5': 16
    },
    messageCountPerUser: {
      'user1': 120,
      'user2': 25,
      'user3': 110,
      'user4': 18,
      'user5': 95
    }
  };
}

/**
 * Analyze response time equity
 */
function analyzeResponseTimeEquity(data) {
  const times = Object.values(data.responseTimesPerUser);
  const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
  const stdDev = Math.sqrt(variance);
  
  const affectedUsers = [];
  
  for (const [userId, time] of Object.entries(data.responseTimesPerUser)) {
    const deviation = time - avg;
    
    // If someone waits >2x standard deviations longer
    if (deviation > 2 * stdDev) {
      affectedUsers.push({
        userId,
        avgResponseTime: time,
        deviationFromMean: deviation
      });
    }
  }
  
  return {
    averageResponseTime: avg,
    standardDeviation: stdDev,
    inequityDetected: affectedUsers.length > 0,
    affectedUsers
  };
}

/**
 * Analyze participation equity
 */
function analyzeParticipationEquity(data) {
  const invites = Object.values(data.meetingInvitesPerUser);
  const avg = invites.reduce((sum, i) => sum + i, 0) / invites.length;
  const variance = invites.reduce((sum, i) => sum + Math.pow(i - avg, 2), 0) / invites.length;
  const stdDev = Math.sqrt(variance);
  
  const underincludedUsers = [];
  
  for (const [userId, count] of Object.entries(data.meetingInvitesPerUser)) {
    const percentBelowAverage = ((avg - count) / avg) * 100;
    
    // If someone gets <50% of average invites
    if (percentBelowAverage > 50) {
      underincludedUsers.push({
        userId,
        meetingInvites: count,
        percentBelowAverage
      });
    }
  }
  
  return {
    averageMeetingInvites: avg,
    standardDeviation: stdDev,
    inequityDetected: underincludedUsers.length > 0,
    underincludedUsers
  };
}

/**
 * Analyze workload equity
 */
function analyzeWorkloadEquity(data) {
  const hours = Object.values(data.meetingHoursPerUser);
  const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
  const stdDev = Math.sqrt(variance);
  
  const overloadedUsers = [];
  
  for (const [userId, hoursCount] of Object.entries(data.meetingHoursPerUser)) {
    const percentAboveAverage = ((hoursCount - avg) / avg) * 100;
    
    // If someone has >75% more meetings than average
    if (percentAboveAverage > 75) {
      overloadedUsers.push({
        userId,
        meetingHours: hoursCount,
        percentAboveAverage
      });
    }
  }
  
  return {
    averageMeetingHours: avg,
    standardDeviation: stdDev,
    inequityDetected: overloadedUsers.length > 0,
    overloadedUsers
  };
}

/**
 * Analyze voice equity
 */
function analyzeVoiceEquity(data) {
  const messages = Object.values(data.messageCountPerUser);
  const avg = messages.reduce((sum, m) => sum + m, 0) / messages.length;
  const variance = messages.reduce((sum, m) => sum + Math.pow(m - avg, 2), 0) / messages.length;
  const stdDev = Math.sqrt(variance);
  
  const silencedUsers = [];
  
  for (const [userId, count] of Object.entries(data.messageCountPerUser)) {
    const percentBelowAverage = ((avg - count) / avg) * 100;
    
    // If someone sends <70% fewer messages than average
    if (percentBelowAverage > 70) {
      silencedUsers.push({
        userId,
        messageCount: count,
        percentBelowAverage
      });
    }
  }
  
  return {
    averageMessageCount: avg,
    standardDeviation: stdDev,
    inequityDetected: silencedUsers.length > 0,
    silencedUsers
  };
}

/**
 * Calculate overall equity score
 */
function calculateEquityScore(responseTime, participation, workload, voice) {
  let score = 100;
  
  // Deduct for response time inequity
  if (responseTime.inequityDetected) {
    score -= responseTime.affectedUsers.length * 15;
  }
  
  // Deduct for participation inequity
  if (participation.inequityDetected) {
    score -= participation.underincludedUsers.length * 20;
  }
  
  // Deduct for workload inequity
  if (workload.inequityDetected) {
    score -= workload.overloadedUsers.length * 15;
  }
  
  // Deduct for voice inequity
  if (voice.inequityDetected) {
    score -= voice.silencedUsers.length * 20;
  }
  
  return Math.max(score, 0);
}

/**
 * Get equity level
 */
function getEquityLevel(score) {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'needs-attention';
  return 'critical';
}

/**
 * Generate recommendations
 */
function generateRecommendations(responseTime, participation, workload, voice) {
  const recs = [];
  
  if (responseTime.inequityDetected) {
    recs.push(`${responseTime.affectedUsers.length} team member(s) wait significantly longer for responses - establish team response SLAs`);
  }
  
  if (participation.inequityDetected) {
    recs.push(`${participation.underincludedUsers.length} team member(s) excluded from meetings - review invitation practices`);
  }
  
  if (workload.inequityDetected) {
    recs.push(`${workload.overloadedUsers.length} team member(s) have excessive meeting load - redistribute or decline meetings`);
  }
  
  if (voice.inequityDetected) {
    recs.push(`${voice.silencedUsers.length} team member(s) rarely participate in Slack - check for psychological safety issues`);
  }
  
  return recs;
}

/**
 * Get org-wide equity issues
 */
export async function getOrgEquityIssues(orgId, maxScore = 65) {
  try {
    const issues = await EquitySignal.find({
      orgId,
      equityScore: { $lte: maxScore }
    })
    .populate('teamId', 'name')
    .sort({ equityScore: 1 });
    
    return issues;
  } catch (error) {
    console.error('[Equity Signals] Error fetching org issues:', error);
    throw error;
  }
}

export default {
  analyzeTeamEquity,
  getOrgEquityIssues
};
