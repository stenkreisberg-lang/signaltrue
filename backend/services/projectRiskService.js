/**
 * Project Risk Service
 * Infers project health from meeting titles and Slack patterns
 * No Jira/Linear integration - purely behavioral from Google Calendar + Slack
 */

import ProjectRisk from '../models/projectRisk.js';
import Team from '../models/team.js';

/**
 * Detect and analyze projects for a team
 */
export async function analyzeTeamProjects(teamId) {
  try {
    // Step 1: Discover projects from meeting titles and Slack channels
    const projects = await discoverProjects(teamId);
    
    if (projects.length === 0) {
      return [];
    }
    
    const results = [];
    
    // Step 2: Analyze risk for each project
    for (const project of projects) {
      const risk = await analyzeProjectRisk(teamId, project);
      results.push(risk);
    }
    
    return results;
  } catch (error) {
    console.error('[Project Risk] Error analyzing team projects:', error);
    throw error;
  }
}

/**
 * Discover projects from meeting titles and Slack channels
 */
async function discoverProjects(teamId) {
  // Placeholder - in production, query Google Calendar API for recurring meetings
  // and Slack API for project channels
  
  // Mock data showing how it would work:
  return [
    {
      name: 'Q1 Product Launch',
      source: 'calendar_meeting_title', // from "Q1 Launch - Weekly Planning"
      meetingId: 'meeting_123'
    },
    {
      name: 'Mobile App Redesign',
      source: 'slack_channel', // from #mobile-redesign channel
      channelId: 'C123456'
    }
  ];
}

/**
 * Analyze risk for a specific project
 */
async function analyzeProjectRisk(teamId, project) {
  // Get calendar signals
  const calendarSignals = await getCalendarSignals(teamId, project);
  
  // Get Slack signals
  const slackSignals = await getSlackSignals(teamId, project);
  
  // Calculate risk score
  const riskScore = calculateProjectRiskScore(calendarSignals, slackSignals);
  
  // Determine risk level
  const riskLevel = getRiskLevel(riskScore);
  
  // Generate prediction
  const prediction = generatePrediction(riskScore, calendarSignals, slackSignals);
  
  // Determine confidence
  const confidence = determineConfidence(calendarSignals, slackSignals);
  
  // Generate recommendations
  const recommendedActions = generateRecommendations(calendarSignals, slackSignals);
  
  // Save or update
  const team = await Team.findById(teamId);
  let risk = await ProjectRisk.findOne({ teamId, projectName: project.name });
  
  if (risk) {
    Object.assign(risk, {
      riskScore,
      riskLevel,
      calendarSignals,
      slackSignals,
      prediction,
      confidence,
      recommendedActions,
      lastAnalyzed: new Date()
    });
  } else {
    risk = new ProjectRisk({
      teamId,
      orgId: team.orgId || team.organizationId,
      projectName: project.name,
      source: project.source,
      riskScore,
      riskLevel,
      calendarSignals,
      slackSignals,
      prediction,
      confidence,
      recommendedActions
    });
  }
  
  await risk.save();
  return risk;
}

/**
 * Get calendar-based signals
 */
async function getCalendarSignals(teamId, project) {
  // Placeholder - query Google Calendar API
  return {
    emergencyMeetingsSpike: {
      baseline: 2,
      current: 8,
      detected: true
    },
    meetingDurationIncrease: {
      baselineMinutes: 30,
      currentMinutes: 90,
      percentChange: 200,
      detected: true
    },
    externalMeetingsIncrease: {
      count: 12,
      detected: true
    }
  };
}

/**
 * Get Slack-based signals
 */
async function getSlackSignals(teamId, project) {
  // Placeholder - query Slack API for project channel
  return {
    escalationKeywords: {
      count: 45,
      keywords: ['urgent', 'blocker', 'help needed', 'critical', 'deadline'],
      detected: true
    },
    questionResponseTime: {
      baselineHours: 2,
      currentHours: 8,
      detected: true
    },
    afterHoursSpike: {
      percentChange: 85,
      detected: true
    },
    deadlineMentions: {
      count: 18,
      detected: true
    }
  };
}

/**
 * Calculate project risk score
 */
function calculateProjectRiskScore(calendar, slack) {
  let score = 0;
  
  // Calendar signals (40% weight)
  if (calendar.emergencyMeetingsSpike.detected) score += 25;
  if (calendar.meetingDurationIncrease.detected) score += 20;
  if (calendar.externalMeetingsIncrease.detected) score += 15;
  
  // Slack signals (60% weight)
  if (slack.escalationKeywords.detected) score += 25;
  if (slack.questionResponseTime.detected) score += 10;
  if (slack.afterHoursSpike.detected) score += 20;
  if (slack.deadlineMentions.detected) score += 10;
  
  return Math.min(score, 100);
}

/**
 * Get risk level from score
 */
function getRiskLevel(score) {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

/**
 * Generate prediction
 */
function generatePrediction(score, calendar, slack) {
  if (score >= 75) {
    return 'Project at critical risk of missing deadline - immediate intervention needed';
  } else if (score >= 55) {
    return 'Project at high risk - team exhibiting stress patterns';
  } else if (score >= 35) {
    return 'Project showing warning signs - monitor closely';
  }
  return 'Project on track';
}

/**
 * Determine confidence
 */
function determineConfidence(calendar, slack) {
  let signals = 0;
  
  if (calendar.emergencyMeetingsSpike.detected) signals++;
  if (calendar.meetingDurationIncrease.detected) signals++;
  if (calendar.externalMeetingsIncrease.detected) signals++;
  if (slack.escalationKeywords.detected) signals++;
  if (slack.questionResponseTime.detected) signals++;
  if (slack.afterHoursSpike.detected) signals++;
  if (slack.deadlineMentions.detected) signals++;
  
  if (signals >= 5) return 'high';
  if (signals >= 3) return 'medium';
  return 'low';
}

/**
 * Generate recommendations
 */
function generateRecommendations(calendar, slack) {
  const recs = [];
  
  if (calendar.emergencyMeetingsSpike.detected) {
    recs.push('Reduce emergency meetings - establish regular sync cadence');
  }
  
  if (calendar.meetingDurationIncrease.detected) {
    recs.push('Meetings getting longer indicates indecision - clarify decision-making authority');
  }
  
  if (slack.escalationKeywords.detected) {
    recs.push('High escalation language - identify and remove blockers');
  }
  
  if (slack.questionResponseTime.detected) {
    recs.push('Team members stuck waiting for answers - improve async communication');
  }
  
  if (slack.afterHoursSpike.detected) {
    recs.push('Team working excessive after-hours - review scope or extend timeline');
  }
  
  return recs;
}

/**
 * Get all projects at risk for org
 */
export async function getHighRiskProjects(orgId, minRiskScore = 55) {
  try {
    const projects = await ProjectRisk.find({
      orgId,
      riskScore: { $gte: minRiskScore }
    })
    .populate('teamId', 'name')
    .sort({ riskScore: -1 });
    
    return projects;
  } catch (error) {
    console.error('[Project Risk] Error fetching high-risk projects:', error);
    throw error;
  }
}

export default {
  analyzeTeamProjects,
  analyzeProjectRisk,
  getHighRiskProjects
};
