import mongoose from 'mongoose';
import crypto from 'node:crypto';

const apiKeySchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true, required: true },
  name: { type: String, required: true },
  keyHash: { type: String, required: true, unique: true }, // SHA256 hash of the key
  lastUsed: { type: Date },
  usageCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date },
}, { timestamps: true });

// Static method to generate and hash a new API key
apiKeySchema.statics.generateKey = function() {
  const key = 'st_' + crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash };
};

export default mongoose.model('ApiKey', apiKeySchema);
