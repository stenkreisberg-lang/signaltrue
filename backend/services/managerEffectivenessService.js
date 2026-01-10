/**
 * Manager Effectiveness Service
 * Measures manager quality through behavioral outcomes
 * No surveys - purely data-driven from Calendar + Slack patterns
 */

import ManagerEffectiveness from '../models/managerEffectiveness.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import AttritionRisk from '../models/attritionRisk.js';
import MetricsDaily from '../models/metricsDaily.js';

/**
 * Calculate manager effectiveness
 */
export async function calculateManagerEffectiveness(managerId, teamId) {
  try {
    const team = await Team.findById(teamId).populate('members');
    if (!team) return null;
    
    // Calculate calendar metrics
    const calendarMetrics = await calculateCalendarMetrics(managerId, team);
    
    // Calculate Slack metrics
    const slackMetrics = await calculateSlackMetrics(managerId, team);
    
    // Calculate team outcome metrics
    const teamOutcomes = await calculateTeamOutcomes(teamId);
    
    // Get org benchmarks
    const benchmarks = await getOrgBenchmarks(team.orgId || team.organizationId);
    
    // Calculate weighted effectiveness score
    const effectivenessScore = calculateEffectivenessScore(
      calendarMetrics,
      slackMetrics,
      teamOutcomes,
      benchmarks
    );
    
    // Identify strengths and improvement areas
    const { strengths, improvementAreas } = analyzePerformance(
      calendarMetrics,
      slackMetrics,
      teamOutcomes,
      benchmarks
    );
    
    // Generate verdict and coaching recommendations
    const verdict = generateVerdict(effectivenessScore, improvementAreas);
    const { coachingRecommended, coachingTopics } = generateCoachingPlan(improvementAreas);
    
    // Save or update record
    let record = await ManagerEffectiveness.findOne({ managerId, teamId })
      .sort({ createdAt: -1 });
    
    if (record && isSameMonth(record.lastReviewDate, new Date())) {
      // Update existing record (same month)
      Object.assign(record, {
        effectivenessScore,
        calendarMetrics,
        slackMetrics,
        teamOutcomes,
        benchmarks,
        strengths,
        improvementAreas,
        verdict,
        coachingRecommended,
        coachingTopics,
        lastReviewDate: new Date()
      });
    } else {
      // Create new record
      record = new ManagerEffectiveness({
        managerId,
        teamId,
        orgId: team.orgId || team.organizationId,
        effectivenessScore,
        calendarMetrics,
        slackMetrics,
        teamOutcomes,
        benchmarks,
        strengths,
        improvementAreas,
        verdict,
        coachingRecommended,
        coachingTopics
      });
    }
    
    record.calculateEffectivenessLevel();
    await record.save();
    
    return record;
  } catch (error) {
    console.error('[Manager Effectiveness] Error calculating effectiveness:', error);
    throw error;
  }
}

/**
 * Calculate calendar-based metrics
 */
async function calculateCalendarMetrics(managerId, team) {
  // Placeholder - in production, query Google Calendar/Outlook API
  // For now, return mock structure
  
  const teamSize = team.members?.length || 5;
  const expectedOneOnOnes = teamSize * 4; // weekly * 4 weeks
  
  return {
    oneOnOneConsistency: 0.75, // 75% consistency
    oneOnOneFrequency: 'weekly',
    expectedOneOnOnes,
    actualOneOnOnes: Math.floor(expectedOneOnOnes * 0.75),
    teamMeetingLoad: 18, // hours per week
    lastMinuteCancellations: 3
  };
}

/**
 * Calculate Slack-based metrics
 */
async function calculateSlackMetrics(managerId, team) {
  // Placeholder - in production, query Slack API for manager's messages
  
  return {
    responseToTeamHours: 3.5, // avg response time to team
    messageToTeamRatio: 0.35, // 35% of messages to their team
    recognitionRate: 1.2, // kudos per week
    escalationBypass: 5 // escalations in last 30 days
  };
}

/**
 * Calculate team outcome metrics
 */
