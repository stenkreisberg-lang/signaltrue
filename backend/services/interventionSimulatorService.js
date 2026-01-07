/**
 * Intervention Simulator Service (What-If Engine)
 * Lets teams see impact before enforcing change
 * 
 * Simulations:
 * - Remove selected meetings
 * - Shorten meetings (60 → 25/50)
 * - Insert no-meeting blocks
 * 
 * Recalculates:
 * - Focus time
 * - Fragmentation
 * - After-hours load
 */

import Team from '../models/team.js';
import { calculateFocusBlocks, calculateFragmentationIndex } from './focusForecastService.js';
import { calculateAfterHoursActivity } from './afterHoursCostService.js';

/**
 * Intervention types
 */
export const INTERVENTION_TYPES = {
  REMOVE_MEETING: 'remove_meeting',
  SHORTEN_MEETING: 'shorten_meeting',
  ADD_FOCUS_BLOCK: 'add_focus_block',
  NO_MEETING_DAY: 'no_meeting_day',
  CONSOLIDATE_MEETINGS: 'consolidate_meetings'
};

/**
 * Apply meeting removal intervention
 * @param {Array} meetings - Original meetings
 * @param {Object} params - { meetingIds: [] }
 * @returns {Array} - Modified meetings
 */
function applyRemoveMeeting(meetings, params) {
  const idsToRemove = new Set(params.meetingIds || []);
  return meetings.filter(m => !idsToRemove.has(m.id));
}

/**
 * Apply meeting shortening intervention
 * @param {Array} meetings - Original meetings
 * @param {Object} params - { targetDuration: 25|50, meetingIds?: [] }
 * @returns {Array} - Modified meetings
 */
function applyShortenMeeting(meetings, params) {
  const targetDuration = params.targetDuration || 25;
  const targetIds = params.meetingIds ? new Set(params.meetingIds) : null;
  
  return meetings.map(m => {
    if (targetIds && !targetIds.has(m.id)) return m;
    
    const currentDuration = m.durationMinutes || 60;
    
    // Only shorten if meeting is longer than target
    if (currentDuration > targetDuration) {
      return {
        ...m,
        durationMinutes: targetDuration,
        endTime: new Date(new Date(m.startTime).getTime() + targetDuration * 60000).toISOString()
      };
    }
    return m;
  });
}

/**
 * Apply focus block insertion
 * @param {Array} meetings - Original meetings
 * @param {Object} params - { day: 0-4, startHour: 9, endHour: 12 }
 * @returns {Array} - Modified meetings (removing conflicts)
 */
function applyAddFocusBlock(meetings, params) {
  const { day, startHour, endHour } = params;
  
  return meetings.filter(m => {
    const meetingStart = new Date(m.startTime);
    const meetingDay = meetingStart.getDay() - 1; // Convert to Mon=0
    if (meetingDay < 0 || meetingDay > 4) return true; // Keep weekend meetings
    if (meetingDay !== day) return true;
    
    const meetingHour = meetingStart.getHours();
    const meetingEndHour = meetingHour + ((m.durationMinutes || 60) / 60);
    
    // Remove if meeting overlaps with focus block
    return !(meetingHour < endHour && meetingEndHour > startHour);
  });
}

/**
 * Apply no-meeting day intervention
 * @param {Array} meetings - Original meetings
 * @param {Object} params - { day: 0-4 (Mon-Fri) }
 * @returns {Array} - Modified meetings
 */
function applyNoMeetingDay(meetings, params) {
  const targetDay = params.day;
  
  return meetings.filter(m => {
    const meetingStart = new Date(m.startTime);
    const meetingDay = meetingStart.getDay() - 1; // Convert to Mon=0
    return meetingDay !== targetDay;
  });
}

/**
 * Apply meeting consolidation (group similar meetings)
 * @param {Array} meetings - Original meetings
 * @param {Object} params - { targetDays: [1, 3] } // Tue, Thu
 * @returns {Array} - Modified meetings
 */
function applyConsolidateMeetings(meetings, params) {
  const targetDays = new Set(params.targetDays || [1, 3]); // Default Tue/Thu
  
  // Identify recurring meetings
  const recurring = meetings.filter(m => m.isRecurring);
  const adHoc = meetings.filter(m => !m.isRecurring);
  
  // Move recurring meetings to target days (simulation - just count impact)
  // In reality, this would redistribute meetings
  const movedRecurring = recurring.filter(m => {
    const day = new Date(m.startTime).getDay() - 1;
    return targetDays.has(day);
  });
  
  return [...movedRecurring, ...adHoc];
}

