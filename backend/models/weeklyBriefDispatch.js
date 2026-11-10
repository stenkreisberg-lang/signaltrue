import mongoose from 'mongoose';

// A stable _id is atomic and unique even when a MongoDB secondary index is not built.
// Ambiguous provider results stay blocked until reconciled; never auto-retry blindly.
const weeklyBriefDispatchSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  periodStart: { type: Date, required: true },
  status: { type: String, enum: ['sending', 'sent', 'unknown'], required: true },
  recipientCount: Number,
  providerMessageId: String,
  lastError: String,
  sentAt: Date,
}, { timestamps: true });

export default mongoose.model('WeeklyBriefDispatch', weeklyBriefDispatchSchema);
