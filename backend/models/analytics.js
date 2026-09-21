import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true },
    payload: { type: Object, default: {} },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: false },
    // Optional source-event time for server-side events discovered after they occurred.
    occurredAt: { type: Date, required: false, index: true },
    // Optional atomic idempotency key for external event sources such as Calendly.
    dedupeKey: { type: String, required: false, trim: true, maxlength: 2048 },
  },
  { timestamps: true }
);

// TTL: expire analytics documents after 90 days to limit storage growth.
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
analyticsSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export default mongoose.model('Analytics', analyticsSchema);
