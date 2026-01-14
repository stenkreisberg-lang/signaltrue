import mongoose from 'mongoose';

const assessmentSubmissionSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  sessionId: {
    type: String,
    required: true
  },
  result: {
    riskScore: {
      total: Number,
      level: {
        type: String,
        enum: ['low', 'emerging', 'high']
      },
      factors: {
        meetingLoad: Number,
        fragmentation: Number,
        afterHoursWork: Number,
        focusTimeLoss: Number
      }
    },
    costBreakdown: {
      loadedHourlyRate: Number,
      weeklyMeetingCost: Number,
      annualMeetingCost: Number,
      meetingWasteCost: Number,
      turnoverExposureLow: Number,
      turnoverExposureHigh: Number,
      totalCostLow: Number,
      totalCostHigh: Number
    },
    assumptions: {
      salary: Number,
      overheadMultiplier: Number,
      meetingWastePercent: Number,
      attritionPercent: Number,
      replacementMultiplier: Number
    },
    insights: [String]
  },
  inputs: {
    company: {
      teamSize: Number,
      averageSalary: Number,
      overheadMultiplier: Number
    },
    workload: {
      meetingHoursPerWeek: Number,
      backToBackFrequency: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      afterHoursPerWeek: Number
    },
    retention: {
      attritionPercent: Number,
      roleType: {
        type: String,
        enum: ['professional', 'manager', 'custom']
      },
      customReplacementCost: Number
    }
  },
  consentGiven: {
    type: Boolean,
    required: true
  },
  source: {
    type: String,
    default: 'how-it-works'
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: true
});

// Index for quick lookups
assessmentSubmissionSchema.index({ email: 1 });
assessmentSubmissionSchema.index({ sessionId: 1 });
assessmentSubmissionSchema.index({ createdAt: -1 });
assessmentSubmissionSchema.index({ 'result.riskScore.level': 1 });

export default mongoose.model('AssessmentSubmission', assessmentSubmissionSchema);
