import mongoose from 'mongoose';

const programImpactSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
  name: { type: String, required: true }, // e.g. "Wellness Week", "4-Day Pilot"
  description: { type: String, default: '' },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],
  // Before/after metrics
  baselineEnergyIndex: { type: Number },
  postEnergyIndex: { type: Number },
  energyDelta: { type: Number },
  roi: { type: String, default: '' }, // qualitative or quantitative
}, { timestamps: true });

export default mongoose.model('ProgramImpact', programImpactSchema);
