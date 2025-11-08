import mongoose from 'mongoose';

const commHygieneScoreSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true },
  date: { type: Date, required: true },
  hygieneScore: { type: Number, required: true },
  medianReplyTime: Number,
  unansweredThreadsPct: Number,
  reactionCoverage: Number,
  details: { type: Object },
  kpis: {
    medianReplyTime: Number,
    unansweredThreadsPct: Number,
    reactionCoverage: Number
  }
}, { timestamps: true });

commHygieneScoreSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('CommHygieneScore', commHygieneScoreSchema);
