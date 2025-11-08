import mongoose from 'mongoose';

const focusInterruptionSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true },
  date: { type: Date, required: true },
  focusInterruptionIndex: { type: Number, required: true },
  interruptionScore: { type: Number, required: true },
  totalFocusHours: Number,
  uninterruptedHours: Number,
  details: { type: Object },
  interruptions: [{
    source: String,
    count: Number
  }],
  topSources: [String]
}, { timestamps: true });

focusInterruptionSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('FocusInterruption', focusInterruptionSchema);
