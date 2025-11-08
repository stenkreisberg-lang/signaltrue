import mongoose from 'mongoose';

const recognitionMetricsSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true },
  date: { type: Date, required: true },
  recognitionsPerFTE: Number,
  recognitionCount: { type: Number, required: true },
  giverReceiverRatio: Number,
  details: { type: Object },
  distributionEquity: Number,
  heatmap: Object,
  aiTip: String
}, { timestamps: true });

recognitionMetricsSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('RecognitionMetrics', recognitionMetricsSchema);
