import mongoose from 'mongoose';

/**
 * A reader's response to a weekly brief.
 *
 * Zero logged actions has several very different causes — nothing worth acting
 * on, acted on outside the tool, or nobody reading — and they call for opposite
 * fixes. One click from the brief separates them, and doubles as the only
 * structured usefulness feedback the product collects.
 */
const briefResponseSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    // Week the brief covered, as an ISO week key such as '2026-W34'.
    weekKey: {
      type: String,
      required: true,
      index: true,
    },
    response: {
      type: String,
      enum: [
        'useful', // worth reading
        'not_useful', // read it, did not help
        'nothing_to_act_on', // read it, correctly quiet this week
        'acted_outside_tool', // acted, but not recorded as an action
      ],
      required: true,
    },
    // Set when the responder followed a signed link rather than being signed in.
    viaEmail: {
      type: Boolean,
      default: false,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: {
      type: String,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

briefResponseSchema.index({ orgId: 1, weekKey: 1, response: 1 });

export default mongoose.model('BriefResponse', briefResponseSchema);
