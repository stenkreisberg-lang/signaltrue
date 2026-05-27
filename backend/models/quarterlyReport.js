import mongoose from 'mongoose';

/**
 * Quarterly Report Model
 *
 * Aggregated from 3 MonthlyReports covering a calendar quarter (Q1–Q4).
 * Compared against prior quarter to surface directional change.
 *
 * Generated: Jan 1, Apr 1, Jul 1, Oct 1 at 5:00 AM UTC (after monthly at 4 AM)
 * Recipients: master_admin, hr_admin, executive (+ org.settings.quarterlyReportRecipients overrides)
 */

// ── Shared sub-schema for a period's aggregated health snapshot ──────────────
const periodSnapshotSchema = new mongoose.Schema(
  {
    // Average BDI across all teams and all months in the period
    avgBDI: { type: Number, min: 0, max: 100 },
    // Direction of BDI across the period (first month avg → last month avg)
    bdiTrend: { type: String, enum: ['improving', 'stable', 'deteriorating'] },
    trendStrength: { type: String, enum: ['strong', 'moderate', 'weak'] },
    // Cumulative zone distribution (sum of weeks across all teams)
    zoneDistribution: {
      stable: { type: Number, default: 0 },
      stretched: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      recovery: { type: Number, default: 0 },
    },
    // Total team-weeks in Watch/Critical zones
    teamWeeksAtRisk: { type: Number, default: 0 },
    // Risks that appeared in ≥2 of 3 months (recurring) or all 3 (structural)
    persistentRisks: [
      {
        riskType: { type: String, enum: ['overload', 'execution', 'retention'] },
        monthsPresent: { type: Number }, // how many months out of 3
        classification: { type: String, enum: ['structural', 'recurring', 'episodic'] },
        avgScore: { type: Number, min: 0, max: 100 },
        affectedTeamCount: { type: Number },
      },
    ],
    // Leadership metrics averaged across the quarter
    managerEffectivenessAvg: { type: Number, min: 0, max: 100 },
    managerEffectivenessTrend: { type: String, enum: ['improving', 'stable', 'deteriorating'] },
    equityScoreAvg: { type: Number, min: 0, max: 100 },
    // Retention: worst-month peak and average across quarter
    avgAttritionRisk: { type: Number, min: 0, max: 100 },
    peakAttritionRisk: { type: Number, min: 0, max: 100 },
    criticalIndividualsPeak: { type: Number, default: 0 },
    // Execution
    executionDragAvg: { type: Number, min: 0, max: 100 },
    totalCrises: { type: Number, default: 0 },
    // Top structural drivers that appeared in ≥2 months
    topDrivers: [
      {
        metric: String,
        monthsPresent: Number,
        avgDeviation: Number,
        teamsAffected: Number,
      },
    ],
    // Overall organisational trajectory for this period
    organizationalTrajectory: {
      type: String,
      enum: ['positive', 'stable', 'concerning', 'critical'],
    },
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const quarterlyReportSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },

    // Calendar quarter label, e.g. "2026-Q2"
    quarterLabel: { type: String, required: true }, // e.g. "2026-Q2"
    quarterNumber: { type: Number, enum: [1, 2, 3, 4], required: true },
    year: { type: Number, required: true },

    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },

    // IDs of the MonthlyReport documents that were aggregated
    sourceMonthlyReportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MonthlyReport' }],
    monthsIncluded: { type: Number, required: true }, // 2 or 3 (guard for partial quarters)

    // Current quarter snapshot
    current: { type: periodSnapshotSchema, required: true },

    // Prior quarter snapshot (for delta calculation)
    comparison: { type: periodSnapshotSchema },

    // Deltas: positive = improvement (BDI going down = improving)
    deltas: {
      bdiDelta: { type: Number }, // negative = BDI rose (worse), positive = fell (better)
      attritionRiskDelta: { type: Number },
      executionDragDelta: { type: Number },
      managerEffectivenessDelta: { type: Number },
      teamWeeksAtRiskDelta: { type: Number },
      // Human-readable verdict
      overallDirection: { type: String, enum: ['improving', 'stable', 'deteriorating'] },
      overallDirectionStrength: { type: String, enum: ['strong', 'moderate', 'weak'] },
    },

    // AI-generated strategic narrative
    aiSummary: {
      narrative: { type: String },
      keyFindings: [{ finding: String, significance: String }],
      quarterVsPrior: { type: String }, // concise comparison sentence
      persistentConcerns: [String], // risks that survived full quarter
      resolvedIssues: [String], // risks present in prior Q but not this Q
      recommendedLeadershipActions: [
        {
          action: String,
          rationale: String,
          urgency: { type: String, enum: ['immediate', 'this-quarter', 'strategic'] },
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

// Compound index — one report per org per quarter
quarterlyReportSchema.index({ orgId: 1, quarterLabel: 1 }, { unique: true });
quarterlyReportSchema.index({ orgId: 1, periodEnd: -1 });

// ── Static helpers ─────────────────────────────────────────────────────────────
quarterlyReportSchema.statics.getLatestForOrg = async function (orgId) {
  return this.findOne({ orgId }).sort({ periodEnd: -1 });
};

quarterlyReportSchema.statics.getHistoryForOrg = async function (orgId, limit = 8) {
  return this.find({ orgId })
    .sort({ periodEnd: -1 })
    .limit(limit)
    .select(
      'quarterLabel year quarterNumber periodStart periodEnd current.avgBDI current.organizationalTrajectory deltas.overallDirection generatedAt'
    );
};

quarterlyReportSchema.statics.findByLabel = async function (orgId, quarterLabel) {
  return this.findOne({ orgId, quarterLabel });
};

// ── Instance helpers ───────────────────────────────────────────────────────────
quarterlyReportSchema.methods.getOverallSeverity = function () {
  const factors = [
    this.current.avgBDI > 65,
    this.current.teamWeeksAtRisk > 6,
    this.current.criticalIndividualsPeak > 3,
    this.current.persistentRisks.filter((r) => r.classification === 'structural').length > 1,
    this.current.totalCrises > 4,
  ];
  const count = factors.filter(Boolean).length;
  if (count >= 4) return 'critical';
  if (count >= 3) return 'high';
  if (count >= 1) return 'medium';
  return 'low';
};

const QuarterlyReport = mongoose.model('QuarterlyReport', quarterlyReportSchema);

export default QuarterlyReport;
