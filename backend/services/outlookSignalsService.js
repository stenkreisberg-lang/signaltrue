/**
 * Outlook Signals Service
 * Analyzes behavioral patterns from Outlook/Microsoft 365 (email, Teams status, calls)
 */

import OutlookSignal from '../models/outlookSignal.js';
import Team from '../models/team.js';
import User from '../models/user.js';

/**
 * Analyze Outlook signals for a user
 */
export async function analyzeUserOutlookSignals(userId, teamId, periodDays = 30) {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    // Get data from Microsoft Graph API
    const outlookData = await getOutlookData(userId, startDate, endDate);
    const teamsData = await getTeamsData(userId, startDate, endDate);
    
    // Calculate metrics
    const emailMetrics = calculateEmailMetrics(outlookData);
    const teamsMetrics = calculateTeamsMetrics(teamsData);
    const teamsCallMetrics = calculateTeamsCallMetrics(teamsData);
    
    // Detect behavioral signals
    const behavioralSignals = detectBehavioralSignals(emailMetrics, teamsMetrics, teamsCallMetrics);
    
    // Calculate health score
    const healthScore = calculateHealthScore(behavioralSignals, emailMetrics, teamsMetrics);
    const healthLevel = getHealthLevel(healthScore);
    
    // Generate recommendations
    const recommendations = generateRecommendations(behavioralSignals);
    
    // Save or update
    const user = await User.findById(userId);
    const team = await Team.findById(teamId);
    
    let signal = await OutlookSignal.findOne({
      userId,
      'period.start': startDate,
      'period.end': endDate
    });
    
    if (signal) {
      Object.assign(signal, {
        emailMetrics,
        teamsMetrics,
        teamsCallMetrics,
        behavioralSignals,
        healthScore,
        healthLevel,
        recommendations,
        lastAnalyzed: new Date()
      });
    } else {
      signal = new OutlookSignal({
        userId,
        teamId,
        orgId: team.orgId || team.organizationId,
        emailMetrics,
        teamsMetrics,
        teamsCallMetrics,
        behavioralSignals,
        healthScore,
        healthLevel,
        recommendations,
        period: {
          start: startDate,
          end: endDate
        }
      });
    }
    
    await signal.save();
    return signal;
  } catch (error) {
    console.error('[Outlook Signals] Error analyzing:', error);
    throw error;
  }
}

/**
 * Get Outlook email data from Microsoft Graph API
 */
async function getOutlookData(userId, startDate, endDate) {
  // Placeholder - query Microsoft Graph API for:
  // - Sent emails
  // - Received emails
  // - Timestamps (to detect after-hours)
  // - Response times
  // - Unread count
  
  return {
    sent: 245,
    received: 680,
    afterHoursSent: 45,
    weekendSent: 12,
    responses: [
      { threadId: 'thread1', responseTimeHours: 2.5 },
      { threadId: 'thread2', responseTimeHours: 0.5 },
      // etc...
    ],
    threads: [
      { id: 'thread1', emailCount: 5 },
      { id: 'thread2', emailCount: 12 },
      // etc...
    ],
    unreadCount: 248
  };
}

/**
 * Get Teams data from Microsoft Graph API
 */
async function getTeamsData(userId, startDate, endDate) {
  // Placeholder - query Microsoft Graph API for:
  // - Presence status changes
  // - Call records
  
  return {
    presenceChanges: [
      { status: 'Available', timestamp: new Date('2026-01-10T09:00:00Z') },
      { status: 'Busy', timestamp: new Date('2026-01-10T10:00:00Z') },
      { status: 'DoNotDisturb', timestamp: new Date('2026-01-10T11:00:00Z') },
      { status: 'Available', timestamp: new Date('2026-01-10T12:00:00Z') },
      // etc... many changes = stress
    ],
    calls: [
      { duration: 30, type: 'video', timestamp: new Date('2026-01-10T10:00:00Z') },
      { duration: 15, type: 'audio', timestamp: new Date('2026-01-10T14:30:00Z') },
      { duration: 45, type: 'video', timestamp: new Date('2026-01-10T19:00:00Z') }, // after hours
      // etc...
    ]
  };
}

/**
 * Calculate email metrics
 */
function calculateEmailMetrics(data) {
  const avgResponseTime = data.responses.length > 0
    ? data.responses.reduce((sum, r) => sum + r.responseTimeHours, 0) / data.responses.length
    : 0;
  
  const avgThreadLength = data.threads.length > 0
    ? data.threads.reduce((sum, t) => sum + t.emailCount, 0) / data.threads.length
    : 0;
  
  return {
    sentCount: data.sent,
    receivedCount: data.received,
    afterHoursEmailCount: data.afterHoursSent,
    weekendEmailCount: data.weekendSent,
    averageResponseTimeHours: avgResponseTime,
    threadLength: avgThreadLength,
    unreadBacklog: data.unreadCount
  };
}

/**
 * Calculate Teams metrics
 */
