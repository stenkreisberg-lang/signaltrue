import mongoose from 'mongoose';

const STUDY_KEYS = [
  'connector_accuracy',
  'measurement_reliability',
  'construct_validation',
  'network_map_validation',
  'longitudinal_validation',
  'intervention_effectiveness',
  'external_validation',
  'independent_review',
];

const validationStudySchema = new mongoose.Schema(
  {
    studyKey: {
      type: String,
      enum: STUDY_KEYS,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['planned', 'protocol_ready', 'collecting', 'analyzing', 'completed', 'paused'],
      default: 'planned',
      required: true,
    },
    protocolVersion: { type: String, default: 'draft' },
    protocolUrl: String,
    preregistrationUrl: String,
    startedAt: Date,
    completedAt: Date,
    publicSummary: String,
    limitations: [{ type: String }],
    sample: {
      organizations: { type: Number, min: 0, default: 0 },
      teams: { type: Number, min: 0, default: 0 },
      observations: { type: Number, min: 0, default: 0 },
    },
    externalReview: {
      organization: String,
      reportUrl: String,
      completedAt: Date,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true, strict: 'throw' }
);

export default mongoose.models.ValidationStudy ||
  mongoose.model('ValidationStudy', validationStudySchema);
