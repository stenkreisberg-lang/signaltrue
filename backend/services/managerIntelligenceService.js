import { describeManagerMetric, summarizeManagerSeries } from './managerFindings.js';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import WorkEvent from '../models/workEvent.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import ManagerAssignment from '../models/managerAssignment.js';
import ManagerAuditEvent from '../models/managerAuditEvent.js';
import ManagerWorkAction from '../models/managerWorkAction.js';
import ManagerTeamContext from '../models/managerTeamContext.js';
import { buildReportTrendSeries, buildEligibleTeamTrends } from './reportTrendService.js';

export const MANAGER_TERMS_VERSION = 'manager-intelligence-2026-10';
const DAY = 86400000;
const asId = x => String(x?._id || x || '');
const canonicalEmail = x => String(x || '').trim().toLowerCase();
const utcDay = d => new Date(d).toISOString().slice(0, 10);
const utcMonday = date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
};
export function hashSecret(token) { return crypto.createHash('sha256').update(String(token)).digest('hex'); }
export function hashInvitedEmail(email) { return crypto.createHmac('sha256', process.env.JWT_SECRET).update(canonicalEmail(email)).digest('hex'); }
export function secureToken() { return crypto.randomBytes(32).toString('base64url'); }
export const normalizeEmail = canonicalEmail;
export function validateTeamPermission({ user, assignment, team, orgId, teamId, now = new Date() }) {
  if (!user || user.accountStatus !== 'active' || !assignment || !team) return false;
  if (assignment.status !== 'active' || !assignment.acceptedAt || assignment.revokedAt) return false;
  if (team.isActive === false || team.analyticsEnabled === false) return false;
  // HR-approved structure changes immediately invalidate an older manager grant.
  if (team.structure?.source === 'hr' &&
      (!team.structure.verifiedAt || asId(team.structure.managerUserId) !== asId(user._id))) return false;
  if (assignment.expiresAt && new Date(assignment.expiresAt) <= now) return false;
  return asId(user._id) === asId(assignment.managerUserId) &&
    asId(user.orgId) === asId(orgId) &&
    asId(team.orgId) === asId(orgId) &&
    asId(team._id) === asId(teamId) &&
    asId(assignment.teamId) === asId(teamId) &&
    asId(assignment.orgId) === asId(orgId);
}
export async function assertScopedManager(req, teamId) {
  if (!mongoose.isValidObjectId(teamId)) return null;
  const claimId = req.user?.userId;
  if (!mongoose.isValidObjectId(claimId)) return null;
  const user = await User.findById(claimId).select('_id orgId teamId email accountStatus').lean();
  if (!user || !user.orgId) return null;
  const [assignment, team] = await Promise.all([
    ManagerAssignment.findOne({ orgId: user.orgId, managerUserId: user._id, teamId, status: 'active' }).lean(),
    Team.findOne({ orgId: user.orgId, _id: teamId }).select('name orgId isActive analyticsEnabled metadata structure').lean(),
  ]);
  return validateTeamPermission({ user, assignment, team, orgId: user.orgId, teamId })
    ? { user, assignment, team } : null;
}
export async function managerAudit({ orgId, actorUserId, managerUserId, teamId, assignmentId, action }) {
  await ManagerAuditEvent.create({ orgId, actorUserId, managerUserId, teamId, assignmentId, action });
}
/**
 * Observed-only team activity. Never use Mongoose default zeroes as proof that
 * an integration produced measurements. Seven-day results are deliberately
 * marked partial unless all seven days contain verified source evidence.
 */
