import { Resend } from 'resend';
import User from '../models/user.js';
import Team from '../models/team.js';
import ManagerAssignment from '../models/managerAssignment.js';
import ManagerReportDelivery from '../models/managerReportDelivery.js';
import Organization,{ACTIVE_ORG_FILTER} from '../models/organizationModel.js';
import { getScopedTeamMeasurements, validateTeamPermission,resolveOrgMinimum } from './managerIntelligenceService.js';

const TEMPLATE='manager-intelligence-v1';
const id=x=>String(x?._id||x||'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>v==null?'Not measured':Number(v).toLocaleString('en-GB',{maximumFractionDigits:2});
const date=v=>new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
export function managerLocalClock(now,timezone='UTC'){
 try{
  const items=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:timezone,
    weekday:'short',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
    .formatToParts(now).map(i=>[i.type,i.value]));
  return {weekday:items.weekday,day:items.day,month:items.month,year:items.year,hour:Number(items.hour),minute:Number(items.minute)};
 }catch{return null}
}
export function isManagerDeliveryWindow(now,timezone){
 const clock=managerLocalClock(now,timezone);
 return clock?.weekday==='Mon'&&clock.hour===8&&clock.minute===30;
}
export function managerReportWeek(now){
 const d=new Date(now);d.setUTCHours(0,0,0,0);
 d.setUTCDate(d.getUTCDate() - ((d.getUTCDay()+6)%7) - 7);
 return d.toISOString().slice(0,10);
}
function reportTable(data){
 const eligible=(data.points||[]).filter(p=>p.value!=null).slice(-6);
 return '<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">'+
  eligible.map(p=>'<tr><td style="font-size:11px;color:#64748b;padding:6px 4px;">'+esc(date(p.date))+
   '</td><td style="font-size:11px;color:#0f172a;font-weight:bold;padding:6px 4px;text-align:right;">'+esc(fmt(p.value))+'</td></tr>').join('')+'</table>';
}
export function renderManagerWeeklyDigest({reportWeek,eligible=[],missing=0,link='https://www.signaltrue.ai/app/manager'}){
 const blocks=eligible.map(data=>'<section style="border:1px solid #e2e8f0;border-radius:9px;margin:14px 0;padding:15px;">'+
 '<h3 style="margin:0 0 8px;color:#0f172a;">'+esc(data.teamName)+'</h3>'+
 '<p style="font-size:12px;color:#64748b;">Meeting instances per mapped team contributor, measured on comparable completed weeks. No individual attendance inferred.</p>'+
 '<p style="font-size:22px;font-weight:bold;color:#0f172a;margin:8px 0;">'+esc(fmt(data.current))+'</p>'+
 '<p style="font-size:12px;color:#64748b;">Earlier median: '+esc(fmt(data.baseline))+
 (data.changePct!=null?' · Difference: '+esc(data.changePct)+'%':' · Baseline not yet available')+'</p>'+
 reportTable(data)+
 '<p style="font-size:12px;color:#334155;">Manager action: review recurring meetings with the team, record one work-design decision and check the next 14 and 28 days.</p></section>').join('');
 const missingNote=missing?'<p style="padding:12px;background:#fffbeb;color:#92400e;font-size:12px;">Some assigned reporting scopes do not have sufficient privacy-eligible evidence. Their team-level values and identities are withheld from this email.</p>':'';
 return '<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;margin:0;background:#f1f5f9;">'+
 '<table role="presentation" width="100%"><tr><td align="center" style="padding:12px;"><table role="presentation" width="560" style="width:100%;max-width:560px;background:white;"><tr><td style="padding:22px;">'+
 '<p style="font-size:12px;letter-spacing:1px;font-weight:bold;color:#2563eb;">SIGNALTRUE / YOUR TEAM THIS WEEK</p>'+
 '<h1 style="font-size:22px;color:#0f172a;">Weekly work-pattern intelligence</h1>'+
 '<p style="font-size:12px;color:#64748b;">Completed week starting '+esc(reportWeek)+'. Team-aggregate metadata only; not an assessment of employee health or productivity.</p>'+
 (eligible.length?blocks:'<p style="padding:15px;background:#fffbeb;color:#92400e;">This week no authorized team met the historical coverage and privacy thresholds. There are no reliable team measurements to report. Ask HR/IT to review source mapping and coverage.</p>')+
 missingNote+'<p style="font-size:13px;line-height:1.6;color:#334155;">Actions and follow-ups belong in your private team dashboard, where access is rechecked on every request.</p>'+
 '<p><a href="'+esc(link)+'" style="display:block;padding:14px;text-align:center;background:#10223a;color:white;font-weight:bold;text-decoration:none;border-radius:6px;">Open my team dashboard</a></p>'+
 '<p style="font-size:11px;color:#64748b;">You can turn off weekly email in your manager dashboard without changing your HR-approved team access. Any forwarded link requires the recipient’s own authorization.</p>'+
 '</td></tr></table></td></tr></table></body></html>';
}
export async function deliverManagerDigestsForOrg(orgId, now=new Date(), options={}) {
 if(process.env.MANAGER_INTELLIGENCE_EMAIL_ENABLED!=='true'&&!options.forceDryRun)
   return {enabled:false,reason:'Waiting for customer HR sign-off and email QA'};
 const [org,config]=await Promise.all([Organization.findById(orgId).lean(),resolveOrgMinimum(orgId)]);
 if(!org)return {enabled:false,reason:'No tenant'};
 if(!options.forceDryRun&&!isManagerDeliveryWindow(now,config.timezone))return {skipped:'outside tenant-local Monday 08:30'};
 const assignments=await ManagerAssignment.find({orgId,status:'active',weeklyEmailEnabled:true,acceptedAt:{$ne:null},
   revokedAt:null,$or:[{expiresAt:null},{expiresAt:{$gt:now}}]}).lean();
 const byUser=new Map();
 for(const a of assignments){const key=id(a.managerUserId);byUser.set(key,[...(byUser.get(key)||[]),a])}
 const weekKey=managerReportWeek(now),results=[];
 for(const [managerUserId,scopes] of byUser) {
  const user=await User.findOne({_id:managerUserId,orgId,accountStatus:'active'}).select('_id orgId email accountStatus').lean();
  if(!user?.email)continue;
  const eligible=[],acceptedIds=[],missingIds=[];
  for(const scope of scopes){
   const team=await Team.findOne({_id:scope.teamId,orgId,isActive:{$ne:false}}).select('_id orgId name isActive metadata analyticsEnabled').lean();
   if(!validateTeamPermission({user,assignment:scope,team,orgId,teamId:scope.teamId,now}))continue;
   const data=await getScopedTeamMeasurements({orgId,team,minimum:config.minimum,now});
   if(data.eligible){eligible.push(data);acceptedIds.push(id(scope._id))}
   else missingIds.push(id(scope._id));
  }
  if(!acceptedIds.length&&!missingIds.length)continue;
  if(options.forceDryRun){results.push({managerUserId,eligible:eligible.length,suppressed:missingIds.length,status:'dry_run'});continue}
  if(!process.env.RESEND_API_KEY){results.push({managerUserId,status:'transport_not_configured'});continue}
  let claim;
  try{
   claim=await ManagerReportDelivery.create({orgId,managerUserId,weekKey,templateVersion:TEMPLATE,
     claimedAt:new Date(),attemptCount:1,status:'claimed'});
  }catch(e){if(e?.code===11000){results.push({managerUserId,status:'already_claimed'});continue}throw e}
  // Revocation and opt-out are verified a second time just before network send.
  const still=await ManagerAssignment.find({orgId,_id:{$in:scopes.map(s=>s._id)},managerUserId,
    status:'active',weeklyEmailEnabled:true,acceptedAt:{$ne:null},revokedAt:null,
    $or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]}).lean();
  const stillIds=new Set(still.map(s=>id(s._id)));
  if(stillIds.size!==scopes.length){
   await ManagerReportDelivery.updateOne({_id:claim._id},{$set:{status:'cancelled',lastErrorCode:'scope_changed'}});
   results.push({managerUserId,status:'scope_changed'});continue;
  }
  const html=renderManagerWeeklyDigest({reportWeek:weekKey,eligible,missing:missingIds.length,
    link:(process.env.FRONTEND_URL||'https://www.signaltrue.ai').replace(/\/$/,'')+'/app/manager'});
  try{
   const resend=new Resend(process.env.RESEND_API_KEY);
   const result=await resend.emails.send({from:'SignalTrue <brief@signaltrue.ai>',to:user.email,
    subject:'SignalTrue | Your team this week',html,tags:[{name:'email_type',value:'manager-weekly-digest'}]});
   if(result.error)throw new Error('provider_rejected');
   await ManagerReportDelivery.updateOne({_id:claim._id},{$set:{status:'sent',providerMessageId:result.data?.id,sentAt:new Date()}});
   results.push({managerUserId,status:'sent'});
  }catch(e){
   // Unknown provider status: do not resend blindly or risk duplicate disclosure.
   await ManagerReportDelivery.updateOne({_id:claim._id},{$set:{status:'unknown',lastErrorCode:'provider_result_uncertain'}});
   results.push({managerUserId,status:'unknown'});
  }
 }
 return {weekKey,results};
}
export async function runScheduledManagerDigests(now=new Date()) {
 if(process.env.MANAGER_INTELLIGENCE_EMAIL_ENABLED!=='true')return {enabled:false};
 const orgs=await Organization.find(ACTIVE_ORG_FILTER).select('_id settings.timezone').lean();
 const results=[];
 for(const org of orgs){
  if(isManagerDeliveryWindow(now,org.settings?.timezone||'UTC'))
   results.push({orgId:id(org._id),result:await deliverManagerDigestsForOrg(org._id,now)});
 }
 return {results};
}
