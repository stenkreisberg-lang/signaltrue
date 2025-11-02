import mongoose from 'mongoose';

const driftEventSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true, required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  date: { type: Date, index: true, required: true },
  metric: { type: String, enum: ['sentiment','response','meetings','afterHours','network','focus','recovery','energy'], required: true },
  direction: { type: String, enum: ['positive','negative'], required: true },
  magnitude: { type: Number, required: true }, // % change or z-score amplitude
  basis: { type: String, enum: ['percent','zscore'], default: 'percent' },
  details: { type: Object, default: {} },
  acknowledged: { type: Boolean, default: false },
  // Explainability: top contributing metrics
  topContributors: [{ metric: String, change: Number }],
  // Micro-playbook recommendation
  recommendation: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('DriftEvent', driftEventSchema);
