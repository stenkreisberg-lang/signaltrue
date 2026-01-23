/**
 * Context Switching Index Service
 * Category-defining signal per Category King spec
 * 
 * Formula:
 * context_switching_index = (meetings_per_day + slack_threads_active_per_day + tasks_touched_per_day)
 * Compare vs baseline, track trend
 * 
 * Thresholds:
 * - Warning: +25% vs baseline
 * - Critical: +40% vs baseline
 */

import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

const THRESHOLDS = {
  WARNING: 0.25,  // 25% increase
  CRITICAL: 0.40  // 40% increase
};

/**
 * Calculate Context Switching Index for a team
 * @param {string} teamId - Team ID
 * @param {number} periodDays - Days to analyze (default 7)
 * @returns {Object} - CSI calculation with severity and trend
 */
export async function calculateContextSwitchingIndex(teamId, periodDays = 7) {
  try {
    const team = await Team.findById(teamId);
    if (!team) {
      throw new Error('Team not found');
    }
    
    const baseline = team.baseline?.signals || {};
    
    // Get recent metrics
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    
    const recentMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: since }
    }).sort({ date: -1 });
    
    if (recentMetrics.length === 0) {
      return {
        hasData: false,
        message: 'Insufficient data for Context Switching Index'
      };
    }
    
    // Calculate components
    const avgMeetingsPerDay = average(recentMetrics.map(m => m.meetingsPerDay || m.meetingCount || 0));
    const avgSlackThreadsPerDay = average(recentMetrics.map(m => m.slackThreadsActive || m.messageCount / 10 || 0));
    const avgTasksTouchedPerDay = average(recentMetrics.map(m => m.tasksTouched || 5)); // Placeholder until Jira integration
    
    const currentCSI = avgMeetingsPerDay + avgSlackThreadsPerDay + avgTasksTouchedPerDay;
    
    // Calculate baseline CSI
    const baselineMeetings = baseline.meetingsPerDay || avgMeetingsPerDay * 0.8;
    const baselineThreads = baseline.slackThreadsActive || avgSlackThreadsPerDay * 0.8;
    const baselineTasks = baseline.tasksTouched || avgTasksTouchedPerDay * 0.8;
    const baselineCSI = baselineMeetings + baselineThreads + baselineTasks;
    
    // Calculate delta
    const deltaPercent = baselineCSI > 0 
      ? ((currentCSI - baselineCSI) / baselineCSI)
      : 0;
    
    // Determine severity
    let severity = 'INFO';
    let status = 'stable';
    
    if (deltaPercent >= THRESHOLDS.CRITICAL) {
      severity = 'CRITICAL';
      status = 'worsening';
    } else if (deltaPercent >= THRESHOLDS.WARNING) {
      severity = 'RISK';
      status = 'worsening';
    } else if (deltaPercent <= -0.1) {
      status = 'improving';
    }
    
    // Direction indicator
    const direction = deltaPercent > 0.05 ? 'worsening' 
                    : deltaPercent < -0.05 ? 'improving' 
                    : 'stable';
    
    return {
      hasData: true,
      teamId,
      teamName: team.name,
      signalType: 'context_switching',
      signalCategory: 'coordination',
      sources: ['slack', 'calendar'],
      
      currentValue: Math.round(currentCSI * 10) / 10,
      baselineValue: Math.round(baselineCSI * 10) / 10,
      deltaPercent: Math.round(deltaPercent * 100),
      direction,
      
      severity,
      status,
      
      // Component breakdown
      components: {
        meetingsPerDay: Math.round(avgMeetingsPerDay * 10) / 10,
        slackThreadsPerDay: Math.round(avgSlackThreadsPerDay * 10) / 10,
        tasksTouchedPerDay: Math.round(avgTasksTouchedPerDay * 10) / 10
      },
      
      // Why this matters
      interpretation: generateCSIInterpretation(deltaPercent, currentCSI),
      
      // Suggested intervention
      suggestedAction: deltaPercent >= THRESHOLDS.WARNING 
        ? 'Consider reducing meeting frequency or consolidating communication channels'
        : null,
      
      calculatedAt: new Date()
    };
    
  } catch (error) {
    console.error('[ContextSwitching] Error:', error);
    throw error;
  }
}

/**
 * Helper: Calculate average
 */
function average(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Helper: Generate interpretation text
 */
function generateCSIInterpretation(deltaPercent, currentCSI) {
  if (deltaPercent >= THRESHOLDS.CRITICAL) {
    return `Critical context switching load. Team members are juggling ${Math.round(currentCSI)} activities per day, ${Math.round(deltaPercent * 100)}% above baseline. This level of fragmentation typically leads to shallow work and decision fatigue.`;
  }
  
  if (deltaPercent >= THRESHOLDS.WARNING) {
    return `Elevated context switching. Activities per day have increased ${Math.round(deltaPercent * 100)}% vs baseline. Consider consolidating touchpoints.`;
  }
  
  if (deltaPercent <= -0.1) {
    return `Context switching is improving. Team has ${Math.round(Math.abs(deltaPercent) * 100)}% fewer daily interruptions than baseline.`;
  }
  
  return `Context switching is within normal range at ${Math.round(currentCSI)} activities per day.`;
}

export default {
  calculateContextSwitchingIndex,
  THRESHOLDS
};
