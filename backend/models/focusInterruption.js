import mongoose from 'mongoose';

const focusInterruptionSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true },
  focusInterruptionIndex: { type: Number, required: true },
  totalFocusHours: Number,
  uninterruptedHours: Number,
  interruptions: [{
    source: String,
    count: Number
  }],
  topSources: [String]
}, { timestamps: true });

focusInterruptionSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('FocusInterruption', focusInterruptionSchema);
