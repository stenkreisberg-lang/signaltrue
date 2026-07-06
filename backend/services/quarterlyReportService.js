import MonthlyReport from '../models/monthlyReport.js';
import QuarterlyReport from '../models/quarterlyReport.js';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import { Resend } from 'resend';
import { ccSuperadmin } from './superadminNotifyService.js';

/**
 * Quarterly Report Service
 *
 * Aggregates 3 MonthlyReports into a quarterly snapshot.
 * Compares current quarter vs prior quarter.
 * Generates AI strategic narrative covering the full 13-week window.
 *
 * Triggered: Jan 1, Apr 1, Jul 1, Oct 1 at 5:00 AM UTC (after monthly at 4 AM)
 */

// ── Quarter date boundaries ────────────────────────────────────────────────────

/**
 * Returns { start, end, label, number, year } for a given quarter.
 * quarterOffset = 0 → current quarter, -1 → prior quarter, etc.
 */
export function getQuarterBounds(date = new Date(), quarterOffset = 0) {
  const d = new Date(date);
  const month = d.getUTCMonth(); // 0-based
  const year = d.getUTCFullYear();

  const quarterNumber = Math.floor(month / 3) + 1; // 1–4
  const targetQuarter = quarterNumber + quarterOffset;

  // Normalise overflow (e.g. Q0 → Q4 prior year, Q5 → Q1 next year)
  let adjustedYear = year;
  let adjustedQ = targetQuarter;
  while (adjustedQ < 1) {
    adjustedQ += 4;
    adjustedYear -= 1;
  }
  while (adjustedQ > 4) {
    adjustedQ -= 4;
    adjustedYear += 1;
  }

  const startMonth = (adjustedQ - 1) * 3; // 0, 3, 6, 9
  const start = new Date(Date.UTC(adjustedYear, startMonth, 1));
  const end = new Date(Date.UTC(adjustedYear, startMonth + 3, 0, 23, 59, 59, 999));

  return {
    start,
    end,
    label: `${adjustedYear}-Q${adjustedQ}`,
    quarterNumber: adjustedQ,
    year: adjustedYear,
  };
}

// ── Trend helper ──────────────────────────────────────────────────────────────

function calcTrend(firstValue, lastValue, improvingWhenDown = true) {
  if (firstValue == null || lastValue == null) return 'stable';
  const delta = lastValue - firstValue;
  const threshold = 3;
  if (Math.abs(delta) < threshold) return 'stable';
  const isGettingBetter = improvingWhenDown ? delta < 0 : delta > 0;
  const strength = Math.abs(delta) > 10 ? 'strong' : 'moderate';
  return isGettingBetter ? 'improving' : 'deteriorating';
}

function calcTrendStrength(firstValue, lastValue) {
  if (firstValue == null || lastValue == null) return 'weak';
  const delta = Math.abs(lastValue - firstValue);
  if (delta > 15) return 'strong';
  if (delta > 5) return 'moderate';
  return 'weak';
}

function safeDelta(current, prior) {
  if (current == null || prior == null) return null;
  return Math.round((current - prior) * 10) / 10;
}

// ── Aggregate MonthlyReports into a quarter snapshot ─────────────────────────

