/**
 * Manager Overload Service — per-manager metrics + Span Overload Index (SOI).
 *
 * The flagship of the manager-overload pivot. Computes, for each manager with a
 * known reporting line (OrgUnit), real per-manager metrics from WorkEvents and
 * the SOI (0–100) against the manager's own past baseline.
 *
 * Privacy: a manager is suppressed (no score written) when their active span is
 * below the per-metric contributor minimum, so tiny groups are never exposed.
 * Identity is pseudonymized via managerHash. See docs/PIVOT_REPORT_SPEC.md §3.5.
 *
 * Deterministic and auditable: AI is NOT used here.
 */

import WorkEvent from '../models/workEvent.js';
import OrgUnit from '../models/orgUnit.js';
import ManagerWeekly from '../models/managerWeekly.js';
import { robustZ, zToRiskScore } from './engagementBaselineService.js';
import {
  buildMetricBaseline,
  riskState,
  trendFrom,
  weightedComposite,
  clamp,
} from '../utils/robustMath.js';
import { hashPerson } from '../utils/identity.js';
import { MIN_METRIC_CONTRIBUTORS } from '../utils/privacyGate.js';

export const SCORING_VERSION = '3.0.0';

// Absolute span bands (2025 norms: avg ~12 reports/manager).
const SPAN_BANDS = { warn: 10, high: 15, severe: 20 };
// Map an absolute span band to a risk score when no personal baseline exists yet.
const SPAN_BAND_RISK = { ok: 40, warn: 62, high: 78, severe: 90 };

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compute + persist ManagerWeekly for every manager in an org for a given week.
 *
 * @param {string|ObjectId} orgId
 * @param {string} weekStartStr  — Monday, YYYY-MM-DD
 * @param {Object} [opts]
 * @param {Object} [opts.graph]  — output of communicationGraphService (optional;
 *                                 supplies decisionConcentration + brokerage)
 * @returns {{processed:number, suppressed:number, errors:Array}}
 */
export async function runManagerOverloadForOrg(orgId, weekStartStr, opts = {}) {
  const managers = await OrgUnit.find({ orgId, isManager: true, effectiveTo: null }).lean();
  let processed = 0;
  let suppressed = 0;
  const errors = [];

  for (const mgr of managers) {
    try {
      const result = await computeManagerWeek(orgId, mgr, weekStartStr, opts);
      await ManagerWeekly.findOneAndUpdate(
        { orgId, managerHash: result.managerHash, weekStart: weekStartStr },
        { $set: result },
        { upsert: true, new: true }
      );
      if (result.suppressed) suppressed++;
      else processed++;
    } catch (err) {
      errors.push({ manager: String(mgr._id), message: err.message });
    }
  }

  return { processed, suppressed, errors };
}

/**
 * Compute (not persist) one manager's weekly record.
 * @returns {Object} ManagerWeekly-shaped object
 */
