/**
 * Alert Type Definitions
 * 
 * Based on the SignalTrue Product Execution Spec.
 * Defines 7 structured alert types with persistence rules,
 * severity mapping, and recommendation templates.
 * 
 * Alert principles:
 * - Minimum 2 weeks persistence for emerging alerts
 * - Minimum 3 weeks or large spike for elevated alerts
 * - Require sufficient data confidence
 * - Suppress alerts for teams below privacy threshold (minTeamSize)
 * - Avoid duplicate alerts when same condition remains active
 */

// Severity thresholds for normalized scores (0-100 scale)
export const SEVERITY_THRESHOLDS = {
  stable:   { min: 0,  max: 59 },
  emerging: { min: 60, max: 69 },
  elevated: { min: 70, max: 79 },
  critical: { min: 80, max: 100 },
};

/**
 * Map a normalized score to a severity level
 */
export function scoreToSeverity(score) {
  if (score >= 80) return 'critical';
  if (score >= 70) return 'elevated';
  if (score >= 60) return 'emerging';
  return 'stable';
}

/**
 * Normalized score formula per spec:
 * z = (current_value - baseline_mean) / max(baseline_stddev, epsilon)
 * normalized_score = clamp(50 + 15 * z, 0, 100)
 */
export function computeNormalizedScore(currentValue, baselineMean, baselineStddev, epsilon = 0.001) {
  const z = (currentValue - baselineMean) / Math.max(baselineStddev, epsilon);
  return Math.max(0, Math.min(100, 50 + 15 * z));
}

// ============================================================
// ALERT TYPE DEFINITIONS
// ============================================================

