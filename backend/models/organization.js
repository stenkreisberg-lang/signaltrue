import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
  // Placeholder for future industry averages (for analytics)
  industryAverages: {
    type: Object,
    default: {}
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
  settings: {
    allowRegistration: { type: Boolean, default: false },
    maxUsers: { type: Number, default: 10 },
    features: {
      calendar: { type: Boolean, default: false },
      aiPlaybooks: { type: Boolean, default: false },
      slackIntegration: { type: Boolean, default: true },
      advancedAnalytics: { type: Boolean, default: false }
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
