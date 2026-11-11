import mongoose from 'mongoose';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import WorkEvent from '../models/workEvent.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import Intervention from '../models/intervention.js';
import WeekContext from '../models/weekContext.js';

// All points are ROLLING-SEVEN-DAY snapshots. A point is never a daily count.
// Complete weeks are sampled on the SAME UTC weekday so the window is comparable.
// A missing sampled weekday is a gap, never a substitute from a different weekday.
export const TREND_METRICS = [
  { key: 'meetings', label: 'Meeting instances', unit: 'meetings', direction: 'context' },
  { key: 'meeting_hours', label: 'Meeting participant-hours', unit: 'hours', direction: 'context' },
  { key: 'back_to_back', label: 'Back-to-back meetings', unit: 'blocks', direction: 'context' },
  { key: 'after_hours', label: 'After-hours messaging', unit: '%', direction: 'context' },
  { key: 'messages', label: 'Observed messaging volume', unit: 'messages', direction: 'context' },
  { key: 'recurring_load', label: 'Recurring meeting share', unit: '%', direction: 'context' },
  { key: 'focus_time', label: 'Uninterrupted calendar availability', unit: 'hours', direction: 'context' },
  { key: 'fragmentation', label: 'Calendar fragmentation', unit: '/100', direction: 'context' },
];
const DAY = 86400000;
const fixed = (n, d = 1) => Number.isFinite(n) ? Math.round(n * 10 ** d) / 10 ** d : null;
const safe = (r, k) => r && r[k] != null && Number.isFinite(Number(r[k])) ? Number(r[k]) : null;
const dayKey = d => new Date(d).toISOString().slice(0, 10);
const monday = input => {
  const d = new Date(input);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d;
};
const validDate = r => r && Number.isFinite(new Date(r.date).getTime());
const id = v => String(v || '');