function aggregateMonthsIntoSnapshot(monthlyReports) {
  if (!monthlyReports || monthlyReports.length === 0) return null;

  const sorted = [...monthlyReports].sort((a, b) => a.periodEnd - b.periodEnd);
  const n = sorted.length;

  // Null-metric gating: a metric that was never measured must be reported as
  // "not measured", never as 0 — otherwise the AI recommends actions (e.g.
  // "manager training, immediate") based on a number that doesn't exist.
  const bdiMeasured = sorted.some((m) => m.orgHealth?.avgBDI != null);

  // BDI: average across months
  const avgBDI = sorted.reduce((s, m) => s + (m.orgHealth?.avgBDI || 0), 0) / n;

  // BDI trend: first month → last month
  const firstBDI = sorted[0].orgHealth?.avgBDI;
  const lastBDI = sorted[n - 1].orgHealth?.avgBDI;
  const bdiTrend = calcTrend(firstBDI, lastBDI, true); // lower BDI = improving
  const trendStrength = calcTrendStrength(firstBDI, lastBDI);

  // Zone distribution: cumulative sum
  const zoneDistribution = sorted.reduce(
    (acc, m) => {
      acc.stable += m.orgHealth?.zoneDistribution?.stable || 0;
      acc.stretched += m.orgHealth?.zoneDistribution?.stretched || 0;
      acc.critical += m.orgHealth?.zoneDistribution?.critical || 0;
      acc.recovery += m.orgHealth?.zoneDistribution?.recovery || 0;
      return acc;
    },
    { stable: 0, stretched: 0, critical: 0, recovery: 0 }
  );

  // Team-weeks at risk = cumulative stretched + critical across all months
  const teamWeeksAtRisk = sorted.reduce(
    (s, m) =>
      s +
      (m.orgHealth?.zoneDistribution?.stretched || 0) +
      (m.orgHealth?.zoneDistribution?.critical || 0),
    0
  );

  // Persistent risks: count how many months each risk type appeared
  const riskCounts = {};
  for (const m of sorted) {
    for (const risk of m.persistentRisks || []) {
      if (!riskCounts[risk.riskType]) {
        riskCounts[risk.riskType] = {
          riskType: risk.riskType,
          monthsPresent: 0,
          scores: [],
          teamCounts: [],
        };
      }
      riskCounts[risk.riskType].monthsPresent++;
      riskCounts[risk.riskType].scores.push(risk.avgScore || 0);
      riskCounts[risk.riskType].teamCounts.push(risk.affectedTeams?.length || 0);
    }
  }

  const persistentRisks = Object.values(riskCounts).map((r) => {
    const avgScore = r.scores.reduce((a, b) => a + b, 0) / r.scores.length;
    const avgTeams = r.teamCounts.reduce((a, b) => a + b, 0) / r.teamCounts.length;
    let classification = 'episodic';
    if (r.monthsPresent >= 3) classification = 'structural';
    else if (r.monthsPresent >= 2) classification = 'recurring';
    return {
      riskType: r.riskType,
      monthsPresent: r.monthsPresent,
      classification,
      avgScore: Math.round(avgScore),
      affectedTeamCount: Math.round(avgTeams),
    };
  });

  // Manager effectiveness: average + trend across months
  const managerScores = sorted
    .map((m) => m.leadershipSignals?.managerEffectiveness?.avgScore)
    .filter(Boolean);
  const managerEffectivenessAvg =
    managerScores.length > 0 ? managerScores.reduce((a, b) => a + b, 0) / managerScores.length : 0;
  const managerEffectivenessTrend = calcTrend(
    managerScores[0],
    managerScores[managerScores.length - 1],
    false // higher manager score = improving
  );

  // Equity: average
  const equityScores = sorted.map((m) => m.leadershipSignals?.equityScoreAvg).filter(Boolean);
  const equityScoreAvg =
    equityScores.length > 0 ? equityScores.reduce((a, b) => a + b, 0) / equityScores.length : 100;

  // Attrition: average and peak
  const attritionValues = sorted
    .map((m) => m.retentionExposure?.avgAttritionRisk)
    .filter((v) => v != null);
  const avgAttritionRisk =
    attritionValues.length > 0
      ? attritionValues.reduce((a, b) => a + b, 0) / attritionValues.length
      : 0;
  const peakAttritionRisk = attritionValues.length > 0 ? Math.max(...attritionValues) : 0;
  const criticalIndividualsPeak = Math.max(
    ...sorted.map((m) => m.retentionExposure?.criticalIndividualsCount || 0)
  );

  // Execution: average drag
  const dragValues = sorted
    .map((m) => m.executionSignals?.executionDragAvg)
    .filter((v) => v != null);
  const executionDragAvg =
    dragValues.length > 0 ? dragValues.reduce((a, b) => a + b, 0) / dragValues.length : 0;

  // Total crises
  const totalCrises = sorted.reduce((s, m) => s + (m.crisisPatterns?.totalCrises || 0), 0);

  // Top structural drivers: those appearing in ≥2 months
  const driverCounts = {};
  for (const m of sorted) {
    for (const d of m.topStructuralDrivers || []) {
      if (!driverCounts[d.metric]) {
        driverCounts[d.metric] = {
          metric: d.metric,
          monthsPresent: 0,
          deviations: [],
          teamCounts: [],
        };
      }
      driverCounts[d.metric].monthsPresent++;
      driverCounts[d.metric].deviations.push(d.avgDeviation || 0);
      driverCounts[d.metric].teamCounts.push(d.teamsAffected || 0);
    }
  }

  const topDrivers = Object.values(driverCounts)
    .filter((d) => d.monthsPresent >= 2)
    .map((d) => ({
      metric: d.metric,
      monthsPresent: d.monthsPresent,
      avgDeviation:
        Math.round((d.deviations.reduce((a, b) => a + b, 0) / d.deviations.length) * 100) / 100,
      teamsAffected: Math.round(d.teamCounts.reduce((a, b) => a + b, 0) / d.teamCounts.length),
    }))
    .sort((a, b) => Math.abs(b.avgDeviation) - Math.abs(a.avgDeviation))
    .slice(0, 5);

  // Organisational trajectory from worst monthly trajectory
  const trajectoryOrder = ['critical', 'concerning', 'stable', 'positive'];
  const worstTrajectory = sorted.reduce((worst, m) => {
    const t = m.aiSummary?.organizationalTrajectory || 'stable';
    return trajectoryOrder.indexOf(t) < trajectoryOrder.indexOf(worst) ? t : worst;
  }, 'positive');

  return {
    avgBDI: Math.round(avgBDI * 10) / 10,
    bdiMeasured,
    bdiTrend,
    trendStrength,
    zoneDistribution,
    teamWeeksAtRisk,
    persistentRisks,
    managerEffectivenessAvg: Math.round(managerEffectivenessAvg),
    managerEffectivenessMeasured: managerScores.length > 0,
    managerEffectivenessTrend,
    equityScoreAvg: Math.round(equityScoreAvg),
    equityMeasured: equityScores.length > 0,
    avgAttritionRisk: Math.round(avgAttritionRisk * 10) / 10,
    peakAttritionRisk: Math.round(peakAttritionRisk * 10) / 10,
    attritionMeasured: attritionValues.length > 0,
    criticalIndividualsPeak,
    executionDragAvg: Math.round(executionDragAvg * 10) / 10,
    executionDragMeasured: dragValues.length > 0,
    totalCrises,
    topDrivers,
    organizationalTrajectory: worstTrajectory,
  };
}

