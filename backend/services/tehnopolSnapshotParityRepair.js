/**
 * Bounded, one-time correction of the canonical Tehnopol org-wide snapshot for
 * 10 November 2026 after independent raw-event reconciliation found three
 * stale calendar measurements. This never sends customer mail.
 *
 * It is intentionally NOT a general backfill or a replacement for checking
 * source-side Microsoft Graph coverage and user permissions.
 */
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import WorkEvent from '../models/workEvent.js';
import { TEHNOPOL_CANONICAL_ORG_ID } from './tehnopolCanonicalRepair.js';
import { compareStoredWorkPatternMetrics } from './workPatternParityAudit.js';
import { computeDailyMetrics } from './integrationMetricsService.js';
import { generateWeeklyBrief } from './weeklyBriefService.js';
import { logTehnopolProductionDiagnostic } from './tehnopolProductionDiagnostic.js';

const TARGET = new Date('2026-11-10T00:00:00.000Z');
const END = new Date('2026-11-11T00:00:00.000Z');
const START = new Date('2026-11-04T00:00:00.000Z');
const JOB_KEY = 'tehnopol-org-parity-2026-11-10-v1';
const MAX_EVENTS = 15000;
const CALENDAR_FIELDS = new Set([
  'meetingInstanceCount7d',
  'meetingDurationTotalHours7d',
  'focusTimeAvailabilityHours',
]);

export function assessTehnopolParityRepair(parity) {
  if (parity?.status === 'PASS') return { eligible: false, reason: 'already_consistent' };
  if (parity?.status !== 'FAIL') return { eligible: false, reason: 'missing_or_unverified_evidence' };
  const failed = parity.checks.filter((item) => item.status === 'FAIL');
  const other = parity.checks.filter((item) => item.status !== 'PASS' && item.status !== 'FAIL');
  if (!failed.length || other.length || failed.some((item) => !CALENDAR_FIELDS.has(item.field))) {
    return { eligible: false, reason: 'unexpected_measurement_failure' };
  }
  return { eligible: true, reason: 'calendar_snapshot_mismatch' };
}

async function getSnapshot(orgId) {
  return IntegrationMetricsDaily.findOne({
    orgId, teamId: null, userId: null, date: TARGET,
  }).lean();
}

async function readEvidence(orgId) {
  const scope = { orgId, timestamp: { $gte: START, $lt: END } };
  const total = await WorkEvent.countDocuments(scope);
  if (total < 1 || total > MAX_EVENTS) return { status: 'event_limit_or_missing', total };
  const events = await WorkEvent.find(scope)
    .select('source eventType actorUserId externalId timestamp metadata').lean();
  if (events.length !== total) return { status: 'changed_while_reading', total };
  return { status: 'complete', total, events };
}

function scheduleFromOrg(org) {
  return {
    timezone: org.settings?.timezone || 'UTC',
    workdayStart: org.settings?.workdayStart || '09:00',
    workdayEnd: org.settings?.workdayEnd || '17:00',
  };
}

export async function repairTehnopolNovemberSnapshot() {
  const org = await Organization.findById(TEHNOPOL_CANONICAL_ORG_ID)
    .select('domain lifecycleStatus settings').lean();
  if (!org || String(org.domain || '').toLowerCase() !== 'tehnopol.ee' ||
      org.lifecycleStatus !== 'active' || org.settings?.timezone !== 'Europe/Tallinn') {
    return { applied: false, reason: 'canonical_tenant_guard' };
  }
  if (!mongoose.connection.db) return { applied: false, reason: 'database_unavailable' };

  const snapshot = await getSnapshot(org._id);
  if (!snapshot) return { applied: false, reason: 'november_snapshot_missing' };
  const evidence = await readEvidence(org._id);
  if (evidence.status !== 'complete') {
    return { applied: false, reason: evidence.status, eventCount: evidence.total };
  }
  const workSchedule = scheduleFromOrg(org);
  const before = compareStoredWorkPatternMetrics({
    events: evidence.events, snapshot, workSchedule,
  });
  const eligibility = assessTehnopolParityRepair(before);
  if (!eligibility.eligible) {
    return { applied: false, reason: eligibility.reason, beforeStatus: before.status };
  }

  const jobs = mongoose.connection.db.collection('signaltrue_maintenance_runs');
  await jobs.updateOne({ _id: JOB_KEY }, {
    $setOnInsert: { status: 'pending', createdAt: new Date() },
  }, { upsert: true });
  const lease = await jobs.findOneAndUpdate({
    _id: JOB_KEY, status: { $in: ['pending', 'failed'] },
  }, {
    $set: { status: 'running', startedAt: new Date(), errorCategory: null },
    $inc: { attempts: 1 },
  }, { returnDocument: 'after' });
  if (!lease) return { applied: false, reason: 'previously_processed_or_running' };

  try {
    // Recompute the canonical measurement for the exact affected day.
    // This upserts metrics for the canonical organisation and its own teams.
    await computeDailyMetrics(org._id, TARGET);

    // Check against the events still in the DB after recomputation. Do not
    // convert a moving source window into a false PASS.
    const finalEvidence = await readEvidence(org._id);
    const refreshed = await getSnapshot(org._id);
    const after = finalEvidence.status === 'complete'
      ? compareStoredWorkPatternMetrics({
        events: finalEvidence.events, snapshot: refreshed, workSchedule,
      })
      : { status: 'INCOMPLETE', checks: [] };

    const audit = {
      beforeStatus: before.status,
      afterStatus: after.status,
      calendarBefore: before.checks.filter((check) => CALENDAR_FIELDS.has(check.field))
        .map(({ field, discrepancy }) => ({ field, discrepancy })),
      calendarAfter: after.checks.filter((check) => CALENDAR_FIELDS.has(check.field))
        .map(({ field, discrepancy, status }) => ({ field, discrepancy, status })),
      eventCountBefore: evidence.total,
      eventCountAfter: finalEvidence.total,
    };

    if (after.status !== 'PASS') {
      await jobs.updateOne({ _id: JOB_KEY, status: 'running' }, {
        $set: { status: 'failed', failedAt: new Date(),
          errorCategory: 'parity_still_failed', audit },
      });
      console.error('[TehnopolSnapshotRepair] Parity still incomplete', JSON.stringify(audit));
      return { applied: false, reason: 'parity_still_failed', ...audit };
    }

    // No sending. Writes a replacement saved HR brief after verified metrics.
    await generateWeeklyBrief(org._id);
    await jobs.updateOne({ _id: JOB_KEY, status: 'running' }, {
      $set: { status: 'completed', completedAt: new Date(), audit },
    });
    console.info('[TehnopolSnapshotRepair] Recomputed and verified', JSON.stringify(audit));
    await logTehnopolProductionDiagnostic();
    return { applied: true, ...audit };
  } catch (error) {
    await jobs.updateOne({ _id: JOB_KEY, status: 'running' }, {
      $set: { status: 'failed', failedAt: new Date(), errorCategory: 'repair_exception' },
    });
    console.error('[TehnopolSnapshotRepair] Failed:', error.message);
    return { applied: false, reason: 'repair_exception' };
  }
}
