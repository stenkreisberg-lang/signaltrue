import mongoose from 'mongoose';
import {
  DEFAULT_JURISDICTION,
  DEFAULT_TIMEZONE,
  MIN_GROUP_SIZE_DEFAULT,
  PATTERN_DEFAULTS,
  EVALUATION_DEFAULTS,
} from './constants.js';

/**
 * DeploymentConfig — per-tenant trust and calculation settings (spec §21, §22).
 *
 * The Trust Deployment Pack checkpoints live here rather than in a document
 * folder, because connector activation is gated on them: a production customer
 * cannot start ingesting until the pack has been acknowledged.
 */
const checklistItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    required: { type: Boolean, default: true },
    completed: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const deploymentConfigSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      unique: true,
      index: true,
    },

    // Open strings, resolved against the jurisdiction pack registry. An
    // unrecognised code degrades to the global pack rather than being rejected,
    // so a customer in an unmodelled country can still deploy.
    jurisdictions: [{ type: String }],
    primaryJurisdiction: { type: String, default: DEFAULT_JURISDICTION },

    minGroupSize: { type: Number, default: MIN_GROUP_SIZE_DEFAULT },

    defaultTimezone: { type: String, default: DEFAULT_TIMEZONE },

    patternThresholds: { type: mongoose.Schema.Types.Mixed, default: () => ({ ...PATTERN_DEFAULTS }) },
    evaluationDefaults: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({ ...EVALUATION_DEFAULTS }),
    },

    retention: {
      workEventDays: { type: Number, default: 400 },
      metricDays: { type: Number, default: 1095 },
      caseRecordDays: { type: Number, default: 2555 },
      auditEventDays: { type: Number, default: 2555 },
    },

    purposeStatement: { type: String, default: '' },

    trustPack: {
      checklist: { type: [checklistItemSchema], default: [] },
      acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      acknowledgedAt: { type: Date, default: null },
      customerLegalReviewConfirmed: { type: Boolean, default: false },
      workerConsultationCompleted: { type: Boolean, default: false },
    },

    // Blocks connector activation until the trust pack is acknowledged (§36.22).
    connectorsActivated: { type: Boolean, default: false },
    connectorsActivatedAt: { type: Date, default: null },

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.HsDeploymentConfig ||
  mongoose.model('HsDeploymentConfig', deploymentConfigSchema);
