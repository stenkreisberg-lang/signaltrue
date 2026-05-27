/**
 * Privacy Gate Utility
 *
 * Enforces all team-level privacy rules from the spec (Section 5):
 *
 *   Rule 1 — Team size minimum: do not compute/show if < 8 active people.
 *   Rule 2 — Per-metric suppression: if a metric is based on < 5 active people,
 *             suppress that specific metric.
 *   Rule 3 — Concentrated pattern detection: if one person drives > 40% of a
 *             metric value, surface "concentrated pattern detected" without
 *             identifying the person.
 *
 * Never expose individual identities. All checks operate on counts or
 * anonymous value arrays.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

export const MIN_TEAM_SIZE = 8; // Minimum active people for team reporting
export const MIN_METRIC_CONTRIBUTORS = 5; // Minimum people contributing to a metric
export const CONCENTRATION_THRESHOLD = 0.4; // Fraction above which to flag concentration

// ── Team Size Gate ─────────────────────────────────────────────────────────────

/**
 * Returns true if the team is large enough for reporting.
 * If false, the calling service should suppress all output for this team.
 *
 * @param {number} activePeopleCount  — distinct active people this period
 * @param {number} [min]              — override minimum (default: MIN_TEAM_SIZE)
 * @returns {boolean}
 */
export function checkTeamSize(activePeopleCount, min = MIN_TEAM_SIZE) {
  return typeof activePeopleCount === 'number' && activePeopleCount >= min;
}

// ── Per-Metric Contributor Gate ────────────────────────────────────────────────

/**
 * Returns true if a metric should be suppressed because it is based on
 * too few active contributors this period.
 *
 * Usage:
 *   if (suppressMetricIfTooFew(activePeopleForThisMetric)) {
 *     return null; // do not report this metric
 *   }
 *
 * @param {number} activePeopleCount  — people who contributed to this metric
 * @param {number} [min]              — override minimum (default: MIN_METRIC_CONTRIBUTORS)
 * @returns {boolean}                 — true means: suppress this metric
 */
export function suppressMetricIfTooFew(activePeopleCount, min = MIN_METRIC_CONTRIBUTORS) {
  return typeof activePeopleCount !== 'number' || activePeopleCount < min;
}

// ── Concentration Detection ────────────────────────────────────────────────────

/**
 * Checks whether a single contributor is responsible for more than
 * CONCENTRATION_THRESHOLD of a metric's total value.
 *
 * Returns a structured result — never the identity of the concentrated person.
 *
 * @param {number[]} perPersonValues
 *   Array of numeric metric values, one per person.
 *   Example: [12, 14, 48, 9, 11] for after-hours messages per person.
 * @param {number} [threshold]  — override fraction threshold (default: 0.40)
 * @returns {{ concentrated: boolean, message: string|null }}
 *
 * Example output when concentrated:
 *   { concentrated: true, message: "concentrated pattern detected" }
 */
export function detectConcentratedPattern(perPersonValues, threshold = CONCENTRATION_THRESHOLD) {
  if (!Array.isArray(perPersonValues) || perPersonValues.length === 0) {
    return { concentrated: false, message: null };
  }

  const total = perPersonValues.reduce((s, v) => s + v, 0);
  if (total === 0) return { concentrated: false, message: null };

  const maxValue = Math.max(...perPersonValues);
  const maxFraction = maxValue / total;

  if (maxFraction > threshold) {
    return {
      concentrated: true,
      message: 'concentrated pattern detected',
    };
  }

  return { concentrated: false, message: null };
}

// ── Rollup Helper ──────────────────────────────────────────────────────────────

/**
 * Determine whether a team should roll up to its parent department instead
 * of reporting as its own team.
 *
 * @param {number} teamSize
 * @returns {{ rollUp: boolean, reason: string|null }}
 */
export function shouldRollUpToDepartment(teamSize) {
  if (!checkTeamSize(teamSize)) {
    return {
      rollUp: true,
      reason: `Team size (${teamSize}) is below the minimum of ${MIN_TEAM_SIZE}. Rolled up to parent department.`,
    };
  }
  return { rollUp: false, reason: null };
}
