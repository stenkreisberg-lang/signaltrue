/**
 * After-Hours Cost Calculator Service
 * Translates invisible work into cost language executives understand
 * 
 * Inputs:
 * - Messages sent outside local working hours
 * - Duration of sustained after-hours periods
 * - Time zone mapping
 * 
 * Outputs:
 * - After-hours hours/week
 * - Equivalent FTE = after_hours_hours / 40
 * - Optional cost proxy = FTE × avg_role_cost
 */

import { AfterHoursCost } from '../models/loopClosing.js';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';

/**
 * Default working hours configuration
 */
const DEFAULT_WORK_HOURS = {
  start: 9,  // 9 AM
  end: 18,   // 6 PM
  workDays: [1, 2, 3, 4, 5] // Monday to Friday
};

/**
 * Default average role cost (annual salary for FTE calculation)
 */
const DEFAULT_AVG_ROLE_COST = 75000;

/**
 * Determine if a timestamp is after-hours
 * @param {Date} timestamp - The timestamp to check
 * @param {Object} workHours - Working hours config
 * @param {string} timezone - IANA timezone (e.g., 'America/New_York')
 * @returns {boolean} - True if after-hours
 */
export function isAfterHours(timestamp, workHours = DEFAULT_WORK_HOURS, timezone = 'UTC') {
  const date = new Date(timestamp);
  
  // Get local time components
  const options = { timeZone: timezone, hour: 'numeric', weekday: 'short' };
  let hour, dayOfWeek;
  
  try {
    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: timezone,
      hour: 'numeric',
      hour12: false 
    });
    hour = parseInt(formatter.format(date));
    
    const dayFormatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: timezone,
      weekday: 'narrow' 
    });
    const dayStr = dayFormatter.format(date);
    const dayMap = { 'S': 0, 'M': 1, 'T': 2, 'W': 3, 'F': 5 };
    // Handle Tuesday vs Thursday
    const fullDayFormatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: timezone,
      weekday: 'long' 
    });
    const fullDay = fullDayFormatter.format(date);
    if (fullDay === 'Sunday') dayOfWeek = 0;
    else if (fullDay === 'Monday') dayOfWeek = 1;
    else if (fullDay === 'Tuesday') dayOfWeek = 2;
    else if (fullDay === 'Wednesday') dayOfWeek = 3;
    else if (fullDay === 'Thursday') dayOfWeek = 4;
    else if (fullDay === 'Friday') dayOfWeek = 5;
    else if (fullDay === 'Saturday') dayOfWeek = 6;
  } catch (e) {
    // Fallback to UTC
    hour = date.getUTCHours();
    dayOfWeek = date.getUTCDay();
  }

  // Weekend check
  if (!workHours.workDays.includes(dayOfWeek)) {
    return true;
  }

  // Outside working hours check
  if (hour < workHours.start || hour >= workHours.end) {
    return true;
  }

  return false;
}

/**
 * Calculate after-hours activity from messages
 * @param {Array} messages - Messages with timestamps
 * @param {Object} workHours - Working hours config
 * @param {string} timezone - Team timezone
 * @returns {Object} - After-hours metrics
 */
export function calculateAfterHoursActivity(messages, workHours = DEFAULT_WORK_HOURS, timezone = 'UTC') {
  if (!messages || messages.length === 0) {
    return {
      totalMessages: 0,
      afterHoursMessages: 0,
      afterHoursRate: 0,
      afterHoursHours: 0,
      sustainedPeriods: []
    };
  }

  let afterHoursMessages = 0;
  const afterHoursTimestamps = [];

  messages.forEach(msg => {
    const ts = new Date(msg.timestamp || msg.ts);
    if (isAfterHours(ts, workHours, timezone)) {
      afterHoursMessages++;
      afterHoursTimestamps.push(ts);
    }
  });

  // Calculate sustained periods (clusters of after-hours activity)
  const sustainedPeriods = calculateSustainedPeriods(afterHoursTimestamps);

  // Estimate after-hours hours (assume 2-3 min per message on average)
  const estimatedMinutesPerMessage = 2.5;
  const afterHoursMinutes = afterHoursMessages * estimatedMinutesPerMessage;
  
  // Add sustained period time
  const sustainedMinutes = sustainedPeriods.reduce((sum, p) => sum + p.durationMinutes, 0);
  
  const totalAfterHoursHours = (afterHoursMinutes + sustainedMinutes) / 60;

  return {
    totalMessages: messages.length,
    afterHoursMessages,
    afterHoursRate: messages.length > 0 ? (afterHoursMessages / messages.length) * 100 : 0,
    afterHoursHours: Math.round(totalAfterHoursHours * 10) / 10,
    sustainedPeriods
  };
}

/**
 * Identify sustained after-hours periods
 * A sustained period is multiple messages within 30 min windows
 * @param {Array} timestamps - Sorted after-hours timestamps
 * @returns {Array} - Sustained period objects
 */
function calculateSustainedPeriods(timestamps) {
  if (timestamps.length < 2) return [];

  const sorted = [...timestamps].sort((a, b) => a - b);
  const periods = [];
  let periodStart = sorted[0];
  let periodEnd = sorted[0];
  let messageCount = 1;

  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i] - periodEnd) / (1000 * 60); // minutes
    
    if (gap <= 30) {
      // Continue current period
      periodEnd = sorted[i];
      messageCount++;
    } else {
      // Save period if it had multiple messages
      if (messageCount >= 2) {
        periods.push({
          start: periodStart,
          end: periodEnd,
          durationMinutes: Math.round((periodEnd - periodStart) / (1000 * 60)),
          messageCount
        });
      }
      // Start new period
      periodStart = sorted[i];
      periodEnd = sorted[i];
      messageCount = 1;
    }
  }

  // Don't forget last period
  if (messageCount >= 2) {
    periods.push({
      start: periodStart,
      end: periodEnd,
      durationMinutes: Math.round((periodEnd - periodStart) / (1000 * 60)),
      messageCount
    });
  }

  return periods;
}

