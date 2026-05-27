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
  const risk = (field, key) => riskHigherWorse(w[field], bm[key]);
  const riskInv = (field, key) => riskLowerWorse(w[field], bm[key]);
  const riskTwo = (field, key) => riskTwoSided(w[field], bm[key]);

  return {
    // ── Calendar ──────────────────────────────────────────────────────────────
    afterHoursActivityRatio: risk('afterHoursActivityRatio', 'afterHoursEmailRatio'),
    afterHoursMessageRatio: risk('afterHoursMessageRatio', 'afterHoursMessageRatio'),
    afterHoursMeetingMinutes: risk('afterHoursMeetingMinutes', 'afterHoursMeetingMinutes'),
    afterHoursMeetingRatio: risk('afterHoursMeetingRatio', 'afterHoursMeetingMinutes'),
    afterHoursEmailRatio: risk('afterHoursEmailRatio', 'afterHoursEmailRatio'),

    // Recovery gap violations — no direct baseline field, uses afterHoursActivityRatio as proxy
    recoveryGapViolationRate: risk('afterHoursActivityRatio', 'afterHoursEmailRatio'),

    // Focus
    focusHoursAvailablePerPerson: riskInv(
      'focusHoursAvailablePerPerson',
      'focusHoursAvailablePerPerson'
    ),
    focusBlocks90mCountPerPerson: riskInv('focusBlocks90mCountPerPerson', 'focusBlocks90mCount'),
    fragmentedDayRatio: risk('fragmentedDayRatio', 'fragmentedDayRatio'),
    backToBackMeetingCount: risk('backToBackMeetingCount', 'backToBackMeetingCount'),
    meetingHoursPerPerson: risk('meetingHoursPerPerson', 'meetingHoursPerPerson'),

    // Coordination
    attendeeHoursPerPerson: risk('attendeeHoursPerPerson', 'attendeeHoursPerPerson'),
    avgAttendeeCount: risk('avgAttendeeCount', 'avgAttendeeCount'),
    recurringMeetingRatio: risk('recurringMeetingRatio', 'recurringMeetingRatio'),

    // Responsiveness
    messagesSentPerPerson: riskTwo('messagesSentPerPerson', 'messagesSentPerPerson'),
    afterHoursResponseRatio: risk('afterHoursMessageRatio', 'afterHoursMessageRatio'),
    p90ResponseMinutes: risk('p90ResponseMinutes', 'p90ResponseMinutes'),

    // Collaboration
    uniqueCollaboratorsPerPerson: riskTwo(
      'uniqueCollaboratorsPerPerson',
      'uniqueCollaboratorsPerPerson'
    ),
    publicChannelRatio: riskInv('publicChannelRatio', 'publicChannelRatio'),
    reciprocityRatio: riskInv('reciprocityRatio', 'reciprocityRatio'),
    threadParticipationRate: riskInv('threadParticipationRate', 'threadParticipationRate'),

    // Manager support
    manager1to1MinutesPerPerson: riskInv(
      'manager1to1MinutesPerPerson',
      'manager1to1MinutesPerPerson'
    ),
    cancelled1to1Count: risk('cancelled1to1Count', 'cancelled1to1Count'),
    managerResponseLatency: risk('medianResponseMinutes', 'medianResponseMinutes'),
    managerMeetingLoad: risk('meetingHoursPerPerson', 'meetingHoursPerPerson'),
    managerAfterHoursActivity: risk('afterHoursActivityRatio', 'afterHoursEmailRatio'),

    // Workload volatility
    weekOverWeekMeetingLoadChange: riskTwo('weekOverWeekMeetingLoadChange', null),
    weekOverWeekMessageVolumeChange: riskTwo('weekOverWeekMessageVolumeChange', null),
    weekOverWeekAfterHoursChange: risk('weekOverWeekAfterHoursChange', null),
    newRecurringMeetingsCount: risk('newRecurringMeetingsCount', null),
    activitySpikeDays: risk('activitySpikeDays', null),
  };
}

// ── Subscore Formula Implementations ──────────────────────────────────────────

/**
 * 10.1 Recovery Debt
 *
 * 0.30 * risk(after_hours_activity_ratio)
 * 0.20 * risk(after_hours_message_ratio)
 * 0.15 * risk(after_hours_meeting_minutes)
 * 0.15 * risk(weekend_activity_ratio)   — proxied by afterHoursActivityRatio
 * 0.15 * risk(recovery_gap_violation_rate)
 * 0.05 * risk(late_response_ratio)      — proxied by afterHoursResponseRatio
 */
function calcRecoveryDebt(mr) {
  return clampScore(
    0.3 * mr.afterHoursActivityRatio.score +
      0.2 * mr.afterHoursMessageRatio.score +
      0.15 * mr.afterHoursMeetingMinutes.score +
      0.15 * mr.afterHoursActivityRatio.score + // weekend proxy
      0.15 * mr.recoveryGapViolationRate.score +
      0.05 * mr.afterHoursResponseRatio.score
  );
}

/**
 * 10.2 Focus Erosion
 *
 * 0.30 * risk_inverse(focus_hours_available_per_person)
 * 0.20 * risk_inverse(focus_blocks_90m_count_per_person)
 * 0.20 * risk(fragmented_day_ratio)
 * 0.15 * risk(back_to_back_meetings_per_person)
 * 0.15 * risk(meeting_hours_per_person)
 */
function calcFocusErosion(mr) {
  return clampScore(
    0.3 * mr.focusHoursAvailablePerPerson.score +
      0.2 * mr.focusBlocks90mCountPerPerson.score +
      0.2 * mr.fragmentedDayRatio.score +
      0.15 * mr.backToBackMeetingCount.score +
      0.15 * mr.meetingHoursPerPerson.score
  );
}

