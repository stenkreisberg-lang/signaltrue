/**
 * Meeting Collision Heatmap Service
 * Exposes structural focus dead zones
 * 
 * Inputs:
 * - Meeting blocks by weekday/time
 * - Available non-meeting blocks
 * 
 * Outputs:
 * - Weekly heatmap (Mon–Fri × hours)
 * - Red zones where focus is impossible
 * - Available focus windows
 */

import { MeetingCollision } from '../models/loopClosing.js';
import Team from '../models/team.js';

/**
 * Working day configuration
 */
const WORK_HOURS = {
  start: 8,  // 8 AM
  end: 18,   // 6 PM
  days: [0, 1, 2, 3, 4] // Monday to Friday (0-indexed from Monday)
};

/**
 * Build heatmap grid from calendar events
 * @param {Array} meetings - Calendar events for the week
 * @param {number} teamSize - Number of team members
 * @returns {Array} - Heatmap data
 */
export function buildHeatmapGrid(meetings, teamSize = 1) {
  // Initialize grid: 5 days × 10 hours (8am-6pm)
  const grid = [];
  
  for (let day = 0; day < 5; day++) {
    for (let hour = WORK_HOURS.start; hour < WORK_HOURS.end; hour++) {
      grid.push({
        day,
        hour,
        meetingCount: 0,
        totalAttendees: 0,
        fragmentationCount: 0,
        collisionDensity: 0,
        bookedPercentage: 0
      });
    }
  }

  // Populate grid with meeting data
  const peopleBooked = {}; // Track unique people per slot
  
  meetings.forEach(meeting => {
    const start = new Date(meeting.startTime);
    const end = new Date(meeting.endTime || 
      new Date(start.getTime() + (meeting.durationMinutes || 30) * 60000));
    
    // Get day of week (0 = Monday)
    let dayOfWeek = start.getDay() - 1; // Convert Sunday=0 to Monday=0
    if (dayOfWeek < 0) dayOfWeek = 6; // Sunday
    if (dayOfWeek > 4) return; // Skip weekends
    
    const startHour = start.getHours();
    const endHour = end.getHours() || startHour + 1;
    
    // Mark all hours this meeting spans
    for (let h = startHour; h < endHour && h < WORK_HOURS.end; h++) {
      if (h < WORK_HOURS.start) continue;
      
      const slotIndex = dayOfWeek * (WORK_HOURS.end - WORK_HOURS.start) + (h - WORK_HOURS.start);
      if (slotIndex >= 0 && slotIndex < grid.length) {
        grid[slotIndex].meetingCount++;
        grid[slotIndex].totalAttendees += meeting.attendeeCount || 1;
        
        // Track unique people booked
        const slotKey = `${dayOfWeek}-${h}`;
        if (!peopleBooked[slotKey]) peopleBooked[slotKey] = new Set();
        (meeting.attendees || []).forEach(a => peopleBooked[slotKey].add(a));
      }
    }
  });

  // Calculate fragmentation (transitions between meeting and non-meeting)
  for (let day = 0; day < 5; day++) {
    let prevWasMeeting = false;
    for (let hour = WORK_HOURS.start; hour < WORK_HOURS.end; hour++) {
      const idx = day * (WORK_HOURS.end - WORK_HOURS.start) + (hour - WORK_HOURS.start);
      const isMeeting = grid[idx].meetingCount > 0;
      
      if (isMeeting !== prevWasMeeting) {
        grid[idx].fragmentationCount++;
      }
      prevWasMeeting = isMeeting;
    }
  }

  // Calculate collision density and booked percentage
  grid.forEach((slot, idx) => {
    const slotKey = `${slot.day}-${slot.hour}`;
    const bookedPeople = peopleBooked[slotKey]?.size || 0;
    
    slot.bookedPercentage = teamSize > 0 
      ? Math.round((bookedPeople / teamSize) * 100) 
      : 0;
    
    // Collision density: weighted combination of booking and fragmentation
    slot.collisionDensity = Math.min(100, Math.round(
      slot.bookedPercentage * 0.7 + 
      slot.fragmentationCount * 15 + 
      Math.min(slot.meetingCount * 10, 30)
    ));
  });

  return grid;
}

