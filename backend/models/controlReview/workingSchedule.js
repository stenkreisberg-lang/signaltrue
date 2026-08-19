import mongoose from 'mongoose';

/**
 * WorkingSchedule — hours, days, timezone and flexibility (spec §11.1).
 *
 * After-Hours Activity is only meaningful against the schedule a person is
 * actually expected to work, so part-time patterns, flexible policies, public
 * holidays and DST all have to resolve here rather than in the metric code.
 *
 * A schedule may attach to an org (default), a team, or a person. Person-level
 * schedules exist for calculation only and are never surfaced in the H&S UI.
 */
const daySchema = new mongoose.Schema(
  {
    // 0 = Sunday .. 6 = Saturday, matching Date#getDay.
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    working: { type: Boolean, default: true },
    // Minutes from local midnight, e.g. 540 = 09:00.
    startMinute: { type: Number, default: 540 },
    endMinute: { type: Number, default: 1020 },
  },
  { _id: false }
);

const workingScheduleSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    scope: {
      type: String,
      enum: ['ORG', 'TEAM', 'PERSON'],
      default: 'ORG',
      index: true,
    },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null, index: true },
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    // IANA zone, e.g. Australia/Melbourne. DST is resolved through Intl, so
    // storing the zone rather than a fixed offset is required.
    timezone: { type: String, default: 'Australia/Sydney' },

    days: { type: [daySchema], default: undefined },

    // A flexible schedule widens the window instead of pinning start/end times;
    // activity inside the window is not counted as after-hours.
    flexible: {
      enabled: { type: Boolean, default: false },
      earliestMinute: { type: Number, default: 360 },
      latestMinute: { type: Number, default: 1260 },
      policyNote: { type: String, default: '' },
    },

    // ISO date strings (YYYY-MM-DD) treated as non-working.
    publicHolidays: [{ type: String }],

    effectiveFrom: { type: Date, default: () => new Date(0) },
    effectiveTo: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

workingScheduleSchema.index({ tenantId: 1, scope: 1, teamId: 1, personId: 1 });

export default mongoose.models.WorkingSchedule ||
  mongoose.model('WorkingSchedule', workingScheduleSchema);
