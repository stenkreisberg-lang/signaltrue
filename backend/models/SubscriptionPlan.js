import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    enum: ['team', 'leadership', 'custom'],
    index: true
  },
  name: {
    type: String,
    required: true
  },
  priceEUR: {
    type: Number,
    default: null // null for custom pricing
  },
  features: {
    weeklyReports: {
      type: Boolean,
      default: false
    },
    monthlyReportsHR: {
      type: Boolean,
      default: false
    },
    monthlyReportsLeadership: {
      type: Boolean,
      default: false
    },
    aiTactical: {
      type: Boolean,
      default: false
    },
    aiStrategic: {
      type: Boolean,
      default: false
    },
    industryBenchmarks: {
      type: Boolean,
      default: false
    },
    orgComparisons: {
      type: Boolean,
      default: false
    },
    customModels: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Method to check if a feature is enabled
subscriptionPlanSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true;
};

// Static method to get plan by ID
subscriptionPlanSchema.statics.getByPlanId = async function(planId) {
  return await this.findOne({ planId, isActive: true });
};

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
