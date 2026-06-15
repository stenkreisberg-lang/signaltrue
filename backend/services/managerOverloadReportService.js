/**
 * Manager Overload Report Assembler.
 *
 * Stitches the deterministic engine outputs (flattening, ManagerWeekly, ONA
 * patterns) plus AI narration into the pivoted brief, ordered per
 * docs/PIVOT_REPORT_SPEC.md §4: headline → structure/span → patterns →
 * structural actions → did-it-work → data-readiness footer.
 *
 * The cost figure is returned as a BAND, never a point estimate, until
 * P(exit | SOI) is calibrated (spec §A).
 */

import ManagerWeekly from '../models/managerWeekly.js';
import { computeFlatteningSignal } from './flatteningService.js';
import { buildCommunicationGraph } from './communicationGraphService.js';
import { generateHeadline, narratePatterns, generateDiscussionPrompts } from './aiInsightService.js';

// Replacement cost multiplier of annual salary; org-configurable later.
const DEFAULT_REPLACEMENT_COST = 140000; // placeholder per-manager; configure per org

export async function assembleBrief(orgId, weekStartStr, opts = {}) {
  const replacementCost = opts.replacementCost || DEFAULT_REPLACEMENT_COST;

  const [flattening, managers, graph] = await Promise.all([
    computeFlatteningSignal(orgId, weekStartStr),
    ManagerWeekly.find({ orgId, weekStart: weekStartStr, suppressed: { $ne: true } })
      .sort({ spanOverloadIndex: -1 })
      .lean(),
    buildCommunicationGraph(orgId, weekStartStr),
  ]);

  // ── Section A: headline + cost band ──────────────────────────────────────────
  const summary = {
    ...flattening,
    topRoles: managers.slice(0, 3).map((m) => m.role),
  };
  const headline = await generateHeadline(summary);
  const costBand = estimateCostBand(flattening.managersInStrain, replacementCost);
  const overallConfidence = lowestConfidence(managers);

  // ── Section B: structure & span panel ────────────────────────────────────────
  const structurePanel = {
    reportsPerManager: flattening.reportsPerManager,
    baselineReportsPerManager: flattening.baselineReportsPerManager,
    flatteningDelta: flattening.flatteningDelta,
    managersAboveThreshold: flattening.managersAboveThreshold,
    healthySpanThreshold: flattening.healthySpanThreshold,
    managers: managers.map((m) => ({
      role: m.role,
      span: m.span,
      spanDelta:
        typeof m.spanBaselineMedian === 'number' ? round1(m.span - m.spanBaselineMedian) : null,
      coordinationLoadHours: m.coordinationLoadHours,
      oneOnOneMinutesPerReport: m.oneOnOneMinutesPerReport,
      spanOverloadIndex: m.spanOverloadIndex,
      riskState: m.riskState,
      trend: m.trend,
      confidence: m.confidence,
    })),
    roleBrokerage: graph.roleBrokerage,
  };

  // ── Section C: communication patterns (AI-narrated) ──────────────────────────
  const patterns = await narratePatterns(graph.patterns);

  // ── Section F: structural actions ────────────────────────────────────────────
  const actions = buildStructuralActions(managers, patterns);

  // ── Section H: discussion prompts ────────────────────────────────────────────
  const topDrivers = managers[0]?.drivers || [];
  const discussionPrompts = await generateDiscussionPrompts(topDrivers);

  // ── Section I: data readiness footer ─────────────────────────────────────────
  const suppressedCount = await ManagerWeekly.countDocuments({
    orgId,
    weekStart: weekStartStr,
    suppressed: true,
  });

  return {
    orgId: String(orgId),
    weekStart: weekStartStr,
    scoringVersion: '3.0.0',
    headline: {
      sentence: headline.sentence,
      source: headline.source,
      costExposureBand: costBand,
      status: orgStatus(flattening.orgSpanOverloadIndex),
      confidence: overallConfidence,
    },
    structurePanel,
    patterns,
    actions,
    discussionPrompts: discussionPrompts.questions,
    dataReadiness: {
      scoredManagers: managers.length,
      suppressedManagers: suppressedCount,
      graphNodes: graph.nodeCount,
      note: 'Manager-level conclusions require a known reporting line and a span above the privacy minimum.',
    },
    // Section E framing is static, research-backed, validation-pending:
    whyItMatters:
      'Coordination overload on managers is a leading indicator of slower delivery and ' +
      'regretted attrition — it appears in system behavior weeks before it shows in surveys ' +
      'or output (research-backed window, JD-R; SignalTrue validation ongoing).',
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function estimateCostBand(managersInStrain, replacementCost) {
  if (!managersInStrain) return { low: 0, high: 0, label: 'No managers currently in strain.' };
  // Band, not a point estimate (spec §A): assume 10–40% of strained managers
  // represent realized regretted-exit risk over the horizon.
  const low = Math.round(managersInStrain * 0.1);
  const high = Math.round(managersInStrain * 0.4);
  return {
    low,
    high,
    estCostLow: low * replacementCost,
    estCostHigh: high * replacementCost,
    label:
      `Exposure band: ${low}–${high} regretted manager departures ` +
      `(~${fmtMoney(low * replacementCost)}–${fmtMoney(high * replacementCost)}). ` +
      `Band, not a forecast — to be calibrated against observed exits.`,
  };
}

function buildStructuralActions(managers, patterns) {
  const actions = [];
  const driverAction = {
    span: { title: 'Rebalance reports', target: 'span ↓ · SOI ↓', effort: 'medium' },
    coordinationLoad: { title: 'Reassign a decision right', target: 'coordination load ↓', effort: 'low' },
    oneOnOneSupport: { title: 'Restore 1:1 cadence', target: 'manager support gap ↓', effort: 'low' },
    decisionConcentration: { title: 'Distribute brokerage', target: 'decision concentration ↓', effort: 'medium' },
  };
  for (const m of managers.filter((x) => x.riskState === 'critical' || x.riskState === 'strain')) {
    const top = m.drivers?.[0];
    const tmpl = driverAction[top?.key] || driverAction.coordinationLoad;
    actions.push({
      title: `${tmpl.title} — ${m.role} (SOI ${m.spanOverloadIndex})`,
      intendedMovement: tmpl.target,
      reversible: true,
      effort: tmpl.effort,
      basis: top?.evidence || 'elevated span overload',
    });
  }
  // Pattern-driven structural actions
  for (const p of patterns.slice(0, 3)) {
    if (p.recommendedAction) {
      actions.push({
        title: p.recommendedAction,
        intendedMovement: 'structural — see pattern',
        reversible: true,
        effort: 'low',
        basis: p.title,
      });
    }
  }
  return dedupe(actions);
}

function orgStatus(soi) {
  if (typeof soi !== 'number') return 'unknown';
  if (soi >= 80) return 'critical';
  if (soi >= 60) return 'strain';
  if (soi >= 40) return 'watch';
  return 'healthy';
}

function lowestConfidence(managers) {
  if (!managers.length) return 'low';
  if (managers.some((m) => m.confidence === 'low')) return 'low';
  if (managers.some((m) => m.confidence === 'medium')) return 'medium';
  return 'high';
}

function dedupe(actions) {
  const seen = new Set();
  return actions.filter((a) => (seen.has(a.title) ? false : seen.add(a.title)));
}

function round1(v) {
  return typeof v === 'number' ? Math.round(v * 10) / 10 : v;
}

function fmtMoney(v) {
  if (!v) return '€0';
  return `€${Math.round(v).toLocaleString('en-US')}`;
}

export default { assembleBrief };
