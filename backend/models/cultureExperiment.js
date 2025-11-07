import mongoose from 'mongoose';

const cultureExperimentSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  name: { type: String, required: true },
  startDate: Date,
  endDate: Date,
  metrics: [String], // e.g. ['energy', 'recognition', 'focus']
  preSnapshot: Object,
  postSnapshot: Object,
  resultDelta: Object,
  notes: String
}, { timestamps: true });

export default mongoose.model('CultureExperiment', cultureExperimentSchema);