export function metricValue(record, key) {
  if (!record) return null;
  switch (key) {
    case 'meetings': {
      const instance = safe(record, 'meetingInstanceCount7d');
      // Legacy attendee-expanded meeting counts are not comparable.
      return instance != null && instance > 0 ? fixed(instance, 0)
        : safe(record, 'meetingCount7d') > 0 ? null : instance;
    }
    case 'meeting_hours': return fixed(safe(record, 'meetingParticipantHours7d') ?? safe(record, 'meetingDurationTotalHours7d'));
    case 'back_to_back': return fixed(safe(record, 'backToBackMeetingBlocks'), 0);
    case 'after_hours': return safe(record, 'messageCount7d') > 0
      ? fixed(safe(record, 'afterHoursMessageRatio') == null ? NaN : safe(record, 'afterHoursMessageRatio') * 100)
      : null;
    case 'messages': return safe(record, 'messageCount7d') > 0
      ? fixed(safe(record, 'messageCount7d'), 0) : null;
    case 'recurring_load': return safe(record, 'meetingParticipantHours7d') > 0
      ? fixed(safe(record, 'recurringMeetingBurden') == null ? NaN : safe(record, 'recurringMeetingBurden') * 100)
      : null;
    case 'focus_time': return safe(record, 'calendarDaysObserved') > 0
      ? fixed(safe(record, 'focusTimeAvailabilityHours')) : null;
    case 'fragmentation': return safe(record, 'calendarDaysObserved') > 0
      ? fixed(safe(record, 'calendarFragmentationScore')) : null;
    default: return null;
  }
}
function observation(date, record, extra = {}) {
  const p = { date: dayKey(date), sourceDate: record ? dayKey(record.date) : null, measured: Boolean(record), ...extra };
  for (const m of TREND_METRICS) p[m.key] = metricValue(record, m.key);
  return p;
}
function normalizeRecords(records) {
  return (records || []).filter(validDate).sort((a, b) => new Date(a.date) - new Date(b.date));
}
function chooseAnchor(records, thisMonday) {
  const weeksByDay = Array.from({ length: 7 }, () => new Set());
  for (const r of records) {
    const d = new Date(r.date);
    if (d >= thisMonday) continue;
    weeksByDay[d.getUTCDay()].add(dayKey(monday(d)));
  }
  // Sunday is preferred on ties: data for a complete Mon-Sun week.
  return [0, 6, 5, 4, 3, 2, 1].sort((a, b) => weeksByDay[b].size - weeksByDay[a].size)[0];
}
function buildWeekly(records, now, anchorDay, count = 26, mapRecord = null) {
  const currentMonday = monday(now);
  const byDate = new Map(records.map(r => [dayKey(r.date), r]));
  const points = [];
  for (let back = count; back >= 1; back--) {
    const start = new Date(currentMonday.getTime() - back * 7 * DAY);
    const sampled = new Date(start.getTime() + ((anchorDay + 6) % 7) * DAY);
    const record = byDate.get(dayKey(sampled));
    const chosen = record && (!mapRecord || mapRecord(record, start)) ? record : null;
    points.push(observation(start, chosen, { sampledOn: dayKey(sampled), complete: true }));
  }
  return points;
}
function sortedMedian(values) {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}
function signalFor(points, key) {
  const recent = points.slice(-7);
  // Require four consecutive weekly observations, with at least four preceding baseline observations.
  const lastFour = recent.slice(-4).map(p => p[key]);
  const baseline = points.slice(-10, -4).map(p => p[key]).filter(Number.isFinite);
  if (lastFour.some(v => !Number.isFinite(v)) || baseline.length < 4) return null;
  const median = sortedMedian(baseline);
  if (median == null || median <= 0) return null;
  const v = lastFour[3], delta = fixed((v - median) / median * 100);
  // A 40,000% message "signal" from a tiny or newly collected baseline is
  // not an HR conclusion. Preserve the numeric history but require a data
  // source and cohort review before describing its direction.
  if (Math.abs(delta) > 500 || (key === 'messages' && median < 30)) {
    return { metric: key, current: v, baseline: fixed(median), deltaPct: null,
      direction: 'unverified', sustained: false, material: false,
      statement: 'Extreme movement or sparse baseline. Verify source coverage and historical comparability.' };
  }
  const allUp = lastFour.every((val, i) => i === 0 || val > lastFour[i - 1]);
  const allDown = lastFour.every((val, i) => i === 0 || val < lastFour[i - 1]);
  const direction = allUp ? 'rising' : allDown ? 'falling' : 'variable';
  const material = Math.abs(delta) >= 15;
  return { metric: key, current: v, baseline: fixed(median), deltaPct: delta, direction,
    sustained: material && (allUp || allDown), material, statement: material
      ? (direction === 'variable' ? 'Outside the earlier six-week median; direction varies.'
        : 'Three consecutive weekly changes in one direction.')
      : 'Within 15% of the earlier six-week median.' };
}
export function buildReportTrendSeries(records, now = new Date(), options = {}) {
  const currentMonday = monday(now);
  const orgRecords = normalizeRecords(records).filter(r => !r.teamId && !r.userId);
  // Never mix the corrected seven-day definition with legacy eight-date snapshots.
  // Older, unversioned data remain usable in isolated legacy tests, but once any
  // corrected data exist, only corrected samples can support the trend.
  const hasCorrected = orgRecords.some(r => r.calculationWindowVersion === 'rolling7-calendar-days-v2');
  const org = hasCorrected ? orgRecords.filter(r =>
    r.calculationWindowVersion === 'rolling7-calendar-days-v2') : orgRecords;
  const anchorDay = options.anchorDay ?? chooseAnchor(org, currentMonday);
  const weekly = buildWeekly(org, now, anchorDay);
  const byDate = new Map(org.map(r => [dayKey(r.date), r]));
  const daily = [];
  const midnight = new Date(now); midnight.setUTCHours(0, 0, 0, 0);
  for (let days = 6; days >= 0; days--) {
    const date = new Date(midnight.getTime() - days * DAY);
    daily.push(observation(date, byDate.get(dayKey(date)), { rolling: true }));
  }
  const current = org.filter(r => new Date(r.date) >= currentMonday).at(-1) || null;
  const last = org.at(-1);
  const lastAgeDays = last ? (new Date(now) - new Date(last.date)) / DAY : Infinity;
  const insights = TREND_METRICS.map(m => signalFor(weekly, m.key)).filter(Boolean)
    .sort((a, b) => Number(b.sustained) - Number(a.sustained) || Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  return { weekly, daily, currentPartial: current ? observation(current.date, current, { complete: false }) : null,
    lastObservedDate: last ? dayKey(last.date) : null, stale: lastAgeDays > 10,
    anchorDay, metrics: TREND_METRICS, insights,
    method: 'Completed UTC Mon–Sun weeks. Each point uses the same UTC observation weekday and its recorded rolling-seven-day window. The current incomplete week is separate. Missing sampled dates are gaps, not zeros; no interpolation or causal claims.' };
}
const displayName = text => String(text || '').replace(/[<>]/g, '').slice(0, 80);
const catchAll = name => /^(unassigned|general|other|default|no[ -]?team)$/i.test(String(name || '').trim());

// Requiring a minimum number of DISTINCT mapped actors in each displayed week
// prevents an undersized team becoming identifiable when members leave or sync drops.
export const TEAM_TREND_DIMENSIONS = Object.freeze([
  { key: 'meetingsPerRepresentedPerson', label: 'Meetings per calendar participant', unit: 'meetings/person' },
  { key: 'meetingHoursPerRepresentedPerson', label: 'Meeting participant-hours per person', unit: 'hours/person' },
  { key: 'messagesPerRepresentedPerson', label: 'Messages per messaging participant', unit: 'messages/person' },
  { key: 'afterHoursPct', label: 'After-hours messaging', unit: '%' },
  { key: 'focusHoursPerRepresentedPerson', label: 'Uninterrupted calendar availability per person', unit: 'hours/person' },
  { key: 'recurringLoadPct', label: 'Recurring meeting share', unit: '%' },
  { key: 'calendarFragmentation', label: 'Calendar fragmentation index', unit: '/100' },
]);

export function buildEligibleTeamTrends({ records, teams, activeMemberCounts, actorsByWeek,
  calendarActorsByWeek = null, messagingActorsByWeek = null,
  minimumGroupSize = 2, now = new Date(), anchorDay = 0 }) {
  const floor = Math.max(2, Number(minimumGroupSize) || 2);
  const allRecords = normalizeRecords(records).filter(r => r.teamId && !r.userId);
  const results = [];
  for (const team of teams || []) {
    const key = id(team._id || team.id);
    const members = activeMemberCounts[key] || 0;
    if (team.isActive === false || team.analyticsEnabled === false || catchAll(team.name) ||
      members < floor || (Number(team.metadata?.actualSize) > 0 && team.metadata.actualSize < floor)) continue;
    const rawTeamRecords = allRecords.filter(r => id(r.teamId) === key);
    // Do not mix the old calculation window with corrected rolling-seven-day snapshots.
    const corrected = rawTeamRecords.some(r => r.calculationWindowVersion === 'rolling7-calendar-days-v2');
    const teamRecords = corrected
      ? rawTeamRecords.filter(r => r.calculationWindowVersion === 'rolling7-calendar-days-v2')
      : rawTeamRecords;
    const weekly = buildWeekly(teamRecords, now, anchorDay, 26, (_record, weekStart) =>
      (actorsByWeek[key + ':' + dayKey(weekStart)] || 0) >= floor);
    const normalized = weekly.map(p => {
      const actors = actorsByWeek[key + ':' + p.date] || 0;
      const calendar = (calendarActorsByWeek || actorsByWeek)[key + ':' + p.date] || 0;
      const messaging = (messagingActorsByWeek || actorsByWeek)[key + ':' + p.date] || 0;
      const eligible = actors >= floor && p.measured;
      const eligibleCalendar = eligible && calendar >= floor;
      const eligibleMessaging = eligible && messaging >= floor;
      return {
        ...p,
        actors: eligible ? actors : null,
        calendarActors: eligibleCalendar ? calendar : null,
        messagingActors: eligibleMessaging ? messaging : null,
        meetingsPerRepresentedPerson: eligibleCalendar && Number.isFinite(p.meetings)
          ? fixed(p.meetings / calendar, 2) : null,
        meetingHoursPerRepresentedPerson: eligibleCalendar && Number.isFinite(p.meeting_hours)
          ? fixed(p.meeting_hours / calendar, 2) : null,
        messagesPerRepresentedPerson: eligibleMessaging && Number.isFinite(p.messages)
          ? fixed(p.messages / messaging, 2) : null,
        afterHoursPct: eligibleMessaging ? p.after_hours : null,
        focusHoursPerRepresentedPerson: eligibleCalendar && Number.isFinite(p.focus_time)
          ? fixed(p.focus_time / calendar, 2) : null,
        recurringLoadPct: eligibleCalendar ? p.recurring_load : null,
        calendarFragmentation: eligibleCalendar ? p.fragmentation : null,
      };
    });
    const metricSummaries = Object.fromEntries(TEAM_TREND_DIMENSIONS.map(dimension => {
      const current = normalized.at(-1)?.[dimension.key] ?? null;
      // The baseline is the six immediately preceding comparable weekly periods.
      // Four measured periods are required; older isolated data are not silently substituted.
      const history = normalized.slice(-7, -1).map(p => p[dimension.key]).filter(Number.isFinite);
      const baseline = history.length >= 4 ? sortedMedian(history) : null;
      const rawChange = baseline > 0 && Number.isFinite(current)
        ? (current - baseline) / baseline * 100 : null;
      const changePct = rawChange != null && Math.abs(rawChange) <= 500 ? fixed(rawChange) : null;
      return [dimension.key, {
        current, baseline: baseline == null ? null : fixed(baseline, 2),
        changePct, comparablePeriods: history.length, unit: dimension.unit,
        verifiedComparison: changePct != null,
      }];
    }));
    const hasMeasuredData = normalized.some(p =>
      TEAM_TREND_DIMENSIONS.some(d => Number.isFinite(p[d.key])));
    if (!hasMeasuredData) continue;
    const primary = metricSummaries.meetingsPerRepresentedPerson;
    results.push({
      id: key, name: displayName(team.name), population: members,
      latestRepresented: normalized.at(-1)?.actors || null, points: normalized,
      current: primary.current, baseline: primary.baseline, changePct: primary.changePct,
      metric: 'meetingsPerRepresentedPerson', metricSummaries,
      note: 'Team-level observations with source-specific mapped contributors. No individual scores; missing periods are gaps.',
    });
  }
  return results.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 50);
}
export function buildTimelineAnnotations({ contexts = [], interventions = [], teams = [], now = new Date() }) {
  const events = (contexts || []).filter(c => !c.teamId && c.tag).map(c => ({
    date: dayKey(c.weekStart), title: displayName(String(c.tag).replaceAll('_', ' ')),
    kind: 'context', teamId: null, endDate: c.weekEnd ? dayKey(c.weekEnd) : null }));
  const allowedIds = new Set((teams || []).map(t => t.id));
  const actions = (interventions || []).filter(i => !i.privateToManager && allowedIds.has(id(i.teamId)))
    .map(i => {
      const review = (i.reviews || []).filter(r => r.measuredAt && r.interpretation).at(-1);
      const result = review?.interpretation || (i.outcomeDelta?.computedAt ? (i.outcomeDelta.improved ? 'improved' : 'worsened') : null);
      return { date: dayKey(i.startDate), title: displayName(i.title || i.interventionType || 'Recorded action'),
        kind: 'intervention', teamId: id(i.teamId),
        reviewAt: i.reviewDate ? dayKey(i.reviewDate) : i.recheckDate ? dayKey(i.recheckDate) : null,
        metric: String(i.targetMetric || '').slice(0, 60), expected: displayName(i.successCriterion || i.expectedEffect),
        outcome: result, observedBefore: safe(i.outcomeDelta, 'metricBefore'),
        observedAfter: safe(i.outcomeDelta, 'metricAfter'), measuredAt: i.outcomeDelta?.computedAt ? dayKey(i.outcomeDelta.computedAt) : null,
        note: 'Observed post-action association, not proof of causality.' };
    });
  return [...events, ...actions].filter(e => new Date(e.date) <= now).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
}
export async function getReportTrendSeries(orgId, now = new Date(), { includeTeams = false, minimumGroupSize = 2 } = {}) {
  const start = new Date(monday(now).getTime() - 27 * 7 * DAY);
  const scopedOrgId = mongoose.isValidObjectId(orgId) ? new mongoose.Types.ObjectId(String(orgId)) : orgId;
  const [records, contexts, actorDays] = await Promise.all([
    IntegrationMetricsDaily.find({ orgId: scopedOrgId, date: { $gte: start, $lte: now }, userId: null }).sort({ date: 1 }).lean(),
    WeekContext.find({ orgId: scopedOrgId, teamId: null, weekEnd: { $gte: start }, weekStart: { $lte: now } })
      .select('tag weekStart weekEnd teamId').limit(100).lean(),
    WorkEvent.aggregate([
      { $match: { orgId: scopedOrgId, timestamp: { $gte: start, $lte: now },
        actorUserId: { $ne: null }, eventType: 'meeting',
        source: { $in: ['microsoft-outlook', 'google-calendar'] } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d',
        date: '$timestamp', timezone: 'UTC' } }, actors: { $addToSet: '$actorUserId' } } },
    ]),
  ]);
  const org = buildReportTrendSeries(records, now);
  // Normalise aggregate participant-hours and calendar windows using the people
  // actually represented in EACH sampled seven-day observation, never today's
  // actor population or the pooled six-week population.
  const actorMap = new Map(actorDays.map(r => [r._id, r.actors.map(id)]));
  const countActors = sampled => {
    if (!sampled) return 0;
    const end = new Date(sampled + 'T00:00:00Z');
    if (!Number.isFinite(end.getTime())) return 0;
    const seen = new Set();
    for (let back = 0; back < 7; back++) {
      const key = dayKey(new Date(end.getTime() - back * DAY));
      for (const actor of actorMap.get(key) || []) seen.add(actor);
    }
    return seen.size;
  };
  const normalise = point => {
    if (!point) return point;
    const actors = countActors(point.sampledOn || point.sourceDate);
    return { ...point, representedCalendarActors: actors,
      meeting_hours: actors > 0 && Number.isFinite(point.meeting_hours) ? fixed(point.meeting_hours / actors) : null,
      focus_time: actors > 0 && Number.isFinite(point.focus_time) ? fixed(point.focus_time / actors) : null };
  };
  org.weekly = org.weekly.map(normalise);
  org.daily = org.daily.map(normalise);
  org.currentPartial = normalise(org.currentPartial);
  org.insights = TREND_METRICS.map(m => signalFor(org.weekly, m.key)).filter(Boolean)
    .sort((a, b) => Number(b.sustained) - Number(a.sustained) || Math.abs(b.deltaPct) - Math.abs(a.deltaPct));
  org.method += ' Participant-hours and calendar-availability hours are divided by distinct represented calendar actors in each same seven-day window. Legacy and corrected calculation versions are never mixed.';
  if (!includeTeams) return { ...org, annotations: buildTimelineAnnotations({ contexts, now }), teams: [] };
  const floor = Math.max(2, Number(minimumGroupSize) || 2);
  // The unique-person denominator must use the SAME rolling seven days as
  // the sampled metric; grouping on calendar Mon–Sun would be wrong for a
  // Wednesday or Friday source snapshot.
  const actorWeekStart = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][org.anchorDay];
  const [teams, members, actors, interventions] = await Promise.all([
    Team.find({ orgId: scopedOrgId, isActive: { $ne: false }, analyticsEnabled: { $ne: false } }).select('name metadata.actualSize analyticsEnabled isActive').lean(),
    User.aggregate([{ $match: { orgId: scopedOrgId, accountStatus: { $ne: 'inactive' }, teamId: { $ne: null } } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } }]),
    WorkEvent.aggregate([{ $match: { orgId: scopedOrgId, timestamp: { $gte: start, $lte: now }, teamId: { $ne: null }, actorUserId: { $ne: null } } },
      { $group: {
        _id: { team: '$teamId', week: { $dateTrunc: { date: '$timestamp', unit: 'week', startOfWeek: actorWeekStart, timezone: 'UTC' } } },
        actors: { $addToSet: '$actorUserId' },
        calendarActors: { $addToSet: { $cond: [
          { $and: [{ $eq: ['$eventType', 'meeting'] }, { $in: ['$source', ['microsoft-outlook', 'google-calendar', 'microsoft-teams']] }] },
          '$actorUserId', null,
        ] } },
        messagingActors: { $addToSet: { $cond: [
          { $and: [{ $eq: ['$eventType', 'message'] }, { $in: ['$source', ['microsoft-teams', 'slack', 'google-chat']] }] },
          '$actorUserId', null,
        ] } },
      } },
      { $project: {
        active: { $size: '$actors' },
        calendar: { $size: { $setDifference: ['$calendarActors', [null]] } },
        messaging: { $size: { $setDifference: ['$messagingActors', [null]] } },
      } }]),
    Intervention.find({ orgId: scopedOrgId, source: { $ne: 'manager_coaching' }, privateToManager: { $ne: true },
      startDate: { $gte: start, $lte: now } }).select('teamId title interventionType startDate reviewDate recheckDate targetMetric expectedEffect successCriterion outcomeDelta reviews privateToManager').limit(100).lean(),
  ]);
  const memberCounts = Object.fromEntries(members.map(m => [id(m._id), m.count]));
  const cohortWeekKey = a => {
    const endDate = new Date(new Date(a._id.week).getTime() + 6 * DAY);
    return id(a._id.team) + ':' + dayKey(monday(endDate));
  };
  const actorsByWeek = Object.fromEntries(actors.map(a => [cohortWeekKey(a), a.active]));
  const calendarActorsByWeek = Object.fromEntries(actors.map(a => [cohortWeekKey(a), a.calendar]));
  const messagingActorsByWeek = Object.fromEntries(actors.map(a => [cohortWeekKey(a), a.messaging]));
  const eligible = buildEligibleTeamTrends({
    records, teams, activeMemberCounts: memberCounts, actorsByWeek,
    calendarActorsByWeek, messagingActorsByWeek,
    minimumGroupSize: floor, now, anchorDay: org.anchorDay,
  });
  return { ...org, teams: eligible, annotations: buildTimelineAnnotations({ contexts, interventions, teams: eligible, now }),
    privacy: { minimumGroupSize: floor, visibleTeams: eligible.length,
      note: 'Only team-week observations with at least the privacy minimum of distinct mapped actors appear. Suppressed groups are omitted entirely.' } };
}
