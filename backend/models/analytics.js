import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    eventName: { type: String, required: true },
    payload: { type: Object, default: {} },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: false },
  },
  { timestamps: true }
);

// TTL: expire analytics documents after 90 days to limit storage growth.
analyticsSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

export default mongoose.model("Analytics", analyticsSchema);
