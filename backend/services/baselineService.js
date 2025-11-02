import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';

function startOfDayUTC(d = new Date()) {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return dt;
}

export async function upsertDailyMetricsFromTeam(team) {
  const date = startOfDayUTC();
  // Placeholder: in real system, these would be computed from raw ingested data
  const doc = {
    teamId: team._id,
    orgId: team.orgId || null,
    date,
    // Core high-impact metrics only
    // 1. Meeting Load Index
    meetingHoursWeek: Number(team.calendarSignals?.meetingHoursWeek || 0),
    meetingLoadIndex: Number(team.calendarSignals?.meetingHoursWeek || 0) / 40,
    // 2. After-Hours Activity Rate
    afterHoursRate: Number(team.slackSignals?.afterHoursRate || 0),
    // 3. Response Latency Trend
    responseMedianMins: Number(team.slackSignals?.avgResponseDelayHours || 0) * 60,
    responseLatencyTrend: Number(team.slackSignals?.responseLatencyTrend || 0),
    // 4. Sentiment / Tone Shift
    sentimentAvg: Number(team.slackSignals?.sentiment || 0),
    sentimentShift: Number(team.slackSignals?.sentimentShift || 0),
    // 5. Collaboration Network Breadth
    uniqueContacts: Number(team.slackSignals?.uniqueContacts || 0),
    networkBreadthChange: Number(team.slackSignals?.networkBreadthChange || 0),
    // 6. Focus Time Ratio
    focusTimeRatio: Number(team.calendarSignals?.focusTimeRatio || 0),
    // 7. Engagement Recovery Index
    recoveryDays: Number(team.recoveryDays || 0),
    // 8. Team Energy Index (Composite - auto-tuned weights)
    energyIndex: Number(team.energyIndex != null ? team.energyIndex : (team.bdi != null ? (100 - team.bdi) : 0)),
  };
  await MetricsDaily.findOneAndUpdate(
    { teamId: team._id, date },
    { $set: doc },
    { upsert: true }
  );
}

export async function buildBaselinesForAllTeams({ minDays = 7, windowDays = 30 } = {}) {
  const since = startOfDayUTC(new Date(Date.now() - windowDays * 24 * 3600 * 1000));
  const teams = await Team.find({});

  for (const team of teams) {
    const rows = await MetricsDaily.find({ teamId: team._id, date: { $gte: since } }).sort({ date: 1 });
    if (rows.length < minDays) continue;

    const avg = (arr) => (arr.length ? arr.reduce((a,b) => a + b, 0) / arr.length : 0);
    const std = (arr) => {
      if (arr.length < 2) return 0;
      const m = avg(arr);
      const v = avg(arr.map(x => (x - m) * (x - m)));
      return Math.sqrt(v);
    };

    // Compute baselines for core metrics only
    team.baseline = {
      bdi: team.bdi,
      date: new Date(),
      signals: {
        meetingLoadIndex: avg(rows.map(r => r.meetingLoadIndex)),
        afterHoursRate: avg(rows.map(r => r.afterHoursRate)),
        responseMedianMins: avg(rows.map(r => r.responseMedianMins)),
        responseLatencyTrend: avg(rows.map(r => r.responseLatencyTrend)),
        sentimentAvg: avg(rows.map(r => r.sentimentAvg)),
        sentimentShift: avg(rows.map(r => r.sentimentShift)),
        uniqueContacts: avg(rows.map(r => r.uniqueContacts)),
        networkBreadthChange: avg(rows.map(r => r.networkBreadthChange)),
        focusTimeRatio: avg(rows.map(r => r.focusTimeRatio)),
        recoveryDays: avg(rows.map(r => r.recoveryDays)),
        energyIndex: avg(rows.map(r => r.energyIndex)),
      }
    };

    await team.save();
  }
}

export default { upsertDailyMetricsFromTeam, buildBaselinesForAllTeams };
