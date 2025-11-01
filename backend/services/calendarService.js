import { google } from 'googleapis';
import Team from '../models/team.js';
import { createSnapshot } from '../utils/bdiHistory.js';

/**
 * Google Calendar Service
 * Fetches meeting data and calculates recovery scores
 */

// Initialize Google Calendar API
function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: process.env.GOOGLE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT)
      : undefined,
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  });
  
  return google.calendar({ version: 'v3', auth });
}

/**
 * Fetch calendar events for a team
 * @param {string} calendarId - Google Calendar ID
 * @param {number} daysBack - Number of days to look back (default 7)
 */
export async function fetchCalendarEvents(calendarId, daysBack = 7) {
  try {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
      console.warn('⚠️  No GOOGLE_SERVICE_ACCOUNT configured, skipping calendar fetch');
      return [];
    }

    const calendar = getCalendarClient();
    const now = new Date();
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId,
      timeMin: startDate.toISOString(),
      timeMax: now.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error(`❌ Calendar fetch error for ${calendarId}:`, error.message);
    return [];
  }
}

/**
 * Analyze calendar events to calculate recovery signals
 * @param {Array} events - Calendar events from Google API
 */
export function analyzeCalendarEvents(events) {
  if (!events || events.length === 0) {
    return {
      totalMeetingHours: 0,
      afterHoursMeetings: 0,
      weekendMeetings: 0,
      avgMeetingDuration: 0,
      meetingDensity: 0,
      recoveryScore: 100, // Perfect score if no data
    };
  }

  let totalMinutes = 0;
  let afterHoursCount = 0;
  let weekendCount = 0;
  const daysWithMeetings = new Set();

  events.forEach(event => {
    if (!event.start || !event.end) return;

    const start = new Date(event.start.dateTime || event.start.date);
    const end = new Date(event.end.dateTime || event.end.date);
    const duration = (end - start) / (1000 * 60); // minutes

    totalMinutes += duration;
    daysWithMeetings.add(start.toDateString());

    // Check if after hours (before 8am or after 6pm)
    const hour = start.getHours();
    if (hour < 8 || hour >= 18) {
      afterHoursCount++;
    }

    // Check if weekend
    const day = start.getDay();
    if (day === 0 || day === 6) {
      weekendCount++;
    }
  });

  const totalMeetingHours = totalMinutes / 60;
  const avgMeetingDuration = events.length > 0 ? totalMinutes / events.length : 0;
  const meetingDensity = daysWithMeetings.size > 0 
    ? events.length / daysWithMeetings.size 
    : 0;

  // Calculate recovery score (0-100, higher is better)
  // Penalties: excessive meetings, after-hours, weekends, high density
  let recoveryScore = 100;
  
  // Penalty for total meeting hours (>20 hours/week is concerning)
  const weeklyHours = (totalMeetingHours / 7) * 7; // normalize to weekly
  if (weeklyHours > 20) recoveryScore -= Math.min(30, (weeklyHours - 20) * 2);
  
  // Penalty for after-hours meetings
  recoveryScore -= Math.min(25, afterHoursCount * 5);
  
  // Penalty for weekend meetings
  recoveryScore -= Math.min(20, weekendCount * 10);
  
  // Penalty for high meeting density (>5 meetings/day)
  if (meetingDensity > 5) {
    recoveryScore -= Math.min(15, (meetingDensity - 5) * 3);
  }

  recoveryScore = Math.max(0, Math.min(100, recoveryScore));

  return {
    totalMeetingHours: parseFloat(totalMeetingHours.toFixed(1)),
    afterHoursMeetings: afterHoursCount,
    weekendMeetings: weekendCount,
    avgMeetingDuration: parseFloat(avgMeetingDuration.toFixed(1)),
    meetingDensity: parseFloat(meetingDensity.toFixed(1)),
    recoveryScore: Math.round(recoveryScore),
  };
}

/**
 * Refresh calendar data for a specific team
 * @param {string} teamId - MongoDB team ID
 */
