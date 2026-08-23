import mongoose from 'mongoose';

const managerCoachingEventSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    managerHash: { type: String, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    insightId: { type: String, required: true, index: true },
    signalKey: { type: String, required: true },
    eventType: {
      type: String,
      required: true,
      enum: [
        'shown',
        'opened',
        'acknowledged',
        'dismissed',
        'remind_later',
        'experiment_started',
        'experiment_completed',
        'feedback_useful',
        'feedback_not_useful',
      ],
    },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    occurredAt: { type: Date, default: Date.now, required: true },
    metadata: {
      scoringVersion: String,
      confidence: { type: String, enum: ['high', 'medium', 'low'] },
      experimentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Intervention' },
    },
  },
  { timestamps: true }
);

managerCoachingEventSchema.index(
  { orgId: 1, managerHash: 1, insightId: 1, eventType: 1 },
  { unique: true }
);
managerCoachingEventSchema.index({ orgId: 1, managerHash: 1, occurredAt: -1 });

export default mongoose.models.ManagerCoachingEvent ||
  mongoose.model('ManagerCoachingEvent', managerCoachingEventSchema);
