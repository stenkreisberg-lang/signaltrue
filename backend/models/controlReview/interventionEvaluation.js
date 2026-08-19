import mongoose from 'mongoose';
import {
  P0_METRICS,
  DATA_QUALITY,
  EXPECTED_DIRECTIONS,
  ALGORITHM_VERSION,
} from './constants.js';

/**
 * InterventionEvaluation — one metric compared before and after (spec §16.1).
 *
 * `directionMatched` says only that the observed movement matched what the
 * organisation expected. It is not a claim that the control caused it (§16.2).
 */
const interventionEvaluationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ControlReviewCase',
      required: true,
      index: true,
    },
    interventionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ControlIntervention',
      required: true,
      index: true,
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },

    metric: { type: String, enum: P0_METRICS, required: true },
    isExpectedEffect: { type: Boolean, default: false },

    prePeriodValue: { type: Number, default: null },
    postPeriodValue: { type: Number, default: null },
    absoluteChange: { type: Number, default: null },
    relativeChange: { type: Number, default: null },

    expectedDirection: { type: String, enum: [...EXPECTED_DIRECTIONS, 'NOT_SPECIFIED'], default: 'NOT_SPECIFIED' },
    observedDirection: { type: String, enum: ['INCREASE', 'DECREASE', 'NO_CHANGE'], default: 'NO_CHANGE' },
    directionMatched: { type: Boolean, default: null },
    materialChange: { type: Boolean, default: false },

    // §18.1 — did the movement hold through the sustainability window?
    sustained: { type: Boolean, default: null },
    reboundDetected: { type: Boolean, default: false },
    sustainabilityPeriods: [
      {
        periodStart: { type: Date },
        periodEnd: { type: Date },
        value: { type: Number },
        relativeChangeVsPre: { type: Number },
        _id: false,
      },
    ],

    dataQuality: { type: String, enum: DATA_QUALITY, default: 'INSUFFICIENT' },
    dataCoverage: { type: Number, default: 0 },
    // Set when a connector gap or the group-size gate left no comparable data.
    evaluationPossible: { type: Boolean, default: true },
    unavailableReason: { type: String, default: '' },

    analysisPeriod: {
      preStart: { type: Date },
      preEnd: { type: Date },
      bufferStart: { type: Date },
      bufferEnd: { type: Date },
      postStart: { type: Date },
      postEnd: { type: Date },
    },

    algorithmVersion: { type: String, default: ALGORITHM_VERSION },
  },
  { timestamps: true }
);

interventionEvaluationSchema.index(
  { interventionId: 1, teamId: 1, metric: 1 },
  { unique: true }
);

export default mongoose.models.InterventionEvaluation ||
  mongoose.model('InterventionEvaluation', interventionEvaluationSchema);