async function calculateTeamOutcomes(teamId) {
  try {
    const team = await Team.findById(teamId);
    
    // Get team attrition risk
    const teamAttritionRisks = await AttritionRisk.find({
      teamId,
      outcome: 'pending'
    });
    
    const avgAttritionRisk = teamAttritionRisks.length > 0
      ? teamAttritionRisks.reduce((sum, r) => sum + r.riskScore, 0) / teamAttritionRisks.length
      : 0;
    
    // Get team health trend (from BDI or drift score)
    const teamHealthTrend = team.trend || 0;
    
    return {
      teamHealthTrend,
      teamRetention: 85, // placeholder - calculate from actual departures
      teamAttritionRisk: avgAttritionRisk,
      teamEngagement: 70 // placeholder - derive from participation metrics
    };
  } catch (error) {
    console.error('[Manager Effectiveness] Error calculating team outcomes:', error);
    return {
      teamHealthTrend: 0,
      teamRetention: 85,
      teamAttritionRisk: 0,
      teamEngagement: 70
    };
  }
}

/**
 * Get org-level benchmarks
 */
async function getOrgBenchmarks(orgId) {
  try {
    // Get all managers in org
    const allManagers = await ManagerEffectiveness.find({ orgId });
    
    if (allManagers.length === 0) {
      return {
        orgAvgEffectiveness: 65,
        orgAvgTeamHealth: 0,
        orgAvgRetention: 85
      };
    }
    
    const avgEffectiveness = allManagers.reduce((sum, m) => sum + m.effectivenessScore, 0) / allManagers.length;
    const avgTeamHealth = allManagers.reduce((sum, m) => sum + (m.teamOutcomes?.teamHealthTrend || 0), 0) / allManagers.length;
    const avgRetention = allManagers.reduce((sum, m) => sum + (m.teamOutcomes?.teamRetention || 85), 0) / allManagers.length;
    
    return {
      orgAvgEffectiveness: avgEffectiveness,
      orgAvgTeamHealth: avgTeamHealth,
      orgAvgRetention: avgRetention
    };
  } catch (error) {
    return {
      orgAvgEffectiveness: 65,
      orgAvgTeamHealth: 0,
      orgAvgRetention: 85
    };
  }
}

/**
 * Calculate weighted effectiveness score
 */
function calculateEffectivenessScore(calendar, slack, outcomes, benchmarks) {
  let score = 0;
  
  // Calendar metrics (25% weight)
  score += calendar.oneOnOneConsistency * 15; // 15 points max
  if (calendar.lastMinuteCancellations <= 2) score += 5;
  if (calendar.teamMeetingLoad <= 16) score += 5; // healthy meeting load
  
  // Slack metrics (25% weight)
  if (slack.responseToTeamHours <= 4) score += 8;
  if (slack.messageToTeamRatio >= 0.3) score += 7; // engaged with team
  if (slack.recognitionRate >= 1) score += 5;
  if (slack.escalationBypass <= 3) score += 5;
  
  // Team outcomes (50% weight - most important)
  if (outcomes.teamHealthTrend >= 0) score += 15; // team not drifting
  if (outcomes.teamRetention >= benchmarks.orgAvgRetention) score += 15;
  if (outcomes.teamAttritionRisk < 40) score += 10; // low flight risk
  if (outcomes.teamEngagement >= 65) score += 10;
  
  return Math.min(Math.round(score), 100);
}

/**
 * Analyze performance to identify strengths and gaps
 */
