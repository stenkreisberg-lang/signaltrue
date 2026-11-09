/**
 * Once-only historical reconstruction after correcting the 7-day window.
 * Rebuilds the same Sunday samples used by historical report trends.
 * No raw message bodies, no external analytics service, and no customer mail.
 */
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';
import { computeDailyMetrics } from './integrationMetricsService.js';

const KEY = 'rolling7-calendar-days-v2-history-2026-11-09';
const DAY = 86400000;
const LEASE_MS = 45 * 60 * 1000;

export function historicalSampleDays(now = new Date(), count = 9) {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() || 7)); // most recent completed Sunday
  return Array.from({ length: count }, (_, i) => new Date(d.getTime() - (count - 1 - i) * 7 * DAY));
}
export async function rebuildSevenDayReportHistory() {
  const db = mongoose.connection.db;
  if (!db) return { applied: false, reason: 'database_not_connected' };
  const jobs = db.collection('signaltrue_maintenance_runs');
  await jobs.updateOne({ _id: KEY },
    { $setOnInsert: { status: 'pending', createdAt: new Date() } },
    { upsert: true });
  const lease = await jobs.findOneAndUpdate({
    _id: KEY,
    $or: [
      { status: { $in: ['pending', 'failed'] } },
      { status: 'running', startedAt: { $lt: new Date(Date.now() - LEASE_MS) } },
    ],
  }, {
    $set: { status: 'running', startedAt: new Date() },
    $inc: { attempts: 1 },
  }, { returnDocument: 'after' });
  if (!lease) return { applied: false, reason: 'completed_or_running' };
  let processed = 0;
  const failures = [];
  try {
    const orgs = await Organization.find({ lifecycleStatus: { $ne: 'retired' } })
      .select('_id name').lean();
    const days = historicalSampleDays();
    for (const org of orgs) {
      for (const day of days) {
        const start = new Date(day.getTime() - 6 * DAY);
        const end = new Date(day.getTime() + DAY);
        const hasActivity = await WorkEvent.exists({
          orgId: org._id,
          timestamp: { $gte: start, $lt: end },
        });
        if (!hasActivity) continue; // do not turn unavailable weeks into fabricated zeros
        try {
          await computeDailyMetrics(org._id, day);
          processed++;
        } catch (error) {
          failures.push({ orgId: String(org._id), date: day.toISOString().slice(0, 10), reason: error.message });
          console.error('[HistoryRebuild] Sample failed', String(org._id), day.toISOString().slice(0, 10));
        }
      }
    }
    if (failures.length) throw new Error('some_historical_samples_failed');
    const summary = { processed, organizations: orgs.length, sampledWeeks: days.length };
    await jobs.updateOne({ _id: KEY }, { $set: { status: 'completed', completedAt: new Date(), summary } });
    console.info('[HistoryRebuild] Completed corrected historical weekly samples', summary);
    return { applied: true, ...summary };
  } catch (error) {
    await jobs.updateOne({ _id: KEY }, { $set: {
      status: 'failed', failedAt: new Date(), processed,
      errorCategory: failures.length ? 'sample_errors' : 'pipeline_error',
    } });
    console.error('[HistoryRebuild] Failed', error.message, 'samples', failures.length);
    return { applied: false, processed, errors: failures.length };
  }
}
