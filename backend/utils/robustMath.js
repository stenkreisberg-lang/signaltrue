/**
 * Robust statistics + scoring helpers shared by the manager-overload / span
 * pipeline. Mirrors the conventions already used in engagementBaselineService.js
 * (robustZ, zToRiskScore) so scores are comparable across the product.
 *
 * See docs/PIVOT_REPORT_SPEC.md §2.
 */

export const EPSILON = 1e-9;

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function median(values) {
  const arr = (values || []).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mad(values, med) {
  const arr = (values || []).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (arr.length === 0) return null;
  const m = typeof med === 'number' ? med : median(arr);
  return median(arr.map((v) => Math.abs(v - m)));
}

/**
 * Build a {median, scaledMad, n} baseline from a past-only value array.
 * scaledMad = 1.4826 * MAD (comparable to std for normal data).
 * Returns null if there is no data.
 */
export function buildMetricBaseline(values) {
  const arr = (values || []).filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (arr.length === 0) return null;
  const med = median(arr);
  const m = mad(arr, med);
  return { median: med, scaledMad: m === null ? 0 : 1.4826 * m, n: arr.length };
}

/** Map a 0–100 risk score to a state. */
export function riskState(score) {
  if (typeof score !== 'number') return 'unknown';
  if (score >= 80) return 'critical';
  if (score >= 60) return 'strain';
  if (score >= 40) return 'watch';
  return 'healthy';
}

/** Trend from current vs prior composite score. */
export function trendFrom(current, prior) {
  if (typeof current !== 'number' || typeof prior !== 'number') return 'stable';
  const delta = current - prior;
  if (delta <= -5) return 'improving';
  if (delta > 8) return 'accelerating';
  if (delta > 5) return 'worsening';
  return 'stable';
}

/**
 * Weighted composite that tolerates null components: any component whose value
 * is null is dropped and the remaining weights are renormalized. Returns null
 * if every component is null.
 *
 * @param {Array<{value:number|null, weight:number}>} parts
 */
export function weightedComposite(parts) {
  const present = (parts || []).filter(
    (p) => typeof p.value === 'number' && Number.isFinite(p.value)
  );
  const totalWeight = present.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return null;
  const sum = present.reduce((s, p) => s + p.value * p.weight, 0);
  return Math.round(sum / totalWeight);
}

export default {
  EPSILON,
  clamp,
  median,
  mad,
  buildMetricBaseline,
  riskState,
  trendFrom,
  weightedComposite,
};
