import mongoose from 'mongoose';

const weeklyBriefSnapshotSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    orgName: { type: String, required: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true },
    reportMode: {
      type: String,
      enum: ['setup', 'full'],
      required: true,
      index: true,
    },
    sourceVersion: { type: String, default: 'weekly-brief-v3' },
    generatedAt: { type: Date, required: true, default: Date.now, index: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

weeklyBriefSnapshotSchema.index({ orgId: 1, periodStart: -1 });
weeklyBriefSnapshotSchema.index({ orgId: 1, periodStart: 1 }, { unique: true });

export default mongoose.model('WeeklyBriefSnapshot', weeklyBriefSnapshotSchema);
