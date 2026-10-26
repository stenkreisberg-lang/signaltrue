import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';

// Each point is a recorded rolling-seven-day snapshot, NOT a sum of daily snapshots.
// Organization-level records only: never average individual or team records into a
// purported organization time series. Missing periods remain null.
const METRICS = [
  { key: 'meetings', label: 'Meetings', unit: 'meetings', readinessKey: 'meetings' },
  { key: 'meeting_hours', label: 'Meeting participant-hours', unit: 'hours', readinessKey: 'meeting_hours' },
  { key: 'back_to_back', label: 'Back-to-back meetings', unit: 'blocks', readinessKey: 'back_to_back' },
  { key: 'after_hours', label: 'After-hours messaging', unit: '%', readinessKey: 'after_hours' },
  { key: 'focus_time', label: 'Uninterrupted time', unit: 'hours', readinessKey: 'focus_time' },
  { key: 'fragmentation', label: 'Calendar fragmentation', unit: '/100', readinessKey: 'fragmentation' },
];

function rounded(value, digits = 1) {
  return Number.isFinite(value) ? Math.round(value * 10 ** digits) / 10 ** digits : null;
}
function valueFor(record, key) {
  if (!record) return null;
  const safe = (name) => record[name] != null && Number.isFinite(Number(record[name])) ? Number(record[name]) : null;
  switch (key) {
    case 'meetings': {
      const canonical = safe('meetingInstanceCount7d');
      const legacy = safe('meetingCount7d');
      // Historic documents may predate deduplication. Do not silently join
      // attendee-expanded meeting counts to deduplicated meeting-instance counts.
      return canonical != null && canonical > 0 ? rounded(canonical, 0) : legacy != null && legacy > 0 ? null : canonical;
    }
    case 'meeting_hours': return rounded(safe('meetingDurationTotalHours7d'));
    case 'back_to_back': return rounded(safe('backToBackMeetingBlocks'), 0);
    case 'after_hours': return Number(record.messageCount7d) > 0 ? rounded((safe('afterHoursMessageRatio') ?? NaN) * 100) : null;
    case 'focus_time': return rounded(safe('focusTimeAvailabilityHours'));
    case 'fragmentation': return rounded(safe('calendarFragmentationScore'));
    default: return null;
  }
}
function mondayUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}
function dateKey(d) { return new Date(d).toISOString().slice(0, 10); }
function point(date, record, lastDate) {
  const p = { date: dateKey(date), sourceDate: record ? dateKey(record.date) : null, measured: Boolean(record) };
  for (const m of METRICS) p[m.key] = valueFor(record, m.key);
  p.meetingCountSource = record && (Number(record.meetingInstanceCount7d) > 0 ? 'unique_instances' : 'unverified_or_zero');
  p.stale = Boolean(record && lastDate && new Date(record.date) < lastDate);
  return p;
}
export function buildReportTrendSeries(records, now = new Date()) {
  const end = new Date(now); end.setUTCHours(23, 59, 59, 999);
  const orgRecords = (records || []).filter(r => r && !r.teamId && !r.userId && Number.isFinite(new Date(r.date).getTime())).sort((a,b) => new Date(a.date)-new Date(b.date));
  const byDay = new Map(orgRecords.map(r => [dateKey(r.date), r]));
  const daily = [];
  for (let days = 6; days >= 0; days--) {
    const d = new Date(end); d.setUTCDate(d.getUTCDate() - days);
    daily.push(point(d, byDay.get(dateKey(d)) || null));
  }
  const thisMonday = mondayUTC(end);
  const weekly = [];
  for (let weeks = 25; weeks >= 0; weeks--) {
    const start = new Date(thisMonday); start.setUTCDate(start.getUTCDate() - weeks * 7);
    const stop = new Date(start); stop.setUTCDate(stop.getUTCDate() + 7);
    const recent = orgRecords.filter(r => new Date(r.date) >= start && new Date(r.date) < stop);
    const last = recent.length ? recent[recent.length - 1] : null;
    weekly.push(point(start, last));
  }
  const lastObserved = orgRecords.length ? orgRecords[orgRecords.length - 1] : null;
  const lastObservedDate = lastObserved ? dateKey(lastObserved.date) : null;
  const lastAgeDays = lastObserved ? (end - new Date(lastObserved.date)) / 86400000 : null;
  return { daily, weekly, lastObservedDate, stale: lastAgeDays == null || lastAgeDays > 10, metrics: METRICS, method: 'Rolling seven-day source snapshots; weekly point uses latest recorded observation in each UTC week. Missing dates are gaps, not zeros. Coverage may vary between weeks.' };
}
export async function getReportTrendSeries(orgId, now = new Date()) {
  const start = new Date(now); start.setUTCDate(start.getUTCDate() - 191);
  const records = await IntegrationMetricsDaily.find({
    orgId, date: { $gte: start, $lte: now },
    teamId: null, userId: null,
  }).sort({ date: 1 }).lean();
  return buildReportTrendSeries(records, now);
}