/**
 * 10.3 Coordination Friction
 *
 * 0.30 * risk(attendee_hours_per_person)
 * 0.20 * risk(avg_attendee_count)
 * 0.20 * risk(recurring_meeting_ratio)
 * 0.20 * risk(cross_team_meeting_ratio)  — proxied by avgAttendeeCount
 * 0.10 * risk(meeting_load_variance)     — proxied by backToBackMeetingCount
 */
function calcCoordinationFriction(mr) {
  return clampScore(
    0.3 * mr.attendeeHoursPerPerson.score +
      0.2 * mr.avgAttendeeCount.score +
      0.2 * mr.recurringMeetingRatio.score +
      0.2 * mr.avgAttendeeCount.score + // cross-team proxy
      0.1 * mr.backToBackMeetingCount.score
  );
}

/**
 * 10.4 Responsiveness Pressure
 *
 * 0.25 * risk(inbound_messages_per_person)   — proxied by messagesSentPerPerson (two-sided)
 * 0.25 * risk(after_hours_response_ratio)
 * 0.20 * risk(p90_response_minutes)
 * 0.15 * risk(response_latency_volatility)   — proxied by p90ResponseMinutes
 * 0.15 * risk(same_day_message_bursts)       — proxied by activitySpikeDays
 */
function calcResponsivenessPressure(mr) {
  return clampScore(
    0.25 * mr.messagesSentPerPerson.score +
      0.25 * mr.afterHoursResponseRatio.score +
      0.2 * mr.p90ResponseMinutes.score +
      0.15 * mr.p90ResponseMinutes.score + // latency volatility proxy
      0.15 * mr.activitySpikeDays.score
  );
}

/**
 * 10.5 Collaboration Withdrawal
 *
 * 0.25 * two_sided_risk(unique_collaborators_per_person)
 * 0.20 * risk_inverse(public_channel_ratio)
 * 0.20 * risk_inverse(reciprocity_ratio)
 * 0.20 * risk_inverse(cross_team_interaction_ratio)  — proxied by uniqueCollaboratorsPerPerson
 * 0.15 * risk_inverse(optional_participation_rate)   — proxied by threadParticipationRate
 */
function calcCollaborationWithdrawal(mr) {
  return clampScore(
    0.25 * mr.uniqueCollaboratorsPerPerson.score +
      0.2 * mr.publicChannelRatio.score +
      0.2 * mr.reciprocityRatio.score +
      0.2 * mr.uniqueCollaboratorsPerPerson.score + // cross-team proxy
      0.15 * mr.threadParticipationRate.score
  );
}

/**
 * 10.6 Manager Support Gap
 *
 * 0.30 * risk_inverse(manager_1to1_minutes_per_person)
 * 0.20 * risk(cancelled_1to1_rate)
 * 0.20 * risk(manager_response_latency)
 * 0.15 * risk(manager_meeting_load)
 * 0.15 * risk(manager_after_hours_activity)
 */
function calcManagerSupportGap(mr) {
  return clampScore(
    0.3 * mr.manager1to1MinutesPerPerson.score +
      0.2 * mr.cancelled1to1Count.score +
      0.2 * mr.managerResponseLatency.score +
      0.15 * mr.managerMeetingLoad.score +
      0.15 * mr.managerAfterHoursActivity.score
  );
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
  return clampScore(
    0.25 * mr.weekOverWeekMeetingLoadChange.score +
      0.2 * mr.weekOverWeekMessageVolumeChange.score +
      0.2 * mr.weekOverWeekAfterHoursChange.score +
      0.2 * mr.newRecurringMeetingsCount.score +
      0.15 * mr.activitySpikeDays.score
  );
}

// ── Direction-Aware z→Risk Helpers ────────────────────────────────────────────

/**
 * Higher value = more risk (e.g. after-hours ratio, fragmented day ratio).
 * risk_z = robust_z
 */
function riskHigherWorse(value, baselineMetric) {
  if (value === null || value === undefined) return neutral();
  const z = baselineMetric ? robustZ(value, baselineMetric) : zFromRawFraction(value);
  return { score: zToRiskScore(z), z };
}

/**
 * Lower value = more risk (e.g. focus hours, reciprocity ratio).
 * risk_z = -robust_z
 */
function riskLowerWorse(value, baselineMetric) {
  if (value === null || value === undefined) return neutral();
  const z = baselineMetric ? robustZ(value, baselineMetric) : zFromRawFraction(value);
  return { score: zToRiskScore(-z), z };
}

/**
 * Risk on both sides (e.g. collaboration breadth — both drop and spike are risky).
 * risk_z = abs(robust_z)
 */
function riskTwoSided(value, baselineMetric) {
  if (value === null || value === undefined) return neutral();
  const z = baselineMetric ? robustZ(value, baselineMetric) : zFromRawFraction(value);
  return { score: zToRiskScore(Math.abs(z)), z };
}

/**
 * When there is no baseline yet, use the raw value as a weak heuristic.
 * Maps a 0–1 ratio or small count to a mild z-score.
 * This ensures new teams don't immediately spike to 100.
 */
function zFromRawFraction(value) {
  if (typeof value !== 'number') return 0;
  // Treat the value as a fraction of a "concerning" threshold (0.3 for ratios, 5 for counts)
  const threshold = value <= 1 ? 0.3 : 5;
  return (value - threshold / 2) / (threshold / 2);
}

function neutral() {
  // No data — score at the "watch" floor, not healthy and not alarming
  return { score: 40, z: 0 };
}

function clampScore(raw) {
  return Math.max(0, Math.min(100, Math.round(raw)));
}
