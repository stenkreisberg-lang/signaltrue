/**
 * Privacy Gate Utility
 *
 * Enforces all team-level privacy rules from the spec (Section 5):
 *
 *   Rule 1 — Team size minimum: use the organization's configured threshold.
 *   Rule 2 — Per-metric suppression: use the contributor threshold,
 *             suppress that specific metric.
 *   Rule 3 — Concentrated pattern detection: if one person drives > 40% of a
 *             metric value, surface "concentrated pattern detected" without
 *             identifying the person.
 *
 * Never expose individual identities. All checks operate on counts or
 * anonymous value arrays.
 */

import Organization from '../models/organizationModel.js';

// ── Constants ──────────────────────────────────────────────────────────────────

export const MIN_TEAM_SIZE = 5;
export const MIN_METRIC_CONTRIBUTORS = 5;
export const CONCENTRATION_THRESHOLD = 0.4; // Fraction above which to flag concentration

// Engagement Strain / Manager-overload pipeline uses a stricter team floor (8)
// to match the marketed privacy minimum. Per-metric contributor floor stays at 5.
// See docs/PIVOT_REPORT_SPEC.md §9.
export const MIN_ENGAGEMENT_TEAM_SIZE = 8;

// Minimum base value before a week-over-week percentage change is meaningful.
// Below this, a change is noise (e.g. messages 12 -> 2) and must be suppressed
// rather than presented as a signal. See docs/PIVOT_REPORT_SPEC.md §4 Section D.
export const MIN_CHANGE_BASE = 5;

export async function resolveMinimumTeamSize(orgId) {
  if (!orgId) return MIN_TEAM_SIZE;
  try {
    const org = await Organization.findById(orgId).select('settings.minTeamSize').lean();
    const configured = Number(org?.settings?.minTeamSize);
    return Number.isFinite(configured) ? Math.max(configured, MIN_TEAM_SIZE) : MIN_TEAM_SIZE;
  } catch {
    return MIN_TEAM_SIZE;
  }
}

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

// ── Week-over-week change suppression ────────────────────────────────────────────

/**
 * Decide whether a week-over-week percentage change is reportable.
 *
 * A change computed on a tiny base is statistical noise, not a signal — e.g.
 * messages 12 -> 2 is "-83%" but means nothing. Returns a structured result so
 * callers can render "—" / "insufficient base" instead of an alarming delta.
 *
 * @param {number} from  — prior-period value (the denominator)
 * @param {number} to    — current-period value
 * @param {number} [minBase] — minimum prior value to trust the change
 * @returns {{ reportable: boolean, pct: number|null, reason: string|null }}
 */
export function evaluateChange(from, to, minBase = MIN_CHANGE_BASE) {
  if (typeof from !== 'number' || typeof to !== 'number') {
    return { reportable: false, pct: null, reason: 'no_data' };
  }
  if (from < minBase) {
    return { reportable: false, pct: null, reason: 'insufficient_base' };
  }
  const pct = ((to - from) / from) * 100;
  return { reportable: true, pct: Math.round(pct), reason: null };
}

// ── Rollup Helper ──────────────────────────────────────────────────────────────

/**
 * Determine whether a team should roll up to its parent department instead
 * of reporting as its own team.
 *
 * @param {number} teamSize
 * @returns {{ rollUp: boolean, reason: string|null }}
 */
export function shouldRollUpToDepartment(teamSize, min = MIN_TEAM_SIZE) {
  if (!checkTeamSize(teamSize, min)) {
    return {
      rollUp: true,
      reason: `Team size (${teamSize}) is below the minimum of ${min}. Rolled up to parent department.`,
    };
  }
  return { rollUp: false, reason: null };
}
