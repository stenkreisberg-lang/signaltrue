import mongoose from 'mongoose';

const validationEvidenceSchema = new mongoose.Schema(
  {
    studyKey: {
      type: String,
      enum: [
        'connector_accuracy',
        'measurement_reliability',
        'construct_validation',
        'network_map_validation',
        'longitudinal_validation',
        'intervention_effectiveness',
        'external_validation',
        'independent_review',
      ],
      required: true,
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
      default: null,
    },
    evidenceType: {
      type: String,
      enum: [
        'connector_reconciliation',
        'repeatability',
        'missing_data_sensitivity',
        'survey_comparison',
        'network_ground_truth',
        'prospective_outcome',
        'intervention_outcome',
        'external_replication',
        'independent_audit',
      ],
      required: true,
    },
    metricKey: { type: String, required: true, trim: true, maxlength: 120 },
    dataDefinition: { type: String, required: true, trim: true, maxlength: 2000 },
    supportsClaim: { type: String, required: true, trim: true, maxlength: 2000 },
    doesNotSupport: { type: String, required: true, trim: true, maxlength: 2000 },
    sourceSystems: [{ type: String, trim: true, maxlength: 80 }],
    period: {
      start: Date,
      end: Date,
    },
    sample: {
      organizations: { type: Number, min: 0, default: 0 },
      teams: { type: Number, min: 0, default: 0 },
      observations: { type: Number, min: 0, default: 0 },
    },
    result: {
      value: Number,
      unit: { type: String, maxlength: 80 },
      numerator: Number,
      denominator: Number,
      intervalLow: Number,
      intervalHigh: Number,
    },
    modelVersion: { type: String, trim: true, maxlength: 80 },
    evidenceLevel: {
      type: String,
      enum: ['internal', 'external'],
      default: 'internal',
    },
    externalReference: {
      organization: { type: String, trim: true, maxlength: 200 },
      reportUrl: { type: String, trim: true, maxlength: 1000 },
    },
    reviewStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: Date,
  },
  { timestamps: true, strict: 'throw' }
);

validationEvidenceSchema.index({ orgId: 1, studyKey: 1, createdAt: -1 });
validationEvidenceSchema.index({ studyKey: 1, reviewStatus: 1, evidenceLevel: 1 });

export default mongoose.models.ValidationEvidence ||
  mongoose.model('ValidationEvidence', validationEvidenceSchema);
