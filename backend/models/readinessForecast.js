import mongoose from 'mongoose';

const readinessForecastSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  week: { type: String, required: true },
  engagementRisk: Number,
  confidence: Number,
  keyFactors: [String]
}, { timestamps: true });

readinessForecastSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('ReadinessForecast', readinessForecastSchema);
