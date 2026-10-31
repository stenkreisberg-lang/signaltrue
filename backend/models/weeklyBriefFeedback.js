import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyBriefSnapshot', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  useful: { type: String, required: true, enum: ['yes', 'no', 'unclear'] },
  novel: { type: Boolean, required: true },
  action: { type: String, required: true, enum: ['investigate', 'record', 'none'] },
  note: { type: String, maxlength: 500, default: '' },
}, { timestamps: true });
schema.index({ orgId: 1, userId: 1, snapshotId: 1 }, { unique: true });
export default mongoose.models.WeeklyBriefFeedback ||
  mongoose.model('WeeklyBriefFeedback', schema);