function calculateTeamsMetrics(data) {
  // Calculate hours in each status
  let availableHours = 0;
  let busyHours = 0;
  let dndHours = 0;
  
  for (let i = 0; i < data.presenceChanges.length - 1; i++) {
    const current = data.presenceChanges[i];
    const next = data.presenceChanges[i + 1];
    const duration = (next.timestamp - current.timestamp) / (1000 * 60 * 60); // hours
    
    if (current.status === 'Available') availableHours += duration;
    else if (current.status === 'Busy') busyHours += duration;
    else if (current.status === 'DoNotDisturb') dndHours += duration;
  }
  
  const totalDays = 30;
  const changesPerDay = data.presenceChanges.length / totalDays;
  
  return {
    statusChanges: data.presenceChanges,
    availableHoursPerDay: availableHours / totalDays,
    busyHoursPerDay: busyHours / totalDays,
    dndHoursPerDay: dndHours / totalDays,
    statusFluctuationRate: changesPerDay
  };
}

/**
 * Calculate Teams call metrics
 */
function calculateTeamsCallMetrics(data) {
  const totalMinutes = data.calls.reduce((sum, c) => sum + c.duration, 0);
  const videoCount = data.calls.filter(c => c.type === 'video').length;
  const audioCount = data.calls.filter(c => c.type === 'audio').length;
  
  // Detect after-hours calls (before 8 AM or after 6 PM)
  const afterHoursCount = data.calls.filter(c => {
    const hour = c.timestamp.getHours();
    return hour < 8 || hour >= 18;
  }).length;
  
  return {
    callCount: data.calls.length,
    totalCallMinutes: totalMinutes,
    averageCallDuration: data.calls.length > 0 ? totalMinutes / data.calls.length : 0,
    videoCallCount: videoCount,
    audioOnlyCount: audioCount,
    afterHoursCallCount: afterHoursCount
  };
}

/**
 * Detect behavioral signals
 */
function detectBehavioralSignals(email, teams, calls) {
  return {
    emailOverload: {
      detected: email.unreadBacklog > 100,
      unreadCount: email.unreadBacklog
    },
    afterHoursWork: {
      detected: (email.afterHoursEmailCount + calls.afterHoursCallCount) > 15,
      percentOfTotal: ((email.afterHoursEmailCount + calls.afterHoursCallCount) / 
                      (email.sentCount + calls.callCount)) * 100
    },
    responsivenessDrop: {
      detected: email.averageResponseTimeHours > 24,
      baselineHours: 4, // typical baseline
      currentHours: email.averageResponseTimeHours
    },
    statusThrashing: {
      detected: teams.statusFluctuationRate > 20,
      changesPerDay: teams.statusFluctuationRate
    }
  };
}

/**
 * Calculate health score
 */
function calculateHealthScore(signals, email, teams) {
  let score = 100;
  
  if (signals.emailOverload.detected) score -= 20;
  if (signals.afterHoursWork.detected) score -= 25;
  if (signals.responsivenessDrop.detected) score -= 15;
  if (signals.statusThrashing.detected) score -= 20;
  
  // Additional deductions
  if (email.unreadBacklog > 500) score -= 10;
  if (teams.dndHoursPerDay > 4) score -= 10; // too much DND = overwhelmed
  
  return Math.max(score, 0);
}

/**
 * Get health level
 */
function getHealthLevel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

/**
 * Generate recommendations
 */
function generateRecommendations(signals) {
  const recs = [];
  
  if (signals.emailOverload.detected) {
    recs.push(`${signals.emailOverload.unreadCount} unread emails - encourage inbox zero practices or email batching`);
  }
  
  if (signals.afterHoursWork.detected) {
    recs.push(`${signals.afterHoursWork.percentOfTotal.toFixed(0)}% of work happening after hours - risk of burnout`);
  }
  
  if (signals.responsivenessDrop.detected) {
    recs.push('Email response time increasing - may indicate workload overwhelm');
  }
  
  if (signals.statusThrashing.detected) {
    recs.push('Frequent Teams status changes indicate constant interruptions - block focus time');
  }
  
  return recs;
}

/**
 * Analyze team Outlook signals
 */
export async function analyzeTeamOutlookSignals(teamId, periodDays = 30) {
  try {
    const team = await Team.findById(teamId).populate('members');
    
    if (!team || !team.members) {
      throw new Error('Team not found or has no members');
    }
    
    const results = [];
    
    for (const member of team.members) {
      const signal = await analyzeUserOutlookSignals(member._id, teamId, periodDays);
      results.push(signal);
    }
    
    return results.sort((a, b) => a.healthScore - b.healthScore);
  } catch (error) {
    console.error('[Outlook Signals] Error analyzing team:', error);
    throw error;
  }
}

/**
 * Get users with critical Outlook signals
 */
export async function getCriticalOutlookSignals(orgId, maxScore = 50) {
  try {
    const signals = await OutlookSignal.find({
      orgId,
      healthScore: { $lte: maxScore }
    })
    .populate('userId', 'name email')
    .populate('teamId', 'name')
    .sort({ healthScore: 1 });
    
    return signals;
  } catch (error) {
    console.error('[Outlook Signals] Error fetching critical signals:', error);
    throw error;
  }
}

export default {
  analyzeUserOutlookSignals,
  analyzeTeamOutlookSignals,
  getCriticalOutlookSignals
};
