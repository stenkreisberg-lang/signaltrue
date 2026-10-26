import mongoose from 'mongoose';

const managerInvitationSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ManagerAssignment', required: true, index: true },
  recipientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientEmailHash: { type: String, required: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date, declinedAt: Date, deliveredAt: Date, attempts: { type: Number, default: 0 },
}, { timestamps: true });
managerInvitationSchema.index({ assignmentId: 1, createdAt: -1 });
export default mongoose.models.ManagerInvitation || mongoose.model('ManagerInvitation', managerInvitationSchema);
