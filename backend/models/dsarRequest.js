/**
 * DSARRequest Model
 *
 * Tracks Data Subject Access Requests (GDPR Art. 15/17, CCPA).
 * Every request to export, delete, or rectify personal data is logged here.
 *
 * Lifecycle:
 *   pending → processing → completed | failed
 */

import mongoose from 'mongoose';

const dsarRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    requestType: {
      type: String,
      enum: ['export', 'delete', 'rectify'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    // Signed URL to the exported data package (export requests only)
    exportUrl: {
      type: String,
    },
    exportUrlExpiresAt: {
      type: Date,
    },
    // Freeform notes from the requester
    notes: {
      type: String,
      maxlength: 2000,
    },
    // Who processed this request: admin userId or 'system'
    processedBy: {
      type: String,
    },
    // Error message if status is 'failed'
    errorMessage: {
      type: String,
    },
    // Collections purged / exported (summary)
    summary: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

dsarRequestSchema.index({ userId: 1, requestedAt: -1 });
dsarRequestSchema.index({ orgId: 1, status: 1 });

export default mongoose.model('DSARRequest', dsarRequestSchema);
