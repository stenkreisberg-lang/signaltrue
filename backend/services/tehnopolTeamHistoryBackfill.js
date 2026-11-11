/**
 * One-time, metadata-only recovery of the historical team snapshots needed
 * for comparable Tehnopol trends with the unified two-person threshold.
 * Every team uses the same measurement code; no demonstrations or fabricated
 * weeks, and no invitation/report email is sent by this job.
 */
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import { computeDailyMetrics } from './integrationMetricsService.js';
import { computeDayForOrg } from './engagementDailyAggregationService.js';
import { generateWeeklyBrief } from './weeklyBriefService.js';
import { TEHNOPOL_CANONICAL_ORG_ID } from './tehnopolCanonicalRepair.js';

const DAY_MS = 86400000;
const BACKFILL_DAYS = 28;
const KEY = 'tehnopol-unified-team-history-28d-v1';

export async function backfillTehnopolTeamHistory() {
  const org = await Organization.findById(TEHNOPOL_CANONICAL_ORG_ID)
    .select('_id domain lifecycleStatus settings.timezone').lean();
  if (!org || org.lifecycleStatus !== 'active' ||
    String(org.domain || '').toLowerCase() !== 'tehnopol.ee' ||
    org.settings?.timezone !== 'Europe/Tallinn' || !mongoose.connection.db) {
    return { status: 'not_applicable' };
  }
  const jobs = mongoose.connection.db.collection('signaltrue_maintenance_runs');
  await jobs.updateOne({ _id: KEY },
    { $setOnInsert: { status: 'pending', createdAt: new Date() } },
    { upsert: true });
  const leased = await jobs.findOneAndUpdate({
    _id: KEY, $or: [
      { status: { $in: ['pending', 'failed'] } },
      { status: 'running', startedAt: { $lt: new Date(Date.now() - 90 * 60000) } },
    ],
  }, { $set: { status: 'running', startedAt: new Date() },
    $inc: { attempts: 1 } }, { returnDocument: 'after' });
  if (!leased) return { status: 'already_processed_or_running' };

  let rebuiltDays = 0;
  let daysWithoutSources = 0;
  let teamDayRecords = 0;
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    for (let back = BACKFILL_DAYS; back >= 1; back--) {
      const day = new Date(today.getTime() - back * DAY_MS);
      const rollingStart = new Date(day.getTime() - 6 * DAY_MS);
      const rollingEnd = new Date(day.getTime() + DAY_MS);
      // No source records is 'unavailable', never synthetic zero work.
      const hasSource = await WorkEvent.exists({
        orgId: org._id, timestamp: { $gte: rollingStart, $lt: rollingEnd },
      });
      if (!hasSource) { daysWithoutSources++; continue; }
      await computeDailyMetrics(org._id, day);
      const teamRecords = await computeDayForOrg(org._id, day);
      teamDayRecords += teamRecords.length;
      rebuiltDays++;
    }

    const activeTwoMemberTeams = await Team.find({
      orgId: org._id, isActive: { $ne: false },
      'metadata.actualSize': 2,
    }).select('_id').lean();
    const measuredTwoMemberPeriods = activeTwoMemberTeams.length
      ? await IntegrationMetricsDaily.countDocuments({
        orgId: org._id,
        teamId: { $in: activeTwoMemberTeams.map(team => team._id) },
        userId: null,
        date: { $gte: new Date(today.getTime() - BACKFILL_DAYS * DAY_MS),
          $lt: today },
        calendarDaysObserved: { $gt: 0 },
      })
      : 0;

    await generateWeeklyBrief(org._id);
    const summary = {
      threshold: 2,
      lookedBackDays: BACKFILL_DAYS,
      rebuiltDays,
      daysWithoutSources,
      teamDayRecords,
      activeTwoMemberTeams: activeTwoMemberTeams.length,
      measuredTwoMemberPeriods,
    };
    await jobs.updateOne({ _id: KEY, status: 'running' }, {
      $set: { status: 'completed', completedAt: new Date(), summary },
    });
    console.info('[TehnopolTeamHistory]', JSON.stringify(summary));
    return { status: 'completed', ...summary };
  } catch (error) {
    await jobs.updateOne({ _id: KEY, status: 'running' },
      { $set: { status: 'failed', failedAt: new Date(),
        reason: 'recompute_failed' } });
    console.error('[TehnopolTeamHistory] Recompute failed:', error.message);
    return { status: 'failed', reason: 'recompute_failed' };
  }
}