export function summarizeObservedTeamDays(daily = [], floor = 2) {
  const eligible = daily.filter(day => Number(day.activePeopleCount) >= floor);
  const calendar = eligible.filter(day =>
    day.integrationCoverage?.hasCalendar && day.measurementEvidence?.calendarEventCount > 0);
  const messaging = eligible.filter(day =>
    day.integrationCoverage?.hasMessaging && day.measurementEvidence?.messagingEventCount > 0);
  const sum = (days, get) => days.reduce((total, day) => total + Number(get(day) || 0), 0);
  const value = (days, get, digits = 1) => days.length
    ? Math.round(sum(days, get) * 10 ** digits) / 10 ** digits
    : null;
  const calendarEventCount = sum(calendar, d => d.measurementEvidence?.calendarEventCount);
  const messagingEventCount = sum(messaging, d => d.measurementEvidence?.messagingEventCount);
  const meetings = sum(calendar, d => d.calendar?.meetingCount);
  const messages = sum(messaging, d => d.messaging?.messagesSentTotal);
  const afterHoursMessages = sum(messaging, d =>
    Number(d.messaging?.afterHoursMessageRatio || 0) * Number(d.messaging?.messagesSentTotal || 0));
  return {
    provenance: {
      calendarObservedDays: calendar.length,
      messagingObservedDays: messaging.length,
      calendarEventCount,
      messagingEventCount,
      calendarComplete: calendar.length === 7,
      messagingComplete: messaging.length === 7,
      explanation: 'Observed calendar availability is not proven focus or actual work time. Missing source days are not counted as zero.',
    },
    metrics: [
      { key: 'meeting_hours', label: 'Meeting hours per represented person',
        value: value(calendar, d => d.calendar?.meetingHoursPerPerson), unit: 'hours',
        observedDays: calendar.length, available: calendar.length > 0 },
      { key: 'focus_availability', label: 'Uninterrupted calendar availability per represented person',
        value: value(calendar, d => d.calendar?.focusHoursAvailablePerPerson), unit: 'hours',
        observedDays: calendar.length, available: calendar.length > 0 },
      { key: 'fragmented_days', label: 'Observed fragmented-day share',
        value: calendar.length
          ? Math.round(100 * sum(calendar, d => d.calendar?.fragmentedDayRatio) / calendar.length)
          : null, unit: '%', observedDays: calendar.length, available: calendar.length > 0 },
      { key: 'after_hours_meetings', label: 'After-hours meeting share',
        value: meetings > 0
          ? Math.round(100 * sum(calendar, d => d.calendar?.afterHoursMeetingCount) / meetings)
          : null, unit: '%', observedDays: calendar.length, available: meetings > 0 },
      { key: 'teams_messages', label: 'Observed team messages',
        value: messaging.length ? messages : null, unit: 'events',
        observedDays: messaging.length, available: messaging.length > 0 },
      { key: 'after_hours_messages', label: 'After-hours message share',
        value: messages > 0 ? Math.round(100 * afterHoursMessages / messages) : null,
        unit: '%', observedDays: messaging.length, available: messages > 0 },
    ],
  };
}

/**
 * Count actual mapped contributors for each snapshot's exact rolling window.
 * The logic is identical for every team size. Missing periods remain absent,
 * and composition changes suppress unreliable week-to-week comparisons.
 */
export function buildRollingActorCohorts({ grouped = [], activeIds, teamId,
  now = new Date(), anchorDay = 0, count = 26, field = 'actors', signatures }) {
  const dayActors = new Map(grouped.map(row => [
    String(row._id), new Set((row[field] || []).filter(Boolean).map(asId)),
  ]));
  const result = {};
  const currentMonday = utcMonday(now);
  let previous = null;
  for (let back = count; back >= 1; back--) {
    const weekStart = new Date(currentMonday.getTime() - back * 7 * DAY);
    const sampledOn = new Date(weekStart.getTime() + ((anchorDay + 6) % 7) * DAY);
    const union = new Set();
    for (let dayOffset = -6; dayOffset <= 0; dayOffset++) {
      const key = utcDay(new Date(sampledOn.getTime() + dayOffset * DAY));
      for (const actor of dayActors.get(key) || []) union.add(actor);
    }
    const cohort = [...union].sort();
    const comparable = !previous ||
      (previous.length === cohort.length && cohort.every((id, i) => id === previous[i]));
    result[asId(teamId) + ':' + utcDay(weekStart)] =
      cohort.length && comparable && cohort.every(id => activeIds.has(id)) ? cohort.length : 0;
    if (signatures && result[asId(teamId) + ':' + utcDay(weekStart)]) {
      signatures[utcDay(weekStart)] = hashSecret(cohort.join(','));
    }
    if (cohort.length) previous = cohort;
  }
  return result;
}

