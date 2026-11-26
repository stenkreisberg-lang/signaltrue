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
export function managerReportWeek(now, timezone = 'UTC'){
 const local=managerLocalClock(now,timezone);
 if(!local)return null;
 const localDate=new Date(Date.UTC(Number(local.year),Number(local.month)-1,Number(local.day)));
 localDate.setUTCDate(localDate.getUTCDate() - ((localDate.getUTCDay()+6)%7) - 7);
 return localDate.toISOString().slice(0,10);
}
export function renderManagerWeeklyDigest({reportWeek,eligible=[],missing=0,locale='en',link='https://www.signaltrue.ai/app/manager'}){
 const et=locale==='et';
 const t=(en,estonian)=>et?estonian:en;
 const fmt=value=>new Intl.NumberFormat(et?'et-EE':'en-GB',{maximumFractionDigits:2}).format(value);
 const blocks=eligible.map(data=>{
   const findings=(data.findings || []).map(f=>'<p><strong>'+esc(f.label)+'</strong>: '+esc(fmt(f.baseline))+
     ' → '+esc(fmt(f.current))+' '+esc(f.unit)+'</p><p>'+esc(f.question)+'</p>');
   const latest=(data.trendSeries || []).filter(series=>series.points.at(-1)?.verified).map(series=>
     '<li>'+esc(series.label)+': '+esc(fmt(series.points.at(-1).value))+' '+esc(series.unit)+'</li>');
   if(!latest.length && Number.isFinite(data.current))latest.push('<li>'+t('Meetings per calendar participant','Koosolekuid kalendrikasutaja kohta')+': '+esc(fmt(data.current))+'</li>');
   return '<section><h2>'+esc(data.teamName)+'</h2>'+findings.join('')+
     (findings.length?'':'<p>'+t('There is insufficient evidence to rank a change.','Muutuse esiletõstmiseks napib võrreldavaid andmeid.')+'</p>')+
     (latest.length?'<ul>'+latest.join('')+'</ul>':'')+'</section>';
 }).join('');
 return '<!doctype html><html lang="'+(et?'et':'en')+'"><body style="max-width:580px;margin:20px auto;font-family:Arial,sans-serif;color:#17293c">'+
 '<h1>'+t('Your team this week','Sinu tiimi nädal')+'</h1><p>'+esc(reportWeek)+'</p>'+blocks+
 (!eligible.length?'<p>'+t('This week no authorized team met the evidence thresholds.','Sel nädalal ei olnud üheski kinnitatud tiimis aruandeks piisavalt andmeid.')+'</p>':'')+
 (missing?'<p>'+t('Some team measurements were unavailable.','Osa tiimide mõõtmistest puudub.')+'</p>':'')+
 '<p>'+t('Discuss possible explanations with the team.','Arutage võimalikke selgitusi tiimiga.')+'</p>'+
 '<a href="'+esc(link)+'">'+t('Open my team dashboard','Ava tiimi ülevaade')+'</a></body></html>';
}
export async function deliverManagerDigestsForOrg(orgId, now=new Date(), options={}) {
 if(process.env.MANAGER_INTELLIGENCE_EMAIL_ENABLED!=='true'&&!options.forceDryRun)
   return {enabled:false,reason:'Waiting for customer HR sign-off and email QA'};
 const [org,config]=await Promise.all([Organization.findOne({_id:orgId,...ACTIVE_ORG_FILTER}).select('_id settings.timezone').lean(),resolveOrgMinimum(orgId)]);
 if(!org)return {enabled:false,reason:'No tenant'};
 if(!options.forceDryRun&&!isManagerDeliveryWindow(now,config.timezone))return {skipped:'outside tenant-local Monday 08:30'};
 const assignments=await ManagerAssignment.find({orgId,status:'active',weeklyEmailEnabled:true,acceptedAt:{$ne:null},
   revokedAt:null,$or:[{expiresAt:null},{expiresAt:{$gt:now}}]}).lean();
 const byUser=new Map();
 for(const a of assignments){const key=id(a.managerUserId);byUser.set(key,[...(byUser.get(key)||[]),a])}
 const weekKey=managerReportWeek(now,config.timezone),results=[];
 for(const [managerUserId,scopes] of byUser) {
  const user=await User.findOne({_id:managerUserId,orgId,accountStatus:'active'}).select('_id orgId email accountStatus').lean();
  if(!user?.email)continue;
  const eligible=[],acceptedIds=[],missingIds=[];
  for(const scope of scopes){
   const team=await Team.findOne({_id:scope.teamId,orgId,isActive:{$ne:false}}).select('_id orgId name isActive metadata analyticsEnabled structure').lean();
   if(!validateTeamPermission({user,assignment:scope,team,orgId,teamId:scope.teamId,now}))continue;
   const data=await getScopedTeamMeasurements({orgId,team,minimum:config.minimum,locale:config.locale,now});
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
  const [recipient,currentTeams,activeOrg] = await Promise.all([
    User.findOne({_id:managerUserId,orgId,accountStatus:'active'}).select('_id orgId email accountStatus').lean(),
    Team.find({orgId,_id:{$in:scopes.map(s=>s.teamId)}}).select('_id orgId isActive analyticsEnabled structure').lean(),
    Organization.exists({_id:orgId,...ACTIVE_ORG_FILTER}),
  ]);
  const byTeam = new Map(currentTeams.map(t=>[id(t),t]));
  const validIds = new Set(still.filter(s=>validateTeamPermission({user:recipient,assignment:s,team:byTeam.get(id(s.teamId)),orgId,teamId:s.teamId,now:new Date()})).map(s=>id(s)));
  if(!activeOrg || !recipient?.email || recipient.email!==user.email || [...acceptedIds,...missingIds].some(a=>!validIds.has(a))){
   await ManagerReportDelivery.updateOne({_id:claim._id},{$set:{status:'cancelled',lastErrorCode:'scope_changed'}});
   results.push({managerUserId,status:'scope_changed'});continue;
  }
  const html=renderManagerWeeklyDigest({reportWeek:weekKey,eligible,missing:missingIds.length,locale:config.locale,
    link:(process.env.FRONTEND_URL||'https://www.signaltrue.ai').replace(/\/$/,'')+'/app/manager'});
  try{
   const resend=new Resend(process.env.RESEND_API_KEY);
   const result=await resend.emails.send({from:'SignalTrue <brief@signaltrue.ai>',to:recipient.email,
    subject:config.locale==='et'?'SignalTrue | Sinu tiimi nädal':'SignalTrue | Your team this week',html,tags:[{name:'email_type',value:'manager-weekly-digest'}]});
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
