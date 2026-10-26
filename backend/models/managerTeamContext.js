import mongoose from 'mongoose';
const managerTeamContextSchema=new mongoose.Schema({
 orgId:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},
 teamId:{type:mongoose.Schema.Types.ObjectId,required:true,index:true},
 createdBy:{type:mongoose.Schema.Types.ObjectId,required:true},
 weekStart:{type:Date,required:true},
 tag:{type:String,enum:['launch','planning','offsite','holiday','deadline','reorganization','other'],required:true},
 note:{type:String,maxlength:500},
},{timestamps:true});
managerTeamContextSchema.index({orgId:1,teamId:1,weekStart:-1});
export default mongoose.models.ManagerTeamContext || mongoose.model('ManagerTeamContext',managerTeamContextSchema);
