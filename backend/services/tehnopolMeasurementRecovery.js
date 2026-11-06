/**
 * One-time, resumable Tehnopol measurement recovery after Chat.Read.All became
 * available and local-time calculation bugs were fixed.
 *
 * The job is scoped to the canonical active tenant, never accesses message
 * bodies, and never sends an email. It reuses normal ingestion and metrics.
 */
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import { MicrosoftAdapter } from './coreIntegrationAdapters.js';
import { backfillWorkEventAttribution } from './workEventAttributionService.js';
import { computeDailyMetrics } from './integrationMetricsService.js';
import { computeDayForOrg } from './engagementDailyAggregationService.js';
import { generateWeeklyBrief } from './weeklyBriefService.js';
import { TEHNOPOL_CANONICAL_ORG_ID } from './tehnopolCanonicalRepair.js';

const DAY = 86400000;
const RECOVERY_KEY = 'tehnopol-tallinn-chat-metrics-v2-parallel';
const MAX_LEASE_MS = 45 * 60 * 1000;
const SOURCE_BACKFILL_DAYS = 21;
const METRIC_RECALC_DAYS = 14;

export function isEligibleTehnopolRecovery(org) {
  return Boolean(
    org &&
    String(org._id) === TEHNOPOL_CANONICAL_ORG_ID &&
    String(org.domain || '').toLowerCase() === 'tehnopol.ee' &&
    org.lifecycleStatus === 'active' &&
    org.settings?.timezone === 'Europe/Tallinn' &&
    org.integrations?.microsoft?.tenantId &&
    org.integrations?.microsoft?.scope === 'both'
  );
}

export function getTehnopolRecoveryDays(now = new Date()) {
  const todayUtc = new Date(now);
  todayUtc.setUTCHours(0, 0, 0, 0);
  const lastDay = new Date(todayUtc.getTime() - DAY);
  const firstDay = new Date(todayUtc.getTime() - METRIC_RECALC_DAYS * DAY);
  const sourceSince = new Date(todayUtc.getTime() - SOURCE_BACKFILL_DAYS * DAY);
  return { todayUtc, lastDay, firstDay, sourceSince };
}

export async function runTehnopolMeasurementRecovery() {
  const org = await Organization.findById(TEHNOPOL_CANONICAL_ORG_ID).lean();
  if (!isEligibleTehnopolRecovery(org)) {
    console.warn('[TehnopolRecovery] Not eligible: canonical organisation, Tallinn timezone or Microsoft scope missing');
    return { applied: false, reason: 'not_eligible' };
  }

  // An atomic lease prevents overlapping runs during deploys/restarts.
  // The run is versioned so it never repeats after a verified completion.
  const jobs = mongoose.connection.db.collection('signaltrue_maintenance_runs');
  await jobs.updateOne(
    { _id: RECOVERY_KEY },
    { $setOnInsert: { status: 'pending', createdAt: new Date() } },
    { upsert: true }
  );
  const leased = await jobs.findOneAndUpdate(
    {
      _id: RECOVERY_KEY,
      $or: [
        { status: { $in: ['pending', 'failed'] } },
        { status: 'running', startedAt: { $lt: new Date(Date.now() - MAX_LEASE_MS) } },
      ],
    },
    { $set: { status: 'running', startedAt: new Date(), errorCategory: null }, $inc: { attempts: 1 } },
    { returnDocument: 'after' }
  );
  if (!leased) return { applied: false, reason: 'completed_or_running' };

  const { todayUtc, firstDay, sourceSince } = getTehnopolRecoveryDays();
  try {
    console.log('[TehnopolRecovery] Starting bounded Microsoft metadata backfill');
    const microsoft = new MicrosoftAdapter();
    const result = await microsoft.sync(org._id, sourceSince, new Date());
    const outlook = result.details?.sources?.outlook;
    const teams = result.details?.sources?.teams;
    const chat = teams?.coverage;
    if (
      !result.success || !outlook?.success || !teams?.success ||
      !chat?.chatAttemptedUsers || chat.chatAttemptedUsers !== chat.chatSyncedUsers ||
      chat.chatFailedUsers > 0
    ) {
      throw new Error('source_coverage_incomplete');
    }

    const attribution = await backfillWorkEventAttribution(org._id, {
      since: sourceSince,
      sources: ['microsoft-outlook', 'microsoft-teams'],
    });
    let recomputedDays = 0;
    let recomputedTeamDays = 0;
    for (let day = new Date(firstDay); day < todayUtc; day = new Date(day.getTime() + DAY)) {
      await computeDailyMetrics(org._id, day);
      const daily = await computeDayForOrg(org._id, day);
      recomputedDays++;
      recomputedTeamDays += daily.length;
    }
    await generateWeeklyBrief(org._id);
    const summary = {
      sourceDays: SOURCE_BACKFILL_DAYS,
      metricDays: recomputedDays,
      teamDays: recomputedTeamDays,
      chatUsersChecked: chat.chatAttemptedUsers,
      chatUsersSucceeded: chat.chatSyncedUsers,
      rawEventsProcessed: result.eventsProcessed || 0,
      attributionUpdated: attribution.updated,
    };
    await jobs.updateOne(
      { _id: RECOVERY_KEY, status: 'running' },
      { $set: { status: 'completed', completedAt: new Date(), summary } }
    );
    console.log('[TehnopolRecovery] Complete ' + JSON.stringify(summary));
    return { applied: true, ...summary };
  } catch (err) {
    // No Graph payloads, user IDs or message contents are logged or stored.
    const category = err.message === 'source_coverage_incomplete'
      ? 'source_coverage_incomplete'
      : 'pipeline_failed';
    await jobs.updateOne(
      { _id: RECOVERY_KEY, status: 'running' },
      { $set: { status: 'failed', failedAt: new Date(), errorCategory: category } }
    );
    console.error('[TehnopolRecovery] Failed (' + category + ')');
    return { applied: false, reason: category };
  }
}
