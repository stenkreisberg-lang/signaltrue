import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';

const DAY = 86400000;
const MIN_WEEKS = 3;

// Use complete, non-overlapping Monday–Sunday windows. One organisation row
// already deduplicates shared meetings across teams and includes their attendees.
export async function readMonthlyWorkPatterns(orgId, start, end, members, minimum) {
  const dates = [];
  const today = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const lastSunday = new Date(+today - (today.getUTCDay() || 7) * DAY);
  for (let anchor = lastSunday; +anchor - 6 * DAY >= +start; anchor = new Date(+anchor - 7 * DAY)) {
    dates.push(anchor);
  }
  if (!dates.length || members.length < minimum) return summarizeMonthlyWorkPatterns([], [], minimum);
  const from = new Date(+dates[dates.length - 1] - 6 * DAY);
  const until = new Date(+dates[0] + DAY);
  const [rows, counts] = await Promise.all([
    IntegrationMetricsDaily.find({
      orgId, userId: null, teamId: null, date: { $in: dates },
      calculationWindowVersion: 'rolling7-calendar-days-v2',
    }).select('date meetingParticipantHours7d meetingInstanceCount7d backToBackMeetingBlocks messageCount7d afterHoursMessageCount rci').lean(),
    WorkEvent.aggregate([
      { $match: { orgId, timestamp: { $gte: from, $lt: until },
        actorUserId: { $in: members }, eventType: { $in: ['meeting', 'meet_started', 'message'] } } },
      { $group: { _id: {
        week: { $dateTrunc: { date: '$timestamp', unit: 'week', startOfWeek: 'Monday', timezone: 'UTC' } },
        source: { $cond: [{ $eq: ['$eventType', 'message'] }, 'messaging', 'calendar'] },
        actor: '$actorUserId',
      } } },
      { $group: { _id: { week: '$_id.week', source: '$_id.source' }, count: { $sum: 1 } } },
    ]),
  ]);
  return summarizeMonthlyWorkPatterns(rows, counts, minimum);
}

export function summarizeMonthlyWorkPatterns(rows, counts, minimum) {
  const coverage = new Map(counts.map(({ _id, count }) =>
    [new Date(_id.week).getTime() + ':' + _id.source, count]));
  const represented = (row, source) => (coverage.get((+new Date(row.date) - 6 * DAY) + ':' + source) || 0) >= minimum;
  const calendar = rows.filter(row => represented(row, 'calendar'));
  const messaging = rows.filter(row => represented(row, 'messaging') && row.messageCount7d > 0 &&
    Number.isFinite(row.afterHoursMessageCount) && row.afterHoursMessageCount >= 0 &&
    row.afterHoursMessageCount <= row.messageCount7d);
  const mean = (records, key) => {
    const values = records.map(row => row[key]).filter(Number.isFinite);
    return values.length >= MIN_WEEKS ? Math.round(values.reduce((a,b) => a+b, 0) / values.length) : null;
  };
  const sum = key => messaging.reduce((total, row) => total + row[key], 0);
  return {
    weeklySnapshots: new Set([...calendar, ...messaging].map(row => +new Date(row.date))).size,
    calendarWeeks: calendar.length,
    messagingWeeks: messaging.length,
    avgMeetingHoursWeekly: mean(calendar, 'meetingParticipantHours7d'),
    avgMeetingCount: mean(calendar, 'meetingInstanceCount7d'),
    avgBackToBackBlocks: mean(calendar, 'backToBackMeetingBlocks'),
    avgAfterHoursPct: messaging.length >= MIN_WEEKS ? Math.round(100 * sum('afterHoursMessageCount') / sum('messageCount7d')) : null,
    avgRCI: mean(calendar.filter(row => messaging.includes(row)), 'rci'),
  };
}
