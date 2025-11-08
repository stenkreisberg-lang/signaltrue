import mongoose from 'mongoose';

const slackNudgeSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  userId: { type: String, required: true },
  nudgeType: { type: String, required: true },
  message: { type: String },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' }
}, { timestamps: true });

export default mongoose.model('SlackNudge', slackNudgeSchema);
