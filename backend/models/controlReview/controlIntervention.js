import mongoose from 'mongoose';
import {
  INTERVENTION_TYPES,
  INTERVENTION_STATUSES,
  EXPECTED_DIRECTIONS,
  P0_METRICS,
  EVALUATION_DEFAULTS,
} from './constants.js';

/**
 * ControlIntervention — the action the organisation chose (spec §15).
 *
 * Named separately from the legacy `Intervention` model, which hangs off
 * signals rather than control review cases.
 *
 * expectedEffects must be recorded before the post period is reviewed. That is
 * what makes the later comparison a test rather than a story told afterwards.
 */
const expectedEffectSchema = new mongoose.Schema(
  {
    metric: { type: String, enum: P0_METRICS, required: true },
    direction: { type: String, enum: EXPECTED_DIRECTIONS, required: true },
    rationale: { type: String, default: '' },
  },
  { _id: false }
);

const controlInterventionSchema = new mongoose.Schema(
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

    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    interventionType: { type: String, enum: INTERVENTION_TYPES, required: true },

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    affectedTeamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }],

    implementationDate: { type: Date, required: true, index: true },
    implementationConfirmed: { type: Boolean, default: false },
    implementationBufferDays: {
      type: Number,
      default: EVALUATION_DEFAULTS.implementationBufferDays,
    },
    prePeriodDays: { type: Number, default: EVALUATION_DEFAULTS.prePeriodDays },
    postPeriodDays: { type: Number, default: EVALUATION_DEFAULTS.postPeriodDays },
    sustainabilityPeriods: { type: Number, default: EVALUATION_DEFAULTS.sustainabilityPeriods },

    // Required before status may leave PLANNED.
    expectedEffects: { type: [expectedEffectSchema], default: [] },
    expectedEffectsRecordedAt: { type: Date, default: null },
    expectedEffectsRecordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    reviewDate: { type: Date, index: true },

    status: { type: String, enum: INTERVENTION_STATUSES, default: 'PLANNED', index: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

controlInterventionSchema.index({ tenantId: 1, status: 1, reviewDate: 1 });

// Thrown rather than passed to `next`, so the guard holds for both callback and
// promise-style document middleware.
controlInterventionSchema.pre('validate', function requireExpectedEffects() {
  if (this.status !== 'PLANNED' && this.status !== 'CANCELLED') {
    if (!this.expectedEffects || this.expectedEffects.length === 0) {
      throw new Error(
        'Expected effects must be recorded before a control moves beyond planning (spec §15.1).'
      );
    }
  }
});

export default mongoose.models.ControlIntervention ||
  mongoose.model('ControlIntervention', controlInterventionSchema);
