import mongoose from 'mongoose';
import crypto from 'node:crypto';

const invitationSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  role: { type: String, enum: ['hr_admin','it_admin','team_member'], required: true },
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true, index: true },
  acceptedAt: { type: Date },
  expiresAt: { type: Date, required: true },
  meta: { type: Object, default: {} }
}, { timestamps: true });

invitationSchema.statics.createWithToken = async function({ email, role, orgId, teamId, invitedBy, ttlHours = 168 }) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return this.create({ email, role, orgId, teamId, invitedBy, token, expiresAt });
};

export default mongoose.model('Invitation', invitationSchema);
