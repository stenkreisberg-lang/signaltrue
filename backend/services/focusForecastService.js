/**
 * Focus Recovery Forecast Service
 * Predicts near-future focus loss using linear extrapolation
 * 
 * Inputs:
 * - focus_blocks_per_day (≥90 min uninterrupted)
 * - fragmentation_index (number of context switches/day)
 * - after_hours_activity_rate
 * 
 * Output:
 * - Focus capacity forecast for next 14 days
 * - Warning state: Stable / Degrading / Critical
 */

import { FocusForecast } from '../models/loopClosing.js';
import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';

/**
 * Calculate linear regression slope
 * @param {Array} points - Array of {x, y} data points
 * @returns {Object} - slope and intercept
 */
function linearRegression(points) {
  if (points.length < 2) {
    return { slope: 0, intercept: points[0]?.y || 0 };
  }

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  points.forEach(({ x, y }) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  });

  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Calculate focus blocks from calendar data
 * A focus block is ≥90 minutes of uninterrupted time
 * 
 * @param {Array} meetings - Calendar events
 * @param {number} workdayHours - Working hours per day (default 8)
 * @returns {number} - Number of focus blocks per day
 */
export function calculateFocusBlocks(meetings, workdayHours = 8) {
  if (!meetings || meetings.length === 0) {
    // No meetings = maximum focus blocks possible
    return Math.floor((workdayHours * 60) / 90); // ~5 blocks in 8h day
  }

  // Sort meetings by start time
  const sorted = [...meetings].sort((a, b) => 
    new Date(a.startTime) - new Date(b.startTime)
  );

  // Group meetings by day
  const byDay = {};
  sorted.forEach(meeting => {
    const day = new Date(meeting.startTime).toDateString();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(meeting);
  });

  let totalFocusBlocks = 0;
  const days = Object.keys(byDay);

  days.forEach(day => {
    const dayMeetings = byDay[day];
    let focusBlocks = 0;
    
    // Assume 9am-5pm workday
    const dayStart = new Date(day);
    dayStart.setHours(9, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(17, 0, 0, 0);

    // Find gaps between meetings
    let lastEnd = dayStart;
    
    dayMeetings.forEach(meeting => {
      const meetingStart = new Date(meeting.startTime);
      const meetingEnd = new Date(meeting.endTime || 
        new Date(meetingStart.getTime() + (meeting.durationMinutes || 30) * 60000));
      
      // Gap before this meeting
      const gapMinutes = (meetingStart - lastEnd) / (1000 * 60);
      if (gapMinutes >= 90) {
        focusBlocks += Math.floor(gapMinutes / 90);
      }
      
      lastEnd = new Date(Math.max(lastEnd.getTime(), meetingEnd.getTime()));
    });

    // Gap after last meeting until end of day
    const finalGap = (dayEnd - lastEnd) / (1000 * 60);
    if (finalGap >= 90) {
      focusBlocks += Math.floor(finalGap / 90);
    }

    totalFocusBlocks += focusBlocks;
  });

  return days.length > 0 ? totalFocusBlocks / days.length : 0;
}

/**
 * Calculate fragmentation index (context switches per day)
 * @param {Array} meetings - Calendar events
 * @param {Array} messages - Slack/Teams messages
 * @returns {number} - Average context switches per day
 */
export function calculateFragmentationIndex(meetings, messages = []) {
  const byDay = {};
  
  // Count meetings as context switches
  meetings.forEach(meeting => {
    const day = new Date(meeting.startTime).toDateString();
    if (!byDay[day]) byDay[day] = { meetings: 0, messageBlocks: 0 };
    byDay[day].meetings++;
  });

  // Count message bursts as context switches
  // A "burst" is a cluster of messages within 5 minutes
  if (messages.length > 0) {
    const sorted = [...messages].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    let lastBurstTime = null;
    sorted.forEach(msg => {
      const msgTime = new Date(msg.timestamp);
      const day = msgTime.toDateString();
      
      if (!byDay[day]) byDay[day] = { meetings: 0, messageBlocks: 0 };
      
      // New burst if > 30 min since last message
      if (!lastBurstTime || (msgTime - lastBurstTime) > 30 * 60 * 1000) {
        byDay[day].messageBlocks++;
        lastBurstTime = msgTime;
      }
    });
  }

  const days = Object.keys(byDay);
  if (days.length === 0) return 0;

  const totalSwitches = days.reduce((sum, day) => {
    const d = byDay[day];
    // Each meeting is a context switch, plus transitions between message blocks
    return sum + d.meetings + Math.max(0, d.messageBlocks - 1);
  }, 0);

  return totalSwitches / days.length;
}

/**
 * Calculate after-hours activity rate
 * @param {Array} messages - Messages with timestamps
 * @param {Object} workingHours - {start: 9, end: 18}
 * @returns {number} - Percentage of after-hours activity
 */
export function calculateAfterHoursRate(messages, workingHours = { start: 9, end: 18 }) {
  if (!messages || messages.length === 0) return 0;

  let afterHoursCount = 0;
  
  messages.forEach(msg => {
    const hour = new Date(msg.timestamp).getHours();
    const day = new Date(msg.timestamp).getDay();
    
    // After hours: before start, after end, or weekends
    if (hour < workingHours.start || hour >= workingHours.end || day === 0 || day === 6) {
      afterHoursCount++;
    }
  });

  return (afterHoursCount / messages.length) * 100;
}

/**
 * Determine warning state based on trends
 * @param {number} focusTrend - Focus blocks trend slope
 * @param {number} fragmentationTrend - Fragmentation trend slope
 * @returns {string} - 'Stable' | 'Degrading' | 'Critical'
 */
function determineWarningState(focusTrend, fragmentationTrend) {
  // Negative focus trend or positive fragmentation trend = degrading
  const focusDegrading = focusTrend < -0.02;
  const fragmentationIncreasing = fragmentationTrend > 0.1;

  if (focusTrend < -0.05 || fragmentationTrend > 0.3) {
    return 'Critical';
  }
  
  if (focusDegrading || fragmentationIncreasing) {
    return 'Degrading';
  }

  return 'Stable';
}

/**
 * Generate human-readable forecast message
 * @param {number} focusChange - Projected focus capacity change
 * @param {string} warningState - Current warning state
 * @returns {string} - Human-readable message
 */
function generateForecastMessage(focusChange, warningState) {
  const absChange = Math.abs(Math.round(focusChange));
  
  if (warningState === 'Critical') {
    if (focusChange < 0) {
      return `Critical: Team projected to lose ~${absChange}% focus capacity in 14 days`;
    }
    return `Critical fragmentation detected; focus time under pressure`;
  }
  
  if (warningState === 'Degrading') {
    if (focusChange < 0) {
      return `At current trend, team will lose ~${absChange}% focus capacity in 14 days`;
    }
    return `Focus capacity degrading; fragmentation increasing`;
  }

  if (focusChange > 5) {
    return `Focus capacity trending up: +${absChange}% projected over 14 days`;
  }
  
  return `Focus capacity stable for the next 14 days`;
}

/**
 * Compute Focus Recovery Forecast for a team
 * @param {string} teamId - Team ID
 * @param {Object} options - Current metrics and historical data
 * @returns {Object} - Complete forecast analysis
 */
export async function computeFocusForecast(teamId, options = {}) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  const {
    currentFocusBlocks = 0,
    currentFragmentation = 0,
    currentAfterHoursRate = 0,
    historicalData = [] // Array of { date, focusBlocks, fragmentation }
  } = options;

  // Build data points for regression (x = day index, y = metric)
  const focusPoints = historicalData.map((d, i) => ({ 
    x: i, 
    y: d.focusBlocks || 0 
  }));
  const fragmentationPoints = historicalData.map((d, i) => ({ 
    x: i, 
    y: d.fragmentation || 0 
  }));

  // Add current day
  const currentDayIndex = historicalData.length;
  focusPoints.push({ x: currentDayIndex, y: currentFocusBlocks });
  fragmentationPoints.push({ x: currentDayIndex, y: currentFragmentation });

  // Calculate trends (14-day rolling)
  const { slope: focusTrend, intercept: focusIntercept } = linearRegression(focusPoints);
  const { slope: fragTrend, intercept: fragIntercept } = linearRegression(fragmentationPoints);

  // Extrapolate 14 days
  const forecastDayIndex = currentDayIndex + 14;
  const forecastedFocusBlocks = Math.max(0, focusIntercept + focusTrend * forecastDayIndex);
  const forecastedFragmentation = Math.max(0, fragIntercept + fragTrend * forecastDayIndex);

  // Calculate capacity change percentage
  const baselineFocus = currentFocusBlocks || 1;
  const focusCapacityChange = ((forecastedFocusBlocks - baselineFocus) / baselineFocus) * 100;

  // Determine warning state
  const warningState = determineWarningState(focusTrend, fragTrend);

  // Generate forecast message
  const forecastMessage = generateForecastMessage(focusCapacityChange, warningState);

  // Build trend data for visualization
  const trendData = focusPoints.slice(-14).map((fp, i) => ({
    date: new Date(Date.now() - (14 - i) * 24 * 60 * 60 * 1000),
    focusBlocks: fp.y,
    fragmentation: fragmentationPoints[i]?.y || 0
  }));

  return {
    teamId,
    orgId: team.orgId,
    date: new Date(),
    
    currentFocusBlocksPerDay: currentFocusBlocks,
    currentFragmentationIndex: currentFragmentation,
    currentAfterHoursRate,
    
    focusBlocksTrend: Math.round(focusTrend * 1000) / 1000,
    fragmentationTrend: Math.round(fragTrend * 1000) / 1000,
    afterHoursTrend: 0, // Would need historical after-hours data
    
    forecastedFocusBlocks: Math.round(forecastedFocusBlocks * 10) / 10,
    forecastedFragmentation: Math.round(forecastedFragmentation * 10) / 10,
    focusCapacityChange: Math.round(focusCapacityChange * 10) / 10,
    
    warningState,
    forecastMessage,
    trendData
  };
}

