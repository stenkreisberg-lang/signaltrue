import mongoose from 'mongoose';

/**
 * Week Context Model
 *
 * Allows HR or managers to tag a week with context that should
 * reduce interpretation confidence when relevant.
 *
 * Examples: planning week, launch week, hiring sprint, offsite, holiday period
 */
const weekContextSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      index: true, // null = org-wide tag
    },

    // Week this tag applies to
    weekStart: {
      type: Date,
      required: true,
      index: true,
    },
    weekEnd: {
      type: Date,
      required: true,
    },

    // Context tag
    tag: {
      type: String,
      required: true,
      enum: [
        'planning_week',
        'launch_week',
        'hiring_sprint',
        'client_workshops',
        'board_prep',
        'offsite',
        'holiday_period',
        'end_of_quarter',
        'reorg',
        'incident_response',
        'other',
      ],
    },

    // Optional description
    description: { type: String },

    // How much this should reduce interpretation confidence
    // e.g., if meetings +35% during tagged "planning week", confidence should drop
    confidenceReduction: {
      type: String,
      enum: ['minor', 'moderate', 'significant'],
      default: 'moderate',
    },

    // Who tagged it
    taggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

weekContextSchema.index({ orgId: 1, weekStart: -1 });
weekContextSchema.index({ orgId: 1, teamId: 1, weekStart: -1 });

export default mongoose.model('WeekContext', weekContextSchema);