function analyzePerformance(calendar, slack, outcomes, benchmarks) {
  const strengths = [];
  const improvementAreas = [];
  
  // Analyze 1:1 consistency
  if (calendar.oneOnOneConsistency >= 0.8) {
    strengths.push({
      area: '1:1 Consistency',
      score: calendar.oneOnOneConsistency * 100,
      description: 'Maintains regular 1:1s with team members'
    });
  } else if (calendar.oneOnOneConsistency < 0.6) {
    improvementAreas.push({
      area: '1:1 Consistency',
      score: calendar.oneOnOneConsistency * 100,
      impact: 'high',
      recommendation: 'Schedule recurring weekly 1:1s with each team member'
    });
  }
  
  // Analyze responsiveness
  if (slack.responseToTeamHours <= 3) {
    strengths.push({
      area: 'Responsiveness',
      score: 100 - (slack.responseToTeamHours * 10),
      description: 'Responds quickly to team members'
    });
  } else if (slack.responseToTeamHours >= 6) {
    improvementAreas.push({
      area: 'Responsiveness',
      score: 100 - (slack.responseToTeamHours * 10),
      impact: 'medium',
      recommendation: 'Set goal to respond to team within 4 hours during work hours'
    });
  }
  
  // Analyze team health
  if (outcomes.teamHealthTrend >= 5) {
    strengths.push({
      area: 'Team Health',
      score: 90,
      description: 'Team health is improving under your leadership'
    });
  } else if (outcomes.teamHealthTrend <= -10) {
    improvementAreas.push({
      area: 'Team Health',
      score: 40,
      impact: 'critical',
      recommendation: 'Team showing negative drift - review workload and meeting load'
    });
  }
  
  // Analyze retention
  if (outcomes.teamRetention >= benchmarks.orgAvgRetention + 5) {
    strengths.push({
      area: 'Team Retention',
      score: outcomes.teamRetention,
      description: 'Above-average team retention'
    });
  } else if (outcomes.teamRetention < benchmarks.orgAvgRetention - 5) {
    improvementAreas.push({
      area: 'Team Retention',
      score: outcomes.teamRetention,
      impact: 'high',
      recommendation: 'Conduct retention conversations with high-risk team members'
    });
  }
  
  // Analyze meeting load
  if (calendar.teamMeetingLoad > 20) {
    improvementAreas.push({
      area: 'Meeting Overload',
      score: 100 - calendar.teamMeetingLoad * 2,
      impact: 'medium',
      recommendation: 'Audit recurring meetings - team has excessive meeting load'
    });
  }
  
  return { strengths, improvementAreas };
}

/**
 * Generate overall verdict
 */
function generateVerdict(score, improvementAreas) {
  if (score >= 80) {
    return 'Excellent manager - team is thriving under your leadership';
  } else if (score >= 65) {
    return 'Good manager - minor improvements would enhance team performance';
  } else if (score >= 45) {
    const topIssue = improvementAreas[0]?.area || 'team outcomes';
    return `Needs improvement in ${topIssue} - coaching recommended`;
  } else {
    return 'Critical issues detected - immediate leadership coaching required';
  }
}

/**
 * Generate coaching recommendations
 */
function generateCoachingPlan(improvementAreas) {
  const coachingRecommended = improvementAreas.some(area => area.impact === 'critical' || area.impact === 'high');
  
  const coachingTopics = improvementAreas
    .filter(area => area.impact === 'critical' || area.impact === 'high')
    .map(area => area.area);
  
  return { coachingRecommended, coachingTopics };
}

/**
 * Check if two dates are in same month
 */
function isSameMonth(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth();
}

/**
 * Get all managers in org with effectiveness scores
 */
export async function getOrgManagerEffectiveness(orgId) {
  try {
    const managers = await ManagerEffectiveness.find({ orgId })
      .populate('managerId', 'name email')
      .populate('teamId', 'name')
      .sort({ effectivenessScore: -1 });
    
    return managers;
  } catch (error) {
    console.error('[Manager Effectiveness] Error fetching org managers:', error);
    throw error;
  }
}

/**
 * Get managers needing coaching
 */
export async function getManagersNeedingCoaching(orgId) {
  try {
    const managers = await ManagerEffectiveness.find({
      orgId,
      coachingRecommended: true
    })
    .populate('managerId', 'name email')
    .populate('teamId', 'name')
    .sort({ effectivenessScore: 1 }); // lowest scores first
    
    return managers;
  } catch (error) {
    console.error('[Manager Effectiveness] Error fetching managers needing coaching:', error);
    throw error;
  }
}

export default {
  calculateManagerEffectiveness,
  getOrgManagerEffectiveness,
  getManagersNeedingCoaching
};
