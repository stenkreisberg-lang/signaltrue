import mongoose from 'mongoose';

const consentAuditSchema = new mongoose.Schema({
  org_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g. 'consent_given', 'data_accessed'
  endpoint: { type: String },
  timestamp: { type: Date, default: Date.now },
  ip: { type: String },
  user_agent: { type: String },
  details: { type: Object, default: {} }
});

export default mongoose.model('ConsentAudit', consentAuditSchema);
