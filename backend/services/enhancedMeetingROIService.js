/**
 * Enhanced Meeting ROI Service
 * Measures meeting effectiveness by analyzing post-meeting Slack behavior
 */

import MeetingROI from '../models/meetingROI.js';
import Team from '../models/team.js';

/**
 * Analyze ROI for a specific meeting
 */
export async function analyzeMeetingROI(meetingId, teamId) {
  try {
    // Get meeting details from Google Calendar
    const meetingDetails = await getMeetingDetails(meetingId);
    
    // Get Slack activity before and after meeting
    const slackData = await getSlackActivityAroundMeeting(
      teamId,
      meetingDetails.startTime,
      meetingDetails.endTime,
      meetingDetails.attendees
    );
    
    // Analyze post-meeting signals
    const postMeetingSignals = analyzePostMeetingSignals(slackData);
    
    // Analyze negative signals
    const negativeSignals = analyzeNegativeSignals(slackData);
    
    // Calculate ROI score
    const roiScore = calculateROIScore(postMeetingSignals, negativeSignals, meetingDetails);
    const roiLevel = getROILevel(roiScore);
    
    // Generate verdict
    const verdict = generateVerdict(roiScore, postMeetingSignals, negativeSignals);
    
    // Generate recommendations
    const recommendations = generateRecommendations(postMeetingSignals, negativeSignals);
    
    // Save or update
    const team = await Team.findById(teamId);
    let roi = await MeetingROI.findOne({ meetingId });
    
    if (roi) {
      Object.assign(roi, {
        roiScore,
        roiLevel,
        postMeetingSignals,
        negativeSignals,
        verdict,
        recommendations,
        lastAnalyzed: new Date()
      });
    } else {
      roi = new MeetingROI({
        meetingId,
        teamId,
        orgId: team.orgId || team.organizationId,
        meetingTitle: meetingDetails.title,
        meetingDate: meetingDetails.startTime,
        durationMinutes: meetingDetails.durationMinutes,
        attendeeCount: meetingDetails.attendees.length,
        roiScore,
        roiLevel,
        postMeetingSignals,
        negativeSignals,
        verdict,
        recommendations
      });
    }
    
    await roi.save();
    return roi;
  } catch (error) {
    console.error('[Meeting ROI Enhanced] Error analyzing:', error);
    throw error;
  }
}

/**
 * Get meeting details from Google Calendar
 */
async function getMeetingDetails(meetingId) {
  // Placeholder - query Google Calendar API
  
  return {
    title: 'Q1 Planning Session',
    startTime: new Date('2026-01-10T10:00:00Z'),
    endTime: new Date('2026-01-10T11:00:00Z'),
    durationMinutes: 60,
    attendees: ['user1', 'user2', 'user3', 'user4']
  };
}

/**
 * Get Slack activity around meeting
 */
async function getSlackActivityAroundMeeting(teamId, startTime, endTime, attendees) {
  // Placeholder - query Slack API for:
  // - Messages in 4h BEFORE meeting
  // - Messages in 4h AFTER meeting
  // - Keywords in messages
  // - Documents shared
  
  return {
    beforeMeeting: {
      messageCount: 15,
      timeWindowHours: 4
    },
    afterMeeting: {
      messageCount: 42,
      timeWindowHours: 4,
      actionKeywords: ['will do', 'I\'ll handle', 'next steps', 'assigned to'],
      actionKeywordCount: 8,
      questions: 12,
      confusionKeywords: ['confused', 'unclear', 'what did we decide'],
      confusionCount: 0,
      documentsShared: 3
    },
    followUpMeeting: {
      scheduled: false,
      daysUntil: null
    }
  };
}

/**
 * Analyze post-meeting signals (positive)
 */
function analyzePostMeetingSignals(data) {
  const beforeRate = data.beforeMeeting.messageCount / data.beforeMeeting.timeWindowHours;
  const afterRate = data.afterMeeting.messageCount / data.afterMeeting.timeWindowHours;
  const percentChange = ((afterRate - beforeRate) / beforeRate) * 100;
  
  return {
    slackActivityIncrease: {
      beforeRate,
      afterRate,
      percentChange,
      detected: percentChange > 30 // 30% increase = productive
    },
    actionItemKeywords: {
      count: data.afterMeeting.actionKeywordCount,
      keywords: data.afterMeeting.actionKeywords,
      detected: data.afterMeeting.actionKeywordCount > 3
    },
    followUpQuestions: {
      count: data.afterMeeting.questions,
      detected: data.afterMeeting.questions > 5
    },
    documentCreation: {
      count: data.afterMeeting.documentsShared,
      detected: data.afterMeeting.documentsShared > 0
    },
    decisionMade: {
      detected: data.afterMeeting.actionKeywordCount > 5,
      confidence: data.afterMeeting.actionKeywordCount > 10 ? 'high' : 
                  data.afterMeeting.actionKeywordCount > 5 ? 'medium' : 'low'
    }
  };
}

