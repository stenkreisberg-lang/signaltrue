/**
 * Integration Sync Scheduler Service
 * 
 * Handles scheduled synchronization of all integrations
 * and metric computation for the Category-King stack.
 */

import cron from 'node-cron';
import { syncAllIntegrations, getAdapter } from './integrationAdapters.js';
import { syncCoreIntegrations } from './coreIntegrationAdapters.js';
import { computeDailyMetrics, computeWeeklyRollups } from './integrationMetricsService.js';
import { detectSignals } from './signalGenerationService.js';
import IntegrationConnection from '../models/integrationConnection.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import Organization from '../models/organizationModel.js';

// ============================================================
// SYNC SCHEDULER
// ============================================================

/**
 * Schedule all integration sync jobs
 * Call this from server.js startup
 */
export function scheduleIntegrationJobs() {
  console.log('📅 Scheduling integration sync and metric jobs...');
  
  // Incremental sync every 15 minutes (6am-10pm)
  cron.schedule('*/15 6-22 * * *', async () => {
    console.log('⏰ Running incremental integration sync...');
    await runIncrementalSync();
  });
  
  // Full backfill sync daily at 3am
  cron.schedule('0 3 * * *', async () => {
    console.log('⏰ Running daily full integration backfill...');
    await runDailyBackfill();
  });
  
  // Compute daily metrics at 4am
  cron.schedule('0 4 * * *', async () => {
    console.log('⏰ Computing daily integration metrics...');
    await runDailyMetricsComputation();
  });
  
  // Generate signals at 4:30am
  cron.schedule('30 4 * * *', async () => {
    console.log('⏰ Generating Category-King signals...');
    await runSignalGeneration();
  });
  
  // Weekly rollups on Monday at 5am
  cron.schedule('0 5 * * 1', async () => {
    console.log('⏰ Computing weekly metric rollups...');
    await runWeeklyRollups();
  });
  
  console.log('✅ Integration jobs scheduled');
}

/**
 * Run incremental sync for all active integrations
 * Syncs last 30 minutes of data
 */
async function runIncrementalSync() {
  const orgs = await getActiveOrgs();
  const since = new Date(Date.now() - 30 * 60 * 1000); // 30 mins ago
  const until = new Date();
  
  for (const orgId of orgs) {
    try {
      // Sync IntegrationConnection-based integrations (Jira, Asana, etc.)
      const results = await syncAllIntegrations(orgId, since, until);
      
      // Sync core integrations (Slack, Microsoft, Google)
      const coreResults = await syncCoreIntegrations(orgId, since, until);
      
      const allResults = [...results, ...coreResults];
      const successCount = allResults.filter(r => r.success).length;
      console.log(`[Sync] Org ${orgId}: ${successCount}/${allResults.length} integrations synced`);
    } catch (error) {
      console.error(`[Sync Error] Org ${orgId}:`, error.message);
    }
  }
}

/**
 * Run daily backfill for all integrations
 * Syncs last 24 hours of data (catches any missed events)
 */
async function runDailyBackfill() {
  const orgs = await getActiveOrgs();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  const until = new Date();
  
  for (const orgId of orgs) {
    try {
      // Sync IntegrationConnection-based integrations
      const results = await syncAllIntegrations(orgId, since, until);
      
      // Sync core integrations (Slack, Microsoft, Google)
      const coreResults = await syncCoreIntegrations(orgId, since, until);
      
      const allResults = [...results, ...coreResults];
      
      // Log results
      for (const result of allResults) {
        if (result.success) {
          console.log(`[Backfill] Org ${orgId} - ${result.source}: ${result.eventsProcessed || 0} events`);
        } else {
          console.error(`[Backfill Error] Org ${orgId} - ${result.source}: ${result.error}`);
        }
      }
    } catch (error) {
      console.error(`[Backfill Error] Org ${orgId}:`, error.message);
    }
  }
}

/**
 * Compute daily metrics for all orgs
 */
