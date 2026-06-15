/**
 * Outcome Service — closes the loop (observe → act → re-measure → learn).
 *
 * `computeDeliveryOutcomes` is REAL and runnable today: it derives cycle time,
 * reopen rate, and throughput from task WorkEvents (Jira/Asana/Linear ingest).
 * `ingestAttritionFromHRIS` is a SCAFFOLD — it needs an HRIS connector +
 * credentials and currently throws a clear NotConfigured error rather than
 * inventing numbers.
 *
 * `evaluateInterventionEffect` does the difference-in-differences-style
 * before/after for the "did it work?" section.
 *
 * See docs/PIVOT_REPORT_SPEC.md §1.3 / §G. Deterministic; no AI.
 */

import WorkEvent from '../models/workEvent.js';
import OperationalOutcome from '../models/operationalOutcome.js';
import { median } from '../utils/robustMath.js';

const COMPLETED_TYPES = new Set(['task_completed', 'todo_completed']);

// ── Delivery outcomes (computable now) ────────────────────────────────────────

/**
 * Compute + persist delivery outcomes for a team-week from task WorkEvents.
 * @returns {Object} the outcome record (or null if no task data)
 */
export async function computeDeliveryOutcomes(orgId, teamId, weekStartStr) {
  const start = new Date(`${weekStartStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

  const events = await WorkEvent.find({
    orgId,
    teamId,
    timestamp: { $gte: start, $lt: end },
    eventType: { $in: ['task_completed', 'task_reopened', 'todo_completed', 'task_status_changed'] },
  })
    .select('eventType metadata.cycleTimeStartedAt metadata.cycleTimeCompletedAt metadata.reopenCount')
    .lean();

  if (events.length === 0) return null;

  const completed = events.filter((e) => COMPLETED_TYPES.has(e.eventType));
  const cycleTimes = completed
    .map((e) => {
      const s = e.metadata?.cycleTimeStartedAt;
      const c = e.metadata?.cycleTimeCompletedAt;
      if (!s || !c) return null;
      return (new Date(c) - new Date(s)) / (1000 * 60 * 60); // hours
    })
    .filter((v) => typeof v === 'number' && v >= 0);

  const reopened = events.filter((e) => e.eventType === 'task_reopened').length;
  const throughput = completed.length;
  const reopenRate = throughput > 0 ? round2(reopened / throughput) : null;
  const cycleTimeMedianHours = cycleTimes.length ? round1(median(cycleTimes)) : null;

  const record = {
    orgId,
    teamId,
    weekStart: weekStartStr,
    family: 'delivery',
    source: 'workevents',
    cycleTimeMedianHours,
    reopenRate,
    throughput,
    confidence: cycleTimes.length >= 5 ? 'medium' : 'low',
  };

  await OperationalOutcome.findOneAndUpdate(
    { orgId, teamId, weekStart: weekStartStr, family: 'delivery' },
    { $set: record },
    { upsert: true, new: true }
  );
  return record;
}

// ── Attrition (needs HRIS connector) ──────────────────────────────────────────

/**
 * SCAFFOLD: ingest voluntary exits / absence from an HRIS connector.
 * Intentionally throws until a connector + credentials are configured — we never
 * fabricate people outcomes. Wire BambooHR/Workday/HiBob/SCIM here.
 */
export async function ingestAttritionFromHRIS(/* orgId, weekStartStr */) {
  if (!process.env.HRIS_PROVIDER) {
    const err = new Error(
      'HRIS connector not configured (set HRIS_PROVIDER + credentials). ' +
        'Attrition/absence outcomes are not available until then.'
    );
    err.code = 'OUTCOME_CONNECTOR_NOT_CONFIGURED';
    throw err;
  }
  // TODO: implement provider-specific ingest -> OperationalOutcome(family:'people')
  throw new Error(`HRIS provider '${process.env.HRIS_PROVIDER}' ingest not yet implemented.`);
}

// ── Did-it-work (intervention effect) ─────────────────────────────────────────

/**
 * Compare a target metric before vs after an intervention week.
 * `seriesFn(weekStart)` returns the numeric value of the targeted metric for a
 * given week (caller supplies it from ManagerWeekly / EngagementStrainWeekly).
 *
 * @returns {{baseline:number|null, at14:number|null, at28:number|null, delta14:number|null, delta28:number|null, evidence:'sufficient'|'insufficient'}}
 */
export async function evaluateInterventionEffect({ baselineWeek, plus14Week, plus28Week, seriesFn }) {
  const baseline = await safe(seriesFn, baselineWeek);
  const at14 = await safe(seriesFn, plus14Week);
  const at28 = await safe(seriesFn, plus28Week);
  const delta14 = num(baseline) && num(at14) ? round1(at14 - baseline) : null;
  const delta28 = num(baseline) && num(at28) ? round1(at28 - baseline) : null;
  const evidence = num(baseline) && (num(at14) || num(at28)) ? 'sufficient' : 'insufficient';
  return { baseline, at14, at28, delta14, delta28, evidence };
}

// ── helpers ───────────────────────────────────────────────────────────────────

async function safe(fn, arg) {
  try {
    return await fn(arg);
  } catch {
    return null;
  }
}
function num(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
function round1(v) {
  return typeof v === 'number' ? Math.round(v * 10) / 10 : v;
}
function round2(v) {
  return typeof v === 'number' ? Math.round(v * 100) / 100 : v;
}

export default {
  computeDeliveryOutcomes,
  ingestAttritionFromHRIS,
  evaluateInterventionEffect,
};
