import mongoose from 'mongoose';

const commHygieneScoreSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true },
  hygieneScore: { type: Number, required: true },
  medianReplyTime: Number,
  unansweredThreadsPct: Number,
  reactionCoverage: Number,
  kpis: {
    medianReplyTime: Number,
    unansweredThreadsPct: Number,
    reactionCoverage: Number
  }
}, { timestamps: true });

commHygieneScoreSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('CommHygieneScore', commHygieneScoreSchema);
