import mongoose from 'mongoose';

/**
 * EngagementTeamDaily
 *
 * Team-level daily metric snapshot for the Engagement Strain Risk system.
 * Schema follows the spec exactly (Section 6.2).
 *
 * This is separate from MetricsDaily (which feeds the legacy BDI/drift system).
 * All values are team aggregates — never individual.
 * Teams below the minimum group size (8) are suppressed before this is written.
 */
const engagementTeamDailySchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },

    // ISO date string YYYY-MM-DD (the calendar day this record covers)
    date: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // How many team members were active on this day
    activePeopleCount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ── Calendar metrics ──────────────────────────────────────────────────────
    calendar: {
      // Total internal meeting minutes across all team members
      meetingHoursTotal: { type: Number, default: 0 },
      // Average per active person
      meetingHoursPerPerson: { type: Number, default: 0 },

      // attendee_hours = sum(meeting_duration_hours * internal_attendee_count)
      attendeeHoursTotal: { type: Number, default: 0 },
      attendeeHoursPerPerson: { type: Number, default: 0 },

      // Fraction of meetings that are part of a recurring series
      recurringMeetingRatio: { type: Number, default: 0, min: 0, max: 1 },

      // Mean attendee count across all meetings
      avgAttendeeCount: { type: Number, default: 0 },

      // Count of back-to-back meeting pairs (gap <= 5 min)
      backToBackMeetingCount: { type: Number, default: 0 },

      // Fraction of person-days where the day was fragmented
      // (>= 5 meetings OR no free block >= 90 min OR >= 3 back-to-back sequences)
      fragmentedDayRatio: { type: Number, default: 0, min: 0, max: 1 },

      // Average 90-min+ free blocks per person within working hours
      focusHoursAvailablePerPerson: { type: Number, default: 0 },

      // Total count of 90-min+ free calendar blocks across the team
      focusBlocks90mCount: { type: Number, default: 0 },

      // Average manager 1:1 minutes per direct report on this day
      manager1to1MinutesPerPerson: { type: Number, default: 0 },

      // Count of manager 1:1 events cancelled on this day
      cancelled1to1Count: { type: Number, default: 0 },

      // Total minutes of meetings that occurred outside working hours
      afterHoursMeetingMinutes: { type: Number, default: 0 },
    },

    // ── Messaging metrics ─────────────────────────────────────────────────────
    messaging: {
      // Total messages sent by team members
      messagesSentTotal: { type: Number, default: 0 },
      // Average per active person
      messagesSentPerPerson: { type: Number, default: 0 },

      // Fraction of messages sent outside working hours
      afterHoursMessageRatio: { type: Number, default: 0, min: 0, max: 1 },

      // Median time to first reply (minutes), for DMs / @-mentions / replies
      medianResponseMinutes: { type: Number, default: null },

      // 90th-percentile response time (minutes)
      p90ResponseMinutes: { type: Number, default: null },

      // Average unique people each team member interacted with
      uniqueCollaboratorsPerPerson: { type: Number, default: 0 },

      // Fraction of messages sent in public channels
      publicChannelRatio: { type: Number, default: 0, min: 0, max: 1 },

      // Fraction of messages sent in DMs or group DMs
      dmRatio: { type: Number, default: 0, min: 0, max: 1 },

      // Fraction of threads where at least one team member replied
      threadParticipationRate: { type: Number, default: 0, min: 0, max: 1 },

      // Two-way interaction edges / total interaction edges
      reciprocityRatio: { type: Number, default: null },
    },

    // ── Email metrics (optional — only populated if email integration connected) ──
    email: {
      emailsSentTotal: { type: Number, default: 0 },
      afterHoursEmailRatio: { type: Number, default: 0, min: 0, max: 1 },
      medianReplyMinutes: { type: Number, default: null },
      internalEmailRatio: { type: Number, default: 0, min: 0, max: 1 },
    },

    // Which integrations contributed data on this day
    integrationCoverage: {
      hasCalendar: { type: Boolean, default: false },
      hasMessaging: { type: Boolean, default: false },
      hasEmail: { type: Boolean, default: false },
      hasOrgStructure: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Unique per team per day
engagementTeamDailySchema.index({ teamId: 1, date: 1 }, { unique: true });
engagementTeamDailySchema.index({ orgId: 1, date: 1 });

export default mongoose.model('EngagementTeamDaily', engagementTeamDailySchema);