// ── AI narrative generation ───────────────────────────────────────────────────

async function generateQuarterlyAINarrative({
  current,
  comparison,
  quarterLabel,
  priorQuarterLabel,
  deltas,
}) {
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const comparisonText = comparison
      ? `Prior quarter (${priorQuarterLabel}): BDI ${comparison.avgBDI}, trend ${comparison.bdiTrend}, attrition risk ${comparison.avgAttritionRisk}, execution drag ${comparison.executionDragAvg}.`
      : 'No prior quarter data available for comparison.';

    const deltaText = deltas
      ? `BDI change: ${deltas.bdiDelta > 0 ? '+' : ''}${deltas.bdiDelta} (positive = worse), attrition risk change: ${deltas.attritionRiskDelta}, execution drag change: ${deltas.executionDragDelta}, manager effectiveness change: ${deltas.managerEffectivenessDelta}, team-weeks at risk change: ${deltas.teamWeeksAtRiskDelta}.`
      : '';

    const persistentText =
      current.persistentRisks.length > 0
        ? current.persistentRisks
            .map((r) => `${r.riskType} (${r.monthsPresent}/3 months, ${r.classification})`)
            .join('; ')
        : 'None';

    const prompt = `You are a senior organizational health analyst writing a quarterly summary for an HR leadership audience. Be direct, factual, and focused on business impact. No filler phrases.

CRITICAL RULE: Metrics marked "NOT MEASURED" were never collected this quarter. Do NOT treat them as zero, do NOT draw findings from them, and do NOT recommend actions based on them. If relevant, you may note that measurement coverage should be expanded — nothing more.

Quarterly Report: ${quarterLabel}
---
Current quarter data:
- Average BDI: ${current.bdiMeasured ? `${current.avgBDI}/100 (higher = more behavioral drift/risk)` : 'NOT MEASURED this quarter'}
- BDI trend during quarter: ${current.bdiMeasured ? `${current.bdiTrend} (${current.trendStrength})` : 'NOT MEASURED'}
- Team-weeks in Watch/Critical zones: ${current.teamWeeksAtRisk}
- Persistent risks across quarter: ${persistentText}
- Manager effectiveness avg: ${current.managerEffectivenessMeasured ? `${current.managerEffectivenessAvg}/100` : 'NOT MEASURED this quarter'}
- Avg attrition risk: ${current.attritionMeasured ? `${current.avgAttritionRisk}, peak: ${current.peakAttritionRisk}` : 'NOT MEASURED this quarter'}
- Critical individuals at peak: ${current.criticalIndividualsPeak}
- Execution drag avg: ${current.executionDragMeasured ? `${current.executionDragAvg}/100` : 'NOT MEASURED this quarter'}
- Total crisis events: ${current.totalCrises}
- Top structural drivers: ${current.topDrivers.map((d) => d.metric).join(', ') || 'none identified'}
- Overall trajectory: ${current.organizationalTrajectory}

${comparisonText}
${deltaText}

Write the following JSON object (no markdown, no code blocks):
{
  "narrative": "3-4 paragraph strategic assessment of the quarter, covering what happened, what persisted, and what it means for the organization",
  "keyFindings": [
    { "finding": "concise finding", "significance": "why this matters to leadership" }
  ],
  "quarterVsPrior": "1-2 sentence comparison to prior quarter (or note if no data)",
  "persistentConcerns": ["list of risks that are now structural concerns"],
  "resolvedIssues": ["list of risks from prior quarter that are no longer present, or empty array"],
  "recommendedLeadershipActions": [
    { "action": "specific action", "rationale": "evidence-based reason", "urgency": "immediate|this-quarter|strategic" }
  ],
  "organizationalTrajectory": "positive|stable|concerning|critical"
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1800,
    });

    const text = response.choices[0].message.content.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('[QuarterlyReport] AI narrative failed:', err.message);
    // Fallback narrative
    return {
      narrative: `Quarterly report for ${quarterLabel}. Average BDI: ${current.avgBDI}/100. BDI trend: ${current.bdiTrend}. ${current.persistentRisks.length} persistent risk(s) identified. ${current.totalCrises} crisis event(s) in the period.`,
      keyFindings: [
        {
          finding: `Organization BDI averaged ${current.avgBDI}/100 this quarter`,
          significance: 'Higher BDI indicates greater behavioral drift and workload risk',
        },
      ],
      quarterVsPrior: comparison
        ? `Prior quarter BDI was ${comparison.avgBDI}/100 vs ${current.avgBDI}/100 this quarter.`
        : 'No prior quarter data available.',
      persistentConcerns: current.persistentRisks
        .filter((r) => r.classification === 'structural')
        .map((r) => r.riskType),
      resolvedIssues: [],
      recommendedLeadershipActions: [],
      organizationalTrajectory: current.organizationalTrajectory,
    };
  }
}

// ── Email HTML generator ───────────────────────────────────────────────────────

function generateQuarterlyEmailHTML({ org, report }) {
  const { current, comparison, deltas, aiSummary, quarterLabel, periodStart, periodEnd } = report;

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const bdiColor = current.avgBDI < 35 ? '#22c55e' : current.avgBDI < 60 ? '#f59e0b' : '#ef4444';
  const trajectoryEmoji =
    {
      positive: '🟢',
      stable: '🔵',
      concerning: '🟡',
      critical: '🔴',
    }[aiSummary.organizationalTrajectory] || '🔵';

  const deltaRow = (label, delta, lowerIsBetter = true) => {
    if (delta == null) return '';
    const improved = lowerIsBetter ? delta < 0 : delta > 0;
    const color = improved ? '#22c55e' : delta === 0 ? '#9ca3af' : '#ef4444';
    const arrow = improved ? '↓' : delta === 0 ? '→' : '↑';
    return `<tr>
      <td style="padding:6px 10px; border-bottom:1px solid #f3f4f6; font-size:13px; color:#4b5563;">${label}</td>
      <td style="padding:6px 10px; border-bottom:1px solid #f3f4f6; text-align:right; font-size:13px; font-weight:600; color:${color};">${arrow} ${Math.abs(delta)}</td>
    </tr>`;
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,sans-serif; background:#f5f5f5; margin:0; padding:20px;">
<div style="max-width:640px; margin:0 auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#3b82f6 100%); color:white; padding:32px 30px 24px;">
    <div style="font-size:12px; opacity:0.8; margin-bottom:6px; text-transform:uppercase; letter-spacing:1px;">Quarterly Health Report</div>
    <h1 style="margin:0 0 4px; font-size:26px; font-weight:700;">${org.name}</h1>
    <div style="font-size:14px; opacity:0.85;">${quarterLabel} · ${fmtDate(periodStart)} – ${fmtDate(periodEnd)}</div>
  </div>

  <!-- Trajectory banner -->
  <div style="background:#f8fafc; padding:16px 30px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; gap:12px;">
    <span style="font-size:22px;">${trajectoryEmoji}</span>
    <div>
      <div style="font-size:15px; font-weight:600; color:#111827; text-transform:capitalize;">
        Trajectory: ${aiSummary.organizationalTrajectory}
      </div>
      <div style="font-size:13px; color:#6b7280;">${aiSummary.quarterVsPrior}</div>
    </div>
  </div>

  <div style="padding:24px 30px;">

    <!-- Key metrics row -->
    <table style="border-collapse:collapse; width:100%; margin-bottom:24px;">
      <tr>
        <td style="padding:16px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:25%;">
          <div style="font-size:28px; font-weight:700; color:${current.bdiMeasured ? bdiColor : '#9ca3af'};">${current.bdiMeasured ? current.avgBDI : '—'}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Avg BDI${current.bdiMeasured ? '' : ' (not measured)'}</div>
        </td>
        <td style="padding:4px;"></td>
        <td style="padding:16px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:25%;">
          <div style="font-size:28px; font-weight:700; color:#374151;">${current.teamWeeksAtRisk}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Team-Weeks at Risk</div>
        </td>
        <td style="padding:4px;"></td>
        <td style="padding:16px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:25%;">
          <div style="font-size:28px; font-weight:700; color:#374151;">${current.persistentRisks.filter((r) => r.classification === 'structural').length}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Structural Risks</div>
        </td>
        <td style="padding:4px;"></td>
        <td style="padding:16px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:25%;">
          <div style="font-size:28px; font-weight:700; color:#374151;">${current.totalCrises}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Crisis Events</div>
        </td>
      </tr>
    </table>

    <!-- Quarter vs Prior delta table (only shown if comparison exists) -->
    ${
      comparison
        ? `<div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; padding:0; margin-bottom:24px; overflow:hidden;">
      <div style="background:#f8fafc; padding:10px 16px; border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px; font-weight:600; color:#374151;">vs Prior Quarter (${comparison.organizationalTrajectory?.toUpperCase() || 'n/a'})</span>
      </div>
      <table style="border-collapse:collapse; width:100%;">
        ${deltaRow('BDI (lower = better)', deltas?.bdiDelta, true)}
        ${deltaRow('Team-Weeks at Risk', deltas?.teamWeeksAtRiskDelta, true)}
        ${deltaRow('Attrition Risk', deltas?.attritionRiskDelta, true)}
        ${deltaRow('Execution Drag', deltas?.executionDragDelta, true)}
        ${deltaRow('Manager Effectiveness', deltas?.managerEffectivenessDelta, false)}
      </table>
    </div>`
        : ''
    }

    <!-- AI Narrative -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Strategic Assessment</h2>
      ${aiSummary.narrative
        .split('\n\n')
        .filter(Boolean)
        .map(
          (p) =>
            `<p style="color:#4b5563; font-size:14px; line-height:1.7; margin:0 0 12px;">${p}</p>`
        )
        .join('')}
    </div>

    <!-- Key Findings -->
    ${
      aiSummary.keyFindings?.length > 0
        ? `<div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Key Findings</h2>
      ${aiSummary.keyFindings
        .map(
          (
            f
          ) => `<div style="background:#f0f9ff; border-left:3px solid #3b82f6; border-radius:0 6px 6px 0; padding:10px 14px; margin-bottom:8px;">
        <div style="font-size:13px; font-weight:600; color:#1e40af;">${f.finding}</div>
        <div style="font-size:12px; color:#6b7280; margin-top:3px;">${f.significance}</div>
      </div>`
        )
        .join('')}
    </div>`
        : ''
    }

    <!-- Persistent concerns -->
    ${
      aiSummary.persistentConcerns?.length > 0
        ? `<div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Structural Concerns</h2>
      ${aiSummary.persistentConcerns
        .map(
          (c) => `<div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px;">
        <span style="color:#ef4444; font-size:14px; margin-top:1px;">⚠</span>
        <span style="font-size:13px; color:#4b5563;">${c}</span>
      </div>`
        )
        .join('')}
    </div>`
        : ''
    }

    <!-- Resolved issues -->
    ${
      aiSummary.resolvedIssues?.length > 0
        ? `<div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Resolved This Quarter</h2>
      ${aiSummary.resolvedIssues
        .map(
          (r) => `<div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px;">
        <span style="color:#22c55e; font-size:14px; margin-top:1px;">✓</span>
        <span style="font-size:13px; color:#4b5563;">${r}</span>
      </div>`
        )
        .join('')}
    </div>`
        : ''
    }

    <!-- Recommended actions -->
    ${
      aiSummary.recommendedLeadershipActions?.length > 0
        ? `<div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Recommended Leadership Actions</h2>
      ${aiSummary.recommendedLeadershipActions
        .map((a) => {
          const urgencyColor =
            a.urgency === 'immediate'
              ? '#ef4444'
              : a.urgency === 'this-quarter'
                ? '#f59e0b'
                : '#6366f1';
          const urgencyLabel =
            a.urgency === 'immediate'
              ? 'Immediate'
              : a.urgency === 'this-quarter'
                ? 'This Quarter'
                : 'Strategic';
          return `<div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
            <span style="font-size:13px; font-weight:600; color:#111827;">${a.action}</span>
            <span style="font-size:11px; font-weight:600; color:${urgencyColor}; background:${urgencyColor}18; padding:2px 8px; border-radius:20px;">${urgencyLabel}</span>
          </div>
          <div style="font-size:12px; color:#6b7280;">${a.rationale}</div>
        </div>`;
        })
        .join('')}
    </div>`
        : ''
    }

  </div>

  <!-- Footer -->
  <div style="padding:16px 30px; background:#f9fafb; border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af; font-size:12px; margin:0;">Generated by <strong>SignalTrue</strong> · ${quarterLabel} Quarterly Health Report · ${fmtDate(new Date())}</p>
    <p style="color:#9ca3af; font-size:12px; margin:4px 0 0;">This report aggregates behavioral pattern data. No message content or personal data included.</p>
  </div>
</div>
</body>
</html>`;
}