/**
 * Store Focus Forecast
 * @param {Object} forecastData - Forecast calculation result
 * @returns {Object} - Saved document
 */
export async function storeFocusForecast(forecastData) {
  const existing = await FocusForecast.findOne({
    teamId: forecastData.teamId,
    date: {
      $gte: new Date(new Date().setHours(0, 0, 0, 0)),
      $lt: new Date(new Date().setHours(23, 59, 59, 999))
    }
  });

  if (existing) {
    Object.assign(existing, forecastData);
    return existing.save();
  }

  return FocusForecast.create(forecastData);
}

/**
 * Get Focus Forecast history
 * @param {string} teamId - Team ID
 * @param {number} days - Number of days to fetch
 * @returns {Array} - Historical forecast data
 */
export async function getFocusForecastHistory(teamId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return FocusForecast.find({
    teamId,
    date: { $gte: startDate }
  }).sort({ date: 1 });
}

/**
 * Get latest Focus Forecast for a team
 * @param {string} teamId - Team ID
 * @returns {Object} - Latest forecast data
 */
export async function getLatestFocusForecast(teamId) {
  return FocusForecast.findOne({ teamId }).sort({ date: -1 });
}

export default {
  computeFocusForecast,
  storeFocusForecast,
  getFocusForecastHistory,
  getLatestFocusForecast,
  calculateFocusBlocks,
  calculateFragmentationIndex,
  calculateAfterHoursRate,
  linearRegression
};