/**
 * Calculate FTE equivalent and cost
 * @param {number} afterHoursHoursWeek - After-hours hours per week
 * @param {number} avgRoleCost - Average annual salary
 * @returns {Object} - FTE and cost metrics
 */
export function calculateFTEAndCost(afterHoursHoursWeek, avgRoleCost = DEFAULT_AVG_ROLE_COST) {
  const standardWorkWeek = 40;
  const equivalentFTE = afterHoursHoursWeek / standardWorkWeek;
  
  // Weekly cost = annual cost / 52 weeks * FTE
  const weeklyCost = (avgRoleCost / 52) * equivalentFTE;
  
  // Monthly accumulation
  const monthlyCost = weeklyCost * 4.33; // avg weeks per month

  return {
    equivalentFTE: Math.round(equivalentFTE * 100) / 100,
    weeklyCost: Math.round(weeklyCost),
    monthlyCost: Math.round(monthlyCost),
    annualizedCost: Math.round(weeklyCost * 52)
  };
}

/**
 * Compute After-Hours Cost for a team
 * @param {string} teamId - Team ID
 * @param {Array} messages - Messages from the week
 * @param {Object} options - Configuration options
 * @returns {Object} - Complete after-hours analysis
 */
export async function computeAfterHoursCost(teamId, messages = [], options = {}) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  // Get org settings for cost configuration
  let avgRoleCost = DEFAULT_AVG_ROLE_COST;
  if (team.orgId) {
    const org = await Organization.findById(team.orgId);
    if (org?.settings?.avgRoleCost) {
      avgRoleCost = org.settings.avgRoleCost;
    }
  }

  const timezone = options.timezone || 'UTC';
  const workHours = options.workHours || DEFAULT_WORK_HOURS;

  // Calculate activity metrics
  const activity = calculateAfterHoursActivity(messages, workHours, timezone);

  // Calculate FTE and cost
  const fteMetrics = calculateFTEAndCost(activity.afterHoursHours, avgRoleCost);

  // Build daily breakdown
  const dailyBreakdown = buildDailyBreakdown(messages, workHours, timezone);

  // Calculate week start (Monday of current week)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  return {
    teamId,
    orgId: team.orgId,
    weekStart,
    
    afterHoursHours: activity.afterHoursHours,
    workingHoursTotal: 40,
    
    equivalentFTE: fteMetrics.equivalentFTE,
    estimatedCost: fteMetrics.weeklyCost,
    avgRoleCost,
    
    dailyBreakdown,
    monthlyAccumulated: fteMetrics.monthlyCost,
    
    // Additional context
    afterHoursRate: Math.round(activity.afterHoursRate * 10) / 10,
    sustainedPeriods: activity.sustainedPeriods.length,
    totalMessages: activity.totalMessages,
    afterHoursMessages: activity.afterHoursMessages
  };
}

/**
 * Build daily breakdown of after-hours work
 * @param {Array} messages - All messages
 * @param {Object} workHours - Working hours config
 * @param {string} timezone - Timezone
 * @returns {Array} - Daily breakdown
 */
function buildDailyBreakdown(messages, workHours, timezone) {
  const byDay = {};

  messages.forEach(msg => {
    const ts = new Date(msg.timestamp || msg.ts);
    const dateKey = ts.toISOString().split('T')[0];
    
    if (!byDay[dateKey]) {
      byDay[dateKey] = { date: dateKey, messages: 0, afterHoursMessages: 0 };
    }
    
    byDay[dateKey].messages++;
    
    if (isAfterHours(ts, workHours, timezone)) {
      byDay[dateKey].afterHoursMessages++;
    }
  });

  return Object.values(byDay).map(day => ({
    date: new Date(day.date),
    hours: Math.round((day.afterHoursMessages * 2.5) / 60 * 10) / 10
  }));
}

/**
 * Store After-Hours Cost calculation
 * @param {Object} costData - Cost calculation result
 * @returns {Object} - Saved document
 */
export async function storeAfterHoursCost(costData) {
  const weekStart = new Date(costData.weekStart);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const existing = await AfterHoursCost.findOne({
    teamId: costData.teamId,
    weekStart: { $gte: weekStart, $lt: weekEnd }
  });

  if (existing) {
    Object.assign(existing, costData);
    return existing.save();
  }

  return AfterHoursCost.create(costData);
}

/**
 * Get After-Hours Cost history
 * @param {string} teamId - Team ID
 * @param {number} weeks - Number of weeks to fetch
 * @returns {Array} - Historical cost data
 */
export async function getAfterHoursCostHistory(teamId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  return AfterHoursCost.find({
    teamId,
    weekStart: { $gte: startDate }
  }).sort({ weekStart: 1 });
}

/**
 * Get latest After-Hours Cost for a team
 * @param {string} teamId - Team ID
 * @returns {Object} - Latest cost data
 */
export async function getLatestAfterHoursCost(teamId) {
  return AfterHoursCost.findOne({ teamId }).sort({ weekStart: -1 });
}

export default {
  computeAfterHoursCost,
  storeAfterHoursCost,
  getAfterHoursCostHistory,
  getLatestAfterHoursCost,
  calculateAfterHoursActivity,
  calculateFTEAndCost,
  isAfterHours
};
