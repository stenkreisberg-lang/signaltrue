import mongoose from 'mongoose';

/**
 * OperationalOutcome — the independent labels the manager-overload signal is
 * validated against (delivery + people outcomes). This is what turns SignalTrue
 * from "another dashboard" into a closed observe→act→re-measure loop.
 *
 * See docs/PIVOT_REPORT_SPEC.md §1.3 / §6.
 *
 * `source` distinguishes what is computed now (delivery, from task WorkEvents)
 * from what needs an external connector (attrition/absence, from HRIS).
 */
const operationalOutcomeSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    managerHash: { type: String, default: null, index: true },
    weekStart: { type: String, required: true, index: true },

    family: {
      type: String,
      enum: ['delivery', 'people', 'employee_reported', 'manager_validation'],
      required: true,
    },
    source: { type: String, enum: ['workevents', 'hris', 'jira', 'linear', 'survey', 'manual'], required: true },

    // Delivery metrics (computed from task WorkEvents)
    cycleTimeMedianHours: Number,
    reopenRate: Number, // reopened / completed
    throughput: Number, // tasks completed

    // People metrics (HRIS connector)
    voluntaryExits: Number,
    absenceDays: Number,

    // Generic value + label for survey/manager-validation rows
    value: Number,
    label: String,

    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    dataQualityVersion: { type: String, default: '1.0.0' },
  },
  { timestamps: true }
);

operationalOutcomeSchema.index({ orgId: 1, teamId: 1, weekStart: 1, family: 1 });

export default mongoose.models.OperationalOutcome ||
  mongoose.model('OperationalOutcome', operationalOutcomeSchema);
