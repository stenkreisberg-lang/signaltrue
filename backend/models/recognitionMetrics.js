import mongoose from 'mongoose';

const recognitionMetricsSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true },
  recognitionsPerFTE: Number,
  giverReceiverRatio: Number,
  distributionEquity: Number,
  heatmap: Object,
  aiTip: String
}, { timestamps: true });

recognitionMetricsSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('RecognitionMetrics', recognitionMetricsSchema);
