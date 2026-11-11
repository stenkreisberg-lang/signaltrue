import mongoose from 'mongoose';

const weeklyWorkReviewSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
  teamName: { type: String, required: true },
  reportVersion: { type: String, required: true },
  snapshotId: { type: mongoose.Schema.Types.ObjectId, ref: 'WeeklyBriefSnapshot', required: true },
  metricKey: { type: String, required: true },
  metricUnit: { type: String, required: true },
  baselineValue: { type: Number, required: true },
  baselinePeriod: { type: Date, required: true },
  baselineContributors: { type: Number, required: true },
  title: { type: String, required: true, maxlength: 160 },
  hypothesis: { type: String, required: true, maxlength: 600 },
  ownerName: { type: String, required: true, maxlength: 120 },
  successCondition: { type: String, required: true, maxlength: 360 },
  startDate: { type: Date, required: true, default: Date.now },
  reviewDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'review_due', 'completed'], default: 'active' },
  reviews: [{
    reviewedAt: { type: Date, required: true },
    measuredPeriod: Date,
    currentValue: Number,
    baselineValue: Number,
    currentContributors: Number,
    comparability: { type: String, enum: ['measured', 'not_comparable', 'missing_data'], required: true },
    reason: String,
    decision: { type: String, enum: ['continue', 'adjust', 'close', 'investigate'], required: true },
    note: { type: String, maxlength: 600 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

weeklyWorkReviewSchema.index({ orgId: 1, reviewDate: 1 });
export default mongoose.model('WeeklyWorkReview', weeklyWorkReviewSchema);
