/**
 * Internal measurement governance.
 *
 * These identifiers are persisted with every intervention so a result can be
 * traced back to the metric definition and review protocol that produced it.
 * They are internal implementation metadata, not a client-facing methodology.
 */

export const MEASUREMENT_VERSION = 'work-pattern-metrics@1.1.0';
export const PRIVACY_POLICY_VERSION = 'team-aggregate-privacy@1.0.0';
export const REVIEW_PROTOCOL_VERSION = '14-28-day-review@1.0.0';

const TARGETS = {
  'coordination-risk': target('meetingLoadIndex', 'Meeting load index', 'decrease'),
  meeting_load_drift: target('meetingLoadIndex', 'Meeting load index', 'decrease'),
  meeting_load: target('meetingLoadIndex', 'Meeting load index', 'decrease'),
  coordination_strain: target('meetingLoadIndex', 'Meeting load index', 'decrease'),
  manager_capacity_risk: target('meetingLoadIndex', 'Meeting load index', 'decrease'),

  'boundary-erosion': target('afterHoursRate', 'After-hours activity rate', 'decrease'),
  recovery_gap_index: target('afterHoursRate', 'After-hours activity rate', 'decrease'),
  recovery_erosion: target('afterHoursRate', 'After-hours activity rate', 'decrease'),

  'focus-erosion': target('focusTimeRatio', 'Focus-time ratio', 'increase'),
  focus_fragmentation: target('meetingFragmentScore', 'Meeting fragmentation', 'decrease'),
  focus_integrity: target('focusTimeRatio', 'Focus-time ratio', 'increase'),
  context_switching: target('meetingFragmentScore', 'Meeting fragmentation', 'decrease'),

  'execution-drag': target('responseMedianMins', 'Median response time', 'decrease'),
  responsiveness_pressure: target('responseMedianMins', 'Median response time', 'decrease'),
  execution_drag_risk: target('responseMedianMins', 'Median response time', 'decrease'),

  'recovery-deficit': target('recoveryDays', 'Recovery days', 'increase'),
  signal_convergence: target('energyIndex', 'Work-pattern stability index', 'increase'),
  team_rhythm_stability: target('energyIndex', 'Work-pattern stability index', 'increase'),
};

function target(metricKey, metricLabel, direction) {
  return { metricKey, metricLabel, direction };
}

export function getSignalMeasurementTarget(signalType) {
  return TARGETS[signalType] || null;
}

export function getGovernanceSnapshot() {
  return {
    measurementVersion: MEASUREMENT_VERSION,
    privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    reviewProtocolVersion: REVIEW_PROTOCOL_VERSION,
  };
}

export default {
  getSignalMeasurementTarget,
  getGovernanceSnapshot,
};
