/**
 * Engagement Subscore Service
 *
 * Implements all 7 subscore formulas from spec Sections 10.1–10.7.
 *
 * Every subscore is derived by:
 *   1. Computing a robust z-score for each input metric against the team baseline.
 *   2. Converting the z-score to a 0–100 risk score via zToRiskScore().
 *   3. Applying the weighted sum from the spec formula.
 *
 * Direction handling (spec Section 8):
 *   - Higher is WORSE  → risk_z = robust_z              (e.g. after_hours_ratio)
 *   - Lower is WORSE   → risk_z = -robust_z             (e.g. focus_hours)
 *   - Two-sided risk   → risk_z = abs(robust_z)         (e.g. collaboration_breadth)
 *
 * Returns an object with all 7 scores (0–100) plus raw component z-scores
 * for the top-driver and pattern detection steps.
 */

import { robustZ, zToRiskScore } from './engagementBaselineService.js';

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compute all 7 subscores.
 *
 * @param {Object} weekly   — WeeklyMetrics from engagementWeeklyMetricsService
 * @param {Object} baseline — EngagementBaseline document (Mongoose lean object)
 * @returns {Object}        — { subscores, metricRisks }
 *   subscores: { recoveryDebt, focusErosion, ..., workloadVolatility }  (0–100 each)
 *   metricRisks: raw per-metric risk scores for driver/pattern detection
 */
export function calculateSubscores(weekly, baseline) {
  const bm = baseline?.metrics ?? {};

  // Compute risk score for every input metric used by any subscore
  const mr = buildMetricRisks(weekly, bm);

  const subscores = {
    recoveryDebt: calcRecoveryDebt(mr),
    focusErosion: calcFocusErosion(mr),
    coordinationFriction: calcCoordinationFriction(mr),
    responsivenessPressure: calcResponsivenessPressure(mr),
    collaborationWithdrawal: calcCollaborationWithdrawal(mr),
    managerSupportGap: calcManagerSupportGap(mr),
    workloadVolatility: calcWorkloadVolatility(mr),
  };

  return { subscores, metricRisks: mr };
}

// ── Metric Risk Builder ────────────────────────────────────────────────────────

/**
 * Compute a risk score (0–100) for every spec metric.
 * Each entry is also annotated with its direction and raw z-score for transparency.
 */
function buildMetricRisks(w, bm) {
  const hasCalendar = w.integrationCoverage?.hasCalendar === true;
  const hasMessaging = w.integrationCoverage?.hasMessaging === true;
  const hasEmail = w.integrationCoverage?.hasEmail === true;
  const risk = (field, key, sourceAvailable = true) =>
    sourceAvailable ? riskHigherWorse(w[field], bm[key]) : unavailable('source_unavailable');
  const riskInv = (field, key, sourceAvailable = true) =>
    sourceAvailable ? riskLowerWorse(w[field], bm[key]) : unavailable('source_unavailable');
  const riskTwo = (field, key, sourceAvailable = true) =>
    sourceAvailable ? riskTwoSided(w[field], bm[key]) : unavailable('source_unavailable');

  return {
    // ── Calendar ──────────────────────────────────────────────────────────────
    afterHoursMessageRatio: risk('afterHoursMessageRatio', 'afterHoursMessageRatio', hasMessaging),
    afterHoursEmailRatio: risk('afterHoursEmailRatio', 'afterHoursEmailRatio', hasEmail),

    // Focus
    focusHoursAvailablePerPerson: riskInv(
      'focusHoursAvailablePerPerson',
      'focusHoursAvailablePerPerson',
      hasCalendar
    ),
    fragmentedDayRatio: risk('fragmentedDayRatio', 'fragmentedDayRatio', hasCalendar),
    meetingHoursPerPerson: risk('meetingHoursPerPerson', 'meetingHoursPerPerson', hasCalendar),

    // Coordination
    attendeeHoursPerPerson: risk('attendeeHoursPerPerson', 'attendeeHoursPerPerson', hasCalendar),
    avgAttendeeCount: risk('avgAttendeeCount', 'avgAttendeeCount', hasCalendar),
    recurringMeetingRatio: risk('recurringMeetingRatio', 'recurringMeetingRatio', hasCalendar),

    // Responsiveness
    messagesSentPerPerson: riskTwo('messagesSentPerPerson', 'messagesSentPerPerson', hasMessaging),
    p90ResponseMinutes: risk('p90ResponseMinutes', 'p90ResponseMinutes', hasMessaging),

    // Collaboration
    uniqueCollaboratorsPerPerson: riskTwo(
      'uniqueCollaboratorsPerPerson',
      'uniqueCollaboratorsPerPerson',
      hasMessaging
    ),
    publicChannelRatio: riskInv('publicChannelRatio', 'publicChannelRatio', hasMessaging),
    reciprocityRatio: riskInv('reciprocityRatio', 'reciprocityRatio', hasMessaging),
    threadParticipationRate: riskInv(
      'threadParticipationRate',
      'threadParticipationRate',
      hasMessaging
    ),

    // Manager support
    manager1to1MinutesPerPerson: riskInv(
      'manager1to1MinutesPerPerson',
      'manager1to1MinutesPerPerson',
      hasCalendar
    ),

    // Workload volatility
    weekOverWeekMeetingLoadChange: riskTwo('weekOverWeekMeetingLoadChange', null, hasCalendar),
    weekOverWeekMessageVolumeChange: riskTwo('weekOverWeekMessageVolumeChange', null, hasMessaging),
    weekOverWeekAfterHoursChange: risk('weekOverWeekAfterHoursChange', null, hasCalendar),
    newRecurringMeetingsCount: risk('newRecurringMeetingsCount', null, hasCalendar),
    activitySpikeDays: risk('activitySpikeDays', null, hasCalendar || hasMessaging),
  };
}

