/**
 * Flattening Service — org-level "Great Flattening" signal.
 *
 * Quantifies span widening for an org: reports-per-manager now vs a trailing
 * baseline, and how many managers sit above a healthy span. This is the market
 * trend (2025 norm ~12 reports/manager) made measurable for a specific org.
 *
 * See docs/PIVOT_REPORT_SPEC.md §3.7. Deterministic; no AI.
 */

import mongoose from 'mongoose';
import OrgUnit from '../models/orgUnit.js';
import ManagerWeekly from '../models/managerWeekly.js';
import { median } from '../utils/robustMath.js';

const HEALTHY_SPAN = 12;

/**
 * @param {string|ObjectId} orgId
 * @param {string} weekStartStr — current week (Monday, YYYY-MM-DD)
 * @returns {Object} flattening summary
 */
export async function computeFlatteningSignal(orgId, weekStartStr) {
  const [units, managerWeeks] = await Promise.all([
    OrgUnit.find({ orgId, effectiveTo: null }).select('isManager').lean(),
    ManagerWeekly.find({ orgId, weekStart: weekStartStr, suppressed: { $ne: true } })
      .select('span spanOverloadIndex riskState')
      .lean(),
  ]);

  const activeManagers = units.filter((u) => u.isManager).length;
  const activeNonManagers = units.filter((u) => !u.isManager).length;
  const reportsPerManager =
    activeManagers > 0 ? round1(activeNonManagers / activeManagers) : null;

  // Trailing baseline (last up-to-13 weeks of org-wide reports/manager proxy:
  // median manager span across prior weeks).
  const priorWeeks = await ManagerWeekly.aggregate([
    { $match: { orgId: asObjectId(orgId), suppressed: { $ne: true }, weekStart: { $lt: weekStartStr } } },
    { $group: { _id: '$weekStart', medianSpanInputs: { $push: '$span' } } },
    { $sort: { _id: -1 } },
    { $limit: 13 },
  ]).catch(() => []);

  const priorMedians = priorWeeks
    .map((w) => median(w.medianSpanInputs))
    .filter((v) => typeof v === 'number');
  const baselineReportsPerManager = priorMedians.length ? round1(median(priorMedians)) : null;

  const flatteningDelta =
    reportsPerManager != null && baselineReportsPerManager != null
      ? round1(reportsPerManager - baselineReportsPerManager)
      : null;

  const managersAboveThreshold = managerWeeks.filter((m) => (m.span || 0) >= HEALTHY_SPAN).length;
  const managersInStrain = managerWeeks.filter(
    (m) => m.riskState === 'strain' || m.riskState === 'critical'
  ).length;
  const orgSoi = managerWeeks.length
    ? Math.round(median(managerWeeks.map((m) => m.spanOverloadIndex)))
    : null;

  return {
    orgId: String(orgId),
    weekStart: weekStartStr,
    activeManagers,
    activeNonManagers,
    reportsPerManager,
    baselineReportsPerManager,
    flatteningDelta,
    healthySpanThreshold: HEALTHY_SPAN,
    managersAboveThreshold,
    totalScoredManagers: managerWeeks.length,
    managersInStrain,
    orgSpanOverloadIndex: orgSoi,
  };
}

function round1(v) {
  return typeof v === 'number' ? Math.round(v * 10) / 10 : v;
}

function asObjectId(id) {
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return id;
  }
}

export default { computeFlatteningSignal };
