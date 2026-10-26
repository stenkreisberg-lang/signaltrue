import mongoose from 'mongoose';
const managerAuditEventSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  actorUserId: mongoose.Schema.Types.ObjectId,
  managerUserId: mongoose.Schema.Types.ObjectId,
  teamId: mongoose.Schema.Types.ObjectId,
  assignmentId: mongoose.Schema.Types.ObjectId,
  action: { type: String, required: true },
  recordedAt: { type: Date, default: Date.now },
}, { timestamps: false });
managerAuditEventSchema.index({ orgId: 1, recordedAt: -1 });
export default mongoose.models.ManagerAuditEvent || mongoose.model('ManagerAuditEvent', managerAuditEventSchema);
