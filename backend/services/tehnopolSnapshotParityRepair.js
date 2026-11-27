/**
 * Bounded, one-time correction of the canonical Tehnopol org-wide snapshot for
 * the affected November 2026 dates after raw-event reconciliation found
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
import { computeCalendarTransitionEvidence, computeDailyMetrics } from './integrationMetricsService.js';
import { generateWeeklyBrief } from './weeklyBriefService.js';
import { logTehnopolProductionDiagnostic } from './tehnopolProductionDiagnostic.js';

const AFFECTED_DATES = ['2026-11-01', '2026-11-08', '2026-11-10', '2026-11-15', '2026-11-22'];
const DAY = 86400000;
const MAX_EVENTS = 15000;
const CALENDAR_FIELDS = new Set([
  'meetingInstanceCount7d',
  'meetingDurationTotalHours7d',
  'focusTimeAvailabilityHours',
]);

export function assessTehnopolParityRepair(parity) {
  if (parity?.status === 'PASS') return { eligible: false, reason: 'already_consistent' };
  if (parity?.status !== 'FAIL') return { eligible: false, reason: 'missing_or_unverified_evidence' };
  const expected = [...CALENDAR_FIELDS, 'messageCount7d', 'afterHoursMessageRatio'];
  const checks = parity.checks || [];
  if (checks.length !== expected.length || expected.some(field => !checks.some(check => check.field === field))) {
    return { eligible: false, reason: 'missing_or_unverified_evidence' };
  }
  const failed = checks.filter((item) => item.status === 'FAIL');
  const other = parity.checks.filter((item) => item.status !== 'PASS' && item.status !== 'FAIL');
  if (!failed.length || other.length || failed.some((item) => !CALENDAR_FIELDS.has(item.field))) {
    return { eligible: false, reason: 'unexpected_measurement_failure' };
  }
  return { eligible: true, reason: 'calendar_snapshot_mismatch' };
}

async function getSnapshot(orgId, target) {
  return IntegrationMetricsDaily.findOne({
    orgId, teamId: null, userId: null, date: target,
  }).lean();
}

async function readEvidence(orgId, target) {
  const scope = { orgId, timestamp: {
    $gte: new Date(target.getTime() - 6 * DAY), $lt: new Date(target.getTime() + DAY),
  } };
  const total = await WorkEvent.countDocuments(scope);
  if (total < 1 || total > MAX_EVENTS) return { status: 'event_limit_or_missing', total };
  const events = await WorkEvent.find(scope)
    .select('source eventType actorUserId externalId timestamp metadata.meetingIdHash metadata.meetingInstanceIdHash metadata.durationMinutes metadata.startTime metadata.endTime metadata.internalAttendeeCount metadata.isAllDay metadata.isCancelled metadata.isFreeCalendarEvent metadata.attendeeResponseStatus')
    .limit(MAX_EVENTS + 1).lean();
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
  const results = [];
  for (const day of AFFECTED_DATES) {
    results.push(await reconcileTehnopolSnapshot(new Date(day + 'T00:00:00Z'), 'tehnopol-org-parity-' + day + '-v1'));
  }
  return results;
}

// Reconcile only the weekly anchors used in the pilot audit. Historical customer
// dispatches stay frozen. Reads select calendar metadata only.
export async function reconcileTehnopolWeeklyTransitions() {
  const org = await Organization.findById(TEHNOPOL_CANONICAL_ORG_ID).select('domain lifecycleStatus settings').lean();
  if (org?.domain !== 'tehnopol.ee' || org.lifecycleStatus !== 'active' || org.settings?.timezone !== 'Europe/Tallinn') return;
  const db = mongoose.connection.db;
  if (!db) return;
  const jobs = db.collection('signaltrue_maintenance_runs');
  const key = 'tehnopol-calendar-transitions-2026-09-13-to-11-22-v1';
  await jobs.updateOne({ _id: key }, { $setOnInsert: { status: 'pending' } }, { upsert: true });
  const startedAt = new Date();
  const lease = await jobs.findOneAndUpdate({ _id: key, $or: [
    { status: { $in: ['pending', 'failed'] } },
    { status: 'running', startedAt: { $lt: new Date(+startedAt - 3600000) } },
  ] }, { $set: { status: 'running', startedAt } }, { returnDocument: 'after' });
  if (!lease) return;
  const dates = [];
  try {
    for (let week = 0; week < 11; week++) {
      const target = new Date(Date.UTC(2026, 8, 13) + week * 7 * DAY);
      const records = await IntegrationMetricsDaily.find({ orgId: org._id, userId: null, date: target,
        calculationWindowVersion: 'rolling7-calendar-days-v2' })
        .select('teamId meetingInstanceCount7d meetingParticipantHours7d backToBackMeetingBlocks').lean();
      const events = await WorkEvent.find({ orgId: org._id, eventType: { $in: ['meeting', 'meet_started'] },
        timestamp: { $gte: new Date(+target - 6*DAY), $lt: new Date(+target + DAY) } })
        .select('source eventType actorUserId teamId timestamp externalId metadata.startTime metadata.endTime metadata.durationMinutes metadata.meetingIdHash metadata.meetingInstanceIdHash metadata.internalAttendeeCount metadata.isAllDay metadata.isCancelled metadata.isFreeCalendarEvent metadata.attendeeResponseStatus').limit(MAX_EVENTS+1).lean();
      if (!records.length || !events.length || events.length > MAX_EVENTS) throw new Error('source_or_snapshot_unavailable');
      let checked = 0, updated = 0, withheld = 0;
      const changes = [];
      for (const record of records) {
        const source = record.teamId ? events.filter(event => String(event.teamId) === String(record.teamId)) : events;
        if (!source.length) { withheld++; continue; }
        const metrics = computeCalendarTransitionEvidence(source, target);
        if (record.meetingInstanceCount7d !== metrics.meetingInstanceCount7d ||
            !Number.isFinite(record.meetingParticipantHours7d) ||
            Math.abs(record.meetingParticipantHours7d - metrics.meetingParticipantHours7d) > 0.05) {
          withheld++;
          continue;
        }
        checked++;
        if (record.backToBackMeetingBlocks === metrics.backToBackMeetingBlocks) continue;
        changes.push({ updateOne: { filter: { _id: record._id, orgId: org._id,
          backToBackMeetingBlocks: record.backToBackMeetingBlocks, meetingInstanceCount7d: record.meetingInstanceCount7d,
          meetingParticipantHours7d: record.meetingParticipantHours7d },
          update: { $set: { backToBackMeetingBlocks: metrics.backToBackMeetingBlocks } } } });
      }
      if (changes.length) {
        const result = await IntegrationMetricsDaily.bulkWrite(changes);
        if (result.matchedCount !== changes.length) throw new Error('snapshot_changed_during_check');
        updated = result.modifiedCount;
      }
      dates.push({ date: target, checked, updated, withheld });
    }
    await generateWeeklyBrief(org._id);
    await jobs.updateOne({ _id: key, status: 'running', startedAt },
      { $set: { status: 'completed', completedAt: new Date(), dates } });
  } catch (err) {
    await jobs.updateOne({ _id: key, status: 'running', startedAt }, { $set: { status: 'failed', dates } });
    throw err;
  }
}

async function reconcileTehnopolSnapshot(target, jobKey) {
  const org = await Organization.findById(TEHNOPOL_CANONICAL_ORG_ID)
    .select('domain lifecycleStatus settings').lean();
  if (!org || String(org.domain || '').toLowerCase() !== 'tehnopol.ee' ||
      org.lifecycleStatus !== 'active' || org.settings?.timezone !== 'Europe/Tallinn') {
    return { applied: false, reason: 'canonical_tenant_guard' };
  }
  if (!mongoose.connection.db) return { applied: false, reason: 'database_unavailable' };

  const jobs = mongoose.connection.db.collection('signaltrue_maintenance_runs');
  const previous = await jobs.findOne({ _id: jobKey }, {projection:{status:1}});
  if (previous?.status === 'completed') return {applied:false,reason:'already_reconciled'};
  const snapshot = await getSnapshot(org._id, target);
  if (!snapshot) return { applied: false, reason: 'november_snapshot_missing' };
  if (snapshot.calculationWindowVersion !== 'rolling7-calendar-days-v2') {
    return { applied: false, reason: 'noncomparable_calculation_version' };
  }
  const evidence = await readEvidence(org._id, target);
  if (evidence.status !== 'complete') {
    return { applied: false, reason: evidence.status, eventCount: evidence.total };
  }
  const workSchedule = scheduleFromOrg(org);
  const before = compareStoredWorkPatternMetrics({
    events: evidence.events, snapshot, workSchedule,
  });
  const eligibility = assessTehnopolParityRepair(before);
  if (!eligibility.eligible && !(before.status === 'PASS' && previous)) {
    return { applied: false, reason: eligibility.reason, beforeStatus: before.status };
  }

  await jobs.updateOne({ _id: jobKey }, {
    $setOnInsert: { status: 'pending', createdAt: new Date() },
  }, { upsert: true });
  const startedAt = new Date();
  const lease = await jobs.findOneAndUpdate({
    _id: jobKey, $or: [
      {status:{$in:['pending','failed']}},
      {status:'running',startedAt:{$lt:new Date(Date.now()-60*60*1000)}},
    ],
  }, {
    $set: { status: 'running', startedAt, errorCategory: null },
    $inc: { attempts: 1 },
  }, { returnDocument: 'after' });
  if (!lease) return { applied: false, reason: 'previously_processed_or_running' };

  try {
    // Recompute the canonical measurement for the exact affected day.
    // This upserts metrics for the canonical organisation and its own teams.
    if (eligibility.eligible) await computeDailyMetrics(org._id, target);

    // Check against the events still in the DB after recomputation. Do not
    // convert a moving source window into a false PASS.
    const finalEvidence = await readEvidence(org._id, target);
    const refreshed = await getSnapshot(org._id, target);
    const after = finalEvidence.status === 'complete' && finalEvidence.total === evidence.total
      ? compareStoredWorkPatternMetrics({
        events: finalEvidence.events, snapshot: refreshed, workSchedule,
      })
      : { status: 'INCOMPLETE', checks: [] };

    const audit = {
      snapshotDate: target.toISOString(),
      beforeStatus: before.status,
      afterStatus: after.status,
      referenceChecks: after.checks.map(({ field, stored, recomputed, status }) => ({ field, stored, recomputed, status })),
      calendarBefore: before.checks.filter((check) => CALENDAR_FIELDS.has(check.field))
        .map(({ field, discrepancy }) => ({ field, discrepancy })),
      calendarAfter: after.checks.filter((check) => CALENDAR_FIELDS.has(check.field))
        .map(({ field, discrepancy, status }) => ({ field, discrepancy, status })),
      eventCountBefore: evidence.total,
      eventCountAfter: finalEvidence.total,
    };

    if (after.status !== 'PASS') {
      await jobs.updateOne({ _id: jobKey, status: 'running', startedAt }, {
        $set: { status: 'failed', failedAt: new Date(),
          errorCategory: 'parity_still_failed', audit },
      });
      console.error('[TehnopolSnapshotRepair] Parity still incomplete', JSON.stringify(audit));
      return { applied: false, reason: 'parity_still_failed', ...audit };
    }

    // No sending. Writes a replacement saved HR brief after verified metrics.
    await generateWeeklyBrief(org._id);
    await jobs.updateOne({ _id: jobKey, status: 'running', startedAt }, {
      $set: { status: 'completed', completedAt: new Date(), audit },
    });
    console.info('[TehnopolSnapshotRepair] Recomputed and verified', JSON.stringify(audit));
    await logTehnopolProductionDiagnostic();
    return { applied: true, ...audit };
  } catch (error) {
    await jobs.updateOne({ _id: jobKey, status: 'running', startedAt }, {
      $set: { status: 'failed', failedAt: new Date(), errorCategory: 'repair_exception' },
    });
    console.error('[TehnopolSnapshotRepair] Failed:', error.message);
    return { applied: false, reason: 'repair_exception' };
  }
}