async function runDailyMetricsComputation() {
  const orgs = await getActiveOrgs();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  for (const orgId of orgs) {
    try {
      await computeDailyMetrics(orgId, yesterday);
      console.log(`[Metrics] Org ${orgId}: Daily metrics computed for ${yesterday.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error(`[Metrics Error] Org ${orgId}:`, error.message);
    }
  }
}

/**
 * Generate signals for all orgs
 */
async function runSignalGeneration() {
  const orgs = await getActiveOrgs();
  
  for (const orgId of orgs) {
    try {
      const signals = await detectSignals(orgId);
      const highSeverity = signals.filter(s => s.severity >= 70).length;
      console.log(`[Signals] Org ${orgId}: ${signals.length} signals generated (${highSeverity} high severity)`);
    } catch (error) {
      console.error(`[Signals Error] Org ${orgId}:`, error.message);
    }
  }
}

/**
 * Compute weekly rollups
 */
async function runWeeklyRollups() {
  const orgs = await getActiveOrgs();
  
  for (const orgId of orgs) {
    try {
      await computeWeeklyRollups(orgId);
      console.log(`[Weekly] Org ${orgId}: Weekly rollups computed`);
    } catch (error) {
      console.error(`[Weekly Error] Org ${orgId}:`, error.message);
    }
  }
}

// ============================================================
// MANUAL SYNC FUNCTIONS
// ============================================================

/**
 * Trigger manual sync for a specific org and integration
 * Works with IntegrationConnection-based integrations (Jira, Asana, etc.)
 */
export async function triggerManualSync(orgId, integrationType, options = {}) {
  const { 
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default 7 days
    until = new Date(),
    computeMetrics = true,
    generateSignals: genSignals = true
  } = options;
  
  console.log(`[Manual Sync] Starting ${integrationType} sync for org ${orgId}`);
  
  const adapter = getAdapter(integrationType);
  const syncResult = await adapter.sync(orgId, since, until);
  
  if (computeMetrics && syncResult.success) {
    console.log(`[Manual Sync] Computing metrics...`);
    
    // Compute metrics for each day in range
    const current = new Date(since);
    while (current < until) {
      await computeDailyMetrics(orgId, current);
      current.setDate(current.getDate() + 1);
    }
  }
  
  if (genSignals && syncResult.success) {
    console.log(`[Manual Sync] Generating signals...`);
    await detectSignals(orgId);
  }
  
  return syncResult;
}

/**
 * Trigger immediate sync for core integrations (Slack, Microsoft, Google)
 * Call this after OAuth completes to populate initial data
 */
export async function triggerImmediateSync(orgId, options = {}) {
  const { 
    since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default 7 days back
    until = new Date()
  } = options;
  
  console.log(`[Immediate Sync] Starting core integration sync for org ${orgId}`);
  
  try {
    const results = await syncCoreIntegrations(orgId, since, until);
    
    for (const result of results) {
      if (result.success) {
        console.log(`[Immediate Sync] ${result.source}: ${result.eventsProcessed || 0} events synced`);
      } else {
        console.warn(`[Immediate Sync] ${result.source} failed: ${result.error}`);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`[Immediate Sync] Error for org ${orgId}:`, error.message);
    return [{ success: false, error: error.message }];
  }
}

/**
 * Trigger backfill for all integrations
 * Use for initial setup or recovery
 */
export async function triggerFullBackfill(orgId, daysBack = 28) {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);
  const until = new Date();
  
  console.log(`[Full Backfill] Starting ${daysBack}-day backfill for org ${orgId}`);
  
  const connections = await IntegrationConnection.find({
    orgId,
    status: 'active'
  });
  
  const results = [];
  
  for (const connection of connections) {
    try {
      const result = await triggerManualSync(orgId, connection.integrationType, {
        since,
        until,
        computeMetrics: false, // Will compute all at once below
        generateSignals: false
      });
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        source: connection.integrationType,
        error: error.message
      });
    }
  }
  
  // Compute metrics for the full range
  console.log(`[Full Backfill] Computing metrics for ${daysBack} days...`);
  const current = new Date(since);
  while (current < until) {
    await computeDailyMetrics(orgId, current);
    current.setDate(current.getDate() + 1);
  }
  
  // Generate signals
  console.log(`[Full Backfill] Generating signals...`);
  await detectSignals(orgId);
  
  return {
    results,
    daysBackfilled: daysBack,
    metricsComputed: true,
    signalsGenerated: true
  };
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Get list of orgs with active integrations
 * Includes both IntegrationConnection-based and Organization.integrations-based
 */
async function getActiveOrgs() {
  // Get orgs with IntegrationConnection entries
  const connectionOrgs = await IntegrationConnection.find({
    status: 'active'
  }).distinct('orgId');
  
  // Get orgs with core integrations (Slack, Microsoft, Google) stored directly
  const coreIntegrationOrgs = await Organization.find({
    $or: [
      { 'integrations.slack.accessToken': { $exists: true, $ne: null } },
      { 'integrations.microsoft.accessToken': { $exists: true, $ne: null } },
      { 'integrations.google.accessToken': { $exists: true, $ne: null } },
      { 'integrations.googleChat.accessToken': { $exists: true, $ne: null } }
    ]
  }).distinct('_id');
  
  // Merge and dedupe
  const allOrgIds = new Set([
    ...connectionOrgs.map(id => id.toString()),
    ...coreIntegrationOrgs.map(id => id.toString())
  ]);
  
  return Array.from(allOrgIds);
}

/**
 * Get sync status for all integrations for an org
 */
export async function getSyncStatus(orgId) {
  const connections = await IntegrationConnection.find({
    orgId,
    status: 'active'
  });
  
  return connections.map(conn => ({
    integration: conn.integrationType,
    status: conn.sync.status,
    lastSync: conn.sync.lastSyncAt,
    error: conn.sync.error,
    coverage: calculateCoverageSync(conn)
  }));
}

function calculateCoverageSync(connection) {
  const mapped = (connection.userMappings || []).filter(m => m.internalUserId).length;
  const total = (connection.userMappings || []).length;
  return total > 0 ? Math.round((mapped / total) * 100) : 0;
}

/**
 * Get latest metrics summary for an org
 */
export async function getLatestMetricsSummary(orgId) {
  const latestDate = await IntegrationMetricsDaily.findOne({ orgId })
    .sort({ date: -1 })
    .select('date');
  
  if (!latestDate) {
    return { hasData: false };
  }
  
  const metrics = await IntegrationMetricsDaily.find({
    orgId,
    date: latestDate.date
  });
  
  // Aggregate across users
  const summary = {
    hasData: true,
    date: latestDate.date,
    users: metrics.length,
    avgTaskCompletionRate: average(metrics.map(m => m.taskCompletionRate)),
    avgWip: average(metrics.map(m => m.wipCurrent)),
    avgAfterHoursRatio: average(metrics.map(m => m.afterHoursRatio)),
    avgMeetingMinutes: average(metrics.map(m => m.meetingMinutesTotal)),
    avgRecoveryTime: average(metrics.map(m => m.avgRecoveryMinutes)),
    cvir: average(metrics.map(m => m.categoryKingMetrics?.cvir)),
    rci: average(metrics.map(m => m.categoryKingMetrics?.rci)),
    wap: average(metrics.map(m => m.categoryKingMetrics?.wap)),
    pis: average(metrics.map(m => m.categoryKingMetrics?.pis))
  };
  
  return summary;
}

function average(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * Get active signals count for an org
 */
export async function getActiveSignalsCount(orgId) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const counts = await CategoryKingSignal.aggregate([
    {
      $match: {
        orgId,
        detectedAt: { $gte: weekAgo },
        status: 'open'
      }
    },
    {
      $group: {
        _id: {
          severity: {
            $cond: [
              { $gte: ['$severity', 70] },
              'high',
              { $cond: [{ $gte: ['$severity', 40] }, 'medium', 'low'] }
            ]
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);
  
  const result = { total: 0, high: 0, medium: 0, low: 0 };
  for (const item of counts) {
    result[item._id.severity] = item.count;
    result.total += item.count;
  }
  
  return result;
}

export default {
  scheduleIntegrationJobs,
  triggerManualSync,
  triggerFullBackfill,
  getSyncStatus,
  getLatestMetricsSummary,
  getActiveSignalsCount
};
