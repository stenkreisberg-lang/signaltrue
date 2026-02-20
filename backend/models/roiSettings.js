/**
 * ROI Settings Model
 * Organization-level settings for ROI calculations
 */

import mongoose from 'mongoose';

const roiSettingsSchema = new mongoose.Schema({
  // Organization reference
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    unique: true,
    index: true
  },
  
  // Currency settings
  currency: {
    type: String,
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY', 'INR'],
    default: 'USD'
  },
  currencySymbol: {
    type: String,
    default: '$'
  },
  
  // Salary and cost inputs
  averageSalary: {
    type: Number,
    default: 75000, // Annual salary
    min: 0
  },
  averageHourlyCost: {
    type: Number,
    default: null // Calculated from salary if not provided
  },
  
  // Team/org size
  teamSize: {
    type: Number,
    default: 10,
    min: 1
  },
  
  // Working time settings
  workingDaysPerYear: {
    type: Number,
    default: 250,
    min: 1,
    max: 365
  },
  hoursPerDay: {
    type: Number,
    default: 8,
    min: 1,
    max: 24
  },
  
  // Cost calculation factors
  overheadMultiplier: {
    type: Number,
    default: 1.3, // 30% overhead on top of salary
    min: 1
  },
  
  // Metric-specific cost factors
  costFactors: {
    // Cost per hour of excess meeting time
    meetingHourCost: {
      type: Number,
      default: null // Derived from hourly cost
    },
    // Cost per day of decision delay
    decisionDelayCostPerDay: {
      type: Number,
      default: null // Derived from daily cost
    },
    // Cost per percentage point of focus time lost
    focusTimeLossCostPerPct: {
      type: Number,
      default: null
    },
    // Cost per attrition event (turnover)
    turnoverCost: {
      type: Number,
      default: null // Default: 1.5x annual salary
    }
  },
  
  // Display preferences
  showROIOverlay: {
    type: Boolean,
    default: true
  },
  roiPeriod: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly'
  },
  
  // Last updated tracking
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Calculate derived values before saving
roiSettingsSchema.pre('save', function(next) {
  const hoursPerYear = this.workingDaysPerYear * this.hoursPerDay;
  
  // Calculate hourly cost if not provided
  if (!this.averageHourlyCost) {
    this.averageHourlyCost = Math.round((this.averageSalary * this.overheadMultiplier) / hoursPerYear);
  }
  
  // Calculate cost factors
  if (!this.costFactors.meetingHourCost) {
    this.costFactors.meetingHourCost = this.averageHourlyCost;
  }
  
  if (!this.costFactors.decisionDelayCostPerDay) {
    this.costFactors.decisionDelayCostPerDay = Math.round(this.averageHourlyCost * this.hoursPerDay);
  }
  
  if (!this.costFactors.focusTimeLossCostPerPct) {
    // Cost of 1% focus time loss per person per week
    this.costFactors.focusTimeLossCostPerPct = Math.round(this.averageHourlyCost * this.hoursPerDay * 5 * 0.01);
  }
  
  if (!this.costFactors.turnoverCost) {
    this.costFactors.turnoverCost = Math.round(this.averageSalary * 1.5);
  }
  
  // Set currency symbol
  const symbols = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', CHF: 'CHF', JPY: '¥', INR: '₹'
  };
  this.currencySymbol = symbols[this.currency] || '$';
  
  next();
});

// Static method to get or create settings for an org
roiSettingsSchema.statics.getOrCreate = async function(orgId) {
  let settings = await this.findOne({ orgId });
  
  if (!settings) {
    settings = new this({ orgId });
    await settings.save();
  }
  
  return settings;
};

export default mongoose.model('ROISettings', roiSettingsSchema);
