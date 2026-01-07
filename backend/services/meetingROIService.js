/**
 * Meeting ROI Service
 * Calculates meeting efficiency without reading content
 * 
 * Inputs:
 * - meeting_duration_minutes
 * - meeting_attendees_count
 * - messages_48h_after_meeting
 * - meetings_same_topic_72h (proxy via attendee overlap)
 * 
 * Output:
 * - Meeting ROI Score (0-100)
 * - Low ROI = high cost + high follow-up + high rework
 */

import { MeetingROI } from '../models/loopClosing.js';
import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';

/**
 * Calculate meeting cost (time × people)
 * @param {Array} meetings - Array of meeting objects with duration and attendees
 * @returns {Object} - Cost metrics
 */
function calculateMeetingCost(meetings) {
  let totalMinutes = 0;
  let totalAttendeeMinutes = 0;
  let recurringCount = 0;
  let recurringMinutes = 0;
  let adHocCount = 0;
  let adHocMinutes = 0;

  meetings.forEach(meeting => {
    const duration = meeting.durationMinutes || 0;
    const attendees = meeting.attendeeCount || 1;
    const attendeeMinutes = duration * attendees;
    
    totalMinutes += duration;
    totalAttendeeMinutes += attendeeMinutes;
    
    if (meeting.isRecurring) {
      recurringCount++;
      recurringMinutes += duration;
    } else {
      adHocCount++;
      adHocMinutes += duration;
    }
  });

  return {
    totalMinutes,
    totalAttendeeMinutes,
    meetingCount: meetings.length,
    recurring: { count: recurringCount, minutes: recurringMinutes },
    adHoc: { count: adHocCount, minutes: adHocMinutes }
  };
}

/**
 * Calculate follow-up load (messages after meetings / meeting cost)
 * @param {number} messagesAfter - Number of messages within 48h after meetings
 * @param {number} meetingCost - Total attendee-minutes
 * @returns {number} - Follow-up load ratio (lower is better)
 */
function calculateFollowUpLoad(messagesAfter, meetingCost) {
  if (meetingCost === 0) return 0;
  // Normalize: messages per 100 attendee-minutes
  return (messagesAfter / meetingCost) * 100;
}

/**
 * Calculate rework indicator (re-meetings with same attendees)
 * @param {Array} meetings - Meetings with attendee lists
 * @returns {Object} - Rework metrics
 */
function calculateReworkIndicator(meetings) {
  if (meetings.length < 2) {
    return { reMeetingCount: 0, reworkRate: 0 };
  }

  let reMeetingCount = 0;
  
  // Sort meetings by start time
  const sorted = [...meetings].sort((a, b) => 
    new Date(a.startTime) - new Date(b.startTime)
  );

  // Check each meeting for similar meetings within 72h
  for (let i = 0; i < sorted.length; i++) {
    const meeting = sorted[i];
    const meetingTime = new Date(meeting.startTime);
    const attendees = new Set(meeting.attendees || []);
    
    if (attendees.size === 0) continue;

    // Look for meetings within next 72 hours
    for (let j = i + 1; j < sorted.length; j++) {
      const nextMeeting = sorted[j];
      const nextTime = new Date(nextMeeting.startTime);
      const hoursDiff = (nextTime - meetingTime) / (1000 * 60 * 60);
      
      if (hoursDiff > 72) break; // Beyond 72h window
      
      const nextAttendees = new Set(nextMeeting.attendees || []);
      if (nextAttendees.size === 0) continue;
      
      // Calculate attendee overlap
      const overlap = [...attendees].filter(a => nextAttendees.has(a)).length;
      const overlapPercent = overlap / Math.min(attendees.size, nextAttendees.size);
      
      if (overlapPercent > 0.6) {
        reMeetingCount++;
        break; // Count each meeting only once
      }
    }
  }

  const reworkRate = meetings.length > 0 
    ? (reMeetingCount / meetings.length) * 100 
    : 0;

  return { reMeetingCount, reworkRate };
}

/**
 * Calculate Meeting ROI Score (0-100)
 * High score = efficient meetings
 * Low score = wasteful meetings
 * 
 * @param {Object} params - Calculation parameters
 * @returns {number} - ROI score 0-100
 */
