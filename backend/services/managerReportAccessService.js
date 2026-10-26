import crypto from 'node:crypto';
import ManagerReportAssignment from '../models/managerReportAssignment.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import { getReportTrendSeries } from './reportTrendService.js';
const same=(a,b)=>String(a||'')===String(b||'');
export function managerAdmin(user) {
 return ['hr_admin','admin','org_admin','master_admin'].includes(user?.role);
}
export async function resolveActor(req) {
 const uid=req.user?.userId||req.user?.id;
 if(!uid) return null;
 const actor=await User.findById(uid).select('_id orgId role email accountStatus').lean();
 return actor?.accountStatus==='active'&&same(actor.orgId,req.user.orgId)?actor:null;
}
export async function authorizedAssignment(orgId,managerUserId,teamId) {
 const row=await ManagerReportAssignment.findOne({orgId,managerUserId,teamId,status:'active',
 $or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]}).lean();
 return row||null;
}
export async function eligibleTeamSeries(orgId,teamId,minGroup=8) {
 const trend=await getReportTrendSeries(orgId,new Date(),{includeTeams:true,minimumGroupSize:Math.max(8,minGroup)});
 const team=trend.teams.find(t=>same(t.id,teamId));
 return team?{team,privacy:trend.privacy,annotations:trend.annotations.filter(e=>e.kind==='intervention'&&same(e.teamId,teamId)),
 method:trend.method}:null;
}
export async function appoint({orgId,teamId,managerUserId,appointedBy}) {
 const [team,manager]=await Promise.all([Team.findOne({_id:teamId,orgId,isActive:{$ne:false}}).lean(),
 User.findOne({_id:managerUserId,orgId,accountStatus:'active'}).lean()]);
 if(!team||!manager) throw Object.assign(new Error('Invalid active team or verified manager'),{status:400});
 const token=crypto.randomBytes(32).toString('hex');
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 const expiry=new Date(Date.now()+7*86400000);
 const record=await ManagerReportAssignment.findOneAndUpdate({orgId,teamId,managerUserId},{
 $set:{appointedBy,status:'pending',inviteTokenHash:hash,inviteExpiresAt:expiry,acceptedAt:null,revokedAt:null,emailEnabled:false},
 $setOnInsert:{orgId,teamId,managerUserId}},
 {upsert:true,new:true,runValidators:true});
 return {record,token};
}
export async function accept({orgId,managerUserId,token,consent}) {
 if(!consent||!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 return ManagerReportAssignment.findOneAndUpdate({orgId,managerUserId,status:'pending',inviteTokenHash:hash,inviteExpiresAt:{$gt:new Date()}},{
 $set:{status:'active',acceptedAt:new Date(),emailEnabled:true},
 $unset:{inviteTokenHash:1}},{new:true});
}
