/**
 * First Signal Service
 * Computes ONE early-warning signal immediately after user connects integrations
 * Priority order: Meeting Load deviation → After-hours trend → Response latency
 * Must execute in <5 seconds to enable "Moment of Unease" onboarding
 */

import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

/**
 * Compute the first signal for a team immediately after integration connect
 * Returns the highest-priority signal that shows drift
 * 
 * @param {ObjectId} teamId - Team to analyze
 * @param {ObjectId} orgId - Organization context
 * @returns {Object|null} - { signalType, value, baseline, delta, statement, context, severity }
 */
export async function computeFirstSignal(teamId, orgId) {
  try {
    const startTime = Date.now();
    
    // Fetch team baseline and recent metrics (last 4 weeks)
    const team = await Team.findById(teamId).select('baseline name');
    if (!team || !team.baseline) {
      return null; // No baseline yet, cannot compute signal
    }

    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const recentMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: fourWeeksAgo }
    })
      .sort({ date: -1 })
      .limit(28)
      .select('meetingLoadIndex afterHoursActivity responseLatency date');

    if (recentMetrics.length < 7) {
      return null; // Not enough data for meaningful signal
    }

    const baseline = team.baseline;

    // Priority 1: Meeting Load Deviation
    const meetingLoadSignal = checkMeetingLoadDeviation(recentMetrics, baseline, team.name);
    if (meetingLoadSignal) {
      console.log(`[FirstSignal] Meeting Load signal found in ${Date.now() - startTime}ms`);
      return meetingLoadSignal;
    }

    // Priority 2: After-Hours Activity Trend
    const afterHoursSignal = checkAfterHoursTrend(recentMetrics, baseline, team.name);
    if (afterHoursSignal) {
      console.log(`[FirstSignal] After-Hours signal found in ${Date.now() - startTime}ms`);
      return afterHoursSignal;
    }

    // Priority 3: Response Latency Increase
    const responseLatencySignal = checkResponseLatency(recentMetrics, baseline, team.name);
    if (responseLatencySignal) {
      console.log(`[FirstSignal] Response Latency signal found in ${Date.now() - startTime}ms`);
      return responseLatencySignal;
    }

    console.log(`[FirstSignal] No drift detected in ${Date.now() - startTime}ms`);
    return null; // No drift detected
  } catch (error) {
    console.error('[FirstSignal] Error computing first signal:', error);
    return null;
  }
}

/**
 * Check for Meeting Load deviation vs baseline
 * Triggers if recent average exceeds baseline by >20%
 */
function checkMeetingLoadDeviation(metrics, baseline, teamName) {
  if (!baseline.meetingLoadIndex) return null;

  // Calculate recent average (last 2 weeks)
  const recentTwoWeeks = metrics.slice(0, 14);
  const validMeetings = recentTwoWeeks.filter(m => m.meetingLoadIndex != null);
  
  if (validMeetings.length < 5) return null;

  const recentAvg = validMeetings.reduce((sum, m) => sum + m.meetingLoadIndex, 0) / validMeetings.length;
  const baselineValue = baseline.meetingLoadIndex;
  const delta = ((recentAvg - baselineValue) / baselineValue) * 100;

  // Trigger threshold: >20% increase
  if (delta > 20) {
    return {
      signalType: 'coordination-risk', // NEW naming
      metricName: 'Meeting Load Index',
      value: recentAvg,
      baseline: baselineValue,
      delta: Math.round(delta),
      statement: `${teamName}'s meeting load increased by +${Math.round(delta)}% over the last 6 weeks.`,
      context: 'This pattern usually precedes focus loss and delivery delays.',
      severity: delta > 40 ? 'CRITICAL' : 'RISK',
      detectedAt: new Date()
    };
  }

  return null;
}

/**
 * Check for After-Hours Activity trend (last 4 weeks)
 * Triggers if showing upward trend >15% above baseline
 */
function checkAfterHoursTrend(metrics, baseline, teamName) {
  if (!baseline.afterHoursActivity) return null;

  const recentFourWeeks = metrics.slice(0, 28);
  const validAfterHours = recentFourWeeks.filter(m => m.afterHoursActivity != null);
  
  if (validAfterHours.length < 10) return null;

  const recentAvg = validAfterHours.reduce((sum, m) => sum + m.afterHoursActivity, 0) / validAfterHours.length;
  const baselineValue = baseline.afterHoursActivity;
  const delta = ((recentAvg - baselineValue) / baselineValue) * 100;

  // Trigger threshold: >15% increase
  if (delta > 15) {
    return {
      signalType: 'boundary-erosion', // NEW naming
      metricName: 'After-Hours Activity',
      value: recentAvg,
      baseline: baselineValue,
      delta: Math.round(delta),
      statement: `${teamName}'s after-hours activity increased by +${Math.round(delta)}% over the last 4 weeks.`,
      context: 'This pattern tends to precede burnout risk and disengagement.',
      severity: delta > 30 ? 'CRITICAL' : 'RISK',
      detectedAt: new Date()
    };
  }

  return null;
}

/**
 * Check for Response Latency increase
 * Triggers if recent average shows >25% increase vs baseline
 */
function checkResponseLatency(metrics, baseline, teamName) {
  if (!baseline.responseLatency) return null;

  const recentTwoWeeks = metrics.slice(0, 14);
  const validLatency = recentTwoWeeks.filter(m => m.responseLatency != null);
  
  if (validLatency.length < 5) return null;

  const recentAvg = validLatency.reduce((sum, m) => sum + m.responseLatency, 0) / validLatency.length;
  const baselineValue = baseline.responseLatency;
  const delta = ((recentAvg - baselineValue) / baselineValue) * 100;

  // Trigger threshold: >25% increase
  if (delta > 25) {
    return {
      signalType: 'execution-drag', // NEW naming
      metricName: 'Response Latency',
      value: recentAvg,
      baseline: baselineValue,
      delta: Math.round(delta),
      statement: `${teamName}'s response time increased by +${Math.round(delta)}% over the last 2 weeks.`,
      context: 'This pattern tends to precede delivery delays and quality issues.',
      severity: delta > 50 ? 'CRITICAL' : 'RISK',
      detectedAt: new Date()
    };
  }

  return null;
}

export default { computeFirstSignal };
