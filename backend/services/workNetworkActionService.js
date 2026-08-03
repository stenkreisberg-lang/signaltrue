import Intervention from '../models/intervention.js';
import { getWorkNetworkMap, readWorkNetworkMetric } from './workNetworkService.js';

const LOWER_IS_BETTER = new Set([
  'interactionUnits',
  'interactionCount',
  'meetingHours',
  'bridgeConcentration',
  'crossTeamUnits',
  'crossTeamMeetingHours',
]);

export function calculateWorkNetworkOutcome(metricName, before, after) {
  const baseline = Number(before);
  const current = Number(after);
  if (!Number.isFinite(baseline) || !Number.isFinite(current)) return null;
  const percentChange =
    baseline === 0 ? null : Math.round(((current - baseline) / baseline) * 1000) / 10;
  return {
    metricBefore: baseline,
    metricAfter: current,
    percentChange,
    improved: LOWER_IS_BETTER.has(metricName) ? current < baseline : current > baseline,
    autoComputed: true,
    computedAt: new Date(),
  };
}

export async function computeWorkNetworkInterventionOutcome(intervention, options = {}) {
  const measurement = intervention.expectedEffectJson || {};
  const metricName = measurement.metric?.name;
  if (!metricName || !Array.isArray(measurement.teamIds)) {
    return { computed: false, reason: 'invalid_measurement' };
  }

  const network =
    options.network ||
    (await getWorkNetworkMap(intervention.orgId, {
      days: measurement.measurementWindowDays || 28,
      now: options.now,
    }));
  if (!network.readiness.ready) {
    intervention.expectedEffectJson = {
      ...measurement,
      recheckStatus: 'waiting_for_coverage',
      lastRecheckAt: options.now || new Date(),
    };
    await intervention.save();
    return { computed: false, reason: 'not_ready', network };
  }

  const currentValue = readWorkNetworkMetric(network, metricName, measurement.teamIds);
  if (currentValue == null) {
    intervention.expectedEffectJson = {
      ...measurement,
      recheckStatus: 'privacy_suppressed',
      lastRecheckAt: options.now || new Date(),
    };
    intervention.outcomeSummary =
      'The follow-up metric fell below the minimum contributor threshold, so no result was inferred.';
    intervention.status = 'pending-recheck';
    await intervention.save();
    return { computed: false, reason: 'privacy_suppressed', network };
  }

  const outcome = calculateWorkNetworkOutcome(
    metricName,
    intervention.outcomeDelta?.metricBefore,
    currentValue
  );
  if (!outcome) return { computed: false, reason: 'invalid_baseline', network };

  intervention.outcomeDelta = outcome;
  intervention.expectedEffectJson = {
    ...measurement,
    recheckStatus: 'computed',
    lastRecheckAt: options.now || new Date(),
  };
  intervention.status = 'pending-recheck';
  await intervention.save();
  return { computed: true, outcome, network };
}

export async function recheckDueWorkNetworkInterventions(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const due = await Intervention.find({
    actionType: /^work_network_/,
    status: 'active',
    recheckDate: { $lte: now },
  })
    .sort({ recheckDate: 1 })
    .limit(options.limit || 100);
  const networkCache = new Map();
  const result = { due: due.length, computed: 0, suppressed: 0, waiting: 0, failed: 0 };

  for (const intervention of due) {
    try {
      const days = intervention.expectedEffectJson?.measurementWindowDays || 28;
      const cacheKey = `${intervention.orgId}:${days}`;
      if (!networkCache.has(cacheKey)) {
        networkCache.set(cacheKey, await getWorkNetworkMap(intervention.orgId, { days, now }));
      }
      const recheck = await computeWorkNetworkInterventionOutcome(intervention, {
        network: networkCache.get(cacheKey),
        now,
      });
      if (recheck.computed) result.computed += 1;
      else if (recheck.reason === 'privacy_suppressed') result.suppressed += 1;
      else result.waiting += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`[WorkNetwork] Recheck failed for ${intervention._id}:`, error.message);
    }
  }

  return result;
}

export default {
  calculateWorkNetworkOutcome,
  computeWorkNetworkInterventionOutcome,
  recheckDueWorkNetworkInterventions,
};
