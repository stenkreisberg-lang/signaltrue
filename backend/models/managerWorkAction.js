import mongoose from 'mongoose';

const managerWorkActionSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true, maxlength: 180 },
  hypothesis: { type: String, maxlength: 1000 },
  metric: { type: String, enum: ['meetingsPerRepresentedPerson'], required: true },
  direction: { type: String, enum: ['decrease', 'increase', 'stabilize'], required: true },
  baseline: { type: Number, default: null },
  baselineWeek: String, baselineMeasurement: { type: String, default: 'meeting-instances-per-mapped-actor-v1' },
  startDate: { type: Date, default: Date.now }, due14: Date, due28: Date,
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  outcome14: { value: Number, status: String, measuredAt: Date },
  outcome28: { value: Number, status: String, measuredAt: Date },
}, { timestamps: true });
managerWorkActionSchema.index({ orgId: 1, teamId: 1, createdAt: -1 });
export default mongoose.models.ManagerWorkAction || mongoose.model('ManagerWorkAction', managerWorkActionSchema);
