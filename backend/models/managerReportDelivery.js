import mongoose from 'mongoose';

const managerReportDeliverySchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  managerUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  weekKey: { type: String, required: true },
  templateVersion: { type: String, default: 'manager-intelligence-1' },
  status: { type: String, enum: ['claimed', 'sent', 'delivered', 'bounced', 'failed', 'cancelled', 'unknown'], default: 'claimed' },
  providerMessageId: String, attemptCount: { type: Number, default: 0 },
  lastErrorCode: String, sentAt: Date, claimedAt: Date,
}, { timestamps: true });
managerReportDeliverySchema.index({ orgId: 1, managerUserId: 1, weekKey: 1, templateVersion: 1 }, { unique: true });
export default mongoose.models.ManagerReportDelivery || mongoose.model('ManagerReportDelivery', managerReportDeliverySchema);