// ── Main: generate quarterly report for one org ───────────────────────────────

export async function generateQuarterlyReportForOrg(orgId, options = {}) {
  // Allow passing a reference date for testing (default: now)
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date();

  // We generate the report for the JUST-COMPLETED quarter (offset -1 from current date)
  // e.g. running on Jul 1 → generates Q2 report
  const currentQ = getQuarterBounds(referenceDate, 0);
  // On the first day of a new quarter, offset 0 IS the new quarter; we want the one that just ended
  // Simple heuristic: if today is within first 2 days of a quarter, generate for prior quarter
  const dayOfQuarter = Math.floor((referenceDate - currentQ.start) / (1000 * 60 * 60 * 24));
  const reportQ =
    dayOfQuarter <= 1 ? getQuarterBounds(referenceDate, -1) : getQuarterBounds(referenceDate, 0);
  const priorQ = getQuarterBounds(new Date(reportQ.start.getTime() - 1), 0); // quarter before reportQ

  console.log(`\n🔄 [QuarterlyReport] Generating ${reportQ.label} for org ${orgId}...`);

  // Guard: already generated?
  const existing = await QuarterlyReport.findByLabel(orgId, reportQ.label);
  if (existing && !options.force) {
    console.log(`[QuarterlyReport] ✅ ${reportQ.label} already exists — skipping`);
    return existing;
  }

  // Load monthly reports for the target quarter
  const monthlyReports = await MonthlyReport.find({
    orgId,
    periodEnd: {
      $gte: reportQ.start,
      $lte: new Date(reportQ.end.getTime() + 1000 * 60 * 60 * 24 * 5),
    }, // +5 days buffer
  }).sort({ periodEnd: 1 });

  if (monthlyReports.length < 2) {
    console.log(
      `[QuarterlyReport] ⚠️ Only ${monthlyReports.length} monthly report(s) found for ${reportQ.label} — need ≥2. Skipping.`
    );
    return null;
  }

  // Load prior quarter monthly reports for comparison
  const priorMonthlyReports = await MonthlyReport.find({
    orgId,
    periodEnd: {
      $gte: priorQ.start,
      $lte: new Date(priorQ.end.getTime() + 1000 * 60 * 60 * 24 * 5),
    },
  }).sort({ periodEnd: 1 });

  // Aggregate snapshots
  const currentSnapshot = aggregateMonthsIntoSnapshot(monthlyReports);
  const comparisonSnapshot =
    priorMonthlyReports.length >= 2 ? aggregateMonthsIntoSnapshot(priorMonthlyReports) : null;

  // Compute deltas
  let deltas = null;
  if (comparisonSnapshot) {
    const bdiDelta = safeDelta(currentSnapshot.avgBDI, comparisonSnapshot.avgBDI);
    const attritionRiskDelta = safeDelta(
      currentSnapshot.avgAttritionRisk,
      comparisonSnapshot.avgAttritionRisk
    );
    const executionDragDelta = safeDelta(
      currentSnapshot.executionDragAvg,
      comparisonSnapshot.executionDragAvg
    );
    const managerEffectivenessDelta = safeDelta(
      currentSnapshot.managerEffectivenessAvg,
      comparisonSnapshot.managerEffectivenessAvg
    );
    const teamWeeksAtRiskDelta = safeDelta(
      currentSnapshot.teamWeeksAtRisk,
      comparisonSnapshot.teamWeeksAtRisk
    );

    // Overall direction: BDI + attrition + teamWeeksAtRisk (all lower = better)
    const improvingCount = [bdiDelta, attritionRiskDelta, teamWeeksAtRiskDelta].filter(
      (d) => d != null && d < -2
    ).length;
    const worseningCount = [bdiDelta, attritionRiskDelta, teamWeeksAtRiskDelta].filter(
      (d) => d != null && d > 2
    ).length;

    let overallDirection = 'stable';
    if (improvingCount >= 2) overallDirection = 'improving';
    else if (worseningCount >= 2) overallDirection = 'deteriorating';

    const maxAbsDelta = Math.max(
      ...[bdiDelta, attritionRiskDelta, teamWeeksAtRiskDelta].filter((d) => d != null).map(Math.abs)
    );
    const overallDirectionStrength =
      maxAbsDelta > 10 ? 'strong' : maxAbsDelta > 4 ? 'moderate' : 'weak';

    deltas = {
      bdiDelta,
      attritionRiskDelta,
      executionDragDelta,
      managerEffectivenessDelta,
      teamWeeksAtRiskDelta,
      overallDirection,
      overallDirectionStrength,
    };
  }

  // Generate AI narrative
  const aiSummary = await generateQuarterlyAINarrative({
    current: currentSnapshot,
    comparison: comparisonSnapshot,
    quarterLabel: reportQ.label,
    priorQuarterLabel: priorQ.label,
    deltas,
  });

  // Upsert the report
  const reportData = {
    orgId,
    quarterLabel: reportQ.label,
    quarterNumber: reportQ.quarterNumber,
    year: reportQ.year,
    periodStart: reportQ.start,
    periodEnd: reportQ.end,
    sourceMonthlyReportIds: monthlyReports.map((m) => m._id),
    monthsIncluded: monthlyReports.length,
    current: currentSnapshot,
    comparison: comparisonSnapshot || undefined,
    deltas: deltas || undefined,
    aiSummary,
    reportVersion: '1.0',
    generatedAt: new Date(),
  };

  let report;
  if (existing) {
    Object.assign(existing, reportData);
    report = await existing.save();
  } else {
    report = await QuarterlyReport.create(reportData);
  }

  console.log(`✅ [QuarterlyReport] ${reportQ.label} generated for org ${orgId}`);
  console.log(
    `   BDI: ${currentSnapshot.avgBDI} | Trajectory: ${aiSummary.organizationalTrajectory} | Months: ${monthlyReports.length}`
  );

  return report;
}

