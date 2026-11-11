import crypto from 'node:crypto';
import mongoose from 'mongoose';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import WorkEvent from '../models/workEvent.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import ManagerAssignment from '../models/managerAssignment.js';
import ManagerAuditEvent from '../models/managerAuditEvent.js';
import ManagerWorkAction from '../models/managerWorkAction.js';
import ManagerTeamContext from '../models/managerTeamContext.js';
import { buildReportTrendSeries, buildEligibleTeamTrends } from './reportTrendService.js';
import { resolveRestrictedTeamMinimum } from './smallTeamReportingPolicy.js';

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
export function summarizeObservedTeamDays(daily = [], floor = 8) {
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

export async function getScopedTeamMeasurements({ orgId, team, now = new Date(),
  minimum = 8, approvedRestrictedSmallTeam = false }) {
  const floor = approvedRestrictedSmallTeam
    ? Math.max(2, Number(minimum) || 8)
    : Math.max(8, Number(minimum) || 8);
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
  const actorWeeks = {};
  const sourceWindowStart = new Date(currentMonday.getTime() - 26 * 7 * DAY +
    ((anchorDay + 6) % 7) * DAY - 6 * DAY);
  const weekStartDay = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'][anchorDay];
  const grouped = await WorkEvent.aggregate([
    { $match: { orgId, teamId, actorUserId: { $ne: null },
      ...(approvedRestrictedSmallTeam
        ? { eventType: { $in: ['meeting', 'message', 'email_sent'] } }
        : { eventType: 'meeting',
            source: { $in: ['calendar', 'microsoft-outlook', 'google-calendar'] } }),
      timestamp: { $gte: sourceWindowStart, $lt: currentMonday } } },
    { $group: { _id: { $dateTrunc: { date: '$timestamp', unit: 'week',
      startOfWeek: weekStartDay, timezone: 'UTC' } }, actors: { $addToSet: '$actorUserId' } } },
  ]);
  const cohortsBySample = new Map(grouped.map(row => {
    const weekEnd = new Date(new Date(row._id).getTime() + 6 * DAY);
    const cohort = row.actors.filter(m => activeIds.has(asId(m))).map(asId).sort();
    return [utcDay(weekEnd), cohort];
  }));
  let previousCohort = null;
  // The reporting denominator and metric cover the same 7-day sampled window.
  // Suppress cohort changes, avoiding a one-person entry/exit subtraction attack.
  for(let back = 26; back >= 1; back--) {
    const startWeek = new Date(currentMonday.getTime() - back * 7 * DAY);
    const obs = new Date(startWeek.getTime() + ((anchorDay + 6) % 7) * DAY);
    const cohort = cohortsBySample.get(utcDay(obs)) || [];
    const comparable = !previousCohort || (cohort.length === previousCohort.length &&
      cohort.every((member,index) => member === previousCohort[index]));
    actorWeeks[asId(teamId) + ':' + utcDay(startWeek)] = comparable ? cohort.length : 0;
    previousCohort = cohort;
  }
  const eligible = buildEligibleTeamTrends({records, teams:[team], activeMemberCounts:{[asId(teamId)]:population},
    actorsByWeek:actorWeeks, minimumGroupSize:floor, now, anchorDay,
    approvedRestrictedSmallTeam })[0];
  if (!eligible) return { eligible:false, reason:'Not enough comparable, privacy-eligible weekly measurements', minimum:floor };
  const observedStart = utcDay(new Date(now.getTime() - 7 * DAY));
  const [actions,contexts,observedDaily] = await Promise.all([
    ManagerWorkAction.find({orgId,teamId}).select('title hypothesis metric direction baseline baselineWeek startDate due14 due28 status outcome14 outcome28 createdAt').sort({createdAt:-1}).limit(20).lean(),
    ManagerTeamContext.find({orgId,teamId,weekStart:{$gte:start,$lte:now}}).select('weekStart tag note').sort({weekStart:-1}).limit(25).lean(),
    EngagementTeamDaily.find({orgId,teamId,date:{$gte:observedStart,$lt:utcDay(now)}})
      .select('date activePeopleCount calendar messaging measurementEvidence integrationCoverage')
      .sort({date:1}).lean(),
  ]);
  let workPatternEvidence = summarizeObservedTeamDays(observedDaily, floor);
  const trendDimensions = [
    { key: 'meetings', label: 'Meeting instances per represented person', unit: 'meetings/person' },
    { key: 'meeting_hours', label: 'Participant meeting hours per represented person', unit: 'hours/person' },
    { key: 'messages', label: 'Messages per represented person', unit: 'messages/person' },
    { key: 'after_hours', label: 'After-hours message share', unit: '%' },
    { key: 'focus_time', label: 'Available calendar hours per represented person', unit: 'hours/person' },
    { key: 'recurring_load', label: 'Recurring meeting share', unit: '%' },
  ];
  const perPerson = new Set(['meetings', 'meeting_hours', 'messages', 'focus_time']);
  const trendSeries = trendDimensions.map(dimension => ({
    ...dimension,
    points: eligible.points.map(point => {
      const denominator = Number(point.actors || 0);
      const measured = point.measured && denominator >= floor;
      const raw = Number.isFinite(point[dimension.key]) ? point[dimension.key] : null;
      const value = measured && raw !== null
        ? (perPerson.has(dimension.key) ? Math.round(raw / denominator * 100) / 100 : raw)
        : null;
      return { date: point.date, sampledOn: point.sampledOn, value,
        verified: value !== null };
    }),
  }));
  const representedWeeks = trendSeries.find(series => series.key === 'meetings')
    ?.points.filter(point => point.verified).length || 0;
  // The ordinary EngagementTeamDaily pipeline keeps the stricter anonymous
  // eight-person threshold. For a controller-approved identifiable two-person
  // view, derive the same metrics from the canonical seven-day rolling
  // IntegrationMetricsDaily team snapshots, never from fabricated zeroes.
  if (approvedRestrictedSmallTeam && workPatternEvidence.provenance.calendarObservedDays === 0) {
    const latest = eligible.points.filter(point => point.measured &&
      Number(point.actors) >= floor).at(-1);
    if (latest) {
      const fields = [
        ['meeting_hours', 'Meeting participant-hours per represented person', 'meeting_hours', 'hours', true],
        ['focus_availability', 'Uninterrupted calendar availability per represented person', 'focus_time', 'hours', true],
        ['fragmented_days', 'Calendar fragmentation score', 'fragmentation', '/100', false],
        ['after_hours_meetings', 'After-hours meeting share', null, '%', false],
        ['teams_messages', 'Observed team messages', 'messages', 'events', false],
        ['after_hours_messages', 'After-hours message share', 'after_hours', '%', false],
      ];
      const metrics = fields.map(([key, label, property, unit, normalize]) => {
        const value = property && Number.isFinite(latest[property])
          ? (normalize ? Math.round(latest[property] / latest.actors * 100) / 100 : latest[property])
          : null;
        return { key, label, value, unit, observedDays: null, available: value !== null };
      });
      workPatternEvidence = {
        provenance: {
          source: 'restricted_rolling7_team_snapshots',
          sampledOn: latest.sampledOn,
          calendarObservedDays: null,
          messagingObservedDays: null,
          explanation: 'Observed seven-day rolling team snapshot. Daily source completeness is not independently established; unavailable metrics are not zero.',
        },
        metrics,
      };
    }
  }
  // A single authorized team only. No organization array, no user data, no
  // neighboring teams, no individual actor information in response.
  return { eligible:true, teamId:asId(teamId), teamName:team.name, minimum:floor,
    restrictedIdentifiable: approvedRestrictedSmallTeam,
    privacyNotice: approvedRestrictedSmallTeam
      ? 'This two-person team report is potentially identifiable. Restricted to HR-approved viewers. No exports, weekly emails or individual assessment.'
      : null,
    trendSeries, representedWeeks,
    workPatternEvidence,
    methodology:eligible.note, metric:'meetingsPerRepresentedPerson',
    current:eligible.current, baseline:eligible.baseline, changePct:eligible.changePct,
    points:eligible.points.map(p=>({date:p.date,sampledOn:p.sampledOn,
      value:p.meetingsPerRepresentedPerson == null ? null : p.meetingsPerRepresentedPerson})),
    contexts:contexts.map(c=>({weekStart:utcDay(c.weekStart),tag:c.tag,note:c.note})),
    actions:actions.map(a=>({id:asId(a._id),title:a.title,hypothesis:a.hypothesis,metric:a.metric,
      direction:a.direction,baseline:a.baseline,baselineWeek:a.baselineWeek,
      startDate:a.startDate,due14:a.due14,due28:a.due28,status:a.status,
      outcome14:a.outcome14,outcome28:a.outcome28})),
    caveat:'Changes are associations in recorded meeting instances per mapped contributor, not productivity, performance or health scores.' };
}
export function validateActionBody(body) {
  const title = String(body?.title || '').trim();
  const hypothesis = String(body?.hypothesis || '').trim();
  const direction = String(body?.direction || '');
  if (!title || title.length > 180 || hypothesis.length > 1000 ||
    !['increase', 'decrease', 'stabilize'].includes(direction)) return null;
  return { title, hypothesis, direction, metric: 'meetingsPerRepresentedPerson' };
}
export async function createScopedAction({user,team,data,body}) {
  const safe = validateActionBody(body);
  if (!safe || !data?.eligible) return null;
  const now = new Date();
  const p = data.points.filter(x=>x.value != null).at(-1);
  const action = await ManagerWorkAction.create({orgId:user.orgId,teamId:team._id,createdBy:user._id,
    ...safe,baseline:p?.value ?? null,baselineWeek:p?.date ?? null,startDate:now,
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
export async function resolveScopedReportingPolicy({ orgId, team, audience,
  scopeApproved = false, now = new Date() }) {
  const org = await Organization.findById(orgId).select('settings.smallTeamReporting').lean();
  return resolveRestrictedTeamMinimum({
    policy: org?.settings?.smallTeamReporting,
    team, audience, scopeApproved, now,
  });
}

export async function resolveOrgMinimum(orgId) {
  const org = await Organization.findById(orgId).select('settings.minTeamSize settings.timezone').lean();
  return {minimum:Math.max(8,Number(org?.settings?.minTeamSize)||8),timezone:org?.settings?.timezone||'UTC'};
}
