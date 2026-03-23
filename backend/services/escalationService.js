/**
 * Escalation Service
 * 
 * Implements tiered escalation logic for team status:
 * 
 *   Stable → Watch → Emerging Drift → Confirmed Drift → Escalating Risk
 * 
 * Status is driven by:
 * - Number of deteriorating metrics
 * - Persistence across multiple weeks
 * - Spillover into after-hours
 * - Focus/recovery compression
 * - Confidence level
 * 
 * Each level has a defined notification action:
 * - Watch: notify HR in weekly report only
 * - Emerging Drift: suggest manager review
 * - Confirmed Drift: recommend HRBP follow-up and intervention
 * - Escalating Risk: suggest formal work design review
 */

import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import WeekContext from '../models/weekContext.js';

// ─── Status definitions ───
export const STATUS_LEVELS = {
  STABLE: 'Stable',
  WATCH: 'Watch',
  EMERGING_DRIFT: 'Emerging Drift',
  CONFIRMED_DRIFT: 'Confirmed Drift',
  ESCALATING_RISK: 'Escalating Risk',
};

const STATUS_ORDER = [
  STATUS_LEVELS.STABLE,
  STATUS_LEVELS.WATCH,
  STATUS_LEVELS.EMERGING_DRIFT,
  STATUS_LEVELS.CONFIRMED_DRIFT,
  STATUS_LEVELS.ESCALATING_RISK,
];

const STATUS_META = {
  [STATUS_LEVELS.STABLE]: {
    color: '#10b981',
    icon: '🟢',
    action: 'No intervention needed. Continue monitoring.',
    notifyLevel: 'report_only',
  },
  [STATUS_LEVELS.WATCH]: {
    color: '#f59e0b',
    icon: '🟡',
    action: 'Monitor trends. Notify HR in weekly report.',
    notifyLevel: 'report_only',
  },
  [STATUS_LEVELS.EMERGING_DRIFT]: {
    color: '#f97316',
    icon: '🟠',
    action: 'Suggest manager review. Flag in weekly report.',
    notifyLevel: 'suggest_manager_review',
  },
  [STATUS_LEVELS.CONFIRMED_DRIFT]: {
    color: '#ef4444',
    icon: '🔴',
    action: 'Recommend HRBP follow-up and intervention.',
    notifyLevel: 'recommend_hrbp',
  },
  [STATUS_LEVELS.ESCALATING_RISK]: {
    color: '#991b1b',
    icon: '🔴',
    action: 'Formal work design review and manager accountability check.',
    notifyLevel: 'escalate_leadership',
  },
};

/**
 * Calculate team status based on metric history
 * 
 * @param {Object} params
 * @param {Object} params.currentMetrics - This week's metrics
 * @param {Object} params.previousMetrics - Last week's metrics
 * @param {Array}  params.weeklyHistory - Array of weekly metric snapshots (up to 6 weeks)
 * @param {Object} params.baseline - Team baseline (mean/stdDev/p25/p75)
 * @param {Array}  params.contextTags - Week context tags that may reduce confidence
 * @param {Object} params.bdiData - Current BDI data if available
 * @returns {Object} { status, confidence, reason, deterioratingMetrics, weeksPersisted, escalationAction }
 */