/**
 * Apply an intervention to meetings
 * @param {Array} meetings - Original meetings
 * @param {Object} intervention - { type, params }
 * @returns {Array} - Modified meetings
 */
export function applyIntervention(meetings, intervention) {
  switch (intervention.type) {
    case INTERVENTION_TYPES.REMOVE_MEETING:
      return applyRemoveMeeting(meetings, intervention.params);
    case INTERVENTION_TYPES.SHORTEN_MEETING:
      return applyShortenMeeting(meetings, intervention.params);
    case INTERVENTION_TYPES.ADD_FOCUS_BLOCK:
      return applyAddFocusBlock(meetings, intervention.params);
    case INTERVENTION_TYPES.NO_MEETING_DAY:
      return applyNoMeetingDay(meetings, intervention.params);
    case INTERVENTION_TYPES.CONSOLIDATE_MEETINGS:
      return applyConsolidateMeetings(meetings, intervention.params);
    default:
      return meetings;
  }
}

/**
 * Calculate metrics for a set of meetings
 * @param {Array} meetings - Meetings to analyze
 * @param {Array} messages - Messages for after-hours calculation
 * @returns {Object} - Calculated metrics
 */
function calculateMetrics(meetings, messages = []) {
  const focusBlocks = calculateFocusBlocks(meetings);
  const fragmentation = calculateFragmentationIndex(meetings, messages);
  const afterHoursActivity = calculateAfterHoursActivity(messages);
  
  // Calculate total meeting hours
  const totalMeetingMinutes = meetings.reduce((sum, m) => sum + (m.durationMinutes || 60), 0);
  const totalMeetingHours = totalMeetingMinutes / 60;
  
  // Calculate focus time (assuming 8h workday, 5 days)
  const workHoursPerWeek = 40;
  const focusTimeHours = workHoursPerWeek - totalMeetingHours;
  const focusTimePercent = (focusTimeHours / workHoursPerWeek) * 100;

  return {
    focusBlocks: Math.round(focusBlocks * 10) / 10,
    focusTimeHours: Math.round(focusTimeHours * 10) / 10,
    focusTimePercent: Math.round(focusTimePercent),
    fragmentation: Math.round(fragmentation * 10) / 10,
    meetingHours: Math.round(totalMeetingHours * 10) / 10,
    meetingCount: meetings.length,
    afterHoursHours: afterHoursActivity.afterHoursHours
  };
}

/**
 * Calculate percentage change between two values
 * @param {number} before - Before value
 * @param {number} after - After value
 * @returns {number} - Percentage change
 */
function percentChange(before, after) {
  if (before === 0) return after > 0 ? 100 : 0;
  return Math.round(((after - before) / before) * 1000) / 10;
}

/**
 * Run simulation with interventions
 * @param {string} teamId - Team ID
 * @param {Array} meetings - Current meetings
 * @param {Array} interventions - List of interventions to apply
 * @param {Object} options - Additional options
 * @returns {Object} - Before/after comparison
 */