// ── Subscore Formula Implementations ──────────────────────────────────────────

/** Outside-schedule messaging and email deviation. */
function calcRecoveryDebt(mr) {
  return weightedScore([
    [mr.afterHoursMessageRatio, 0.5],
    [mr.afterHoursEmailRatio, 0.5],
  ]);
}

/** Focus-availability deviation using metrics measured on the same scale as baseline. */
function calcFocusErosion(mr) {
  return weightedScore([
    [mr.focusHoursAvailablePerPerson, 0.4],
    [mr.fragmentedDayRatio, 0.3],
    [mr.meetingHoursPerPerson, 0.3],
  ]);
}

/** Coordination-metadata deviation using attendee load, meeting size, and recurrence. */
function calcCoordinationFriction(mr) {
  return weightedScore([
    [mr.attendeeHoursPerPerson, 0.4],
    [mr.avgAttendeeCount, 0.3],
    [mr.recurringMeetingRatio, 0.3],
  ]);
}

/** Messaging-volume, outside-schedule, and response-time deviation. */
function calcResponsivenessPressure(mr) {
  return weightedScore([
    [mr.messagesSentPerPerson, 0.35],
    [mr.afterHoursMessageRatio, 0.35],
    [mr.p90ResponseMinutes, 0.3],
  ]);
}

/** Collaboration-metadata deviation; this does not measure engagement or intent. */
function calcCollaborationWithdrawal(mr) {
  return weightedScore([
    [mr.uniqueCollaboratorsPerPerson, 0.3],
    [mr.publicChannelRatio, 0.25],
    [mr.reciprocityRatio, 0.25],
    [mr.threadParticipationRate, 0.2],
  ]);
}

/** Recorded manager 1:1 time deviation; this does not measure support quality. */
function calcManagerSupportGap(mr) {
  return weightedScore([[mr.manager1to1MinutesPerPerson, 1]]);
}

/**
 * 10.7 Workload Volatility
 *
 * 0.25 * two_sided_risk(week_over_week_meeting_load_change)
 * 0.20 * two_sided_risk(week_over_week_message_volume_change)
 * 0.20 * risk(week_over_week_after_hours_change)
 * 0.20 * risk(new_recurring_meetings_count)
 * 0.15 * risk(activity_spike_days)
 */
function calcWorkloadVolatility(mr) {
  return weightedScore([
    [mr.weekOverWeekMeetingLoadChange, 0.25],
    [mr.weekOverWeekMessageVolumeChange, 0.2],
    [mr.weekOverWeekAfterHoursChange, 0.2],
    [mr.newRecurringMeetingsCount, 0.2],
    [mr.activitySpikeDays, 0.15],
  ]);
}

// ── Direction-Aware z→Risk Helpers ────────────────────────────────────────────

/**
 * Higher value = more risk (e.g. after-hours ratio, fragmented day ratio).
 * risk_z = robust_z
 */
function riskHigherWorse(value, baselineMetric) {
  if (!Number.isFinite(value)) return unavailable('missing_value');
  if (!Number.isFinite(baselineMetric?.median)) return unavailable('missing_baseline');
  const z = robustZ(value, baselineMetric);
  return { score: zToRiskScore(z), z };
}

/**
 * Lower value = more risk (e.g. focus hours, reciprocity ratio).
 * risk_z = -robust_z
 */
function riskLowerWorse(value, baselineMetric) {
  if (!Number.isFinite(value)) return unavailable('missing_value');
  if (!Number.isFinite(baselineMetric?.median)) return unavailable('missing_baseline');
  const z = robustZ(value, baselineMetric);
  return { score: zToRiskScore(-z), z };
}

/**
 * Risk on both sides (e.g. collaboration breadth — both drop and spike are risky).
 * risk_z = abs(robust_z)
 */
function riskTwoSided(value, baselineMetric) {
  if (!Number.isFinite(value)) return unavailable('missing_value');
  if (!Number.isFinite(baselineMetric?.median)) return unavailable('missing_baseline');
  const z = robustZ(value, baselineMetric);
  return { score: zToRiskScore(Math.abs(z)), z };
}

function unavailable(reason) {
  return { score: null, z: null, unavailableReason: reason };
}

function weightedScore(entries) {
  const available = entries.filter(([metric]) => Number.isFinite(metric?.score));
  const totalWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight === 0) return null;
  const raw = available.reduce((sum, [metric, weight]) => sum + metric.score * weight, 0);
  return clampScore(raw / totalWeight);
}

function clampScore(raw) {
  return Math.max(0, Math.min(100, Math.round(raw)));
}