export async function computeManagerWeek(orgId, mgr, weekStartStr, opts = {}) {
  const { start, end } = weekRange(weekStartStr);
  const managerHash = mgr.managerHash_self || mgr.personHash || hashPerson(orgId, mgr.userId);
  const role = mgr.role || 'EM';

  // Direct reports + active span
  const reports = await OrgUnit.find({
    orgId,
    managerUserId: mgr.userId,
    effectiveTo: null,
  })
    .select('userId')
    .lean();
  const reportUserIds = reports.map((r) => r.userId).filter(Boolean);
  const totalReports = reportUserIds.length;

  const activeReportIds = totalReports
    ? await WorkEvent.distinct('actorUserId', {
        orgId,
        actorUserId: { $in: reportUserIds },
        timestamp: { $gte: start, $lt: end },
      })
    : [];
  const span = activeReportIds.length;

  const base = {
    orgId,
    teamId: mgr.teamId,
    managerHash,
    role,
    weekStart: weekStartStr,
    scoringVersion: SCORING_VERSION,
  };

  // Privacy: never expose a manager whose active group is too small
  if (span < MIN_METRIC_CONTRIBUTORS) {
    return {
      ...base,
      suppressed: true,
      suppressedReason: 'span_below_minimum',
      span,
      confidence: 'low',
      dataCoverageRatio: totalReports ? span / totalReports : 0,
    };
  }

  // Manager's own events this week
  const events = await WorkEvent.find({
    orgId,
    actorUserId: mgr.userId,
    timestamp: { $gte: start, $lt: end },
  })
    .select('eventType metadata')
    .lean();

  const coordinationLoadHours = round1(
    sum(
      events
        .filter((e) => e.eventType === 'meeting')
        .map((e) => e.metadata?.durationMinutes || 0)
    ) / 60
  );

  const oneOnOneMinutes = sum(
    events
      .filter((e) => e.eventType === 'meeting' && e.metadata?.isManagerOneOnOne)
      .map((e) => e.metadata?.durationMinutes || 0)
  );
  const oneOnOneMinutesPerReport = span > 0 ? round1(oneOnOneMinutes / span) : null;

  const afterHoursCount = events.filter((e) => e.metadata?.isAfterHours).length;
  const afterHoursActivityRatio = events.length
    ? round2(afterHoursCount / events.length)
    : null;

  const latencies = events
    .map((e) => e.metadata?.replyLatencySeconds)
    .filter((v) => typeof v === 'number' && v >= 0)
    .map((v) => v / 60);
  const responseLatencyP50Min = latencies.length ? round1(percentile(latencies, 50)) : null;
  const responseLatencyP90Min = latencies.length ? round1(percentile(latencies, 90)) : null;

  // From ONA graph if supplied (step 4)
  const decisionConcentration =
    opts.graph?.decisionConcentrationByManager?.[managerHash] ?? null;
  const brokerageScore = opts.graph?.brokerageByManager?.[managerHash] ?? null;

  // Personal baselines from prior ManagerWeekly history (past-only)
  const history = await ManagerWeekly.find({
    orgId,
    managerHash,
    suppressed: { $ne: true },
    weekStart: { $lt: weekStartStr },
  })
    .sort({ weekStart: -1 })
    .limit(6)
    .lean();

  const spanBaseline = buildMetricBaseline(history.map((h) => h.span));
  const loadBaseline = buildMetricBaseline(history.map((h) => h.coordinationLoadHours));
  const oneOnOneBaseline = buildMetricBaseline(history.map((h) => h.oneOnOneMinutesPerReport));
  const concBaseline = buildMetricBaseline(history.map((h) => h.decisionConcentration));

  // Absolute span band
  const absoluteSpanFlag =
    span >= SPAN_BANDS.severe
      ? 'severe'
      : span >= SPAN_BANDS.high
        ? 'high'
        : span >= SPAN_BANDS.warn
          ? 'warn'
          : 'ok';

  // Component risks (0–100)
  const spanRisk = spanBaseline
    ? zToRiskScore(robustZ(span, spanBaseline))
    : SPAN_BAND_RISK[absoluteSpanFlag];
  const loadRisk =
    loadBaseline && typeof coordinationLoadHours === 'number'
      ? zToRiskScore(robustZ(coordinationLoadHours, loadBaseline))
      : null;
  const oneOnOneRisk =
    oneOnOneBaseline && typeof oneOnOneMinutesPerReport === 'number'
      ? zToRiskScore(-robustZ(oneOnOneMinutesPerReport, oneOnOneBaseline))
      : null;
  const concRisk =
    typeof decisionConcentration === 'number'
      ? concBaseline
        ? zToRiskScore(robustZ(decisionConcentration, concBaseline))
        : clamp(Math.round(decisionConcentration * 100), 0, 100)
      : null;

  // SOI (renormalizes over present components)
  const spanOverloadIndex = weightedComposite([
    { value: spanRisk, weight: 0.35 },
    { value: loadRisk, weight: 0.25 },
    { value: oneOnOneRisk, weight: 0.2 },
    { value: concRisk, weight: 0.2 },
  ]);

  // Trend vs prior week
  const prior = history[0]?.spanOverloadIndex;
  const trend = trendFrom(spanOverloadIndex, prior);

  // Drivers (top components, descending risk)
  const drivers = [
    { key: 'span', score: spanRisk, direction: 'higher_worse', evidence: `span ${span} (band: ${absoluteSpanFlag})` },
    { key: 'coordinationLoad', score: loadRisk, direction: 'higher_worse', evidence: `${coordinationLoadHours}h coordination` },
    { key: 'oneOnOneSupport', score: oneOnOneRisk, direction: 'lower_worse', evidence: `${oneOnOneMinutesPerReport ?? 'n/a'} min/report 1:1` },
    { key: 'decisionConcentration', score: concRisk, direction: 'higher_worse', evidence: decisionConcentration != null ? `${Math.round(decisionConcentration * 100)}% brokerage` : 'n/a' },
  ]
    .filter((d) => typeof d.score === 'number')
    .sort((a, b) => b.score - a.score);

  const dataCoverageRatio = totalReports ? round2(span / totalReports) : 0;
  const confidence =
    dataCoverageRatio >= 0.7 && spanBaseline && spanBaseline.n >= 3
      ? 'high'
      : dataCoverageRatio >= 0.4
        ? 'medium'
        : 'low';

  return {
    ...base,
    suppressed: false,
    suppressedReason: null,
    span,
    spanBaselineMedian: spanBaseline?.median ?? null,
    spanBaselineScaledMad: spanBaseline?.scaledMad ?? null,
    coordinationLoadHours,
    oneOnOneMinutesPerReport,
    responseLatencyP50Min,
    responseLatencyP90Min,
    afterHoursActivityRatio,
    decisionConcentration,
    brokerageScore,
    spanOverloadIndex,
    riskState: riskState(spanOverloadIndex),
    trend,
    absoluteSpanFlag,
    drivers,
    confidence,
    dataCoverageRatio,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function weekRange(weekStartStr) {
  const start = new Date(`${weekStartStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function sum(arr) {
  return (arr || []).reduce((s, v) => s + (Number(v) || 0), 0);
}

function percentile(values, p) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = clamp((p / 100) * (sorted.length - 1), 0, sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function round1(v) {
  return typeof v === 'number' ? Math.round(v * 10) / 10 : v;
}
function round2(v) {
  return typeof v === 'number' ? Math.round(v * 100) / 100 : v;
}

export default { runManagerOverloadForOrg, computeManagerWeek, SCORING_VERSION };
