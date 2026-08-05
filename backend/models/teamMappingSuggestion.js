import mongoose from 'mongoose';

const teamMappingSuggestionSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    suggestedTeamName: { type: String, required: true, trim: true },
    suggestedFunction: {
      type: String,
      enum: [
        'Engineering',
        'Product',
        'Design',
        'Marketing',
        'Sales',
        'Support',
        'Operations',
        'Other',
      ],
      default: 'Other',
    },
    confidence: { type: Number, min: 0, max: 100, required: true },
    reason: { type: String, required: true },
    evidence: [{ type: String }],
    sourceUrls: [{ type: String }],
    sourceType: {
      type: String,
      enum: ['directory', 'public_website', 'title_inference', 'ai_title_inference'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'applied', 'rejected', 'skipped'],
      default: 'pending',
      index: true,
    },
    decisionMode: {
      type: String,
      enum: ['admin_approved', 'auto_high_confidence'],
    },
    decisionNote: String,
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    decidedAt: Date,
  },
  { timestamps: true }
);

teamMappingSuggestionSchema.index({ orgId: 1, status: 1, createdAt: -1 });
teamMappingSuggestionSchema.index({ orgId: 1, userId: 1, status: 1 });

export default mongoose.model('TeamMappingSuggestion', teamMappingSuggestionSchema);
