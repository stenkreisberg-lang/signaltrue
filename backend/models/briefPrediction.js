/**
 * BriefPrediction Model
 * One falsifiable prediction per weekly brief, graded in the following week's brief.
 * Powers the self-grading "track record" section — a system that shows its
 * predictions came true builds compounding trust.
 */

import mongoose from 'mongoose';

const briefPredictionSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    // Week the prediction was made in (start of the report window)
    weekStart: { type: Date, required: true, index: true },

    // Machine-gradable definition
    metric: {
      type: String,
      required: true,
      // e.g. 'meetingHours', 'afterHoursRatioPct', 'meetings', 'messages', 'focusTimeAvailability'
    },
    comparator: {
      type: String,
      enum: ['gte', 'lte'],
      required: true,
    },
    threshold: { type: Number, required: true },
    // Value of the metric when the prediction was made
    baselineValue: { type: Number },

    // Human-readable statement shown in the report
    statement: { type: String, required: true },

    // Grading (filled by the next week's brief run)
    outcome: {
      evaluated: { type: Boolean, default: false },
      evaluatedAt: { type: Date },
      actualValue: { type: Number },
      held: { type: Boolean },
    },
  },
  { timestamps: true }
);

briefPredictionSchema.index({ orgId: 1, weekStart: -1 });

export default mongoose.model('BriefPrediction', briefPredictionSchema);
