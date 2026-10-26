import mongoose from 'mongoose';

const managerAssignmentSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  managerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  status: { type: String, enum: ['pending', 'invited', 'active', 'declined', 'expired', 'suspended', 'revoked'], default: 'pending', index: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  approvedAt: { type: Date, default: Date.now },
  invitedAt: Date, activatedAt: Date, revokedAt: Date, expiresAt: Date,
  weeklyEmailEnabled: { type: Boolean, default: true },
  exportEnabled: { type: Boolean, default: false },
  preferenceUpdatedAt: Date,
  acceptedTermsVersion: String,
  acceptedAt: Date,
  lastInviteSentAt: Date,
}, { timestamps: true });
managerAssignmentSchema.index({ orgId: 1, managerUserId: 1, teamId: 1 }, { unique: true });
export default mongoose.models.ManagerAssignment || mongoose.model('ManagerAssignment', managerAssignmentSchema);