export async function getScopedTeamMeasurements({ orgId, team, now = new Date(), minimum = 2, forReview = false, locale = 'en' }) {
  const floor = Math.max(2, Number(minimum) || 2);
  const teamId = team._id;
  const start = new Date(utcMonday(now).getTime() - 27 * 7 * DAY);
  const [records, roster] = await Promise.all([
    IntegrationMetricsDaily.find({ orgId, teamId, userId: null, date: { $gte: start, $lte: now } }).sort({date:1}).lean(),
    User.find({orgId,teamId,accountStatus:{$ne:'inactive'}}).select('_id').lean(),
  ]);
  const population = roster.length;
  const activeIds = new Set(roster.map(u => asId(u._id)));
  if (population < floor || (Number(team.metadata?.actualSize) > 0 && Number(team.metadata.actualSize) < floor))
    return { eligible: false, reason: 'Team does not meet the privacy threshold', minimum: floor };
  if (!records.length) return { eligible:false, reason:'Comparable historical data not available', minimum: floor };
  const anchorDay = buildReportTrendSeries(records.map(r => ({...r, teamId:null})), now).anchorDay;
  const currentMonday = utcMonday(now);
  // Each weekly point is a rolling seven-day snapshot sampled on the same
  // weekday. Count distinct active contributors in that exact window, not an
  // arbitrary calendar week with a different anchor.
  const sourceWindowStart = new Date(currentMonday.getTime() - 26 * 7 * DAY - 6 * DAY);
  const grouped = await WorkEvent.aggregate([
    { $match: { orgId, teamId, actorUserId: { $ne: null },
      $or: [
        { eventType: 'meeting', source: { $in: ['microsoft-outlook', 'microsoft-teams', 'google-calendar'] } },
        { eventType: 'message', source: { $in: ['microsoft-teams', 'slack', 'google-chat'] } },
      ],
      timestamp: { $gte: sourceWindowStart, $lt: currentMonday } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d',
        date: '$timestamp', timezone: 'UTC' } },
      actors: { $addToSet: '$actorUserId' },
      calendar: { $addToSet: { $cond: [{ $eq: ['$eventType', 'meeting'] }, '$actorUserId', null] } },
      messaging: { $addToSet: { $cond: [{ $eq: ['$eventType', 'message'] }, '$actorUserId', null] } },
    } },
  ]);
  const actorWeeks = buildRollingActorCohorts({
    grouped, activeIds, teamId, now, anchorDay,
  });
  const sourceKeys = { calendar: {}, messaging: {} };
  const sourceCounts = field => buildRollingActorCohorts({ grouped, activeIds, teamId, now, anchorDay,
    field, signatures: sourceKeys[field] });
  const eligible = buildEligibleTeamTrends({records, teams:[team], activeMemberCounts:{[asId(teamId)]:population},
    actorsByWeek:actorWeeks, calendarActorsByWeek:sourceCounts('calendar'),
    messagingActorsByWeek:sourceCounts('messaging'), minimumGroupSize:floor, now, anchorDay })[0];
  if (!eligible) return { eligible:false, reason:'Not enough comparable, privacy-eligible weekly measurements', minimum:floor };
  const [actions,contexts] = await Promise.all([
    ManagerWorkAction.find({orgId,teamId}).select('title hypothesis metric direction baseline baselineWeek startDate due14 due28 status outcome14 outcome28 createdAt').sort({createdAt:-1}).limit(20).lean(),
    ManagerTeamContext.find({orgId,teamId,weekStart:{$gte:start,$lte:now}}).select('weekStart tag note').sort({weekStart:-1}).limit(25).lean(),
  ]);
  const dimensions = [
    ['meetings', 'Meeting instances per calendar participant', 'meetings/person', 'meetingsPerRepresentedPerson', 'calendar'],
    ['meeting_hours', 'Meeting participant-hours per calendar participant', 'h/person', 'meetingHoursPerRepresentedPerson', 'calendar'],
    ['messages', 'Messages per messaging participant', 'messages/person', 'messagesPerRepresentedPerson', 'messaging'],
    ['after_hours', 'After-hours message share', '%', 'afterHoursPct', 'messaging'],
    ['focus_time', 'Available calendar hours per calendar participant', 'h/person', 'focusHoursPerRepresentedPerson', 'calendar'],
    ['recurring_load', 'Recurring share of meeting hours', '%', 'recurringLoadPct', 'calendar'],
    ['fragmentation', 'Calendar fragmentation', '/100', 'calendarFragmentation', 'calendar'],
  ];
  const versions = new Map(records.map(r => [utcDay(r.date), r.calculationWindowVersion]));
  const trendSeries = dimensions.map(([key,label,unit,property,source]) => {
    const evidence = eligible.points.map(p => {
      const value = p[property] ?? null;
      const version = versions.get(p.sampledOn);
      const cohort = sourceKeys[source][p.date];
      const comparisonKey = version === 'rolling7-calendar-days-v2' && cohort && Number.isFinite(value)
        ? version + ':' + new Date(p.sampledOn).getUTCDay() + ':' + cohort : null;
      return {date:p.date, sampledOn:p.sampledOn, value, verified:Number.isFinite(value), comparisonKey};
    });
    return {key, ...describeManagerMetric(key,label,unit,locale), summary:summarizeManagerSeries(evidence,key),
      baselineAvailable:Boolean(evidence.at(-1)?.comparisonKey),
      points:evidence.map(({comparisonKey,...point}) => forReview ? {...point,comparisonKey} : point)};
  });
  const findings = trendSeries.filter(s => s.summary && s.summary.delta !== 0)
    .sort((a,b) => {
      // Rank by the relative departure from the team's own median; bound sparse baselines.
      const score = s => Math.abs(s.summary.delta) / Math.max(1, s.summary.baseline);
      return score(b) - score(a);
    }).slice(0,3).map(s=>({...s.summary,label:s.label,unit:s.unit,question:s.question}));
  const representedWeeks = trendSeries[0].points.filter(p => p.verified).length;
  const workPatternEvidence = {
    provenance:{source:'rolling7_team_snapshots', sampledOn:eligible.points.at(-1)?.sampledOn},
    metrics:trendSeries.map(series => {
      const point=series.points.at(-1);
      return {key:series.key, label:series.label, unit:series.unit, value:point?.value ?? null,
        available:point?.verified === true, observedDays:null};
    }),
  };
  // A single authorized team only. No organization array, no user data, no
  // neighboring teams, no individual actor information in response.
  return { eligible:true, teamId:asId(teamId), teamName:team.name, minimum:floor,
    trendSeries, representedWeeks, findings, locale,
    workPatternEvidence,
    methodology:eligible.note, metric:'meetingsPerRepresentedPerson',
    current:trendSeries[0].points.at(-1)?.value ?? null, baseline:trendSeries[0].summary?.baseline ?? null, changePct:trendSeries[0].summary?.changePct ?? null,
    points:trendSeries[0].points,
    contexts:contexts.map(c=>({weekStart:utcDay(c.weekStart),tag:c.tag,note:c.note})),
    actions:actions.map(a=>({id:asId(a._id),title:a.title,hypothesis:a.hypothesis,metric:a.metric,
      direction:a.direction,baseline:a.baseline,baselineWeek:a.baselineWeek,
      startDate:a.startDate,due14:a.due14,due28:a.due28,status:a.status,
      outcome14:a.outcome14,outcome28:a.outcome28})),
    caveat:'Changes are associations in recorded meeting instances per mapped contributor, not productivity, performance or health scores.' };
}
const ACTION_METRICS = new Set(['meetingsPerRepresentedPerson', 'meeting_hours', 'focus_time', 'after_hours', 'recurring_load', 'messages', 'fragmentation']);
export function actionMetricPoints(data, metric) {
  if (!ACTION_METRICS.has(metric)) return [];
  if (metric === 'meetingsPerRepresentedPerson') return data?.points || [];
  return data?.trendSeries?.find(series => series.key === metric)?.points
    .filter(point => point.verified === true) || [];
}
export function evaluateActionOutcome(action, data, now = new Date(), reviewDay) {
  const day = reviewDay ?? (now >= new Date(action.due28) ? 28 : 14);
  const due = new Date(day === 28 ? action.due28 : action.due14);
  if (![14,28].includes(day) || !Number.isFinite(due.getTime()) || due > now ||
      !data?.eligible || !Number.isFinite(action.baseline) || !action.baselineKey) return null;
  const points = actionMetricPoints(data, action.metric);
  const baseline = points.find(p => p.date === action.baselineWeek);
  if (baseline?.comparisonKey !== action.baselineKey || baseline?.value !== action.baseline) return null;
  // Completed rolling weeks only. A later retry must never substitute a later window.
  const end = Date.parse(utcDay(due) + 'T00:00:00Z');
  const latest = points.filter(p => {
    const sampled = Date.parse(p.sampledOn);
    return Number.isFinite(p.value) && p.comparisonKey === action.baselineKey &&
      p.date > action.baselineWeek && sampled >= end - 7 * DAY && sampled < end;
  }).at(-1);
  if (!latest) return null;
  const diff = latest.value - action.baseline;
  const tolerance = Math.max(0.05, Math.abs(action.baseline) * 0.05);
  const within = Math.abs(diff) <= tolerance;
  const status = within ? 'unchanged' : action.direction === 'stabilize' ? 'worsened' :
    (action.direction === 'decrease' ? diff < 0 : diff > 0) ? 'improved' : 'worsened';
  return { day, value: latest.value, status, measuredAt: now };
}
export function validateActionBody(body) {
  const title = String(body?.title || '').trim();
  const hypothesis = String(body?.hypothesis || '').trim();
  const direction = String(body?.direction || '');
  if (!title || title.length > 180 || hypothesis.length > 1000 ||
    !['increase', 'decrease', 'stabilize'].includes(direction)) return null;
  const metric = body?.metric ?? 'meetingsPerRepresentedPerson';
  if (!ACTION_METRICS.has(metric)) return null;
  return { title, hypothesis, direction, metric };
}
export async function createScopedAction({user,team,data,body}) {
  const safe = validateActionBody(body);
  if (!safe || !data?.eligible) return null;
  const now = new Date();
  const p = actionMetricPoints(data, safe.metric).at(-1);
  const latestWeek = utcDay(new Date(utcMonday(now).getTime() - 7 * DAY));
  if (!p?.comparisonKey || !Number.isFinite(p.value) || p.date !== latestWeek) return null;
  const action = await ManagerWorkAction.create({orgId:user.orgId,teamId:team._id,createdBy:user._id,
    ...safe,baseline:p.value,baselineKey:p.comparisonKey,baselineWeek:p.date,startDate:now,
    baselineMeasurement: safe.metric === 'meetingsPerRepresentedPerson' ? 'meeting-instances-per-mapped-actor-v1' : safe.metric + '-weekly-v1',
    due14:new Date(now.getTime()+14*DAY),due28:new Date(now.getTime()+28*DAY)});
  await managerAudit({orgId:user.orgId,actorUserId:user._id,managerUserId:user._id,
    teamId:team._id,action:'manager_action_created'});
  return {id:asId(action._id),title:action.title,startDate:action.startDate,due14:action.due14,due28:action.due28};
}
export async function loadManagerRoster(req) {
  const user = await User.findById(req.user?.userId).select('orgId accountStatus').lean();
  if (!user || user.accountStatus !== 'active') return [];
  const list = await ManagerAssignment.find({orgId:user.orgId,managerUserId:user._id,status:'active',
    acceptedAt:{$ne:null},revokedAt:null}).lean();
  const teams = await Team.find({orgId:user.orgId,_id:{$in:list.map(a=>a.teamId)},isActive:{$ne:false},
    analyticsEnabled:{$ne:false}}).select('name orgId isActive analyticsEnabled structure').lean();
  const valid = new Set(teams.map(t=>asId(t._id)));
  return list.filter(a=>valid.has(asId(a.teamId)) && (!a.expiresAt || new Date(a.expiresAt)>new Date()) &&
    validateTeamPermission({user,assignment:a,team:teams.find(t=>asId(t._id)===asId(a.teamId)),
      orgId:user.orgId,teamId:a.teamId}))
    .map(a=>({assignmentId:asId(a._id),teamId:asId(a.teamId),
      name:teams.find(t=>asId(t._id)===asId(a.teamId))?.name,
      weeklyEmailEnabled:a.weeklyEmailEnabled,exportEnabled:a.exportEnabled}));
}
export async function resolveOrgMinimum(orgId) {
  const org = await Organization.findById(orgId).select('settings.minTeamSize settings.timezone settings.reportLanguage').lean();
  return {minimum:Math.max(2,Number(org?.settings?.minTeamSize)||2),locale:org?.settings?.reportLanguage || (org?.settings?.timezone === 'Europe/Tallinn' ? 'et' : 'en'),timezone:org?.settings?.timezone||'UTC'};
}
