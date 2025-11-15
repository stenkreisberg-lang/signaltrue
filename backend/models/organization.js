import mongoose from 'mongoose';
import { encryptString, decryptString } from '../utils/crypto.js';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    set: encryptString,
    get: decryptString
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  industry: {
    type: String,
    required: true,
    trim: true
  },
  industryAverages: {
    type: Object,
    default: {}
  },
  data_region: {
    type: String,
    enum: ['EU', 'US', 'Other'],
    default: 'EU',
    required: true
  },
  data_retention_days: {
    type: Number,
    enum: [30, 90, 180],
    default: 90,
    required: true
  },
  size: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '500+', ''],
    default: ''
  },
  subscription: {
    plan: {
      type: String,
      enum: ['starter', 'professional', 'enterprise', 'trial'],
      default: 'trial'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    expiresAt: Date
  },
  integrations: {
    slack: {
      accessToken: { type: String, default: '' },
      botUserId: { type: String, default: '' },
      team: { type: Object, default: {} },
      authedUser: { type: Object, default: {} },
      sync: {
        lastStatus: { type: String, enum: ['ok','error','disconnected',''], default: '' },
        lastRunAt: { type: Date },
        messagesAnalyzed: { type: Number, default: 0 },
        emailsProcessed: { type: Number, default: 0 }
      }
    }
  }
}, { timestamps: true });

// Generate slug from name if not provided
organizationSchema.pre('save', function(next) {
  if (!this.slug || this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

export default mongoose.model('Organization', organizationSchema);
