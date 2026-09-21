import mongoose from 'mongoose';

const dimensionSchema = new mongoose.Schema(
  {
    detection: { type: Number, min: 0, max: 100, required: true },
    investigation: { type: Number, min: 0, max: 100, required: true },
    verification: { type: Number, min: 0, max: 100, required: true },
    governance: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, maxlength: 80 },
    dimension: {
      type: String,
      required: true,
      enum: ['detection', 'investigation', 'verification', 'governance'],
    },
    value: { type: Number, min: 0, max: 3, required: true },
    label: { type: String, required: true, maxlength: 240 },
  },
  { _id: false }
);

const controlMaturityAssessmentSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, trim: true, maxlength: 255, unique: true },
    score: { type: Number, min: 0, max: 100, required: true },
    level: {
      type: String,
      required: true,
      enum: ['reactive', 'developing', 'structured', 'continuous'],
    },
    weakestDimension: {
      type: String,
      required: true,
      enum: ['detection', 'investigation', 'verification', 'governance'],
    },
    dimensions: { type: dimensionSchema, required: true },
    answers: { type: [answerSchema], required: true },
    market: { type: String, trim: true, maxlength: 80, default: 'global' },
    sourcePath: { type: String, trim: true, maxlength: 1024, default: '/control-evidence-assessment' },
    attribution: {
      source: { type: String, trim: true, maxlength: 255 },
      medium: { type: String, trim: true, maxlength: 255 },
      campaign: { type: String, trim: true, maxlength: 255 },
      content: { type: String, trim: true, maxlength: 255 },
      term: { type: String, trim: true, maxlength: 255 },
      referrer: { type: String, trim: true, maxlength: 2048 },
    },
    email: { type: String, trim: true, lowercase: true, maxlength: 320 },
    organization: { type: String, trim: true, maxlength: 200 },
    role: { type: String, trim: true, maxlength: 160 },
    consentGiven: { type: Boolean, default: false },
    claimedAt: Date,
  },
  { timestamps: true }
);

controlMaturityAssessmentSchema.index({ createdAt: -1 });
controlMaturityAssessmentSchema.index({ market: 1, createdAt: -1 });
controlMaturityAssessmentSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model('ControlMaturityAssessment', controlMaturityAssessmentSchema);
