import mongoose from 'mongoose';
import { P0_METRICS, DATA_QUALITY, ALGORITHM_VERSION } from './constants.js';

/**
 * SignalObservation — one metric compared with the team's own baseline (spec §11.3).
 *
 * Deliberately carries no risk score and no severity language. It records how
 * far the current period sits from the team's own history, how long that has
 * held, and how much data was behind it.
 */
const signalObservationSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    metric: { type: String, enum: P0_METRICS, required: true, index: true },

    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true },

    currentValue: { type: Number, default: null },
    baselineValue: { type: Number, default: null },
    absoluteChange: { type: Number, default: null },
    relativeChange: { type: Number, default: null },

    // Median-absolute-deviation distance from the team's own baseline.
    robustDeviationScore: { type: Number, default: null },

    // Consecutive prior periods that also deviated in the same direction.
    persistencePeriods: { type: Number, default: 0 },

    baseline: {
      startDate: { type: Date },
      endDate: { type: Date },
      sampleSize: { type: Number, default: 0 },
      median: { type: Number },
      mad: { type: Number },
      p25: { type: Number },
      p75: { type: Number },
      coverage: { type: Number, default: 0 },
      mature: { type: Boolean, default: false },
    },

    dataCoverage: { type: Number, default: 0 },
    dataQuality: { type: String, enum: DATA_QUALITY, default: 'INSUFFICIENT' },

    // DEVIATION_OBSERVED is the strongest claim this object may make.
    status: {
      type: String,
      enum: [
        'WITHIN_BASELINE',
        'DEVIATION_OBSERVED',
        'SUPPRESSED',
        'INSUFFICIENT_DATA',
        // The value is a rolled-up group figure, displayable but not this
        // team's own signal — so it must never drive a pattern finding.
        'AGGREGATED',
      ],
      default: 'WITHIN_BASELINE',
      index: true,
    },
    direction: { type: String, enum: ['UP', 'DOWN', 'FLAT'], default: 'FLAT' },

    algorithmVersion: { type: String, default: ALGORITHM_VERSION },
  },
  { timestamps: true }
);

signalObservationSchema.index(
  { tenantId: 1, teamId: 1, metric: 1, periodStart: 1 },
  { unique: true }
);

export default mongoose.models.SignalObservation ||
  mongoose.model('SignalObservation', signalObservationSchema);
