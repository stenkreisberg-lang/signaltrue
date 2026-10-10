import crypto from 'node:crypto';
import Organization, { ACTIVE_ORG_FILTER } from '../../models/organizationModel.js';
import Team from '../../models/team.js';
import IntegrationConnection from '../../models/integrationConnection.js';
import WorkPatternAnalysisRun from '../../models/controlReview/workPatternAnalysisRun.js';
import metricsService from './workPatternMetricsService.js';
import baselineService from './baselineDeviationService.js';
import patternService from './patternDetectionService.js';
import { tenantTimezone, weeklyPeriods } from './workingScheduleService.js';

const LEASE_MS = 30 * 60 * 1000;
const MAX_TEAMS_PER_TENANT = 100;

export function automaticInsightsEnabled() {
  return process.env.AUTOMATED_WORK_PATTERN_INSIGHTS_ENABLED === 'true';
}

export function pilotOrganizationFilter() {
  const slug = process.env.AUTOMATED_WORK_PATTERN_INSIGHTS_ORG_SLUG?.trim();
  return slug ? { slug } : {};
}

function completedPeriod(now, timezone) {
  return weeklyPeriods({ end: now, weeks: 2, schedule: { timezone } })[0];
}

async function hasHealthyConnector(tenantId, periodEnd) {
  const connections = await IntegrationConnection.find({
    orgId: tenantId,
    status: 'connected',
    'sync.enabled': { $ne: false },
  })
    .select('integrationType sync.lastSuccessfulSyncAt sync.lastSyncStatus')
    .lean();

  // A healthy sync is evidence that an empty period was collected; event count
  // alone is never used as a connector-health signal.
  return connections.some(
    (connection) =>
      connection.sync?.lastSyncStatus === 'success' &&
      connection.sync?.lastSuccessfulSyncAt &&
      new Date(connection.sync.lastSuccessfulSyncAt) >= new Date(periodEnd)
  );
}

async function claimRun(tenantId, period) {
  const now = new Date();
  const leaseId = crypto.randomUUID();
  const run = await WorkPatternAnalysisRun.findOneAndUpdate(
    {
      tenantId,
      periodStart: period.periodStart,
      $or: [
        { status: { $in: ['COMPLETED', 'PARTIAL', 'FAILED'] } },
        { status: 'RUNNING', leaseExpiresAt: { $lte: now } },
        { status: 'FAILED' },
        { status: { $exists: false } },
      ],
    },
    {
      $set: {
        periodEnd: period.periodEnd,
        status: 'RUNNING',
        leaseId,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        startedAt: now,
        completedAt: null,
        error: '',
      },
      $setOnInsert: { tenantId, periodStart: period.periodStart },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  if (!run || run.leaseId !== leaseId) return null;
  return { run, leaseId };
}

export async function processCompletedWeek({ tenantId, period, now = new Date() }) {
  if (!automaticInsightsEnabled()) return { skipped: true, reason: 'feature_flag_off' };

  const claim = await claimRun(tenantId, period);
  if (!claim) return { skipped: true, reason: 'already_running_or_completed' };

  const started = Date.now();
  const teamResults = {};
  try {
    const sourceHealthy = await hasHealthyConnector(tenantId, period.periodEnd);
    const teams = await Team.find({ orgId: tenantId, isActive: true })
      .select('_id')
      .limit(MAX_TEAMS_PER_TENANT)
      .lean();

    for (const team of teams) {
      const key = String(team._id);
      if (!sourceHealthy) {
        teamResults[key] = { status: 'SKIPPED_QUALITY', reason: 'No successful connector collection covers the completed week.' };
        continue;
      }
      try {
        await metricsService.persistTeamMetrics({
          tenantId,
          teamId: team._id,
          periods: [period],
        });
        await baselineService.observeTeamPeriod({ tenantId, teamId: team._id, periodStart: period.periodStart });
        const finding = await patternService.evaluateTeamPeriod({ tenantId, teamId: team._id, periodStart: period.periodStart });
        teamResults[key] = { status: 'COMPLETED', findingId: finding?._id || null };
      } catch (error) {
        teamResults[key] = { status: 'FAILED', error: error.message };
      }
    }

    const failed = Object.values(teamResults).filter((result) => result.status === 'FAILED').length;
    const status = failed ? 'PARTIAL' : 'COMPLETED';
    await WorkPatternAnalysisRun.updateOne(
      { _id: claim.run._id, leaseId: claim.leaseId },
      { $set: { status, teamResults, completedAt: new Date(), durationMs: Date.now() - started, leaseExpiresAt: null } }
    );
    return { status, tenantId, period, teams: teamResults, completedAt: now };
  } catch (error) {
    await WorkPatternAnalysisRun.updateOne(
      { _id: claim.run._id, leaseId: claim.leaseId },
      { $set: { status: 'FAILED', error: error.message, completedAt: new Date(), durationMs: Date.now() - started, leaseExpiresAt: null } }
    );
    throw error;
  }
}

export async function runAutomaticWorkPatternAnalysis({ now = new Date() } = {}) {
  if (!automaticInsightsEnabled()) return { skipped: true, reason: 'feature_flag_off' };
  const organizations = await Organization.find({
    ...ACTIVE_ORG_FILTER,
    ...pilotOrganizationFilter(),
  })
    .select('_id slug')
    .lean();
  const results = [];
  for (const organization of organizations) {
    const timezone = await tenantTimezone(organization._id);
    const period = completedPeriod(now, timezone);
    results.push(await processCompletedWeek({ tenantId: organization._id, period, now }));
  }
  return { processed: results.length, results };
}

export default {
  automaticInsightsEnabled,
  pilotOrganizationFilter,
  processCompletedWeek,
  runAutomaticWorkPatternAnalysis,
};
