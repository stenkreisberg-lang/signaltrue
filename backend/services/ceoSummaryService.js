/**
 * CEO summary generation.
 *
 * The summary condenses a month of qualified team-level signals into the few
 * statements a sponsor needs: what moved, what it means, and which way risk is
 * heading. It is generated from the latest monthly report and is idempotent —
 * one summary per report — so it can be produced on a schedule or on demand
 * without ever duplicating.
 */
import crypto from 'crypto';
import Organization from '../models/organizationModel.js';
import MonthlyReport from '../models/monthlyReport.js';
import Signal from '../models/signal.js';
import CeoSummary from '../models/ceoSummary.js';

const SHARE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function directionFor(signal, inverse = false) {
  const delta = Number(signal?.deviation?.deltaPercent || 0);
  if (Math.abs(delta) < 5) return 'stable';
  const increased = inverse ? delta < 0 : delta > 0;
  return increased ? 'increased' : 'decreased';
}

export function buildShareUrl(shareToken) {
  return `${process.env.FRONTEND_URL || 'https://signaltrue.ai'}/ceo-summary/${shareToken}`;
}

/**
 * Generate (or return) the CEO summary for an organization's latest monthly
 * report. Returns null when there is no monthly report to summarize yet.
 */
export async function generateCeoSummaryForOrg(orgId, options = {}) {
  const { generatedBy = null } = options;

  const report = await MonthlyReport.findOne({ orgId }).sort({ periodEnd: -1 });
  if (!report) return null;

  const existing = await CeoSummary.findOne({ orgId, monthlyReportId: report._id });
  if (existing) return { summary: existing, created: false };

  const sourceSignals = await Signal.find({
    orgId,
    status: { $in: ['Open', 'Acknowledged', 'In Progress'] },
  })
    .sort({ lastUpdated: -1 })
    .limit(100)
    .lean();

  const meetingSignal = sourceSignals.find((item) =>
    ['meeting-load-spike', 'context-switching'].includes(item.signalType)
  );
  const recoverySignal = sourceSignals.find((item) =>
    ['after-hours-creep', 'recovery-deficit'].includes(item.signalType)
  );
  const affectedTeams = new Set(sourceSignals.map((item) => String(item.teamId))).size;
  const meetingDirection = directionFor(meetingSignal);
  const recoveryDirection = directionFor(recoverySignal);
  const highConfidenceCount = sourceSignals.filter((item) => item.confidence === 'High').length;

  const summary = new CeoSummary({
    orgId,
    monthlyReportId: report._id,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    generatedBy,

    observations: {
      meetingLoadChange: {
        direction: meetingDirection,
        percentChange: Math.abs(Number(meetingSignal?.deviation?.deltaPercent || 0)),
        summary: meetingSignal
          ? `Qualified team-level meeting demand is ${meetingDirection} against its recorded baseline.`
          : 'No qualified meeting-demand signal is available for this period.',
      },
      afterHoursWork: {
        direction: recoveryDirection,
        percentChange: Math.abs(Number(recoverySignal?.deviation?.deltaPercent || 0)),
        summary: recoverySignal
          ? `Qualified after-hours or recovery activity is ${recoveryDirection} against its recorded baseline.`
          : 'No qualified after-hours or recovery signal is available for this period.',
      },
      coordinationPressure: {
        direction: affectedTeams > 0 ? 'increased' : 'stable',
        areasAffected: [],
        summary:
          affectedTeams > 0
            ? `${affectedTeams} team${affectedTeams === 1 ? '' : 's'} currently require evidence review.`
            : 'No qualified coordination pattern is currently visible. This does not establish absence of risk.',
      },
    },

    significance: {
      summary:
        'These team-level patterns identify where worker consultation and work-design review should be prioritised. They do not establish worker health or cause.',
      riskFactors: [],
    },

    riskDirection: {
      overall: report.orgHealth?.bdiTrend || 'stable',
      trendConfidence:
        highConfidenceCount >= 2 ? 'high' : sourceSignals.length > 0 ? 'medium' : 'low',
      explanation:
        'Direction reflects qualified team-level changes against recorded baselines. Leadership should verify context and review control effectiveness.',
    },
  });

  summary.shareToken = crypto.randomBytes(32).toString('hex');
  summary.shareTokenExpiry = new Date(Date.now() + SHARE_TOKEN_TTL_MS);
  await summary.save();

  await Organization.findByIdAndUpdate(orgId, {
    $set: { 'trial.ceoSummaryGenerated': new Date() },
  });

  return { summary, created: true };
}

/**
 * Produce the current CEO summary for every organization that has a monthly
 * report. Run monthly, after reports are generated, so the sponsor-facing
 * artifact exists without anyone having to remember to create it.
 */
export async function generateCeoSummariesForAllOrgs() {
  const organizations = await Organization.find({}).select('_id name').lean();
  const results = { generated: 0, existing: 0, skipped: 0, errors: 0 };

  for (const organization of organizations) {
    try {
      const result = await generateCeoSummaryForOrg(organization._id);
      if (!result) {
        results.skipped++;
        continue;
      }
      if (result.created) {
        results.generated++;
        console.log(`[CeoSummary] Generated for ${organization.name}`);
      } else {
        results.existing++;
      }
    } catch (error) {
      results.errors++;
      console.error(`[CeoSummary] Failed for ${organization.name}:`, error.message);
    }
  }

  return results;
}
