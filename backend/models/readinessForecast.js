import mongoose from 'mongoose';

const readinessForecastSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  forecastDate: { type: Date, required: true },
  week: { type: String, required: true },
  readinessScore: { type: Number, required: true },
  engagementRisk: Number,
  factors: { type: Object },
  confidence: Number,
  notes: { type: String },
  keyFactors: [String],
  status: { type: String, enum: ['predicted', 'actual'], default: 'predicted' }
}, { timestamps: true });

readinessForecastSchema.index({ teamId: 1, week: 1 }, { unique: true });

export default mongoose.model('ReadinessForecast', readinessForecastSchema);
