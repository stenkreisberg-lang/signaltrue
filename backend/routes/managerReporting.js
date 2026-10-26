import express from 'express';
import User from '../models/user.js';
import ManagerReportAssignment from '../models/managerReportAssignment.js';
import {appoint,accept,eligibleTeamSeries,managerAdmin,resolveActor,authorizedAssignment} from '../services/managerReportAccessService.js';
const router=express.Router();
const deny=(res)=>res.status(403).json({message:'Not authorized'});
router.get('/assignments',async(req,res)=>{
 const actor=await resolveActor(req);
 if(!actor||!managerAdmin(actor))return deny(res);
 const records=await ManagerReportAssignment.find({orgId:actor.orgId}).select('-inviteTokenHash').sort({createdAt:-1}).limit(250).lean();
 res.json({assignments:records});
});
router.post('/assignments',async(req,res)=>{
 try{
 const actor=await resolveActor(req);
 if(!actor||!managerAdmin(actor))return deny(res);
 const {teamId,managerUserId}=req.body||{};
 if(!teamId||!managerUserId)return res.status(400).json({message:'teamId and managerUserId required'});
 const {record}=await appoint({orgId:actor.orgId,teamId,managerUserId,appointedBy:actor._id});
 // Never return invitation tokens in an API response; a dedicated verified-email
 // delivery and claim-link workflow must be enabled before invitations go live.
 res.status(201).json({id:record.id,status:'pending',message:'Appointment pending. Invitation delivery is not enabled.'});
 }catch(e){res.status(e.status||500).json({message:e.status?e.message:'Unable to appoint manager'});}
});
router.post('/accept',async(req,res)=>{
 const actor=await resolveActor(req);
 if(!actor)return deny(res);
 // Fail closed while identity-verified invitation delivery is not wired.
 return res.status(503).json({message:'Manager invitations are not yet enabled'});
});
router.delete('/assignments/:id',async(req,res)=>{
 const actor=await resolveActor(req);if(!actor||!managerAdmin(actor))return deny(res);
 const row=await ManagerReportAssignment.findOneAndUpdate({_id:req.params.id,orgId:actor.orgId,status:{$ne:'revoked'}},
 {$set:{status:'revoked',emailEnabled:false,revokedAt:new Date()},$unset:{inviteTokenHash:1}}, {new:true});
 if(!row)return res.status(404).json({message:'Assignment not found'});res.json({status:'revoked'});
});
router.get('/my-teams',async(req,res)=>{
 const actor=await resolveActor(req);if(!actor)return deny(res);
 const assignments=await ManagerReportAssignment.find({orgId:actor.orgId,managerUserId:actor._id,status:'active',
 $or:[{expiresAt:null},{expiresAt:{$gt:new Date()}}]}).select('teamId').lean();
 res.json({teams:assignments.map(x=>String(x.teamId))});
});
router.get('/team/:teamId',async(req,res)=>{
 const actor=await resolveActor(req);if(!actor)return deny(res);
 if(!await authorizedAssignment(actor.orgId,actor._id,req.params.teamId))return deny(res);
 const payload=await eligibleTeamSeries(actor.orgId,req.params.teamId,8);
 if(!payload)return res.status(404).json({message:'Insufficient group evidence; no report available'});
 res.json(payload);
});
export default router;
