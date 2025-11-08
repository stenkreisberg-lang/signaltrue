import mongoose from 'mongoose';

const deiEsgReportSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  reportDate: { type: Date, required: true },
  metrics: { type: Object },
  notes: { type: String },
  status: { type: String, enum: ['draft', 'final'], default: 'draft' }
}, { timestamps: true });

export default mongoose.model('DeiEsgReport', deiEsgReportSchema);
