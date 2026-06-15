import mongoose from 'mongoose';

/**
 * ManagerWeekly — per-manager weekly metrics + Span Overload Index.
 *
 * Replaces the team-level proxies the old Manager Support Gap used. Each record
 * is auditable: scoring version, data-quality version, confidence, and the raw
 * drivers behind the score. See docs/PIVOT_REPORT_SPEC.md §1.2 / §3.5.
 *
 * Identity is pseudonymized (managerHash). Suppressed weeks are NOT written as
 * scores — they are written with suppressed=true and a reason code.
 */
const driverSchema = new mongoose.Schema(
  {
    key: String,
    score: Number,
    direction: { type: String, enum: ['higher_worse', 'lower_worse', 'two_sided'] },
    evidence: String,
  },
  { _id: false }
);

const managerWeeklySchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true },
    managerHash: { type: String, required: true, index: true },
    role: { type: String, default: 'EM' },
    weekStart: { type: String, required: true, index: true }, // YYYY-MM-DD (Monday)

    suppressed: { type: Boolean, default: false },
    suppressedReason: { type: String, default: null },

    // Raw metrics
    span: Number, // active direct reports this week
    spanBaselineMedian: Number,
    spanBaselineScaledMad: Number,
    coordinationLoadHours: Number,
    oneOnOneMinutesPerReport: Number,
    responseLatencyP50Min: Number,
    responseLatencyP90Min: Number,
    afterHoursActivityRatio: Number,
    decisionConcentration: Number, // 0..1 from ONA graph, null if unavailable
    brokerageScore: Number, // ONA betweenness (normalized), null if unavailable

    // Scores
    spanOverloadIndex: Number, // 0..100
    riskState: { type: String, enum: ['healthy', 'watch', 'strain', 'critical', 'unknown'] },
    trend: { type: String, enum: ['improving', 'stable', 'worsening', 'accelerating'] },
    absoluteSpanFlag: { type: String, enum: ['ok', 'warn', 'high', 'severe'], default: 'ok' },
    drivers: [driverSchema],

    // Quality / audit
    confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
    dataCoverageRatio: Number,
    scoringVersion: { type: String, default: '3.0.0' },
    dataQualityVersion: { type: String, default: '1.0.0' },
  },
  { timestamps: true }
);

managerWeeklySchema.index({ orgId: 1, managerHash: 1, weekStart: 1 }, { unique: true });
managerWeeklySchema.index({ orgId: 1, weekStart: 1 });

export default mongoose.models.ManagerWeekly || mongoose.model('ManagerWeekly', managerWeeklySchema);
