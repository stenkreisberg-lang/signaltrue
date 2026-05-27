import mongoose from 'mongoose';

/**
 * EngagementBaseline
 *
 * Team-specific baseline computed from 42 calendar days of EngagementTeamDaily data.
 * Uses median + MAD (not mean + stdDev) for robustness against outlier weeks.
 * Follows spec Section 6.4 and Section 8.
 *
 * Per-metric structure:
 *   median    — the central tendency of the metric over the baseline window
 *   mad       — Median Absolute Deviation
 *   scaledMad — MAD * 1.4826 (makes it comparable to stdDev for normal distributions)
 *
 * The robust z-score used in scoring is:
 *   robust_z = (current_value - median) / max(scaledMad, epsilon)
 */

// Sub-schema for a single metric's baseline statistics
const metricBaselineSchema = new mongoose.Schema(
  {
    median: { type: Number, default: null },
    mad: { type: Number, default: null },
    scaledMad: { type: Number, default: null }, // MAD * 1.4826
    sampleSize: { type: Number, default: 0 }, // number of daily observations used
  },
  { _id: false }
);

const engagementBaselineSchema = new mongoose.Schema(
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

    // Baseline window (spec default: 42 calendar days, min 20 active workdays)
    baselinePeriodDays: { type: Number, default: 42 },
    baselineStart: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
    baselineEnd: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },

    // ── Per-metric baselines ──────────────────────────────────────────────────
    // Calendar
    metrics: {
      // Calendar
      meetingHoursPerPerson: { type: metricBaselineSchema, default: () => ({}) },
      attendeeHoursPerPerson: { type: metricBaselineSchema, default: () => ({}) },
      recurringMeetingRatio: { type: metricBaselineSchema, default: () => ({}) },
      avgAttendeeCount: { type: metricBaselineSchema, default: () => ({}) },
      backToBackMeetingCount: { type: metricBaselineSchema, default: () => ({}) },
      fragmentedDayRatio: { type: metricBaselineSchema, default: () => ({}) },
      focusHoursAvailablePerPerson: { type: metricBaselineSchema, default: () => ({}) },
      focusBlocks90mCount: { type: metricBaselineSchema, default: () => ({}) },
      manager1to1MinutesPerPerson: { type: metricBaselineSchema, default: () => ({}) },
      cancelled1to1Count: { type: metricBaselineSchema, default: () => ({}) },
      afterHoursMeetingMinutes: { type: metricBaselineSchema, default: () => ({}) },

      // Messaging
      messagesSentPerPerson: { type: metricBaselineSchema, default: () => ({}) },
      afterHoursMessageRatio: { type: metricBaselineSchema, default: () => ({}) },
      medianResponseMinutes: { type: metricBaselineSchema, default: () => ({}) },
      p90ResponseMinutes: { type: metricBaselineSchema, default: () => ({}) },
      uniqueCollaboratorsPerPerson: { type: metricBaselineSchema, default: () => ({}) },
      publicChannelRatio: { type: metricBaselineSchema, default: () => ({}) },
      dmRatio: { type: metricBaselineSchema, default: () => ({}) },
      threadParticipationRate: { type: metricBaselineSchema, default: () => ({}) },
      reciprocityRatio: { type: metricBaselineSchema, default: () => ({}) },

      // Email
      afterHoursEmailRatio: { type: metricBaselineSchema, default: () => ({}) },
      medianReplyMinutes: { type: metricBaselineSchema, default: () => ({}) },
    },

    // ── Baseline quality assessment ───────────────────────────────────────────
    baselineQuality: {
      // Number of days in the window that had active data (>= min activePeopleCount)
      activeDays: { type: Number, default: 0 },

      // Median number of active people across those days
      activePeopleMedian: { type: Number, default: 0 },

      // Composite quality score 0–100
      // Based on: active_days coverage, active_people count, data completeness
      qualityScore: { type: Number, default: 0, min: 0, max: 100 },
    },

    // Whether this baseline has enough data to be considered valid
    isValid: { type: Boolean, default: false },

    // Timestamp of the last recomputation
    updatedAt: { type: Date },
  },
  { timestamps: false }
);

// Only one baseline record per team (upserted on each recomputation)
engagementBaselineSchema.index({ orgId: 1, teamId: 1 }, { unique: true });

export default mongoose.model('EngagementBaseline', engagementBaselineSchema);