/**
 * Analyze negative signals
 */
function analyzeNegativeSignals(data) {
  const noActivity = data.afterMeeting.messageCount < 5;
  
  return {
    noFollowUp: {
      detected: noActivity
    },
    confusionKeywords: {
      count: data.afterMeeting.confusionCount,
      keywords: data.afterMeeting.confusionKeywords,
      detected: data.afterMeeting.confusionCount > 2
    },
    repeatMeetingScheduled: {
      detected: data.followUpMeeting.scheduled,
      daysUntilRepeat: data.followUpMeeting.daysUntil
    }
  };
}

/**
 * Calculate ROI score
 */
function calculateROIScore(positive, negative, meeting) {
  let score = 50; // baseline
  
  // Positive signals
  if (positive.slackActivityIncrease.detected) score += 15;
  if (positive.actionItemKeywords.detected) score += 20;
  if (positive.followUpQuestions.detected) score += 10;
  if (positive.documentCreation.detected) score += 10;
  if (positive.decisionMade.detected) {
    if (positive.decisionMade.confidence === 'high') score += 20;
    else if (positive.decisionMade.confidence === 'medium') score += 10;
  }
  
  // Negative signals
  if (negative.noFollowUp.detected) score -= 30;
  if (negative.confusionKeywords.detected) score -= 20;
  if (negative.repeatMeetingScheduled.detected) score -= 15;
  
  // Long meetings with low score are worse
  if (meeting.durationMinutes > 60 && score < 60) {
    score -= 10;
  }
  
  return Math.max(Math.min(score, 100), 0);
}

/**
 * Get ROI level
 */
function getROILevel(score) {
  if (score >= 75) return 'excellent';
  if (score >= 55) return 'good';
  if (score >= 35) return 'poor';
  return 'waste';
}

/**
 * Generate verdict
 */
function generateVerdict(score, positive, negative) {
  if (score >= 75) {
    return 'Highly productive meeting - clear decisions and action items generated';
  } else if (score >= 55) {
    return 'Moderately productive meeting - some progress made';
  } else if (score >= 35) {
    return 'Low productivity meeting - minimal follow-up activity';
  }
  return 'Unproductive meeting - no observable outcomes';
}

/**
 * Generate recommendations
 */
function generateRecommendations(positive, negative) {
  const recs = [];
  
  if (negative.noFollowUp.detected) {
    recs.push('No Slack activity after meeting - ensure clear action items are defined');
  }
  
  if (negative.confusionKeywords.detected) {
    recs.push('Team confusion detected - document decisions in writing');
  }
  
  if (negative.repeatMeetingScheduled.detected && negative.repeatMeetingScheduled.daysUntilRepeat < 3) {
    recs.push('Follow-up meeting scheduled quickly - original meeting may not have been necessary');
  }
  
  if (!positive.decisionMade.detected) {
    recs.push('No clear decisions detected - consider async communication instead');
  }
  
  return recs;
}

/**
 * Analyze all recent meetings for a team
 */
export async function analyzeTeamRecentMeetings(teamId, days = 7) {
  try {
    // Get recent meetings from Google Calendar
    const meetings = await getRecentMeetings(teamId, days);
    
    const results = [];
    
    for (const meeting of meetings) {
      const roi = await analyzeMeetingROI(meeting.id, teamId);
      results.push(roi);
    }
    
    return results.sort((a, b) => a.roiScore - b.roiScore);
  } catch (error) {
    console.error('[Meeting ROI Enhanced] Error analyzing team meetings:', error);
    throw error;
  }
}

/**
 * Get recent meetings from Google Calendar
 */
async function getRecentMeetings(teamId, days) {
  // Placeholder - query Google Calendar API
  return [
    { id: 'meeting_1', title: 'Q1 Planning' },
    { id: 'meeting_2', title: 'Sprint Planning' }
  ];
}

/**
 * Get low ROI meetings for org
 */
export async function getLowROIMeetings(orgId, maxScore = 40) {
  try {
    const meetings = await MeetingROI.find({
      orgId,
      roiScore: { $lte: maxScore }
    })
    .populate('teamId', 'name')
    .sort({ roiScore: 1 });
    
    return meetings;
  } catch (error) {
    console.error('[Meeting ROI Enhanced] Error fetching low ROI meetings:', error);
    throw error;
  }
}

export default {
  analyzeMeetingROI,
  analyzeTeamRecentMeetings,
  getLowROIMeetings
};