// ── Generate for all orgs ─────────────────────────────────────────────────────

export async function generateQuarterlyReportsForAllOrgs(options = {}) {
  const orgs = await Organization.find({});
  console.log(
    `\n📊 [QuarterlyReport] Generating quarterly reports for ${orgs.length} organizations...`
  );

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const results = [];

  for (const org of orgs) {
    try {
      const report = await generateQuarterlyReportForOrg(org._id, options);
      if (report) {
        successCount++;
        results.push({
          orgId: org._id,
          orgName: org.name,
          status: 'generated',
          quarterLabel: report.quarterLabel,
        });

        // Send email
        await sendQuarterlyReportEmail(org, report);
      } else {
        skippedCount++;
        results.push({ orgId: org._id, orgName: org.name, status: 'skipped' });
      }
    } catch (err) {
      failedCount++;
      results.push({ orgId: org._id, orgName: org.name, status: 'failed', error: err.message });
      console.error(`[QuarterlyReport] ❌ Failed for ${org.name}:`, err.message);
    }
  }

  console.log(
    `✅ [QuarterlyReport] Done: ${successCount} generated, ${skippedCount} skipped, ${failedCount} failed`
  );
  return { successCount, skippedCount, failedCount, results };
}

// ── Email delivery ─────────────────────────────────────────────────────────────