export async function runSimulation(teamId, meetings, interventions = [], options = {}) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  const messages = options.messages || [];

  // Calculate baseline metrics
  const beforeMetrics = calculateMetrics(meetings, messages);

  // Apply all interventions in sequence
  let modifiedMeetings = [...meetings];
  const appliedInterventions = [];

  for (const intervention of interventions) {
    const beforeCount = modifiedMeetings.length;
    modifiedMeetings = applyIntervention(modifiedMeetings, intervention);
    
    appliedInterventions.push({
      ...intervention,
      meetingsAffected: beforeCount - modifiedMeetings.length
    });
  }

  // Calculate post-intervention metrics
  const afterMetrics = calculateMetrics(modifiedMeetings, messages);

  // Calculate deltas
  const deltas = {
    focusBlocks: percentChange(beforeMetrics.focusBlocks, afterMetrics.focusBlocks),
    focusTimePercent: afterMetrics.focusTimePercent - beforeMetrics.focusTimePercent,
    fragmentation: percentChange(beforeMetrics.fragmentation, afterMetrics.fragmentation),
    meetingHours: percentChange(beforeMetrics.meetingHours, afterMetrics.meetingHours),
    afterHoursHours: percentChange(beforeMetrics.afterHoursHours, afterMetrics.afterHoursHours)
  };

  // Generate summary message
  const summaryParts = [];
  if (deltas.focusTimePercent > 0) {
    summaryParts.push(`focus time +${deltas.focusTimePercent}%`);
  }
  if (deltas.fragmentation < 0) {
    summaryParts.push(`fragmentation ${deltas.fragmentation}%`);
  }
  if (deltas.meetingHours < 0) {
    summaryParts.push(`meeting hours ${deltas.meetingHours}%`);
  }

  const summaryMessage = summaryParts.length > 0
    ? `If applied: ${summaryParts.join(', ')}`
    : 'No significant impact detected';

  return {
    teamId,
    orgId: team.orgId,
    simulatedAt: new Date(),
    
    before: beforeMetrics,
    after: afterMetrics,
    deltas,
    
    interventions: appliedInterventions,
    meetingsRemoved: meetings.length - modifiedMeetings.length,
    
    summaryMessage,
    
    // Impact assessment
    impact: {
      focusTimeGained: Math.max(0, afterMetrics.focusTimeHours - beforeMetrics.focusTimeHours),
      meetingsReduced: meetings.length - modifiedMeetings.length,
      fragmentationReduced: Math.max(0, beforeMetrics.fragmentation - afterMetrics.fragmentation),
      isPositive: deltas.focusTimePercent > 0 || deltas.fragmentation < 0
    }
  };
}

/**
 * Generate preset interventions
 * @returns {Array} - Common intervention presets
 */
export function getInterventionPresets() {
  return [
    {
      id: 'shorten_to_25',
      name: 'Shorten all 60-min meetings to 25 min',
      description: 'Apply the 25-minute meeting rule',
      intervention: {
        type: INTERVENTION_TYPES.SHORTEN_MEETING,
        params: { targetDuration: 25 }
      }
    },
    {
      id: 'shorten_to_50',
      name: 'Shorten all 60-min meetings to 50 min',
      description: 'Give 10 minutes back between meetings',
      intervention: {
        type: INTERVENTION_TYPES.SHORTEN_MEETING,
        params: { targetDuration: 50 }
      }
    },
    {
      id: 'no_meeting_friday',
      name: 'No-Meeting Friday',
      description: 'Clear all Friday meetings for focus work',
      intervention: {
        type: INTERVENTION_TYPES.NO_MEETING_DAY,
        params: { day: 4 } // Friday
      }
    },
    {
      id: 'no_meeting_wednesday',
      name: 'No-Meeting Wednesday',
      description: 'Mid-week focus day',
      intervention: {
        type: INTERVENTION_TYPES.NO_MEETING_DAY,
        params: { day: 2 } // Wednesday
      }
    },
    {
      id: 'morning_focus_block',
      name: 'Morning Focus Block (9-12)',
      description: 'Protect mornings for deep work',
      intervention: {
        type: INTERVENTION_TYPES.ADD_FOCUS_BLOCK,
        params: { day: null, startHour: 9, endHour: 12 } // All days
      }
    },
    {
      id: 'afternoon_focus_block',
      name: 'Afternoon Focus Block (2-5)',
      description: 'Protect afternoons for deep work',
      intervention: {
        type: INTERVENTION_TYPES.ADD_FOCUS_BLOCK,
        params: { day: null, startHour: 14, endHour: 17 }
      }
    },
    {
      id: 'consolidate_to_tue_thu',
      name: 'Consolidate to Tue/Thu',
      description: 'Move recurring meetings to meeting days',
      intervention: {
        type: INTERVENTION_TYPES.CONSOLIDATE_MEETINGS,
        params: { targetDays: [1, 3] } // Tuesday, Thursday
      }
    }
  ];
}

/**
 * Apply focus block to all days
 * @param {Array} meetings - Original meetings
 * @param {Object} params - { startHour, endHour }
 * @returns {Array} - Modified meetings
 */
function applyFocusBlockAllDays(meetings, params) {
  let result = meetings;
  for (let day = 0; day < 5; day++) {
    result = applyAddFocusBlock(result, { ...params, day });
  }
  return result;
}

export default {
  runSimulation,
  applyIntervention,
  getInterventionPresets,
  INTERVENTION_TYPES
};