/**
 * Identify red zones (focus impossible)
 * @param {Array} heatmap - Heatmap grid
 * @returns {Array} - Red zone definitions
 */
export function identifyRedZones(heatmap) {
  const redZones = [];
  
  // Group by day
  for (let day = 0; day < 5; day++) {
    const daySlots = heatmap.filter(s => s.day === day);
    let zoneStart = null;
    
    daySlots.forEach((slot, idx) => {
      const isRed = slot.collisionDensity >= 70;
      
      if (isRed && zoneStart === null) {
        zoneStart = slot.hour;
      } else if (!isRed && zoneStart !== null) {
        // Close the zone
        redZones.push({
          day,
          startHour: zoneStart,
          endHour: slot.hour,
          severity: daySlots.filter(s => s.hour >= zoneStart && s.hour < slot.hour)
            .some(s => s.collisionDensity >= 85) ? 'critical' : 'high'
        });
        zoneStart = null;
      }
    });
    
    // Close any open zone at end of day
    if (zoneStart !== null) {
      redZones.push({
        day,
        startHour: zoneStart,
        endHour: WORK_HOURS.end,
        severity: daySlots.filter(s => s.hour >= zoneStart)
          .some(s => s.collisionDensity >= 85) ? 'critical' : 'high'
      });
    }
  }

  return redZones;
}

/**
 * Identify available focus windows
 * @param {Array} heatmap - Heatmap grid
 * @returns {Array} - Focus window definitions
 */
export function identifyFocusWindows(heatmap) {
  const focusWindows = [];
  
  for (let day = 0; day < 5; day++) {
    const daySlots = heatmap.filter(s => s.day === day);
    let windowStart = null;
    let quality = 'good';
    
    daySlots.forEach((slot, idx) => {
      const isAvailable = slot.collisionDensity <= 30;
      const isModerate = slot.collisionDensity > 30 && slot.collisionDensity <= 50;
      
      if ((isAvailable || isModerate) && windowStart === null) {
        windowStart = slot.hour;
        quality = isAvailable ? 'good' : 'moderate';
      } else if (!isAvailable && !isModerate && windowStart !== null) {
        // Only save windows of 90+ minutes (at least 2 hours)
        if (slot.hour - windowStart >= 2) {
          focusWindows.push({
            day,
            startHour: windowStart,
            endHour: slot.hour,
            quality
          });
        }
        windowStart = null;
      } else if (windowStart !== null && isModerate && quality === 'good') {
        // Downgrade quality
        quality = 'moderate';
      }
    });
    
    // Close any open window at end of day
    if (windowStart !== null && (WORK_HOURS.end - windowStart) >= 2) {
      focusWindows.push({
        day,
        startHour: windowStart,
        endHour: WORK_HOURS.end,
        quality
      });
    }
  }

  return focusWindows;
}

/**
 * Calculate summary statistics
 * @param {Array} heatmap - Heatmap grid
 * @param {Array} redZones - Red zones
 * @param {Array} focusWindows - Focus windows
 * @returns {Object} - Summary stats
 */
function calculateSummary(heatmap, redZones, focusWindows) {
  const totalSlots = heatmap.length;
  const highCollisionSlots = heatmap.filter(s => s.collisionDensity >= 70).length;
  const lowCollisionSlots = heatmap.filter(s => s.collisionDensity <= 30).length;
  
  const redZoneHours = redZones.reduce((sum, z) => sum + (z.endHour - z.startHour), 0);
  const focusWindowHours = focusWindows.reduce((sum, w) => sum + (w.endHour - w.startHour), 0);
  
  return {
    totalWorkHours: totalSlots, // 50 hours per week (5 days × 10 hours)
    redZoneHours,
    focusWindowHours,
    congestionRate: Math.round((highCollisionSlots / totalSlots) * 100),
    focusAvailabilityRate: Math.round((lowCollisionSlots / totalSlots) * 100),
    worstDay: findWorstDay(heatmap),
    bestDay: findBestDay(heatmap)
  };
}

