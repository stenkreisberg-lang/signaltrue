import mongoose from 'mongoose';

/**
 * Semi-Annual Report Model
 *
 * Covers H1 (Jan–Jun) or H2 (Jul–Dec) for a given year.
 * Compares against:
 *   - Prior half-year (H2 → H1 comparison within same year)
 *   - Same half-year one year ago (H1 2026 vs H1 2025) — YoY
 *
 * Generated: Jan 1 (covering prior H2) and Jul 1 (covering prior H1) at 6:00 AM UTC.
 * Recipients: executive, master_admin (+ org.settings.semiAnnualReportRecipients overrides)
 */

// ── Shared sub-schema for a half-year health snapshot ────────────────────────
const halfYearSnapshotSchema = new mongoose.Schema(
  {
    halfLabel: { type: String }, // e.g. "2025-H1"
    periodStart: { type: Date },
    periodEnd: { type: Date },

    // BDI across the 6-month window
    avgBDI: { type: Number, min: 0, max: 100 },
    bdiTrend: { type: String, enum: ['improving', 'stable', 'deteriorating'] },
    trendStrength: { type: String, enum: ['strong', 'moderate', 'weak'] },

    // Cumulative zone distribution across all teams and all weeks
    zoneDistribution: {
      stable: { type: Number, default: 0 },
      stretched: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      recovery: { type: Number, default: 0 },
    },
    teamWeeksAtRisk: { type: Number, default: 0 },

    // Quarter-level breakdown (which quarter was harder)
    quarterBreakdown: [
      {
        quarterLabel: String, // e.g. "2026-Q1"
        avgBDI: Number,
        teamWeeksAtRisk: Number,
        organizationalTrajectory: String,
      },
    ],

    // Risks that persisted across both quarters of this half-year
    structuralRisks: [
      {
        riskType: { type: String, enum: ['overload', 'execution', 'retention'] },
        quartersPresent: { type: Number }, // 1 or 2
        avgScore: { type: Number },
        affectedTeamCount: { type: Number },
      },
    ],

    // Leadership and people metrics (averaged over the half)
    managerEffectivenessAvg: { type: Number, min: 0, max: 100 },
    managerEffectivenessTrend: { type: String, enum: ['improving', 'stable', 'deteriorating'] },
    equityScoreAvg: { type: Number, min: 0, max: 100 },
    avgAttritionRisk: { type: Number, min: 0, max: 100 },
    peakAttritionRisk: { type: Number, min: 0, max: 100 },
    criticalIndividualsPeak: { type: Number, default: 0 },

    // Execution
    executionDragAvg: { type: Number, min: 0, max: 100 },
    totalCrises: { type: Number, default: 0 },

    // Seasonality: which metric peaks in which month band
    seasonalityProfile: [
      {
        metric: String, // e.g. 'meetingLoad', 'afterHours', 'attritionRisk'
        peakMonthLabel: String, // e.g. 'March'
        peakValue: Number,
        avgValue: Number,
      },
    ],

    organizationalTrajectory: {
      type: String,
      enum: ['positive', 'stable', 'concerning', 'critical'],
    },

    // How many quarterly/monthly reports were available (data completeness)
    monthsIncluded: { type: Number },
    quartersIncluded: { type: Number },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const semiAnnualReportSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Label: "2026-H1" or "2026-H2"
    halfLabel: { type: String, required: true }, // e.g. "2026-H1"
    halfNumber: { type: Number, enum: [1, 2], required: true },
    year: { type: Number, required: true },

    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },

    // Source report IDs used for aggregation
    sourceQuarterlyReportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'QuarterlyReport' }],
    sourceMonthlyReportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyReport' }],

    // This half-year
    current: { type: halfYearSnapshotSchema, required: true },

    // Prior half-year (H2 of same year for H1 report, H1 of same year for H2 report)
    priorHalf: { type: halfYearSnapshotSchema },

    // Same half last year (H1 2026 vs H1 2025) — YoY
    sameHalfPriorYear: { type: halfYearSnapshotSchema },

    // Key deltas vs prior half
    deltasVsPriorHalf: {
      bdiDelta: { type: Number },
      attritionRiskDelta: { type: Number },
      executionDragDelta: { type: Number },
      managerEffectivenessDelta: { type: Number },
      teamWeeksAtRiskDelta: { type: Number },
      overallDirection: { type: String, enum: ['improving', 'stable', 'deteriorating'] },
      overallDirectionStrength: { type: String, enum: ['strong', 'moderate', 'weak'] },
    },

    // Key deltas vs same half prior year (YoY)
    deltasVsPriorYear: {
      bdiDelta: { type: Number },
      attritionRiskDelta: { type: Number },
      executionDragDelta: { type: Number },
      overallDirection: { type: String, enum: ['improving', 'stable', 'deteriorating'] },
      yoyDataAvailable: { type: Boolean, default: false },
    },

    // AI strategic narrative — longer-form, leadership-oriented
    aiSummary: {
      executiveSummary: { type: String }, // 2–3 sentence headline
      narrative: { type: String }, // Full strategic narrative
      halfVsPriorHalf: { type: String }, // Comparison paragraph
      yearOnYearInsight: { type: String }, // Only present when YoY data exists
      seasonalPatterns: [String], // Recurring patterns tied to business cycle
      structuralConditions: [String], // Issues that have persisted > 3 months
      resolvedConditions: [String], // Issues present prior half but gone now
      headcountAndCapacityInsights: [String], // H2 report especially: input for headcount planning
      leadershipDecisionsRequired: [
        {
          decision: String,
          rationale: String,
          urgency: { type: String, enum: ['immediate', 'this-half', 'strategic'] },
        },
      ],
      organizationalTrajectory: {
        type: String,
        enum: ['positive', 'stable', 'concerning', 'critical'],
      },
    },

    // Email delivery tracking
    emailSentAt: { type: Date },
    emailRecipients: [String],

    reportVersion: { type: String, default: '1.0' },
    generatedAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false }
);

// Compound index — one report per org per half
semiAnnualReportSchema.index({ orgId: 1, halfLabel: 1 }, { unique: true });
semiAnnualReportSchema.index({ orgId: 1, periodEnd: -1 });

// ── Static helpers ─────────────────────────────────────────────────────────────
semiAnnualReportSchema.statics.getLatestForOrg = async function (orgId) {
  return this.findOne({ orgId }).sort({ periodEnd: -1 });
};

semiAnnualReportSchema.statics.getHistoryForOrg = async function (orgId, limit = 4) {
  return this.find({ orgId })
    .sort({ periodEnd: -1 })
    .limit(limit)
    .select('halfLabel year halfNumber periodStart periodEnd current.avgBDI current.organizationalTrajectory deltasVsPriorHalf.overallDirection generatedAt');
};

semiAnnualReportSchema.statics.findByLabel = async function (orgId, halfLabel) {
  return this.findOne({ orgId, halfLabel });
};

// ── Instance helpers ───────────────────────────────────────────────────────────
semiAnnualReportSchema.methods.getOverallSeverity = function () {
  const factors = [
    this.current.avgBDI > 65,
    this.current.teamWeeksAtRisk > 12,
    this.current.criticalIndividualsPeak > 3,
    this.current.structuralRisks.filter((r) => r.quartersPresent >= 2).length > 1,
    this.current.totalCrises > 8,
  ];
  const count = factors.filter(Boolean).length;
  if (count >= 4) return 'critical';
  if (count >= 3) return 'high';
  if (count >= 1) return 'medium';
  return 'low';
};

const SemiAnnualReport = mongoose.model('SemiAnnualReport', semiAnnualReportSchema);

export default SemiAnnualReport;