export const ALERT_TYPES = {
  // A. Meeting Overload Alert
  meeting_overload: {
    alertType: 'meeting_overload',
    signalKey: 'meeting_load',
    title: 'Meeting Overload',
    triggers: [
      { condition: 'MLI >= 70 for 2 consecutive weeks' },
      { condition: 'MLI >= 80 for 1 week AND drift velocity worsening' },
    ],
    severityMapping: {
      '70-79': 'elevated',
      '80+':   'critical',
    },
    minPersistenceWeeks: 2,
    recommendations: [
      { title: 'Review recurring meeting burden', priority: 'high' },
      { title: 'Reduce large meeting dependency', priority: 'medium' },
      { title: 'Protect focus windows', priority: 'medium' },
    ],
  },

  // B. Recovery Erosion Alert
  recovery_erosion: {
    alertType: 'recovery_erosion',
    signalKey: 'recovery_erosion',
    title: 'Recovery Erosion',
    triggers: [
      { condition: 'REI >= 70 for 2 consecutive weeks' },
      { condition: 'After-hours activity > baseline + 2 stddev for 3 weeks' },
    ],
    severityMapping: {
      '70-79': 'elevated',
      '80+':   'critical',
    },
    minPersistenceWeeks: 2,
    recommendations: [
      { title: 'Examine boundary breaches', priority: 'high' },
      { title: 'Limit after-hours collaboration expectations', priority: 'medium' },
      { title: 'Review staffing and handoff load', priority: 'medium' },
    ],
  },

  // C. Coordination Strain Alert
  coordination_strain: {
    alertType: 'coordination_strain',
    signalKey: 'coordination_strain',
    title: 'Coordination Strain',
    triggers: [
      { condition: 'CSI >= 72 and rising for 2 consecutive weeks' },
      { condition: 'CSI + MCR combined average >= 75' },
    ],
    severityMapping: {
      '72-79': 'elevated',
      '80+':   'critical',
    },
    minPersistenceWeeks: 2,
    recommendations: [
      { title: 'Clarify decision ownership', priority: 'high' },
      { title: 'Reduce routing complexity', priority: 'medium' },
      { title: 'Simplify coordination rituals', priority: 'medium' },
    ],
  },

  // D. Focus Fragmentation Alert
  focus_fragmentation: {
    alertType: 'focus_fragmentation',
    signalKey: 'focus_integrity',
    title: 'Focus Fragmentation',
    triggers: [
      { condition: 'FFR >= 70 for 2 consecutive weeks' },
      { condition: 'Uninterrupted blocks fall below lower baseline band' },
    ],
    severityMapping: {
      '70-79': 'elevated',
      '80+':   'critical',
    },
    minPersistenceWeeks: 2,
    recommendations: [
      { title: 'Introduce protected focus blocks', priority: 'high' },
      { title: 'Reduce fragmented scheduling', priority: 'medium' },
      { title: 'Evaluate meeting timing density', priority: 'medium' },
    ],
  },

  // E. Manager Capacity Alert
  manager_capacity: {
    alertType: 'manager_capacity',
    signalKey: 'manager_capacity_risk',
    title: 'Manager Capacity Risk',
    triggers: [
      { condition: 'MCR >= 75 for 2 consecutive weeks' },
      { condition: 'Manager after-hours ratio + manager meeting hours both above elevated band' },
    ],
    severityMapping: {
      '75-84': 'elevated',
      '85+':   'critical',
    },
    minPersistenceWeeks: 2,
    recommendations: [
      { title: 'Review manager span and coordination load', priority: 'high' },
      { title: 'Delegate routing tasks', priority: 'medium' },
      { title: 'Reduce approval bottlenecks', priority: 'medium' },
    ],
  },

  // F. Team Rhythm Instability Alert
  team_rhythm_instability: {
    alertType: 'team_rhythm_instability',
    signalKey: 'team_rhythm_stability',
    title: 'Team Rhythm Instability',
    triggers: [
      { condition: 'TRS <= 40 for 3 consecutive weeks' },
      { condition: 'Anomaly frequency > threshold during reorg/change period' },
    ],
    severityMapping: {
      'TRS 30-40': 'elevated',
      'TRS < 30':  'critical',
    },
    minPersistenceWeeks: 3,
    recommendations: [
      { title: 'Assess transition stress', priority: 'high' },
      { title: 'Review planning cadence', priority: 'medium' },
      { title: 'Stabilize workflow rhythms', priority: 'medium' },
    ],
  },

  // G. Critical Structural Strain Alert
  critical_structural_strain: {
    alertType: 'critical_structural_strain',
    signalKey: 'organizational_strain_index',
    title: 'Critical Structural Strain',
    triggers: [
      { condition: 'OSI >= 80' },
      { condition: '3 or more elevated signal families simultaneously' },
      { condition: 'OSI >= 75 AND drift velocity strongly worsening' },
    ],
    severityMapping: {
      '75-79': 'elevated',
      '80+':   'critical',
    },
    minPersistenceWeeks: 1, // Critical: can fire faster
    recommendations: [
      { title: 'Immediate leadership review', priority: 'critical' },
      { title: 'Intervention plan required', priority: 'critical' },
      { title: '2-week follow-up measurement', priority: 'high' },
    ],
  },
};

// ============================================================
// COMPOSITE SCORE FORMULAS (for reference / computation)
// ============================================================

/**
 * Organizational Strain Index (OSI) — composite headline score
 * OSI = 0.22*MLI + 0.22*REI + 0.20*CSI + 0.16*FFR + 0.10*(100-TRS) + 0.10*MCR
 */
export const OSI_WEIGHTS = {
  meeting_load:          0.22,
  recovery_erosion:      0.22,
  coordination_strain:   0.20,
  focus_fragmentation:   0.16,  // FFR = 100 - FIS
  team_rhythm_instability: 0.10, // 100 - TRS
  manager_capacity_risk: 0.10,
};

/**
 * Execution Drag Risk (EDR)
 * EDR = 0.35*CSI + 0.25*FFR + 0.20*MLI + 0.10*MCR + 0.10*DV
 */
export const EDR_WEIGHTS = {
  coordination_strain:   0.35,
  focus_fragmentation:   0.25,
  meeting_load:          0.20,
  manager_capacity_risk: 0.10,
  drift_velocity:        0.10,
};

export default {
  ALERT_TYPES,
  SEVERITY_THRESHOLDS,
  OSI_WEIGHTS,
  EDR_WEIGHTS,
  scoreToSeverity,
  computeNormalizedScore,
};
