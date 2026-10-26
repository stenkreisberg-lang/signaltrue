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
    Team.findOne({ orgId: user.orgId, _id: teamId }).select('name orgId isActive analyticsEnabled metadata').lean(),
  ]);
  return validateTeamPermission({ user, assignment, team, orgId: user.orgId, teamId })
    ? { user, assignment, team } : null;
}
export async function managerAudit({ orgId, actorUserId, managerUserId, teamId, assignmentId, action }) {
  await ManagerAuditEvent.create({ orgId, actorUserId, managerUserId, teamId, assignmentId, action });
}
export async function getScopedTeamMeasurements({ orgId, team, now = new Date(), minimum = 8 }) {
  const floor = Math.max(8, Number(minimum) || 8);
  const teamId = team._id;
  const start = new Date(utcMonday(now).getTime() - 27 * 7 * DAY);
  const [records, roster] = await Promise.all([
    IntegrationMetricsDaily.find({ orgId, teamId, userId: null, date: { $gte: start, $lte: now } }).sort({date:1}).lean(),
    User.find({orgId,teamId,accountStatus:'active'}).select('_id').lean(),
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
    { $match: { orgId, teamId, actorUserId: { $ne: null }, eventType: 'meeting',
      source: { $in: ['calendar', 'microsoft-outlook', 'google-calendar'] },
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
    actorsByWeek:actorWeeks, minimumGroupSize:floor, now, anchorDay })[0];
  if (!eligible) return { eligible:false, reason:'Not enough comparable, privacy-eligible weekly measurements', minimum:floor };
  const [actions,contexts] = await Promise.all([
    ManagerWorkAction.find({orgId,teamId}).select('title hypothesis metric direction baseline baselineWeek startDate due14 due28 status outcome14 outcome28 createdAt').sort({createdAt:-1}).limit(20).lean(),
    ManagerTeamContext.find({orgId,teamId,weekStart:{$gte:start,$lte:now}}).select('weekStart tag note').sort({weekStart:-1}).limit(25).lean()
  ]);
  // A single authorized team only. No organization array, no user data, no
  // neighboring teams, no individual actor information in response.
  return { eligible:true, teamId:asId(teamId), teamName:team.name, minimum:floor,
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
    analyticsEnabled:{$ne:false}}).select('name').lean();
  const valid = new Set(teams.map(t=>asId(t._id)));
  return list.filter(a=>valid.has(asId(a.teamId)) && (!a.expiresAt || new Date(a.expiresAt)>new Date()))
    .map(a=>({assignmentId:asId(a._id),teamId:asId(a.teamId),
      name:teams.find(t=>asId(t._id)===asId(a.teamId))?.name,
      weeklyEmailEnabled:a.weeklyEmailEnabled,exportEnabled:a.exportEnabled}));
}
export async function resolveOrgMinimum(orgId) {
  const org = await Organization.findById(orgId).select('settings.minTeamSize settings.timezone').lean();
  return {minimum:Math.max(8,Number(org?.settings?.minTeamSize)||8),timezone:org?.settings?.timezone||'UTC'};
}
