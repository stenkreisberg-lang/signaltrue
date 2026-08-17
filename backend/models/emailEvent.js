import mongoose from 'mongoose';

/**
 * Delivery and engagement events for emails we send.
 *
 * "Sent" is where our knowledge used to end, so a brief that nobody opened
 * looked exactly like one that was read and acted on. These events come from
 * the provider webhook and close that gap.
 *
 * No message content is stored — only which email, to which organization, and
 * what happened to it.
 */
const emailEventSchema = new mongoose.Schema(
  {
    // Provider message id, so every event for one email groups together.
    providerMessageId: {
      type: String,
      index: true,
    },
    // What kind of email this was, e.g. 'weekly-brief', 'monthly-report'.
    emailType: {
      type: String,
      index: true,
    },
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    // Recipient is stored hashed: engagement is measurable without keeping a
    // list of who was mailed what.
    recipientHash: {
      type: String,
    },
    event: {
      type: String,
      enum: [
        'sent',
        'delivered',
        'delivery_delayed',
        'opened',
        'clicked',
        'bounced',
        'complained',
        'failed',
      ],
      required: true,
      index: true,
    },
    // For clicks: which link, so we learn what people actually pursue.
    linkUrl: {
      type: String,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

emailEventSchema.index({ orgId: 1, emailType: 1, event: 1, occurredAt: -1 });

export default mongoose.model('EmailEvent', emailEventSchema);
