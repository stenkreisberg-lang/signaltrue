import MetricsDaily from '../models/metricsDaily.js';
import { ENERGY_INDEX_CONFIG, METRIC_LABELS } from '../config/metricLabels.js';

// Use configured weights for Energy Index
const DEFAULT_WEIGHTS = ENERGY_INDEX_CONFIG.weights;

/**
 * Compute Energy Index from capability indicators
 * NOTE: Energy Index should NEVER be displayed standalone
 * Always expand to show top 3 metrics + drift + recommendation
 */
export function computeEnergyIndex(
  {
    resilienceScore,
    executionCapacityScore,
    decisionSpeedScore,
    structuralHealthScore,
    decisionClosureRateScore,
  },
  weights = DEFAULT_WEIGHTS
) {
  // Normalize all scores to 0..100
  const scores = {
    resilience: resilienceScore,
    executionCapacity: executionCapacityScore,
    decisionSpeed: decisionSpeedScore,
    structuralHealth: structuralHealthScore,
    decisionClosureRate: decisionClosureRateScore,
  };
  let weightedTotal = 0;
  let availableWeight = 0;
  for (const [key, score] of Object.entries(scores)) {
    if (Number.isFinite(score) && weights[key]) {
      weightedTotal += weights[key] * score;
      availableWeight += weights[key];
    }
  }
  if (availableWeight === 0) return null;
  const energy = Math.round(weightedTotal / availableWeight);
  return Math.max(0, Math.min(100, energy));
}

/**
 * Get expanded Energy Index with breakdown
 * ALWAYS use this instead of showing just the number
 */
export async function getExpandedEnergyIndex(team) {
  const energy = team.energyIndex || 0;

  // Get individual capability indicators
  const metrics = {
    resilience: {
      label: METRIC_LABELS.resilience.label,
      score: team.resilienceScore || 0,
      description: METRIC_LABELS.resilience.description,
    },
    executionCapacity: {
      label: METRIC_LABELS.executionCapacity.label,
      score: team.executionCapacityScore || 0,
      description: METRIC_LABELS.executionCapacity.description,
    },
    decisionSpeed: {
      label: METRIC_LABELS.decisionSpeed.label,
      score: team.decisionSpeedScore || 0,
      description: METRIC_LABELS.decisionSpeed.description,
    },
    structuralHealth: {
      label: METRIC_LABELS.structuralHealth.label,
      score: team.structuralHealthScore || 0,
      description: METRIC_LABELS.structuralHealth.description,
    },
  };

  // Get top 3 metrics
  const sortedMetrics = Object.entries(metrics)
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 3);

  return {
    energyIndex: energy,
    topMetrics: sortedMetrics.map(([key, metric]) => ({
      key,
      ...metric,
    })),
    drift: team.drift || 'No significant drift detected',
    recommendedAction: team.recommendedAction || 'Continue monitoring patterns',
  };
}

export async function updateEnergyIndexForTeam(team) {
  // Use last 7 days of metrics
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const rows = await MetricsDaily.find({ teamId: team._id, date: { $gte: since } });
  if (!rows.length) return null;

  // Calculate Resilience (was Recovery)
  const resilienceScore = Math.round(
    50 + 50 * (rows.map((r) => r.sentimentAvg).reduce((a, b) => a + b, 0) / rows.length)
  );

  // Calculate Execution Capacity (was Focus)
  const executionCapacityScore = Math.round(
    100 -
      Math.min(
        100,
        rows.map((r) => r.interruptionRate || 0).reduce((a, b) => a + b, 0) / rows.length
      )
  );

  // Calculate Decision Speed (was Response Time)
  const decisionSpeedScore = Math.round(
    100 -
      Math.min(100, rows.map((r) => r.responseMedianMins).reduce((a, b) => a + b, 0) / rows.length)
  );

  // Calculate Structural Health (was Collaboration)
  const structuralHealthScore = Math.round(
    Math.min(100, rows.map((r) => r.messagesCount).reduce((a, b) => a + b, 0) / rows.length)
  );

  const decisionClosureRateScore = null;

  const energy = computeEnergyIndex({
    resilienceScore,
    executionCapacityScore,
    decisionSpeedScore,
    structuralHealthScore,
    decisionClosureRateScore,
  });

  team.energyIndex = energy;
  team.resilienceScore = resilienceScore;
  team.executionCapacityScore = executionCapacityScore;
  team.decisionSpeedScore = decisionSpeedScore;
  team.structuralHealthScore = structuralHealthScore;

  await team.save();
  return energy;
}

export default {
  computeEnergyIndex,
  updateEnergyIndexForTeam,
  getExpandedEnergyIndex,
};