/**
 * Find the worst day for focus
 * @param {Array} heatmap - Heatmap grid
 * @returns {number} - Day index (0 = Monday)
 */
function findWorstDay(heatmap) {
  const dayScores = [0, 1, 2, 3, 4].map(day => {
    const daySlots = heatmap.filter(s => s.day === day);
    return daySlots.reduce((sum, s) => sum + s.collisionDensity, 0) / daySlots.length;
  });
  
  return dayScores.indexOf(Math.max(...dayScores));
}

/**
 * Find the best day for focus
 * @param {Array} heatmap - Heatmap grid
 * @returns {number} - Day index (0 = Monday)
 */
function findBestDay(heatmap) {
  const dayScores = [0, 1, 2, 3, 4].map(day => {
    const daySlots = heatmap.filter(s => s.day === day);
    return daySlots.reduce((sum, s) => sum + s.collisionDensity, 0) / daySlots.length;
  });
  
  return dayScores.indexOf(Math.min(...dayScores));
}

/**
 * Compute Meeting Collision Heatmap for a team
 * @param {string} teamId - Team ID
 * @param {Array} meetings - Calendar events for the week
 * @param {Object} options - Configuration options
 * @returns {Object} - Complete heatmap analysis
 */
export async function computeMeetingCollision(teamId, meetings = [], options = {}) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  const teamSize = options.teamSize || team.metadata?.actualSize || 5;

  // Build heatmap
  const heatmap = buildHeatmapGrid(meetings, teamSize);

  // Identify zones
  const redZones = identifyRedZones(heatmap);
  const focusWindows = identifyFocusWindows(heatmap);

  // Calculate summary
  const summary = calculateSummary(heatmap, redZones, focusWindows);

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
    
    heatmap,
    redZones,
    focusWindows,
    
    summary
  };
}

/**
 * Store Meeting Collision data
 * @param {Object} collisionData - Collision calculation result
 * @returns {Object} - Saved document
 */
export async function storeMeetingCollision(collisionData) {
  const weekStart = new Date(collisionData.weekStart);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const existing = await MeetingCollision.findOne({
    teamId: collisionData.teamId,
    weekStart: { $gte: weekStart, $lt: weekEnd }
  });

  if (existing) {
    Object.assign(existing, collisionData);
    return existing.save();
  }

  return MeetingCollision.create(collisionData);
}

/**
 * Get Meeting Collision history
 * @param {string} teamId - Team ID
 * @param {number} weeks - Number of weeks to fetch
 * @returns {Array} - Historical data
 */
export async function getMeetingCollisionHistory(teamId, weeks = 8) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - weeks * 7);

  return MeetingCollision.find({
    teamId,
    weekStart: { $gte: startDate }
  }).sort({ weekStart: 1 });
}

/**
 * Get latest Meeting Collision for a team
 * @param {string} teamId - Team ID
 * @returns {Object} - Latest data
 */
export async function getLatestMeetingCollision(teamId) {
  return MeetingCollision.findOne({ teamId }).sort({ weekStart: -1 });
}

/**
 * Format heatmap for frontend visualization
 * @param {Array} heatmap - Raw heatmap data
 * @returns {Object} - Formatted for display
 */
export function formatHeatmapForDisplay(heatmap) {
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = [];
  for (let h = WORK_HOURS.start; h < WORK_HOURS.end; h++) {
    hours.push(`${h}:00`);
  }

  // Convert to 2D array for easier rendering
  const grid = dayNames.map((name, dayIndex) => ({
    day: name,
    slots: heatmap
      .filter(s => s.day === dayIndex)
      .map(s => ({
        hour: s.hour,
        density: s.collisionDensity,
        status: s.collisionDensity >= 70 ? 'red' : 
                s.collisionDensity >= 40 ? 'yellow' : 'green'
      }))
  }));

  return { grid, hours, dayNames };
}

export default {
  computeMeetingCollision,
  storeMeetingCollision,
  getMeetingCollisionHistory,
  getLatestMeetingCollision,
  buildHeatmapGrid,
  identifyRedZones,
  identifyFocusWindows,
  formatHeatmapForDisplay
};
