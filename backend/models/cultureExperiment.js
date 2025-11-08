import mongoose from 'mongoose';

const cultureExperimentSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  experimentName: { type: String, required: true },
  name: { type: String, required: true },
  hypothesis: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  metrics: [String], // e.g. ['energy', 'recognition', 'focus']
  outcome: { type: String },
  preSnapshot: Object,
  postSnapshot: Object,
  metricsObj: { type: Object },
  status: { type: String, enum: ['planned', 'active', 'completed'], default: 'planned' },
  resultDelta: Object,
  notes: String
}, { timestamps: true });

export default mongoose.model('CultureExperiment', cultureExperimentSchema);
