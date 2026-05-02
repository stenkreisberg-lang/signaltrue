/**
 * Retention Purge Service
 *
 * Purges data older than the configured retention window for each collection.
 * Reads per-org retention policy from the RetentionPolicy collection.
 * Falls back to conservative defaults if no policy exists for an org.
 *
 * Called by:
 *   - Sunday 03:00 UTC cron (all orgs)
 *   - POST /api/privacy/purge/:orgId  (admin on-demand)
 *   - DSAR delete handler
 */

import mongoose from 'mongoose';
import RetentionPolicy from '../models/retentionPolicy.js';
import Organization from '../models/organizationModel.js';

// Default retention windows (days) — used when no org policy exists
const DEFAULTS = {
  rawEventRetentionDays: 90,
  metricsRetentionDays: 730,
  auditLogRetentionDays: 1825,
  chatLogRetentionDays: 30,
  documentChunkRetentionDays: 3650,
};

/**
 * Get or create the retention policy for an org.
 */
async function getPolicy(orgId) {
  let policy = await RetentionPolicy.findOne({ orgId }).lean();
  if (!policy) {
    // Create a default policy so it can be viewed/edited in admin
    const created = await RetentionPolicy.create({ orgId });
    policy = created.toObject();
  }
  return policy;
}

/**
 * Build a cutoff Date given a retention window in days.
 */
function cutoff(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Purge data for a single org according to its retention policy.
 * Returns a summary object: { collection: deletedCount, ... }
 */
export async function purgeOrgData(orgId) {
  const policy = await getPolicy(orgId);
  const summary = { orgId: orgId.toString(), purgedAt: new Date() };

  // ── WorkEvent ──────────────────────────────────────────────────────────────
  try {
    const WorkEvent = mongoose.models.WorkEvent;
    if (WorkEvent) {
      const result = await WorkEvent.deleteMany({
        orgId,
        occurredAt: { $lt: cutoff(policy.rawEventRetentionDays) },
      });
      summary.WorkEvent = result.deletedCount;
    }
  } catch (err) {
    console.error(`[purge] WorkEvent error for org ${orgId}:`, err.message);
    summary.WorkEvent = 'error';
  }

  // ── IntegrationMetricsDaily ────────────────────────────────────────────────
  try {
    const IMD = mongoose.models.IntegrationMetricsDaily;
    if (IMD) {
      const result = await IMD.deleteMany({
        orgId,
        date: { $lt: cutoff(policy.rawEventRetentionDays) },
      });
      summary.IntegrationMetricsDaily = result.deletedCount;
    }
  } catch (err) {
    console.error(`[purge] IntegrationMetricsDaily error for org ${orgId}:`, err.message);
    summary.IntegrationMetricsDaily = 'error';
  }

  // ── MetricsDaily ───────────────────────────────────────────────────────────
  try {
    const MetricsDaily = mongoose.models.MetricsDaily;
    if (MetricsDaily) {
      const result = await MetricsDaily.deleteMany({
        orgId,
        date: { $lt: cutoff(policy.metricsRetentionDays) },
      });
      summary.MetricsDaily = result.deletedCount;
    }
  } catch (err) {
    console.error(`[purge] MetricsDaily error for org ${orgId}:`, err.message);
    summary.MetricsDaily = 'error';
  }

  // ── ScoringAuditLog ────────────────────────────────────────────────────────
  try {
    const SAL = mongoose.models.ScoringAuditLog;
    if (SAL) {
      const result = await SAL.deleteMany({
        orgId,
        runAt: { $lt: cutoff(policy.auditLogRetentionDays) },
      });
      summary.ScoringAuditLog = result.deletedCount;
    }
  } catch (err) {
    console.error(`[purge] ScoringAuditLog error for org ${orgId}:`, err.message);
    summary.ScoringAuditLog = 'error';
  }

  // ── ChatLog ────────────────────────────────────────────────────────────────
  // ChatLog has no orgId — purge globally by age
  try {
    const ChatLog = mongoose.models.ChatLog;
    if (ChatLog) {
      const result = await ChatLog.deleteMany({
        createdAt: { $lt: cutoff(policy.chatLogRetentionDays) },
      });
      summary.ChatLog = result.deletedCount;
    }
  } catch (err) {
    console.error(`[purge] ChatLog error:`, err.message);
    summary.ChatLog = 'error';
  }

  // ── Update policy record ───────────────────────────────────────────────────
  const nextPurge = new Date();
  nextPurge.setDate(nextPurge.getDate() + 7); // next Sunday

  await RetentionPolicy.findOneAndUpdate(
    { orgId },
    {
      lastPurgeAt: new Date(),
      nextScheduledPurgeAt: nextPurge,
      lastPurgeSummary: summary,
    },
    { upsert: true }
  );

  console.log(`[RetentionPurge] Org ${orgId} complete:`, summary);
  return summary;
}

/**
 * Purge all orgs — called by the Sunday cron job.
 */
export async function purgeAllOrgs() {
  const orgs = await Organization.find({}).select('_id').lean();
  const results = [];

  for (const org of orgs) {
    try {
      const summary = await purgeOrgData(org._id);
      results.push(summary);
    } catch (err) {
      console.error(`[RetentionPurge] Failed for org ${org._id}:`, err.message);
      results.push({ orgId: org._id.toString(), error: err.message });
    }
  }

  return results;
}
