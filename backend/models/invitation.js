import mongoose from 'mongoose';
import crypto from 'node:crypto';

const invitationSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, trim: true },
    role: { type: String, enum: ['hr_admin', 'it_admin', 'team_member'], required: true },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true, index: true },
    acceptedAt: { type: Date },
    revokedAt: { type: Date },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: { type: Date, required: true },
    delivery: {
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'unconfigured'],
        default: 'pending',
      },
      attemptCount: { type: Number, default: 0 },
      lastAttemptAt: Date,
      sentAt: Date,
      messageId: String,
      error: String,
    },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

invitationSchema.statics.createWithToken = async function ({
  email,
  name,
  role,
  orgId,
  teamId,
  invitedBy,
  ttlHours = 168,
}) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return this.create({ email, name, role, orgId, teamId, invitedBy, token, expiresAt });
};

invitationSchema.methods.rotateToken = function (ttlHours = 168) {
  this.token = crypto.randomBytes(24).toString('hex');
  this.expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  this.revokedAt = undefined;
  this.revokedBy = undefined;
  return this;
};

export default mongoose.model('Invitation', invitationSchema);