export async function sendQuarterlyReportEmail(org, report) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[QuarterlyReport] No RESEND_API_KEY — skipping email for ${org.name}`);
    return;
  }

  // Build recipient list
  // 1. Users with roles: master_admin, hr_admin, executive
  const recipients = await User.find({
    orgId: org._id,
    role: { $in: ['master_admin', 'hr_admin', 'executive'] },
  }).select('email');

  const recipientEmails = recipients.map((u) => u.email);

  // 2. Merge org-level overrides (e.g. external CEO email)
  const overrides = org.settings?.quarterlyReportRecipients || [];
  const allRecipients = [...new Set([...recipientEmails, ...overrides])];

  if (allRecipients.length === 0) {
    console.warn(`[QuarterlyReport] No recipients for ${org.name} — skipping email`);
    return;
  }

  const html = generateQuarterlyEmailHTML({ org, report });
  const subject = `${report.quarterLabel} Quarterly Health Report — ${org.name}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'SignalTrue <reports@signaltrue.ai>',
    to: allRecipients,
    subject,
    html,
  });

  if (error) {
    console.error(`[QuarterlyReport] ❌ Email failed for ${org.name}:`, error);
    throw new Error(`Resend failed: ${error.message || error.name}`);
  }

  // Update report with delivery metadata
  report.emailSentAt = new Date();
  report.emailRecipients = allRecipients;
  await report.save();

  console.log(`[QuarterlyReport] ✅ Email sent to ${allRecipients.join(', ')} for ${org.name}`);

  // CC superadmin
  await ccSuperadmin({
    subject,
    html,
    originalRecipient: allRecipients.join(', '),
    reportType: 'Quarterly Health Report',
    orgName: org.name,
  });
}

// ── Read helpers (used by API routes) ─────────────────────────────────────────

export async function getLatestQuarterlyReport(orgId) {
  return QuarterlyReport.getLatestForOrg(orgId);
}

export async function getQuarterlyReportHistory(orgId, limit = 8) {
  return QuarterlyReport.getHistoryForOrg(orgId, limit);
}

export default {
  generateQuarterlyReportForOrg,
  generateQuarterlyReportsForAllOrgs,
  sendQuarterlyReportEmail,
  getLatestQuarterlyReport,
  getQuarterlyReportHistory,
  getQuarterBounds,
};
