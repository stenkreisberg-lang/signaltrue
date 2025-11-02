import mongoose from 'mongoose';

const timelineEventSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
  date: { type: Date, required: true, index: true },
  label: { type: String, required: true }, // e.g. "Product Launch", "Reorg"
  description: { type: String, default: '' },
  category: { type: String, enum: ['launch','reorg','policy','external','other'], default: 'other' },
}, { timestamps: true });

export default mongoose.model('TimelineEvent', timelineEventSchema);
