import mongoose from 'mongoose';
const schema = new mongoose.Schema({
 orgId:{type:mongoose.Schema.Types.ObjectId,ref:'Organization',required:true,index:true},
 teamId:{type:mongoose.Schema.Types.ObjectId,ref:'Team',required:true,index:true},
 managerUserId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
 appointedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 status:{type:String,enum:['pending','active','declined','revoked','expired'],default:'pending',index:true},
 inviteTokenHash:{type:String,select:false},
 inviteExpiresAt:Date,
 acceptedAt:Date, revokedAt:Date, expiresAt:Date,
 termsVersion:{type:String,default:'manager-intelligence-v1'},
 emailEnabled:{type:Boolean,default:false},
 lastDeliveredWeek:String,
}, {timestamps:true});
schema.index({orgId:1,teamId:1,managerUserId:1},{unique:true});
export default mongoose.models.ManagerReportAssignment || mongoose.model('ManagerReportAssignment',schema);