function calculateROIScore({ followUpLoad, reworkRate, avgMeetingDuration }) {
  // Weights for scoring components
  const weights = {
    followUp: 0.35,
    rework: 0.40,
    duration: 0.25
  };

  // Follow-up penalty: high messages = low score
  // Ideal: < 5 messages per 100 attendee-minutes
  const followUpScore = Math.max(0, 100 - (followUpLoad * 4));

  // Rework penalty: re-meetings indicate ineffective first meeting
  const reworkScore = Math.max(0, 100 - (reworkRate * 2.5));

  // Duration penalty: very long meetings tend to be less efficient
  // Optimal: 25-50 minutes
  let durationScore = 100;
  if (avgMeetingDuration > 60) {
    durationScore = Math.max(0, 100 - ((avgMeetingDuration - 60) * 1.5));
  } else if (avgMeetingDuration < 15) {
    durationScore = 80; // Very short meetings might indicate fragmentation
  }

  // Weighted average
  const roiScore = Math.round(
    followUpScore * weights.followUp +
    reworkScore * weights.rework +
    durationScore * weights.duration
  );

  return Math.max(0, Math.min(100, roiScore));
}

/**
 * Calculate low ROI percentage (for dashboard display)
 * @param {Array} meetings - Individual meeting data with scores
 * @returns {number} - Percentage of meeting time that shows low ROI
 */
function calculateLowROIPercentage(meetings, avgROI) {
  // Threshold for "low ROI" meeting time
  const LOW_ROI_THRESHOLD = 50;
  
  if (avgROI >= LOW_ROI_THRESHOLD) {
    // Overall good, estimate low portion
    return Math.round(100 - avgROI);
  }
  
  // For low overall ROI, estimate higher percentage
  return Math.round(Math.min(80, (100 - avgROI) * 1.2));
}

/**
 * Compute Meeting ROI for a team
 * @param {string} teamId - Team ID
 * @param {Array} meetings - Meeting data from calendar
 * @param {number} messagesAfterMeetings - Messages within 48h after meetings
 * @returns {Object} - Complete ROI analysis
 */
export async function computeMeetingROI(teamId, meetings, messagesAfterMeetings = 0) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  // Calculate cost metrics
  const costMetrics = calculateMeetingCost(meetings);
  
  // Calculate follow-up load
  const followUpLoad = calculateFollowUpLoad(
    messagesAfterMeetings, 
    costMetrics.totalAttendeeMinutes
  );

  // Calculate rework indicator
  const { reMeetingCount, reworkRate } = calculateReworkIndicator(meetings);

  // Average meeting duration
  const avgMeetingDuration = costMetrics.meetingCount > 0
    ? costMetrics.totalMinutes / costMetrics.meetingCount
    : 0;

  // Calculate ROI score
  const roiScore = calculateROIScore({
    followUpLoad,
    reworkRate,
    avgMeetingDuration
  });

  // Calculate low ROI percentage for display
  const lowROIPercentage = calculateLowROIPercentage(meetings, roiScore);

  // Build result object
  const result = {
    teamId,
    orgId: team.orgId,
    date: new Date(),
    
    totalMeetingMinutes: costMetrics.totalMinutes,
    totalAttendeeMinutes: costMetrics.totalAttendeeMinutes,
    meetingCount: costMetrics.meetingCount,
    
    messagesAfterMeetings,
    followUpLoad: Math.round(followUpLoad * 100) / 100,
    
    reMeetingCount,
    reworkRate: Math.round(reworkRate * 10) / 10,
    
    roiScore,
    lowROIPercentage,
    
    recurringMeetings: {
      count: costMetrics.recurring.count,
      totalMinutes: costMetrics.recurring.minutes,
      avgROI: roiScore // Simplified; could calculate separately
    },
    adHocMeetings: {
      count: costMetrics.adHoc.count,
      totalMinutes: costMetrics.adHoc.minutes,
      avgROI: roiScore
    }
  };

  return result;
}

/**
 * Store Meeting ROI calculation
 * @param {Object} roiData - ROI calculation result
 * @returns {Object} - Saved document
 */
export async function storeMeetingROI(roiData) {
  const existing = await MeetingROI.findOne({
    teamId: roiData.teamId,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });

  if (existing) {
    Object.assign(existing, roiData);
    return existing.save();
  }

  return MeetingROI.create(roiData);
}

/**
 * Get Meeting ROI history for a team
 * @param {string} teamId - Team ID
 * @param {number} days - Number of days to fetch
 * @returns {Array} - Historical ROI data
 */
export async function getMeetingROIHistory(teamId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return MeetingROI.find({
    teamId,
    date: { $gte: startDate }
  }).sort({ date: 1 });
}

/**
 * Get latest Meeting ROI for a team
 * @param {string} teamId - Team ID
 * @returns {Object} - Latest ROI data
 */
export async function getLatestMeetingROI(teamId) {
  return MeetingROI.findOne({ teamId }).sort({ date: -1 });
}

export default {
  computeMeetingROI,
  storeMeetingROI,
  getMeetingROIHistory,
  getLatestMeetingROI,
  calculateMeetingCost,
  calculateFollowUpLoad,
  calculateReworkIndicator,
  calculateROIScore
};
