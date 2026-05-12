import mongoose from 'mongoose';

/**
 * EngagementStrainWeekly
 *
 * The primary output document of the Engagement Strain Risk system.
 * One record per team per week.  Spec Section 6.5.
 *
 * Risk state bands:
 *   0–29   healthy
 *   30–49  watch
 *   50–69  strain
 *   70–100 critical
 *
 * Trend:
 *   rising    — current > previous by >= 8 points
 *   improving — current < previous by >= 8 points
 *   stable    — change within ±8 points
 *
 * All scores are 0–100 integers.
 * Never contains individual employee identifiers.
 */

// ── Sub-schemas ────────────────────────────────────────────────────────────────

const driverSchema = new mongoose.Schema(
  {
    driver: {
      type: String,
      required: true,
      enum: [
        'recovery_debt',
        'focus_erosion',
        'coordination_friction',
        'responsiveness_pressure',
        'collaboration_withdrawal',
        'manager_support_gap',
        'workload_volatility',
      ],
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    // Percentage change versus baseline, e.g. "+31%" or "-24%"
    changeVsBaseline: { type: String },
    // Plain-language explanation (rule-generated or LLM-summarised in Phase 3)
    explanation: { type: String },
  },
  { _id: false }
);

const recommendedActionSchema = new mongoose.Schema(
  {
    actionType: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    // Which raw metrics this action is expected to move
    expectedMetricMovement: [{ type: String }],
  },
  { _id: false }
);

// ── Main schema ────────────────────────────────────────────────────────────────

const engagementStrainWeeklySchema = new mongoose.Schema(
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

    // ISO date string YYYY-MM-DD — Monday of the week this record covers
    weekStart: {
      type: String,
      required: true,
      index: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    // Number of active people in the team this week (used for privacy gate)
    activePeopleCount: { type: Number, required: true, min: 0 },

    // ── Primary scores ───────────────────────────────────────────────────────
    engagementStrainRisk: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    // Always 100 - engagementStrainRisk
    engagementConditionsScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    riskState: {
      type: String,
      required: true,
      enum: ['healthy', 'watch', 'strain', 'critical'],
    },

    trend: {
      type: String,
      required: true,
      enum: ['rising', 'improving', 'stable'],
    },

    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    confidenceLabel: {
      type: String,
      enum: ['low', 'moderate', 'high'],
    },

    // ── 7 Subscores (spec Section 3) ─────────────────────────────────────────
    subscores: {
      recoveryDebt:               { type: Number, min: 0, max: 100 },
      focusErosion:               { type: Number, min: 0, max: 100 },
      coordinationFriction:       { type: Number, min: 0, max: 100 },
      responsivenessPressure:     { type: Number, min: 0, max: 100 },
      collaborationWithdrawal:    { type: Number, min: 0, max: 100 },
      managerSupportGap:          { type: Number, min: 0, max: 100 },
      workloadVolatility:         { type: Number, min: 0, max: 100 },
    },

    // Top 2–3 subscores driving the overall score this week
    topDrivers: [driverSchema],

    // Named patterns detected (spec Section 13)
    patterns: [
      {
        patternType: {
          type: String,
          enum: [
            'hidden_strain',
            'quiet_withdrawal',
            'manager_bottleneck',
            'coordination_tax',
            'async_breakdown',
            'engagement_theatre',
          ],
        },
        title: { type: String },
        evidence: [{ type: String }],
        interpretation: { type: String },
        _id: false,
      },
    ],

    // Rule-based recommendations (spec Section 17)
    recommendedActions: [recommendedActionSchema],

    // Raw weekly metric snapshot used to compute this record.
    // Stored for audit / debugging.  Not exposed in API responses.
    _weeklyMetricsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      select: false,
    },

    // Scoring version — lets us recompute old records when logic changes
    scoringVersion: { type: String, default: '2.0.0' },
  },
  { timestamps: true }
);

// One record per team per week
engagementStrainWeeklySchema.index({ teamId: 1, weekStart: -1 });
engagementStrainWeeklySchema.index({ orgId: 1, weekStart: -1 });
engagementStrainWeeklySchema.index({ teamId: 1, weekStart: 1 }, { unique: true });

export default mongoose.model('EngagementStrainWeekly', engagementStrainWeeklySchema);
