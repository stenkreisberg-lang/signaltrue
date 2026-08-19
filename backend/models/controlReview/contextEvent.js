import mongoose from 'mongoose';
import { CONTEXT_EVENT_TYPES } from './constants.js';

/**
 * ContextEvent — known organisational context (spec §12).
 *
 * The same work pattern means different things during a launch, a quarter end
 * or an incident. P0 displays context beside the metric change rather than
 * silently normalising it away.
 */
const contextEventSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    eventType: { type: String, enum: CONTEXT_EVENT_TYPES, required: true, index: true },
    // Empty teamIds means the context applies across the organisation.
    teamIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true }],
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

contextEventSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });

export default mongoose.models.ContextEvent || mongoose.model('ContextEvent', contextEventSchema);
