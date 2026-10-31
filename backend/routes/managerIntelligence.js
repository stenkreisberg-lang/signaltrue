import express from 'express';
import mongoose from 'mongoose';
import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import ManagerReportDelivery from '../models/managerReportDelivery.js';
import ManagerTeamContext from '../models/managerTeamContext.js';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import ManagerAssignment from '../models/managerAssignment.js';
import ManagerInvitation from '../models/managerInvitation.js';
import ManagerWorkAction from '../models/managerWorkAction.js';
import Organization from '../models/organizationModel.js';
import { assertScopedManager, createScopedAction, getScopedTeamMeasurements, hashSecret, loadManagerRoster,
  managerAudit, normalizeEmail, hashInvitedEmail, resolveOrgMinimum, secureToken, MANAGER_TERMS_VERSION } from '../services/managerIntelligenceService.js';

const router = express.Router();

// A directory-synced employee can claim an account only with a high-entropy,
// single-use token delivered to the HR-approved company mailbox. Claiming the
// account does not grant any manager access until the user signs in and accepts.
router.post('/invitations/claim', async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (token.length < 32 || password.length < 12 || password.length > 128) {
    return noStore(res).status(400).json({ message: 'A valid invitation and password of at least 12 characters are required' });
  }
  try {
    const invitation = await ManagerInvitation.findOne({
      tokenHash: hashSecret(token), usedAt: null, declinedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!invitation) return noStore(res).status(403).json({ message: 'Invitation unavailable or expired' });
    const assignment = await ManagerAssignment.findOne({
      _id: invitation.assignmentId, orgId: invitation.orgId,
      managerUserId: invitation.recipientUserId, status: 'invited', revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean();
    if (!assignment) return noStore(res).status(403).json({ message: 'Invitation is no longer authorised' });
    const user = await User.findOne({
      _id: invitation.recipientUserId, orgId: invitation.orgId, accountStatus: 'pending',
    });
    if (!user) return noStore(res).status(409).json({ message: 'Account already active or unavailable. Sign in using the invited account.' });
    if (invitation.recipientEmailHash !== hashInvitedEmail(user.email)) {
      return noStore(res).status(403).json({ message: 'Invitation identity mismatch' });
    }
    user.password = password;
    user.accountStatus = 'active';
    await user.save();
    await managerAudit({ orgId: user.orgId, actorUserId: user._id,
      managerUserId: user._id, teamId: assignment.teamId,
      assignmentId: assignment._id, action: 'manager_account_claimed' });
    return noStore(res).json({ status: 'account_claimed', message: 'Account ready. Sign in with your company email and accept the invitation.' });
  } catch (error) {
    console.error('[ManagerInvitation] Claim failed:', error.message);
    return noStore(res).status(500).json({ message: 'Account setup could not be completed' });
  }
});
router.use(authenticateToken);
const ADMIN_ROLES = new Set(['master_admin','admin','hr_admin','org_admin']);
const id = x => String(x?._id || x || '');
const validId = x => mongoose.isValidObjectId(x);
const escapeHtml = s => String(s||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function noStore(res) { res.set('Cache-Control','no-store, private'); res.set('Pragma','no-cache'); return res; }
async function loadOrgUser(req) {
  if (!validId(req.user?.userId)) return null;
  const user=await User.findById(req.user.userId).select('_id email role orgId accountStatus').lean();
  return user?.accountStatus==='active' && user.orgId ? user : null;
}
async function requireAdmin(req,res,next) {
  try {
    const user=await loadOrgUser(req);
    if(!user||!ADMIN_ROLES.has(user.role)) return noStore(res).status(403).json({message:'HR administrator access required'});
    req.managerAdmin=user; next();
  } catch(e){next(e)}
}
const invitationEmail = (teamName, url) =>
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;padding:24px;color:#0f172a;">' +
  '<p style="font-size:12px;color:#64748b;font-weight:bold;">SIGNALTRUE / TEAM INTELLIGENCE</p>' +
  '<h2>Invitation to view team work-pattern insights</h2><p>An authorized organization administrator invited you to view aggregated trends for ' +
  escapeHtml(teamName) + '.</p><p>No individual conversations, employee rankings or personal scores are included.</p>' +
  '<p><a href="'+escapeHtml(url)+'" style="display:inline-block;padding:13px 18px;background:#10223a;color:white;text-decoration:none;border-radius:6px;">Verify identity and review invitation</a></p>' +
  '<p>The invitation expires in seven days. If you have not created a SignalTrue password yet, use the link to claim your company account. You must sign in and accept before seeing any team information.</p>' +
  '<p>If this invitation was unexpected, do not use the link; contact HR.</p></div>';
async function sendInvite(email, teamName, token) {
  if(!process.env.RESEND_API_KEY) throw new Error('Invitation email transport is not configured');
  const url=(process.env.FRONTEND_URL || 'https://www.signaltrue.ai').replace(/\/$/,'') +
    '/app/manager/invite#token='+encodeURIComponent(token);
  const resend=new Resend(process.env.RESEND_API_KEY);
  const response=await resend.emails.send({
    from:'SignalTrue <brief@signaltrue.ai>',to:email,subject:'SignalTrue team insight access invitation',
    html:invitationEmail(teamName,url),
    tags:[{name:'email_type',value:'manager-invitation'}]
  });
  if(response.error) throw new Error('Invitation email provider rejected the request');
  return response.data?.id;
}
router.get('/admin/directory',requireAdmin,async(req,res)=>{
  const orgId=req.managerAdmin.orgId;
  const [users,teams,assignments,org] = await Promise.all([
    User.find({orgId,accountStatus:{$in:['active','pending']},email:{$exists:true,$ne:''}})
      .select('_id name email role accountStatus teamId').sort({name:1}).limit(250).lean(),
    Team.find({orgId,isActive:{$ne:false}}).select('_id name').sort({name:1}).lean(),
    ManagerAssignment.find({orgId}).select('managerUserId teamId status weeklyEmailEnabled exportEnabled activatedAt invitedAt revokedAt').lean(),
    Organization.findById(orgId).select('settings.minTeamSize settings.timezone').lean(),
  ]);
  noStore(res).json({users:users.map(u=>({id:id(u._id),name:u.name,email:u.email,role:u.role,accountStatus:u.accountStatus,teamId:id(u.teamId)})),
    teams:teams.map(t=>({id:id(t._id),name:t.name})),
    assignments:assignments.map(a=>({id:id(a._id),managerUserId:id(a.managerUserId),teamId:id(a.teamId),
      status:a.status,weeklyEmailEnabled:a.weeklyEmailEnabled,exportEnabled:a.exportEnabled,activatedAt:a.activatedAt,invitedAt:a.invitedAt,revokedAt:a.revokedAt})),
    minimum:Math.max(8,Number(org?.settings?.minTeamSize)||8),timezone:org?.settings?.timezone||'UTC'});
});
router.post('/admin/assignments',requireAdmin,async(req,res)=>{
  const managerUserId=String(req.body?.managerUserId||'');
  const teamId=String(req.body?.teamId||'');
  if(!validId(managerUserId)||!validId(teamId))return noStore(res).status(400).json({message:'Choose an existing employee and team'});
  const orgId=req.managerAdmin.orgId;
  const [user,team]=await Promise.all([
    User.findOne({_id:managerUserId,orgId,accountStatus:{$in:['active','pending']}}).select('_id email').lean(),
    Team.findOne({_id:teamId,orgId,isActive:{$ne:false}}).select('_id name').lean()
  ]);
  if(!user?.email||!team)return noStore(res).status(400).json({message:'Inactive or cross-organization employee/team'});
  let assignment=await ManagerAssignment.findOne({orgId,managerUserId,teamId});
  if(assignment && !['revoked','declined','expired'].includes(assignment.status))
    return noStore(res).status(409).json({message:'Assignment already exists; use Resend or Revoke'});
  if(assignment) {
    assignment.status='pending'; assignment.revokedAt=null;assignment.acceptedAt=null;
    assignment.activatedAt=null;assignment.expiresAt=null;assignment.invitedBy=req.managerAdmin._id;
    assignment.weeklyEmailEnabled=req.body?.weeklyEmailEnabled!==false;
    await assignment.save();
  } else {
    assignment=await ManagerAssignment.create({orgId,managerUserId,teamId,invitedBy:req.managerAdmin._id,
      weeklyEmailEnabled:req.body?.weeklyEmailEnabled!==false});
  }
  await managerAudit({orgId,actorUserId:req.managerAdmin._id,managerUserId,teamId,assignmentId:assignment._id,action:'manager_approved_pending'});
  noStore(res).status(201).json({id:id(assignment._id),status:'pending'});
});
router.post('/admin/assignments/:assignmentId/invite',requireAdmin,async(req,res)=>{
  const orgId=req.managerAdmin.orgId;
  const assignment=await ManagerAssignment.findOne({_id:req.params.assignmentId,orgId,
    status:{$in:['pending','invited']},revokedAt:null});
  if(!assignment)return noStore(res).status(404).json({message:'No pending authorization'});
  if(assignment.lastInviteSentAt && Date.now()-new Date(assignment.lastInviteSentAt)<60000)
    return noStore(res).status(429).json({message:'Please allow at least one minute between invitations'});
  const [user,team]=await Promise.all([
    User.findOne({_id:assignment.managerUserId,orgId,accountStatus:{$in:['active','pending']}}).select('_id email').lean(),
    Team.findOne({_id:assignment.teamId,orgId,isActive:{$ne:false}}).select('name').lean(),
  ]);
  if(!user?.email||!team)return noStore(res).status(409).json({message:'Recipient is no longer employed or team is inactive'});
  const token=secureToken(), tokenHash=hashSecret(token), expires=new Date(Date.now()+7*86400000);
  // Invalidate previous links when a new invitation is issued.
  await ManagerInvitation.deleteMany({assignmentId:assignment._id,usedAt:null});
  const invite=await ManagerInvitation.create({orgId,assignmentId:assignment._id,
    recipientUserId:user._id,recipientEmailHash:hashInvitedEmail(user.email),
    tokenHash,expiresAt:expires});
  try {
    await sendInvite(user.email,team.name,token);
  } catch(e) {
    await ManagerInvitation.deleteOne({_id:invite._id});
    return noStore(res).status(503).json({message:'Invitation could not be sent. Verify mail transport.'});
  }
  await ManagerInvitation.updateOne({_id:invite._id},{$set:{deliveredAt:new Date()}});
  assignment.status='invited';assignment.invitedAt=new Date();assignment.lastInviteSentAt=new Date();assignment.expiresAt=expires;
  await assignment.save();
  await managerAudit({orgId,actorUserId:req.managerAdmin._id,managerUserId:user._id,
    teamId:assignment.teamId,assignmentId:assignment._id,action:'manager_invitation_sent'});
  noStore(res).json({status:'invited',expiresAt:expires});
});
router.post('/admin/assignments/:assignmentId/revoke',requireAdmin,async(req,res)=>{
  const orgId=req.managerAdmin.orgId;
  const assignment=await ManagerAssignment.findOneAndUpdate({_id:req.params.assignmentId,orgId,status:{$ne:'revoked'}},
    {$set:{status:'revoked',revokedAt:new Date(),weeklyEmailEnabled:false}},{new:true});
  if(!assignment)return noStore(res).status(404).json({message:'Assignment not found'});
  await ManagerInvitation.deleteMany({assignmentId:assignment._id,usedAt:null});
  await managerAudit({orgId,actorUserId:req.managerAdmin._id,managerUserId:assignment.managerUserId,
    teamId:assignment.teamId,assignmentId:assignment._id,action:'manager_access_revoked'});
  noStore(res).json({status:'revoked'});
});
router.post('/invitations/inspect',async(req,res)=>{
  const user=await loadOrgUser(req),token=String(req.body?.token||'');
  if(!user||token.length<32)return noStore(res).status(403).json({message:'Sign in using the invited company account'});
  const invitation=await ManagerInvitation.findOne({tokenHash:hashSecret(token),recipientUserId:user._id,
    usedAt:null,declinedAt:null,expiresAt:{$gt:new Date()}}).lean();
  if(!invitation||String(invitation.orgId)!==id(user.orgId)||
    invitation.recipientEmailHash!==hashInvitedEmail(user.email))
    return noStore(res).status(403).json({message:'Invitation unavailable or identity mismatch'});
  const assignment=await ManagerAssignment.findOne({_id:invitation.assignmentId,orgId:user.orgId,
    managerUserId:user._id,status:'invited',revokedAt:null}).lean();
  if(!assignment)return noStore(res).status(403).json({message:'Invitation no longer authorized'});
  const team=await Team.findOne({_id:assignment.teamId,orgId:user.orgId,isActive:{$ne:false}}).select('name').lean();
  if(!team)return noStore(res).status(403).json({message:'Team no longer active'});
  noStore(res).json({teamName:team.name,expiresAt:invitation.expiresAt,
    termsVersion:MANAGER_TERMS_VERSION,purpose:'Privacy-protected aggregate team work-pattern intelligence',
    restrictions:'Only assigned team, no individual content; coverage thresholds apply'});
});
router.post('/invitations/respond',async(req,res)=>{
  const user=await loadOrgUser(req),token=String(req.body?.token||''),accept=req.body?.accept===true;
  if(!user||token.length<32)return noStore(res).status(403).json({message:'Invited verified account required'});
  const filter={tokenHash:hashSecret(token),recipientUserId:user._id,recipientEmailHash:hashInvitedEmail(user.email),
    orgId:user.orgId,usedAt:null,declinedAt:null,expiresAt:{$gt:new Date()}};
  const invitation=await ManagerInvitation.findOne(filter);
  if(!invitation)return noStore(res).status(403).json({message:'Invitation unavailable'});
  const assignment=await ManagerAssignment.findOne({_id:invitation.assignmentId,orgId:user.orgId,
    managerUserId:user._id,status:'invited',revokedAt:null,expiresAt:{$gt:new Date()}});
  const team=assignment?await Team.findOne({_id:assignment.teamId,orgId:user.orgId,isActive:{$ne:false}}):null;
  if(!assignment||!team)return noStore(res).status(403).json({message:'Authorization no longer active'});
  const marked=await ManagerInvitation.findOneAndUpdate(filter,{$set:accept?{usedAt:new Date()}:{declinedAt:new Date()}});
  if(!marked)return noStore(res).status(409).json({message:'Invitation already used'});
  const when=new Date();
  const status=accept?'active':'declined';
  const updated=await ManagerAssignment.findOneAndUpdate({_id:assignment._id,status:'invited',revokedAt:null,expiresAt:{$gt:when}},
    {$set:{status,...(accept?{acceptedAt:when,activatedAt:when,acceptedTermsVersion:MANAGER_TERMS_VERSION}:{weeklyEmailEnabled:false})}},
    {new:true});
  if(!updated)return noStore(res).status(409).json({message:'Authorization changed; contact HR'});
  await managerAudit({orgId:user.orgId,actorUserId:user._id,managerUserId:user._id,
    teamId:assignment.teamId,assignmentId:assignment._id,action:accept?'manager_accepted':'manager_declined'});
  noStore(res).json({status,teamId:accept?id(assignment.teamId):undefined});
});
router.get('/me/teams',async(req,res)=>noStore(res).json({teams:await loadManagerRoster(req)}));
router.patch('/me/preferences',async(req,res)=>{
  const user=await loadOrgUser(req);
  const on=req.body?.weeklyEmailEnabled;
  if(!user||typeof on!=='boolean')return noStore(res).status(400).json({message:'Valid email preference required'});
  const changed=await ManagerAssignment.updateMany({orgId:user.orgId,managerUserId:user._id,status:'active'},
    {$set:{weeklyEmailEnabled:on,preferenceUpdatedAt:new Date()}});
  noStore(res).json({weeklyEmailEnabled:on,updated:changed.modifiedCount});
});
router.get('/teams/:teamId/trends',async(req,res)=>{
  const scope=await assertScopedManager(req,req.params.teamId);
  if(!scope)return noStore(res).status(403).json({message:'Not authorized for this team'});
  const {minimum}=await resolveOrgMinimum(scope.user.orgId);
  const data=await getScopedTeamMeasurements({orgId:scope.user.orgId,team:scope.team,minimum});
  noStore(res).json(data);
});
router.post('/teams/:teamId/actions',async(req,res)=>{
  const scope=await assertScopedManager(req,req.params.teamId);
  if(!scope)return noStore(res).status(403).json({message:'Not authorized for this team'});
  const {minimum}=await resolveOrgMinimum(scope.user.orgId);
  const data=await getScopedTeamMeasurements({orgId:scope.user.orgId,team:scope.team,minimum});
  const action=await createScopedAction({user:scope.user,team:scope.team,data,body:req.body});
  if(!action)return noStore(res).status(400).json({message:'Action requires eligible evidence, title and valid expected direction'});
  noStore(res).status(201).json(action);
});
router.post('/teams/:teamId/actions/:actionId/review',async(req,res)=>{
  const scope=await assertScopedManager(req,req.params.teamId);
  if(!scope)return noStore(res).status(403).json({message:'Not authorized for this team'});
  const {minimum}=await resolveOrgMinimum(scope.user.orgId);
  const data=await getScopedTeamMeasurements({orgId:scope.user.orgId,team:scope.team,minimum});
  if(!data.eligible)return noStore(res).status(409).json({message:'Evidence insufficient for outcome review'});
  const action=await ManagerWorkAction.findOne({_id:req.params.actionId,orgId:scope.user.orgId,teamId:scope.team._id});
  if(!action)return noStore(res).status(404).json({message:'Action not found'});
  const now=new Date();
  const day=now>=action.due28?28:now>=action.due14?14:0;
  if(!day)return noStore(res).status(409).json({message:'First review is available after 14 days'});
  const latest=data.points.filter(p=>p.value!=null).at(-1);
  if(!latest||latest.date<=action.baselineWeek || action.baseline==null)return noStore(res).status(409).json({message:'No comparable post-action measurement'});
  const diff=latest.value-action.baseline;
  const status=Math.abs(diff)<Math.max(0.05,action.baseline*0.05)?'unchanged':
    (action.direction==='decrease'?diff<0:action.direction==='increase'?diff>0:Math.abs(diff)<0.05)?'improved':'worsened';
  const field=day===28?'outcome28':'outcome14';
  action[field]={value:latest.value,status,measuredAt:now};
  await action.save();
  await managerAudit({orgId:scope.user.orgId,actorUserId:scope.user._id,managerUserId:scope.user._id,
    teamId:scope.team._id,action:'manager_followup_review'});
  noStore(res).json({day,baseline:action.baseline,current:latest.value,status,
    note:'Observed before/after association with unchanged metric definition, not proof of causal improvement'});
});

router.patch('/admin/assignments/:assignmentId/permissions',requireAdmin,async(req,res)=>{
  const allowed={};
  if(typeof req.body?.exportEnabled==='boolean')allowed.exportEnabled=req.body.exportEnabled;
  if(typeof req.body?.weeklyEmailEnabled==='boolean')allowed.weeklyEmailEnabled=req.body.weeklyEmailEnabled;
  if(!Object.keys(allowed).length)return noStore(res).status(400).json({message:'Choose a permission to update'});
  const assignment=await ManagerAssignment.findOneAndUpdate({_id:req.params.assignmentId,orgId:req.managerAdmin.orgId,
    status:{$ne:'revoked'}},{$set:allowed},{new:true});
  if(!assignment)return noStore(res).status(404).json({message:'No active assignment'});
  await managerAudit({orgId:req.managerAdmin.orgId,actorUserId:req.managerAdmin._id,managerUserId:assignment.managerUserId,
    teamId:assignment.teamId,assignmentId:assignment._id,action:'manager_permission_changed'});
  noStore(res).json({exportEnabled:assignment.exportEnabled,weeklyEmailEnabled:assignment.weeklyEmailEnabled});
});
router.get('/me/deliveries',async(req,res)=>{
  const user=await loadOrgUser(req);
  if(!user)return noStore(res).status(403).json({message:'Account inactive'});
  const records=await ManagerReportDelivery.find({orgId:user.orgId,managerUserId:user._id})
    .select('weekKey status sentAt createdAt').sort({createdAt:-1}).limit(26).lean();
  noStore(res).json({deliveries:records.map(d=>({weekKey:d.weekKey,status:d.status,sentAt:d.sentAt}))});
});
router.post('/teams/:teamId/context',async(req,res)=>{
  const scope=await assertScopedManager(req,req.params.teamId);
  if(!scope)return noStore(res).status(403).json({message:'Not authorized'});
  const validTags=['launch','planning','offsite','holiday','deadline','reorganization','other'];
  const tag=String(req.body?.tag||'');
  const note=String(req.body?.note||'').trim();
  const requested=new Date(req.body?.weekStart);
  if(!validTags.includes(tag)||note.length>500||!Number.isFinite(requested.getTime())||
    requested>new Date()||requested<new Date(Date.now()-190*86400000))
    return noStore(res).status(400).json({message:'Valid recent week, context type and short note required'});
  requested.setUTCHours(0,0,0,0);
  requested.setUTCDate(requested.getUTCDate()-((requested.getUTCDay()+6)%7));
  const context=await ManagerTeamContext.create({orgId:scope.user.orgId,teamId:scope.team._id,
    createdBy:scope.user._id,weekStart:requested,tag,note});
  await managerAudit({orgId:scope.user.orgId,actorUserId:scope.user._id,managerUserId:scope.user._id,
    teamId:scope.team._id,action:'manager_context_added'});
  noStore(res).status(201).json({id:id(context._id),tag,weekStart:requested});
});
router.get('/teams/:teamId/report.pdf',async(req,res)=>{
  const scope=await assertScopedManager(req,req.params.teamId);
  if(!scope||scope.assignment.exportEnabled!==true)
    return noStore(res).status(403).json({message:'Export not authorized by HR'});
  const {minimum}=await resolveOrgMinimum(scope.user.orgId);
  const data=await getScopedTeamMeasurements({orgId:scope.user.orgId,team:scope.team,minimum});
  if(!data.eligible)return noStore(res).status(409).json({message:'No privacy-eligible measurement available for export'});
  noStore(res).type('application/pdf').set('Content-Disposition','attachment; filename="signaltrue-private-team-report.pdf"');
  const pdf=new PDFDocument({size:'A4',margin:48,info:{Title:'SignalTrue - authorized team work-pattern report',
    Author:'SignalTrue',Subject:'Privacy-gated manager intelligence'}});
  pdf.pipe(res);
  pdf.fillColor('#10223a').fontSize(20).text('SignalTrue | Team work-pattern intelligence');
  pdf.moveDown(1).fontSize(14).text(data.teamName);
  pdf.moveDown(1).fontSize(11).fillColor('#475569').text('Privacy minimum: '+minimum+' active mapped calendar contributors per comparable week.');
  pdf.moveDown().fillColor('#10223a').text('Latest eligible complete-week value: '+String(data.current??'unavailable'));
  pdf.text('Earlier median: '+String(data.baseline??'unavailable'));
  pdf.moveDown().fontSize(12).text('Weekly data | meeting instances per mapped calendar contributor');
  for(const p of data.points.slice(-13)){
    pdf.fontSize(10).text(p.date+'   '+(p.value==null?'No eligible measurement':String(p.value)));
  }
  pdf.moveDown().fontSize(9).fillColor('#64748b').text(data.caveat);
  pdf.text('Authorization was checked immediately before generating this file. Once downloaded, control access to your own local copy.');
  pdf.end();
});

export default router;
