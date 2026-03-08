/**
 * Signal Bridge Service
 *
 * The automated pipeline (signalGenerationService / integrationSyncScheduler)
 * writes to the CategoryKingSignal collection.
 * The dashboard pages (Signals, Overview, Insights, ExecutiveSummary) read from
 * the Signal collection.
 *
 * This service bridges the gap by converting active CategoryKingSignals into
 * Signal documents that the frontend can consume.
 *
 * Should be called after each signal-generation run (see integrationSyncScheduler).
 */

import Signal from '../models/signal.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import Team from '../models/team.js';

// ────────────────────────────────────────────────────
// CategoryKing signalCategory → Signal signalType map
// ────────────────────────────────────────────────────
//
// CategoryKingSignal.signalCategory values:
//   demand, recovery, progress, external_pressure, coordination
//
// Signal.signalType values (15 enum entries) belong to 4 drift families:
//   Capacity Drift:      meeting-load-spike, after-hours-creep, focus-erosion,
//                         recovery-deficit, context-switching
//   Coordination Drift:  network-bottleneck, handoff-bottleneck, rework-churn,
//                         response-delay-increase
//   Cohesion Drift:      message-volume-drop, sentiment-decline
//   Culture Drift:       meeting-exclusion, peripheral-member,
//                         hybrid-response-gap, fading-voice
//
// The mapping below picks the best-fit signalType for each CK signalType.
// ────────────────────────────────────────────────────

const CK_TO_SIGNAL_TYPE = {
  // Sprint 1: Jira/Asana
  execution_stagnation: 'focus-erosion',
  rework_spiral: 'rework-churn',
  overcommitment_risk: 'after-hours-creep',
  wip_overload: 'context-switching',

  // Sprint 2: Gmail/Meet
  boundary_erosion: 'after-hours-creep',
  panic_coordination: 'network-bottleneck',
  meeting_fatigue: 'meeting-load-spike',
  response_drift: 'response-delay-increase',

  // Sprint 3: Notion
  decision_churn: 'handoff-bottleneck',
  documentation_decay: 'message-volume-drop',
  cognitive_overload: 'focus-erosion',

  // Sprint 4: CRM
  external_pressure_injection: 'context-switching',
  escalation_cascade: 'network-bottleneck',
  handoff_spike: 'handoff-bottleneck',

  // Cross-source composite
  recovery_collapse: 'recovery-deficit',
  work_aging_pressure: 'after-hours-creep',
  systemic_overload: 'meeting-load-spike',

  // Basecamp
  passive_disengagement: 'message-volume-drop',
  async_breakdown: 'response-delay-increase',
};

// Map numeric 0-100 severity to the Signal severity enum
function mapSeverity(score) {
  if (score >= 65) return 'Critical';
  if (score >= 35) return 'Risk';
  return 'Informational';
}

// Map numeric 0-100 confidence to the Signal confidence enum
function mapConfidence(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

/**
 * Sync all active CategoryKingSignals → Signal docs for one organization.
 * Uses upsert keyed on (orgId + teamId + signalType + status=Open/active)
 * so it won't duplicate.
 */
export async function bridgeSignalsForOrg(orgId) {
  const ckSignals = await CategoryKingSignal.find({
    orgId,
    status: 'active',
  }).lean();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const ck of ckSignals) {
    const signalType = CK_TO_SIGNAL_TYPE[ck.signalType];
    if (!signalType) {
      skipped++;
      continue;
    }

    // Build a unique lookup key per team + signalType
    const filter = {
      orgId: ck.orgId,
      teamId: ck.teamId,
      signalType,
      status: { $in: ['Open', 'Acknowledged'] },
    };

    const severity = mapSeverity(ck.severity);
    const confidence = mapConfidence(ck.confidence);

    const update = {
      $set: {
        title: ck.title,
        severity,
        confidence,
        confidenceScore: ck.confidence,
        sources: ck.sources || [],
        'deviation.startDate': ck.dateRange?.start || new Date(),
        'deviation.currentValue': ck.whatChanged?.[0]?.currentValue ?? ck.severity,
        'deviation.baselineValue': ck.whatChanged?.[0]?.previousValue ?? 0,
        'deviation.delta': ck.whatChanged?.[0]?.delta ?? ck.severity,
        'deviation.deltaPercent': ck.whatChanged?.[0]?.deltaPercent ?? 0,
        'deviation.sustainedDays': ck.trendDays || 0,
        'consequence.statement': ck.explanation || 'Pattern detected — see drivers for detail.',
        drivers: (ck.drivers || []).map(d => ({
          name: d.source || d.description,
          contribution: d.contribution,
          metric: d.source,
          change: d.description,
        })),
        recommendedActions: (ck.recommendedActions || []).map(a => ({
          action: a.action,
          expectedEffect: a.expectedImpact,
          effort: a.effort ? a.effort.charAt(0).toUpperCase() + a.effort.slice(1) : 'Medium',
          timeframe: a.timeframe,
        })),
        lastUpdated: new Date(),
      },
      $setOnInsert: {
        orgId: ck.orgId,
        teamId: ck.teamId,
        signalType,
        status: 'Open',
        firstDetected: ck.firstDetectedAt || ck.createdAt || new Date(),
      },
    };

    const result = await Signal.updateOne(filter, update, { upsert: true });
    if (result.upsertedCount) created++;
    else if (result.modifiedCount) updated++;
  }

  console.log(`[SignalBridge] Org ${orgId}: ${created} created, ${updated} updated, ${skipped} skipped`);
  return { created, updated, skipped };
}

/**
 * Sync CategoryKingSignals → Signal for ALL active orgs.
 * Designed to run right after runSignalGeneration() in the scheduler.
 */
export async function bridgeAllOrgSignals() {
  const orgIds = await CategoryKingSignal.distinct('orgId', { status: 'active' });
  const results = { orgs: 0, created: 0, updated: 0, skipped: 0 };

  for (const orgId of orgIds) {
    try {
      const r = await bridgeSignalsForOrg(orgId);
      results.orgs++;
      results.created += r.created;
      results.updated += r.updated;
      results.skipped += r.skipped;
    } catch (err) {
      console.error(`[SignalBridge] Error for org ${orgId}:`, err.message);
    }
  }

  console.log('[SignalBridge] Complete:', results);
  return results;
}

export default { bridgeSignalsForOrg, bridgeAllOrgSignals };
