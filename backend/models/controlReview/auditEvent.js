import mongoose from 'mongoose';

/**
 * AuditEvent — immutable log of user and system actions (spec §27.3).
 *
 * Every Evidence Pack export, every role change, every material case or
 * configuration change lands here. The schema refuses updates and deletes so
 * the trail cannot be quietly rewritten.
 */
const auditEventSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorEmail: { type: String, default: '' },
    actorRole: { type: String, default: '' },
    // SYSTEM for scheduled calculation; USER for anything a person did.
    actorType: { type: String, enum: ['USER', 'SYSTEM'], default: 'USER' },

    action: { type: String, required: true, index: true },
    objectType: { type: String, required: true, index: true },
    objectId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },

    timestamp: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    ipAddress: { type: String, default: '' },
    userAgent: { type: String, default: '' },
  },
  { timestamps: false, capped: false }
);

auditEventSchema.index({ tenantId: 1, timestamp: -1 });
auditEventSchema.index({ tenantId: 1, objectType: 1, objectId: 1, timestamp: -1 });

const IMMUTABLE = 'AuditEvent is immutable (spec §27.3).';

// Thrown rather than passed to `next`, so the guard holds for both callback and
// promise-style query middleware.
function blockMutation() {
  throw new Error(IMMUTABLE);
}

for (const hook of [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'deleteOne',
  'deleteMany',
  'findOneAndDelete',
  'replaceOne',
]) {
  auditEventSchema.pre(hook, blockMutation);
}

auditEventSchema.pre('save', function blockResave() {
  if (!this.isNew) throw new Error(IMMUTABLE);
});

/**
 * The only sanctioned removal path: expiry under the tenant's configured
 * retention policy, or clearing a demo tenant. Writes through the driver so the
 * immutability hooks stay in force for every ordinary code path, and the intent
 * is visible at the call site.
 */
auditEventSchema.statics.purgeForRetention = function purgeForRetention(filter, { reason }) {
  if (!reason) throw new Error('Purging audit events requires a documented reason.');
  return this.collection.deleteMany(filter);
};

export default mongoose.models.ControlReviewAuditEvent ||
  mongoose.model('ControlReviewAuditEvent', auditEventSchema);
