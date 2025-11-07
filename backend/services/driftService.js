import MetricsDaily from '../models/metricsDaily.js';
import DriftEvent from '../models/driftEvent.js';
import Team from '../models/team.js';
import { getRecommendation } from './playbookService.js';

function startOfDayUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function detectDriftForAllTeams({ windowDays = 7, thresholdMap = null } = {}) {
  // Refined thresholds for core metrics only
  const defaultThresholds = {
    meetingLoadIndex: 0.3, // 30% of 40h = 12h
    afterHoursRate: 0.2, // 20%
    responseMedianMins: 25, // % change
    sentimentShift: 15, // % drop
    networkBreadthChange: 20, // % drop
    focusTimeRatio: 0.5, // 50% minimum
    recoveryDays: 14,
    energyIndex: 60,
  };
  const since = startOfDayUTC(new Date(Date.now() - windowDays * 24 * 3600 * 1000));
  const teams = await Team.find({});

  for (const team of teams) {
    if (!team.baseline || !team.baseline.signals) continue;
    const rows = await MetricsDaily.find({ teamId: team._id, date: { $gte: since } }).sort({ date: 1 });
    if (!rows.length) continue;

    // Core metrics only
    const metrics = [
      { key: 'meetingLoadIndex', label: 'meetings' },
      { key: 'afterHoursRate', label: 'afterHours' },
      { key: 'responseMedianMins', label: 'response' },
      { key: 'sentimentShift', label: 'sentiment' },
      { key: 'networkBreadthChange', label: 'network' },
      { key: 'focusTimeRatio', label: 'focus' },
      { key: 'recoveryDays', label: 'recovery' },
      { key: 'energyIndex', label: 'energy' },
    ];

    const contributions = [];
    for (const metric of metrics) {
      const baseline = team.baseline.signals[metric.key];
      if (baseline == null) continue;
      const arr = rows.map(r => r[metric.key]).filter(x => x != null);
      if (!arr.length) continue;
      const avg = arr.reduce((a,b) => a + b, 0) / arr.length;
      const std = arr.length > 1 ? Math.sqrt(arr.map(x => (x-avg)*(x-avg)).reduce((a,b) => a+b,0)/arr.length) : 0;
      let threshold = thresholdMap?.[metric.key] ?? defaultThresholds[metric.key];
      let percentChange = ((avg - baseline) / (baseline || 1)) * 100;
      let zscore = std ? (avg - baseline) / std : 0;
      let breach = false;
      if (['recoveryDays'].includes(metric.key)) {
        breach = avg > threshold;
      } else if (['energyIndex','focusTimeRatio'].includes(metric.key)) {
        breach = avg < threshold;
      } else {
        breach = Math.abs(percentChange) >= threshold;
      }
      // Track contribution for explainability
      contributions.push({ metric: metric.label, change: percentChange, breach });
      if (breach) {
        const direction = percentChange > 0 ? 'positive' : 'negative';
        const recommendation = getRecommendation(metric.label, direction);
        await DriftEvent.create({
          teamId: team._id,
          orgId: team.orgId || null,
          date: startOfDayUTC(),
          metric: metric.label,
          direction,
          magnitude: Math.abs(percentChange),
          basis: 'percent',
          details: { avg, baseline, percentChange, zscore, threshold },
          drivers: contributions
            .sort((a,b) => Math.abs(b.change) - Math.abs(a.change))
            .slice(0,3)
            .map(c => ({ metric: c.metric, delta: c.change, direction: c.change > 0 ? 'up' : 'down' })),
          recommendation,
        });
      }
    }
  }
}

export default { detectDriftForAllTeams };
