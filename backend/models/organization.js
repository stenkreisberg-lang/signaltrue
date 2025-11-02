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
  // Stripe billing linkage
  stripeCustomerId: { type: String, index: true },
  stripeSubscriptionId: { type: String, index: true },
  settings: {
    allowRegistration: { type: Boolean, default: false },
    maxUsers: { type: Number, default: 10 },
    alertFrequency: { type: String, enum: ['daily','weekly','off'], default: 'daily' },
    features: {
      calendar: { type: Boolean, default: false },
      aiPlaybooks: { type: Boolean, default: false },
      slackIntegration: { type: Boolean, default: true },
      advancedAnalytics: { type: Boolean, default: false }
    }
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
        messagesAnalyzed: { type: Number, default: 0 }
      }
    },
    google: {
      scope: { type: String, default: '' },
      refreshToken: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      expiry: { type: Date },
      email: { type: String, default: '' },
      user: { type: Object, default: {} },
      lastPulledAt: { type: Date },
      eventsCount: { type: Number, default: 0 },
      sync: {
        lastStatus: { type: String, enum: ['ok','error','disconnected',''], default: '' },
        lastRunAt: { type: Date },
        emailsProcessed: { type: Number, default: 0 }
      }
    },
    microsoft: {
      scope: { type: String, default: '' },
      refreshToken: { type: String, default: '' },
      accessToken: { type: String, default: '' },
      expiry: { type: Date },
      accountEmail: { type: String, default: '' },
      tenant: { type: String, default: '' },
      lastPulledAt: { type: Date },
      user: { type: Object, default: {} },
      tenantId: { type: String, default: '' },
      eventsCount: { type: Number, default: 0 },
      teamsCount: { type: Number, default: 0 },
      sync: {
        lastStatus: { type: String, enum: ['ok','error','disconnected',''], default: '' },
        lastRunAt: { type: Date },
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
