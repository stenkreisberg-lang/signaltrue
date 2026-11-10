/**
 * Tenant-scoped retention enforcement.
 * Raw WorkEvent deletion is intentionally preview-first after correcting the
 * legacy "occurredAt" typo: enabling it may remove a historical backlog.
 */
import RetentionPolicy from '../models/retentionPolicy.js';
import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import MetricsDaily from '../models/metricsDaily.js';
import ScoringAuditLog from '../models/scoringAuditLog.js';
import ChatLog from '../models/chatLog.js';

const DAY_MS = 24 * 60 * 60 * 1000;
export const GLOBAL_PUBLIC_CHAT_RETENTION_DAYS = 30;

async function getPolicy(orgId) {
  const existing = await RetentionPolicy.findOne({ orgId }).lean();
  if (existing) return existing;
  try {
    const created = await RetentionPolicy.create({ orgId });
    return created.toObject();
  } catch (error) {
    if (error?.code === 11000) return RetentionPolicy.findOne({ orgId }).lean();
    throw error;
  }
}

function cutoff(days, now) {
  if (!Number.isFinite(days) || days < 1) throw new Error('Invalid retention window');
  return new Date(now.getTime() - Math.floor(days) * DAY_MS);
}

export function buildTenantRetentionFilters(orgId, policy, now = new Date()) {
  if (!orgId || !policy) throw new Error('Tenant and retention policy are required');
  return {
    // WorkEvent uses timestamp, not the nonexistent occurredAt field.
    WorkEvent: { orgId, timestamp: { $lt: cutoff(policy.rawEventRetentionDays, now) } },
    IntegrationMetricsDaily: { orgId, date: { $lt: cutoff(policy.rawEventRetentionDays, now) } },
    MetricsDaily: { orgId, date: { $lt: cutoff(policy.metricsRetentionDays, now) } },
    ScoringAuditLog: { orgId, runAt: { $lt: cutoff(policy.auditLogRetentionDays, now) } },
  };
}

export async function purgeOrgData(orgId, { dryRun = false, now = new Date() } = {}) {
  const policy = await getPolicy(orgId);
  const filters = buildTenantRetentionFilters(orgId, policy, now);
  const summary = {
    orgId: String(orgId), purgedAt: now, dryRun,
    WorkEvent: 0, IntegrationMetricsDaily: 0, MetricsDaily: 0, ScoringAuditLog: 0,
    candidateCounts: {}, errors: [], deferred: [],
  };
  const models = { WorkEvent, IntegrationMetricsDaily, MetricsDaily, ScoringAuditLog };

  for (const [name, model] of Object.entries(models)) {
    try {
      const candidates = await model.countDocuments(filters[name]);
      summary.candidateCounts[name] = candidates;
      if (dryRun) { summary.deferred.push(name); continue; }
      if (name === 'WorkEvent' && process.env.WORK_EVENT_RETENTION_ENFORCEMENT !== 'true') {
        // Do not unexpectedly purge years of raw events on the first corrected deploy.
        summary.deferred.push('WorkEvent: requires validated deletion preview');
        continue;
      }
      const result = await model.deleteMany(filters[name]);
      summary[name] = result.deletedCount || 0;
    } catch (error) {
      console.error('[RetentionPurge] Collection purge failed:', name, error.message);
      summary.errors.push(name);
    }
  }

  // Anonymous ChatLog has no orgId and must NEVER be purged by an individual
  // customer's retention endpoint. It has its own global retention job.
  summary.status = summary.errors.length
    ? 'partial_failure'
    : summary.deferred.length ? 'verification_required' : 'success';

  if (!dryRun) {
    const nextScheduledPurgeAt = new Date(now.getTime() + 7 * DAY_MS);
    const update = {
      nextScheduledPurgeAt, lastPurgeSummary: summary,
    };
    if (summary.status === 'success') update.lastPurgeAt = now;
    await RetentionPolicy.findOneAndUpdate({ orgId }, { $set: update }, { upsert: true });
  }

  console.info('[RetentionPurge] Org cleanup outcome:', {
    orgId: String(orgId), status: summary.status, errors: summary.errors.length,
    deferred: summary.deferred.length,
  });
  return summary;
}

export async function purgeGlobalPublicChatLogs({ dryRun = false, now = new Date() } = {}) {
  // These public chat logs are not tenant-owned. Apply the fixed public-chat
  // retention once per scheduled global job, rather than once for every tenant.
  const filter = { createdAt: { $lt: cutoff(GLOBAL_PUBLIC_CHAT_RETENTION_DAYS, now) } };
  const candidates = await ChatLog.countDocuments(filter);
  if (dryRun) return { status: 'dry_run', candidateCount: candidates, deletedCount: 0 };
  const result = await ChatLog.deleteMany(filter);
  return { status: 'success', candidateCount: candidates, deletedCount: result.deletedCount || 0 };
}

export async function purgeAllOrgs() {
  const orgs = await Organization.find({}).select('_id').lean();
  const results = [];
  for (const org of orgs) {
    try {
      results.push(await purgeOrgData(org._id));
    } catch (error) {
      console.error('[RetentionPurge] Failed:', String(org._id), error.message);
      results.push({ orgId: String(org._id), status: 'failed', errors: [error.message] });
    }
  }
  try {
    const globalChat = await purgeGlobalPublicChatLogs();
    results.push({ orgId: 'public-chat', status: globalChat.status, ChatLog: globalChat.deletedCount });
  } catch (error) {
    console.error('[RetentionPurge] Global public chat cleanup failed:', error.message);
    results.push({ orgId: 'public-chat', status: 'failed', errors: [error.message] });
  }
  return results;
}
