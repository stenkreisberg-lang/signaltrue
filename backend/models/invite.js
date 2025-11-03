import mongoose from 'mongoose';

const inviteSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['it_admin', 'hr_admin', 'team_member'], required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' },
  token: { type: String, required: true, unique: true },
  expiry: { type: Date, required: true },
  inviterName: { type: String },
  companyName: { type: String },
}, { timestamps: true });

export default mongoose.model('Invite', inviteSchema);