export async function refreshTeamCalendar(teamId) {
  const team = await Team.findById(teamId);
  if (!team || !team.calendarId) {
    throw new Error('Team not found or no calendar ID configured');
  }

  const events = await fetchCalendarEvents(team.calendarId, 7);
  const calendarSignals = analyzeCalendarEvents(events);

  // Update team with new calendar signals
  team.calendarSignals = calendarSignals;

  // Recalculate BDI with updated calendar data
  const bdi = calculateBDI(team.slackSignals, team.calendarSignals);
  team.bdi = bdi;

  // Calculate trend (simplified - using recovery score change)
  const oldRecovery = team.calendarSignals?.recoveryScore || 100;
  const recoveryChange = calendarSignals.recoveryScore - oldRecovery;
  team.trend = Math.round(recoveryChange * 0.5); // Scale down for trend

  await team.save();

  // Create snapshot after update
  await createSnapshot(teamId);

  return team;
}

/**
 * Refresh calendar data for all teams with calendar IDs
 */
export async function refreshAllTeamsCalendars() {
  const teams = await Team.find({ calendarId: { $exists: true, $ne: null } });
  console.log(`🗓️  Refreshing calendar data for ${teams.length} teams...`);

  for (const team of teams) {
    try {
      await refreshTeamCalendar(team._id);
      console.log(`✓ Calendar refreshed for team: ${team.name}`);
    } catch (error) {
      console.error(`❌ Calendar refresh failed for ${team.name}:`, error.message);
    }
  }

  console.log('✅ All team calendars refreshed');
}

/**
 * Calculate BDI with Slack + Calendar signals
 * Formula: (workload*0.3) + (sentiment*0.25) + (responsiveness*0.25) + (recovery*0.2)
 * 
 * @param {Object} slack - Slack signals
 * @param {Object} calendar - Calendar signals
 */
function calculateBDI(slack = {}, calendar = {}) {
  // Slack-based scores
  const workloadScore = calculateWorkloadScore(slack);
  const sentimentScore = calculateSentimentScore(slack);
  const responsivenessScore = calculateResponsivenessScore(slack);
  
  // Calendar-based recovery score (inverted: lower recovery = higher BDI)
  const recoveryScore = calendar.recoveryScore !== undefined 
    ? 100 - calendar.recoveryScore 
    : 0;

  // Weighted BDI calculation
  const bdi = (
    workloadScore * 0.3 +
    sentimentScore * 0.25 +
    responsivenessScore * 0.25 +
    recoveryScore * 0.2
  );

  return Math.round(bdi);
}

// Helper: Calculate workload score from message volume
function calculateWorkloadScore(slack) {
  const { messageCount = 0 } = slack;
  // High message count = high workload score
  // Normalize: 0-50 msgs = low, 50-150 = medium, 150+ = high
  if (messageCount < 50) return messageCount * 0.5;
  if (messageCount < 150) return 25 + (messageCount - 50) * 0.5;
  return Math.min(100, 75 + (messageCount - 150) * 0.25);
}

// Helper: Calculate sentiment score from negative sentiment
function calculateSentimentScore(slack) {
  const { avgSentiment = 0 } = slack;
  // avgSentiment ranges from -1 (negative) to 1 (positive)
  // Convert to 0-100 where higher = more negative
  return Math.round((1 - avgSentiment) * 50);
}

// Helper: Calculate responsiveness score from response delays
function calculateResponsivenessScore(slack) {
  const { avgResponseTime = 60 } = slack; // in minutes
  // Higher response time = higher score (worse)
  // 0-30 min = good, 30-120 = medium, 120+ = poor
  if (avgResponseTime < 30) return avgResponseTime * 0.5;
  if (avgResponseTime < 120) return 15 + (avgResponseTime - 30) * 0.5;
  return Math.min(100, 60 + (avgResponseTime - 120) * 0.3);
}

export default {
  fetchCalendarEvents,
  analyzeCalendarEvents,
  refreshTeamCalendar,
  refreshAllTeamsCalendars,
};
