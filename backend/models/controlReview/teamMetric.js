import mongoose from 'mongoose';
import { P0_METRICS, DATA_QUALITY, ALGORITHM_VERSION } from './constants.js';

/**
 * TeamMetric — one work-pattern metric aggregated over one period (spec §26).
 *
 * This is the only layer the rest of the module reads from. Individual-level
 * intermediates are computed inside the metrics service and never persisted
 * here: a stored row is already team-level and already privacy-gated.
 */
const teamMetricSchema = new mongoose.Schema(
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
    periodType: { type: String, enum: ['WEEK', 'CUSTOM'], default: 'WEEK' },

    value: { type: Number, default: null },

    // Supporting detail shown in the UI, e.g. longest uninterrupted block or
    // per-channel split for Coordination Channel Load.
    components: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Distinct people contributing. Drives the minimum-group-size gate.
    contributorCount: { type: Number, default: 0 },
    groupSize: { type: Number, default: 0 },

    // Fraction of expected connector days present for this period.
    dataCoverage: { type: Number, default: 0 },
    dataQuality: { type: String, enum: DATA_QUALITY, default: 'INSUFFICIENT' },

    suppressed: { type: Boolean, default: false, index: true },
    suppressionReason: { type: String, default: '' },

    sources: [{ type: String }],
    algorithmVersion: { type: String, default: ALGORITHM_VERSION },
  },
  { timestamps: true }
);

teamMetricSchema.index(
  { tenantId: 1, teamId: 1, metric: 1, periodStart: 1 },
  { unique: true }
);

export default mongoose.models.TeamWorkPatternMetric ||
  mongoose.model('TeamWorkPatternMetric', teamMetricSchema);