export function calculateTeamStatus({
  currentMetrics = {},
  previousMetrics = {},
  weeklyHistory = [],
  baseline = {},
  contextTags = [],
  bdiData = null,
}) {
  // ─── Identify deteriorating metrics ───
  const deteriorating = [];
  
  // Check each key metric for deterioration (current > baseline upper band or significant WoW worsening)
  const metricChecks = [
    { key: 'meetingHours', curr: currentMetrics.meetingHours, prev: previousMetrics.meetingHours, higherIsBad: true },
    { key: 'backToBack', curr: currentMetrics.backToBack, prev: previousMetrics.backToBack, higherIsBad: true },
    { key: 'afterHoursRatio', curr: currentMetrics.afterHoursRatio, prev: previousMetrics.afterHoursRatio, higherIsBad: true },
    { key: 'focusTimeAvailability', curr: currentMetrics.focusTimeAvailability, prev: previousMetrics.focusTimeAvailability, higherIsBad: false },
    { key: 'calendarFragmentation', curr: currentMetrics.calendarFragmentation, prev: previousMetrics.calendarFragmentation, higherIsBad: true },
    { key: 'recurringBurden', curr: currentMetrics.recurringBurden, prev: previousMetrics.recurringBurden, higherIsBad: true },
    { key: 'asyncVolume', curr: currentMetrics.asyncVolume, prev: previousMetrics.asyncVolume, higherIsBad: false },
  ];
  
  for (const check of metricChecks) {
    if (check.curr == null) continue;
    
    const worsening = check.higherIsBad
      ? (check.prev != null && check.prev > 0 && ((check.curr - check.prev) / check.prev) > 0.15)
      : (check.prev != null && check.prev > 0 && ((check.prev - check.curr) / check.prev) > 0.15);
    
    if (worsening) {
      deteriorating.push(check.key);
    }
  }
  
  // ─── Check persistence (how many consecutive weeks have metrics been worsening) ───
  let weeksPersisted = 0;
  if (weeklyHistory.length >= 2) {
    // Count consecutive weeks with 2+ deteriorating metrics
    for (let i = 0; i < Math.min(weeklyHistory.length - 1, 6); i++) {
      const thisWeek = weeklyHistory[i];
      const prevWeek = weeklyHistory[i + 1];
      if (!thisWeek || !prevWeek) break;
      
      let badCount = 0;
      if (thisWeek.meetingHours > prevWeek.meetingHours * 1.1) badCount++;
      if (thisWeek.backToBack > prevWeek.backToBack * 1.1) badCount++;
      if (thisWeek.afterHoursRatio > prevWeek.afterHoursRatio * 1.1) badCount++;
      if (thisWeek.focusTimeAvailability < prevWeek.focusTimeAvailability * 0.9) badCount++;
      if (thisWeek.calendarFragmentation > prevWeek.calendarFragmentation * 1.1) badCount++;
      
      if (badCount >= 2) {
        weeksPersisted++;
      } else {
        break;
      }
    }
  }
  
  // ─── Check spillover indicators ───
  const hasAfterHoursSpillover = (currentMetrics.afterHoursRatio || 0) > 0.25;
  const hasFocusCompression = (currentMetrics.focusTimeAvailability || 40) < 15; // less than 15 hours
  const hasHighFragmentation = (currentMetrics.calendarFragmentation || 0) > 65;
  
  // ─── Calculate confidence ───
  let confidence = 'Medium';
  const supportingSignals = deteriorating.length;
  
  if (supportingSignals >= 4 && weeksPersisted >= 2) {
    confidence = 'High';
  } else if (supportingSignals >= 2 && weeksPersisted >= 1) {
    confidence = 'Medium';
  } else {
    confidence = 'Low';
  }
  
  // Reduce confidence if context tags present
  if (contextTags.length > 0) {
    const significantTags = contextTags.filter(t => t.confidenceReduction === 'significant');
    const moderateTags = contextTags.filter(t => t.confidenceReduction === 'moderate');
    if (significantTags.length > 0 && confidence === 'High') confidence = 'Medium';
    else if (significantTags.length > 0 && confidence === 'Medium') confidence = 'Low';
    else if (moderateTags.length > 0 && confidence === 'High') confidence = 'Medium';
  }
  
  // ─── Determine status ───
  let status;
  let reason;
  
  const detCount = deteriorating.length;
  
  if (detCount === 0 && weeksPersisted === 0) {
    // Stable: no meaningful negative movement
    status = STATUS_LEVELS.STABLE;
    reason = 'No meaningful negative movement. Work patterns within normal range.';
    
  } else if (detCount <= 2 && weeksPersisted === 0) {
    // Watch: 1-2 metrics deteriorating, only 1-week signal
    status = STATUS_LEVELS.WATCH;
    reason = `${detCount} metric(s) showed negative movement this week: ${deteriorating.join(', ')}. One-week signal only — monitoring.`;
    
  } else if (detCount >= 3 || (detCount >= 2 && weeksPersisted >= 1)) {
    // Emerging Drift: 3+ metrics deteriorating, or 2 metrics for 2 consecutive weeks
    if (weeksPersisted >= 2 && (hasAfterHoursSpillover || hasFocusCompression)) {
      // Confirmed Drift: sustained 3+ week pattern with cross-metric reinforcement
      if (weeksPersisted >= 3 && hasAfterHoursSpillover && hasFocusCompression) {
        // Escalating Risk
        status = STATUS_LEVELS.ESCALATING_RISK;
        reason = `Sustained drift for ${weeksPersisted}+ weeks. After-hours elevated, focus time compressed, ${detCount} metrics deteriorating. Formal review recommended.`;
      } else {
        status = STATUS_LEVELS.CONFIRMED_DRIFT;
        reason = `Sustained ${weeksPersisted}-week pattern. ${detCount} deteriorating metrics with ${hasAfterHoursSpillover ? 'after-hours spillover' : 'focus compression'}. HRBP follow-up recommended.`;
      }
    } else {
      status = STATUS_LEVELS.EMERGING_DRIFT;
      reason = `${detCount} metrics deteriorating${weeksPersisted > 0 ? ` for ${weeksPersisted + 1} consecutive weeks` : ''}. Evidence of coordination pressure building.`;
    }
    
  } else {
    status = STATUS_LEVELS.WATCH;
    reason = `${detCount} metric(s) with negative movement. Monitoring for persistence.`;
  }
  
  // ─── BDI override: if BDI is in Critical Drift, escalate ───
  if (bdiData?.driftState === 'Critical Drift' && STATUS_ORDER.indexOf(status) < STATUS_ORDER.indexOf(STATUS_LEVELS.CONFIRMED_DRIFT)) {
    status = STATUS_LEVELS.CONFIRMED_DRIFT;
    reason = `BDI indicates Critical Drift (score: ${bdiData.driftScore}/100). ${reason}`;
    confidence = 'High';
  }
  
  const meta = STATUS_META[status];
  
  return {
    status,
    confidence,
    reason,
    deterioratingMetrics: deteriorating,
    weeksPersisted,
    escalationAction: meta.action,
    notifyLevel: meta.notifyLevel,
    color: meta.color,
    icon: meta.icon,
  };
}

/**
 * Get the status metadata for a given status label
 */
export function getStatusMeta(status) {
  return STATUS_META[status] || STATUS_META[STATUS_LEVELS.STABLE];
}

export default {
  calculateTeamStatus,
  getStatusMeta,
  STATUS_LEVELS,
};
