import MonthlyReport from '../models/monthlyReport.js';
import QuarterlyReport from '../models/quarterlyReport.js';
import SemiAnnualReport from '../models/semiAnnualReport.js';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import { Resend } from 'resend';
import { ccSuperadmin } from './superadminNotifyService.js';
import { getQuarterBounds } from './quarterlyReportService.js';

/**
 * Semi-Annual Report Service
 *
 * Covers H1 (Jan–Jun) or H2 (Jul–Dec).
 * Compares against prior half AND same half prior year (YoY).
 * Aggregates from QuarterlyReport documents (falls back to MonthlyReports if needed).
 *
 * Generated: Jan 1 at 6 AM (H2 of prior year) and Jul 1 at 6 AM (H1 of current year).
 * Recipients: executive, master_admin (+ org.settings.semiAnnualReportRecipients overrides)
 */

// ── Half-year date boundaries ─────────────────────────────────────────────────

/**
 * Returns { start, end, label, halfNumber, year } for a half-year window.
 * halfOffset = 0 → current half, -1 → prior half, etc.
 */
export function getHalfBounds(date = new Date(), halfOffset = 0) {
  const d = new Date(date);
  const month = d.getUTCMonth(); // 0-based
  const year = d.getUTCFullYear();
  const halfNumber = month < 6 ? 1 : 2;

  const targetHalf = halfNumber + halfOffset;
  let adjustedYear = year;
  let adjustedH = targetHalf;
  while (adjustedH < 1) { adjustedH += 2; adjustedYear -= 1; }
  while (adjustedH > 2) { adjustedH -= 2; adjustedYear += 1; }

  const startMonth = adjustedH === 1 ? 0 : 6; // Jan or Jul
  const endMonth = adjustedH === 1 ? 5 : 11; // Jun or Dec
  const start = new Date(Date.UTC(adjustedYear, startMonth, 1));
  const end = new Date(Date.UTC(adjustedYear, endMonth + 1, 0, 23, 59, 59, 999));

  return {
    start,
    end,
    label: `${adjustedYear}-H${adjustedH}`,
    halfNumber: adjustedH,
    year: adjustedYear,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeDelta(current, prior) {
  if (current == null || prior == null) return null;
  return Math.round((current - prior) * 10) / 10;
}

function calcTrend(firstValue, lastValue, improvingWhenDown = true) {
  if (firstValue == null || lastValue == null) return 'stable';
  const delta = lastValue - firstValue;
  if (Math.abs(delta) < 3) return 'stable';
  const isGettingBetter = improvingWhenDown ? delta < 0 : delta > 0;
  return isGettingBetter ? 'improving' : 'deteriorating';
}

function calcTrendStrength(firstValue, lastValue) {
  if (firstValue == null || lastValue == null) return 'weak';
  const delta = Math.abs(lastValue - firstValue);
  if (delta > 15) return 'strong';
  if (delta > 5) return 'moderate';
  return 'weak';
}

// ── Aggregate quarterly reports into a half-year snapshot ────────────────────

function aggregateQuartersIntoHalfSnapshot(quarterlyReports, halfLabel, halfStart, halfEnd) {
  if (!quarterlyReports || quarterlyReports.length === 0) return null;

  const sorted = [...quarterlyReports].sort((a, b) => a.periodEnd - b.periodEnd);
  const n = sorted.length;

  // BDI: average
  const avgBDI = sorted.reduce((s, q) => s + (q.current?.avgBDI || 0), 0) / n;
  const firstBDI = sorted[0].current?.avgBDI;
  const lastBDI = sorted[n - 1].current?.avgBDI;
  const bdiTrend = calcTrend(firstBDI, lastBDI, true);
  const trendStrength = calcTrendStrength(firstBDI, lastBDI);

  // Zone distribution: cumulative
  const zoneDistribution = sorted.reduce(
    (acc, q) => {
      acc.stable += q.current?.zoneDistribution?.stable || 0;
      acc.stretched += q.current?.zoneDistribution?.stretched || 0;
      acc.critical += q.current?.zoneDistribution?.critical || 0;
      acc.recovery += q.current?.zoneDistribution?.recovery || 0;
      return acc;
    },
    { stable: 0, stretched: 0, critical: 0, recovery: 0 }
  );

  const teamWeeksAtRisk = sorted.reduce((s, q) => s + (q.current?.teamWeeksAtRisk || 0), 0);

  // Quarter breakdown
  const quarterBreakdown = sorted.map((q) => ({
    quarterLabel: q.quarterLabel,
    avgBDI: q.current?.avgBDI,
    teamWeeksAtRisk: q.current?.teamWeeksAtRisk,
    organizationalTrajectory: q.current?.organizationalTrajectory || q.aiSummary?.organizationalTrajectory,
  }));

  // Structural risks: appeared in both quarters
  const riskCounts = {};
  for (const q of sorted) {
    for (const r of q.current?.persistentRisks || []) {
      if (!riskCounts[r.riskType]) {
        riskCounts[r.riskType] = { riskType: r.riskType, quartersPresent: 0, scores: [], teamCounts: [] };
      }
      riskCounts[r.riskType].quartersPresent++;
      riskCounts[r.riskType].scores.push(r.avgScore || 0);
      riskCounts[r.riskType].teamCounts.push(r.affectedTeamCount || 0);
    }
  }

  const structuralRisks = Object.values(riskCounts).map((r) => ({
    riskType: r.riskType,
    quartersPresent: r.quartersPresent,
    avgScore: Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length),
    affectedTeamCount: Math.round(r.teamCounts.reduce((a, b) => a + b, 0) / r.teamCounts.length),
  }));

  // Manager effectiveness
  const managerScores = sorted.map((q) => q.current?.managerEffectivenessAvg).filter(Boolean);
  const managerEffectivenessAvg =
    managerScores.length > 0 ? managerScores.reduce((a, b) => a + b, 0) / managerScores.length : 0;
  const managerEffectivenessTrend = calcTrend(managerScores[0], managerScores[managerScores.length - 1], false);

  // Equity
  const equityScores = sorted.map((q) => q.current?.equityScoreAvg).filter(Boolean);
  const equityScoreAvg =
    equityScores.length > 0 ? equityScores.reduce((a, b) => a + b, 0) / equityScores.length : 100;

  // Attrition
  const attrValues = sorted.map((q) => q.current?.avgAttritionRisk).filter((v) => v != null);
  const avgAttritionRisk = attrValues.length > 0 ? attrValues.reduce((a, b) => a + b, 0) / attrValues.length : 0;
  const peakAttritionRisk = attrValues.length > 0 ? Math.max(...attrValues) : 0;
  const criticalIndividualsPeak = Math.max(...sorted.map((q) => q.current?.criticalIndividualsPeak || 0));

  // Execution
  const dragValues = sorted.map((q) => q.current?.executionDragAvg).filter((v) => v != null);
  const executionDragAvg = dragValues.length > 0 ? dragValues.reduce((a, b) => a + b, 0) / dragValues.length : 0;

  const totalCrises = sorted.reduce((s, q) => s + (q.current?.totalCrises || 0), 0);

  // Trajectory
  const trajectoryOrder = ['critical', 'concerning', 'stable', 'positive'];
  const worstTrajectory = sorted.reduce((worst, q) => {
    const t = q.aiSummary?.organizationalTrajectory || 'stable';
    return trajectoryOrder.indexOf(t) < trajectoryOrder.indexOf(worst) ? t : worst;
  }, 'positive');

  return {
    halfLabel,
    periodStart: halfStart,
    periodEnd: halfEnd,
    avgBDI: Math.round(avgBDI * 10) / 10,
    bdiTrend,
    trendStrength,
    zoneDistribution,
    teamWeeksAtRisk,
    quarterBreakdown,
    structuralRisks,
    managerEffectivenessAvg: Math.round(managerEffectivenessAvg),
    managerEffectivenessTrend,
    equityScoreAvg: Math.round(equityScoreAvg),
    avgAttritionRisk: Math.round(avgAttritionRisk * 10) / 10,
    peakAttritionRisk: Math.round(peakAttritionRisk * 10) / 10,
    criticalIndividualsPeak,
    executionDragAvg: Math.round(executionDragAvg * 10) / 10,
    totalCrises,
    seasonalityProfile: [], // populated below if quarterly data allows
    organizationalTrajectory: worstTrajectory,
    monthsIncluded: sorted.reduce((s, q) => s + (q.monthsIncluded || 0), 0),
    quartersIncluded: sorted.length,
  };
}

// Fallback: build half-year snapshot directly from MonthlyReports when no quarterly reports exist
function aggregateMonthsIntoHalfSnapshot(monthlyReports, halfLabel, halfStart, halfEnd) {
  if (!monthlyReports || monthlyReports.length === 0) return null;
  const sorted = [...monthlyReports].sort((a, b) => a.periodEnd - b.periodEnd);
  const n = sorted.length;

  const avgBDI = sorted.reduce((s, m) => s + (m.orgHealth?.avgBDI || 0), 0) / n;
  const firstBDI = sorted[0].orgHealth?.avgBDI;
  const lastBDI = sorted[n - 1].orgHealth?.avgBDI;
  const bdiTrend = calcTrend(firstBDI, lastBDI, true);
  const trendStrength = calcTrendStrength(firstBDI, lastBDI);

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

  const teamWeeksAtRisk = sorted.reduce(
    (s, m) =>
      s + (m.orgHealth?.zoneDistribution?.stretched || 0) + (m.orgHealth?.zoneDistribution?.critical || 0),
    0
  );

  const riskCounts = {};
  for (const m of sorted) {
    for (const r of m.persistentRisks || []) {
      if (!riskCounts[r.riskType]) riskCounts[r.riskType] = { riskType: r.riskType, quartersPresent: 0, scores: [], teamCounts: [] };
      riskCounts[r.riskType].quartersPresent++;
      riskCounts[r.riskType].scores.push(r.avgScore || 0);
      riskCounts[r.riskType].teamCounts.push(r.affectedTeams?.length || 0);
    }
  }
  const structuralRisks = Object.values(riskCounts).map((r) => ({
    riskType: r.riskType,
    quartersPresent: r.quartersPresent,
    avgScore: Math.round(r.scores.reduce((a, b) => a + b, 0) / r.scores.length),
    affectedTeamCount: Math.round(r.teamCounts.reduce((a, b) => a + b, 0) / r.teamCounts.length),
  }));

  const managerScores = sorted.map((m) => m.leadershipSignals?.managerEffectiveness?.avgScore).filter(Boolean);
  const managerEffectivenessAvg = managerScores.length > 0 ? managerScores.reduce((a, b) => a + b, 0) / managerScores.length : 0;
  const managerEffectivenessTrend = calcTrend(managerScores[0], managerScores[managerScores.length - 1], false);

  const equityScores = sorted.map((m) => m.leadershipSignals?.equityScoreAvg).filter(Boolean);
  const equityScoreAvg = equityScores.length > 0 ? equityScores.reduce((a, b) => a + b, 0) / equityScores.length : 100;

  const attrValues = sorted.map((m) => m.retentionExposure?.avgAttritionRisk).filter((v) => v != null);
  const avgAttritionRisk = attrValues.length > 0 ? attrValues.reduce((a, b) => a + b, 0) / attrValues.length : 0;
  const peakAttritionRisk = attrValues.length > 0 ? Math.max(...attrValues) : 0;
  const criticalIndividualsPeak = Math.max(...sorted.map((m) => m.retentionExposure?.criticalIndividualsCount || 0));

  const dragValues = sorted.map((m) => m.executionSignals?.executionDragAvg).filter((v) => v != null);
  const executionDragAvg = dragValues.length > 0 ? dragValues.reduce((a, b) => a + b, 0) / dragValues.length : 0;

  const totalCrises = sorted.reduce((s, m) => s + (m.crisisPatterns?.totalCrises || 0), 0);

  const trajectoryOrder = ['critical', 'concerning', 'stable', 'positive'];
  const worstTrajectory = sorted.reduce((worst, m) => {
    const t = m.aiSummary?.organizationalTrajectory || 'stable';
    return trajectoryOrder.indexOf(t) < trajectoryOrder.indexOf(worst) ? t : worst;
  }, 'positive');

  return {
    halfLabel,
    periodStart: halfStart,
    periodEnd: halfEnd,
    avgBDI: Math.round(avgBDI * 10) / 10,
    bdiTrend,
    trendStrength,
    zoneDistribution,
    teamWeeksAtRisk,
    quarterBreakdown: [],
    structuralRisks,
    managerEffectivenessAvg: Math.round(managerEffectivenessAvg),
    managerEffectivenessTrend,
    equityScoreAvg: Math.round(equityScoreAvg),
    avgAttritionRisk: Math.round(avgAttritionRisk * 10) / 10,
    peakAttritionRisk: Math.round(peakAttritionRisk * 10) / 10,
    criticalIndividualsPeak,
    executionDragAvg: Math.round(executionDragAvg * 10) / 10,
    totalCrises,
    seasonalityProfile: [],
    organizationalTrajectory: worstTrajectory,
    monthsIncluded: sorted.length,
    quartersIncluded: 0,
  };
}

// ── AI narrative ──────────────────────────────────────────────────────────────

async function generateSemiAnnualAINarrative({
  current,
  priorHalf,
  sameHalfPriorYear,
  halfLabel,
  priorHalfLabel,
  priorYearHalfLabel,
  deltasVsPriorHalf,
  deltasVsPriorYear,
}) {
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const priorText = priorHalf
      ? `Prior half (${priorHalfLabel}): BDI ${priorHalf.avgBDI}, trend ${priorHalf.bdiTrend}, attrition ${priorHalf.avgAttritionRisk}, trajectory ${priorHalf.organizationalTrajectory}.`
      : 'No prior half-year data available.';

    const yoyText = sameHalfPriorYear
      ? `Same period last year (${priorYearHalfLabel}): BDI ${sameHalfPriorYear.avgBDI}, attrition ${sameHalfPriorYear.avgAttritionRisk}, trajectory ${sameHalfPriorYear.organizationalTrajectory}.`
      : 'No year-on-year data available yet.';

    const deltaText = deltasVsPriorHalf
      ? `Changes vs prior half: BDI ${deltasVsPriorHalf.bdiDelta > 0 ? '+' : ''}${deltasVsPriorHalf.bdiDelta}, attrition ${deltasVsPriorHalf.attritionRiskDelta > 0 ? '+' : ''}${deltasVsPriorHalf.attritionRiskDelta}, execution drag ${deltasVsPriorHalf.executionDragDelta > 0 ? '+' : ''}${deltasVsPriorHalf.executionDragDelta}.`
      : '';

    const quarterBreakdownText =
      current.quarterBreakdown?.length > 0
        ? current.quarterBreakdown.map((q) => `${q.quarterLabel}: BDI ${q.avgBDI}, ${q.teamWeeksAtRisk} team-weeks at risk`).join(' | ')
        : 'No quarter breakdown available';

    const prompt = `You are a Chief People Officer preparing a semi-annual organizational health summary for the board and CEO. Be precise, evidence-based, and direct. Focus on structural patterns, not individual weeks.

Semi-Annual Report: ${halfLabel}
---
Current period data:
- Average BDI: ${current.avgBDI}/100
- BDI trend across the half: ${current.bdiTrend} (${current.trendStrength})
- Team-weeks in Watch/Critical: ${current.teamWeeksAtRisk}
- Quarter breakdown: ${quarterBreakdownText}
- Structural risks (both quarters): ${current.structuralRisks.map((r) => `${r.riskType} (${r.quartersPresent}/2 quarters)`).join(', ') || 'none'}
- Manager effectiveness avg: ${current.managerEffectivenessAvg}/100 (${current.managerEffectivenessTrend})
- Avg attrition risk: ${current.avgAttritionRisk}, peak: ${current.peakAttritionRisk}
- Critical individuals at peak: ${current.criticalIndividualsPeak}
- Execution drag avg: ${current.executionDragAvg}/100
- Total crises: ${current.totalCrises}
- Overall trajectory: ${current.organizationalTrajectory}

${priorText}
${deltaText}

${yoyText}

Write the following JSON object (no markdown, no code blocks):
{
  "executiveSummary": "2-3 sentence board-level headline summary of this half-year",
  "narrative": "4-5 paragraph strategic narrative covering the full half-year, trajectory, structural patterns, and what leadership should understand",
  "halfVsPriorHalf": "Paragraph comparing this half to the prior half with specific data",
  "yearOnYearInsight": "Paragraph comparing to same period last year, or null if no data",
  "seasonalPatterns": ["observed patterns that may repeat next year"],
  "structuralConditions": ["conditions that persisted both quarters — true organizational characteristics"],
  "resolvedConditions": ["conditions present in prior half that are now resolved"],
  "headcountAndCapacityInsights": ["insights relevant to headcount planning and capacity decisions for the next half"],
  "leadershipDecisionsRequired": [
    { "decision": "specific decision needed", "rationale": "evidence", "urgency": "immediate|this-half|strategic" }
  ],
  "organizationalTrajectory": "positive|stable|concerning|critical"
}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2200,
    });

    const text = response.choices[0].message.content.trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('[SemiAnnualReport] AI narrative failed:', err.message);
    return {
      executiveSummary: `Semi-annual report for ${halfLabel}. Average BDI: ${current.avgBDI}/100. Trajectory: ${current.organizationalTrajectory}.`,
      narrative: `This report covers ${halfLabel}. The organization's average BDI was ${current.avgBDI}/100 with a ${current.bdiTrend} trend. ${current.teamWeeksAtRisk} team-weeks were spent in Watch or Critical zones.`,
      halfVsPriorHalf: priorHalf ? `Prior half BDI was ${priorHalf.avgBDI} vs ${current.avgBDI} this half.` : 'No prior half data available.',
      yearOnYearInsight: null,
      seasonalPatterns: [],
      structuralConditions: current.structuralRisks.filter((r) => r.quartersPresent >= 2).map((r) => r.riskType),
      resolvedConditions: [],
      headcountAndCapacityInsights: [],
      leadershipDecisionsRequired: [],
      organizationalTrajectory: current.organizationalTrajectory,
    };
  }
}

// ── Email HTML ────────────────────────────────────────────────────────────────

function generateSemiAnnualEmailHTML({ org, report }) {
  const { current, priorHalf, sameHalfPriorYear, deltasVsPriorHalf, deltasVsPriorYear, aiSummary, halfLabel, periodStart, periodEnd } = report;

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const bdiColor = current.avgBDI < 35 ? '#22c55e' : current.avgBDI < 60 ? '#f59e0b' : '#ef4444';
  const trajectoryEmoji = { positive: '🟢', stable: '🔵', concerning: '🟡', critical: '🔴' }[aiSummary.organizationalTrajectory] || '🔵';

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

  <div style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#3b82f6 100%); color:white; padding:36px 30px 28px;">
    <div style="font-size:11px; opacity:0.7; margin-bottom:8px; text-transform:uppercase; letter-spacing:1.5px;">Semi-Annual Organizational Health Report</div>
    <h1 style="margin:0 0 4px; font-size:28px; font-weight:700;">${org.name}</h1>
    <div style="font-size:14px; opacity:0.85;">${halfLabel} · ${fmtDate(periodStart)} – ${fmtDate(periodEnd)}</div>
  </div>

  <!-- Executive summary banner -->
  <div style="background:#f0f9ff; padding:20px 30px; border-bottom:3px solid #3b82f6;">
    <div style="font-size:12px; font-weight:600; color:#1e40af; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Executive Summary</div>
    <p style="font-size:15px; color:#1e3a5f; font-weight:500; margin:0; line-height:1.6;">${aiSummary.executiveSummary}</p>
  </div>

  <!-- Trajectory + key numbers -->
  <div style="padding:24px 30px 0;">
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
      <span style="font-size:28px;">${trajectoryEmoji}</span>
      <div>
        <div style="font-size:16px; font-weight:700; color:#111827; text-transform:capitalize;">Trajectory: ${aiSummary.organizationalTrajectory}</div>
        <div style="font-size:13px; color:#6b7280;">${halfLabel} · ${current.quartersIncluded > 0 ? current.quartersIncluded + ' quarters' : current.monthsIncluded + ' months'} of data</div>
      </div>
    </div>

    <table style="border-collapse:collapse; width:100%; margin-bottom:24px;">
      <tr>
        <td style="padding:14px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:20%;">
          <div style="font-size:26px; font-weight:700; color:${bdiColor};">${current.avgBDI}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Avg BDI</div>
        </td>
        <td style="padding:3px;"></td>
        <td style="padding:14px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:20%;">
          <div style="font-size:26px; font-weight:700; color:#374151;">${current.teamWeeksAtRisk}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Team-Weeks at Risk</div>
        </td>
        <td style="padding:3px;"></td>
        <td style="padding:14px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:20%;">
          <div style="font-size:26px; font-weight:700; color:#374151;">${current.structuralRisks.filter((r) => r.quartersPresent >= 2).length}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Structural Risks</div>
        </td>
        <td style="padding:3px;"></td>
        <td style="padding:14px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:20%;">
          <div style="font-size:26px; font-weight:700; color:#374151;">${current.criticalIndividualsPeak}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Peak Critical Individuals</div>
        </td>
        <td style="padding:3px;"></td>
        <td style="padding:14px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:20%;">
          <div style="font-size:26px; font-weight:700; color:#374151;">${current.totalCrises}</div>
          <div style="font-size:11px; color:#6b7280; margin-top:2px;">Crisis Events</div>
        </td>
      </tr>
    </table>

    <!-- Quarter breakdown -->
    ${current.quarterBreakdown?.length > 0 ? `
    <div style="background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:14px 16px; margin-bottom:24px;">
      <div style="font-size:12px; font-weight:600; color:#374151; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:10px;">Quarter Breakdown</div>
      <table style="border-collapse:collapse; width:100%;">
        ${current.quarterBreakdown.map((q) => `
        <tr>
          <td style="padding:5px 8px; font-size:13px; font-weight:600; color:#374151;">${q.quarterLabel}</td>
          <td style="padding:5px 8px; font-size:13px; color:#4b5563;">BDI ${q.avgBDI}</td>
          <td style="padding:5px 8px; font-size:13px; color:#4b5563;">${q.teamWeeksAtRisk} team-weeks at risk</td>
          <td style="padding:5px 8px; font-size:12px; text-align:right; text-transform:capitalize; color:${{ positive: '#22c55e', stable: '#6366f1', concerning: '#f59e0b', critical: '#ef4444' }[q.organizationalTrajectory] || '#9ca3af'}; font-weight:600;">${q.organizationalTrajectory || '—'}</td>
        </tr>`).join('')}
      </table>
    </div>` : ''}

    <!-- vs Prior Half delta table -->
    ${priorHalf ? `
    <div style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; margin-bottom:24px;">
      <div style="background:#f8fafc; padding:10px 16px; border-bottom:1px solid #e5e7eb;">
        <span style="font-size:13px; font-weight:600; color:#374151;">Changes vs Prior Half (${priorHalf.halfLabel || 'prior'})</span>
      </div>
      <table style="border-collapse:collapse; width:100%;">
        ${deltaRow('BDI (lower = better)', deltasVsPriorHalf?.bdiDelta, true)}
        ${deltaRow('Team-Weeks at Risk', deltasVsPriorHalf?.teamWeeksAtRiskDelta, true)}
        ${deltaRow('Attrition Risk', deltasVsPriorHalf?.attritionRiskDelta, true)}
        ${deltaRow('Execution Drag', deltasVsPriorHalf?.executionDragDelta, true)}
        ${deltaRow('Manager Effectiveness', deltasVsPriorHalf?.managerEffectivenessDelta, false)}
      </table>
    </div>` : ''}

    <!-- YoY comparison (if available) -->
    ${sameHalfPriorYear && deltasVsPriorYear?.yoyDataAvailable ? `
    <div style="background:#fefce8; border:1px solid #fde68a; border-radius:8px; padding:14px 16px; margin-bottom:24px;">
      <div style="font-size:12px; font-weight:600; color:#92400e; margin-bottom:6px;">Year-on-Year (vs ${sameHalfPriorYear.halfLabel})</div>
      <p style="font-size:13px; color:#78350f; margin:0; line-height:1.6;">${aiSummary.yearOnYearInsight || 'See narrative below.'}</p>
    </div>` : ''}

    <!-- Narrative -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Strategic Narrative</h2>
      ${aiSummary.narrative.split('\n\n').filter(Boolean).map((p) => `<p style="color:#4b5563; font-size:14px; line-height:1.7; margin:0 0 12px;">${p}</p>`).join('')}
    </div>

    <!-- Structural conditions -->
    ${aiSummary.structuralConditions?.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Structural Conditions</h2>
      ${aiSummary.structuralConditions.map((c) => `
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px;">
        <span style="color:#ef4444; font-size:14px; margin-top:1px;">⚠</span>
        <span style="font-size:13px; color:#4b5563;">${c}</span>
      </div>`).join('')}
    </div>` : ''}

    <!-- Headcount & capacity insights -->
    ${aiSummary.headcountAndCapacityInsights?.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Headcount & Capacity Insights</h2>
      ${aiSummary.headcountAndCapacityInsights.map((i) => `
      <div style="display:flex; align-items:flex-start; gap:8px; margin-bottom:6px;">
        <span style="color:#6366f1; font-size:14px; margin-top:1px;">→</span>
        <span style="font-size:13px; color:#4b5563;">${i}</span>
      </div>`).join('')}
    </div>` : ''}

    <!-- Leadership decisions -->
    ${aiSummary.leadershipDecisionsRequired?.length > 0 ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827; font-size:17px; font-weight:700; margin:0 0 12px;">Leadership Decisions Required</h2>
      ${aiSummary.leadershipDecisionsRequired.map((a) => {
        const urgencyColor = a.urgency === 'immediate' ? '#ef4444' : a.urgency === 'this-half' ? '#f59e0b' : '#6366f1';
        const urgencyLabel = a.urgency === 'immediate' ? 'Immediate' : a.urgency === 'this-half' ? 'This Half' : 'Strategic';
        return `<div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:8px; padding:12px 16px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
            <span style="font-size:13px; font-weight:600; color:#111827;">${a.decision}</span>
            <span style="font-size:11px; font-weight:600; color:${urgencyColor}; background:${urgencyColor}18; padding:2px 8px; border-radius:20px;">${urgencyLabel}</span>
          </div>
          <div style="font-size:12px; color:#6b7280;">${a.rationale}</div>
        </div>`;
      }).join('')}
    </div>` : ''}

  </div>

  <div style="padding:16px 30px; background:#f9fafb; border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af; font-size:12px; margin:0;">Generated by <strong>SignalTrue</strong> · ${halfLabel} Semi-Annual Health Report · ${fmtDate(new Date())}</p>
    <p style="color:#9ca3af; font-size:12px; margin:4px 0 0;">Behavioral pattern data only. No personal data, message content, or individual tracking included.</p>
  </div>
</div>
</body>
</html>`;
}

// ── Main: generate semi-annual report for one org ─────────────────────────────

export async function generateSemiAnnualReportForOrg(orgId, options = {}) {
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date();

  // Determine which half just ended
  const currentH = getHalfBounds(referenceDate, 0);
  const dayOfHalf = Math.floor((referenceDate - currentH.start) / (1000 * 60 * 60 * 24));
  const reportH = dayOfHalf <= 1 ? getHalfBounds(referenceDate, -1) : getHalfBounds(referenceDate, 0);
  const priorH = getHalfBounds(new Date(reportH.start.getTime() - 1), 0);

  // Same half, one year ago
  const priorYearH = {
    start: new Date(Date.UTC(reportH.year - 1, reportH.halfNumber === 1 ? 0 : 6, 1)),
    end: new Date(Date.UTC(reportH.year - 1, reportH.halfNumber === 1 ? 5 : 11 + 1, 0, 23, 59, 59, 999)),
    label: `${reportH.year - 1}-H${reportH.halfNumber}`,
  };

  console.log(`\n🔄 [SemiAnnualReport] Generating ${reportH.label} for org ${orgId}...`);

  // Guard: already generated?
  const existing = await SemiAnnualReport.findByLabel(orgId, reportH.label);
  if (existing && !options.force) {
    console.log(`[SemiAnnualReport] ✅ ${reportH.label} already exists — skipping`);
    return existing;
  }

  // ── Load data ───────────────────────────────────────────────────────────────

  // Try quarterly reports first
  const currentQReports = await QuarterlyReport.find({
    orgId,
    periodEnd: { $gte: reportH.start, $lte: new Date(reportH.end.getTime() + 1000 * 60 * 60 * 24 * 5) },
  }).sort({ periodEnd: 1 });

  // Fallback to monthly reports if no quarterly available
  const currentMReports =
    currentQReports.length === 0
      ? await MonthlyReport.find({
          orgId,
          periodEnd: { $gte: reportH.start, $lte: new Date(reportH.end.getTime() + 1000 * 60 * 60 * 24 * 5) },
        }).sort({ periodEnd: 1 })
      : [];

  // Guard: insufficient data
  const totalDataPoints = currentQReports.length + currentMReports.length;
  if (totalDataPoints < 2) {
    console.log(`[SemiAnnualReport] ⚠️ Only ${totalDataPoints} data point(s) for ${reportH.label} — need ≥2. Skipping.`);
    return null;
  }

  // Prior half
  const priorQReports = await QuarterlyReport.find({
    orgId,
    periodEnd: { $gte: priorH.start, $lte: new Date(priorH.end.getTime() + 1000 * 60 * 60 * 24 * 5) },
  }).sort({ periodEnd: 1 });
  const priorMReports =
    priorQReports.length === 0
      ? await MonthlyReport.find({
          orgId,
          periodEnd: { $gte: priorH.start, $lte: new Date(priorH.end.getTime() + 1000 * 60 * 60 * 24 * 5) },
        }).sort({ periodEnd: 1 })
      : [];

  // Prior year same half
  const priorYearQReports = await QuarterlyReport.find({
    orgId,
    periodEnd: { $gte: priorYearH.start, $lte: new Date(priorYearH.end.getTime() + 1000 * 60 * 60 * 24 * 5) },
  }).sort({ periodEnd: 1 });
  const priorYearMReports =
    priorYearQReports.length === 0
      ? await MonthlyReport.find({
          orgId,
          periodEnd: { $gte: priorYearH.start, $lte: new Date(priorYearH.end.getTime() + 1000 * 60 * 60 * 24 * 5) },
        }).sort({ periodEnd: 1 })
      : [];

  // ── Aggregate ───────────────────────────────────────────────────────────────

  const currentSnapshot =
    currentQReports.length > 0
      ? aggregateQuartersIntoHalfSnapshot(currentQReports, reportH.label, reportH.start, reportH.end)
      : aggregateMonthsIntoHalfSnapshot(currentMReports, reportH.label, reportH.start, reportH.end);

  const priorSnapshot =
    priorQReports.length >= 1
      ? aggregateQuartersIntoHalfSnapshot(priorQReports, priorH.label, priorH.start, priorH.end)
      : priorMReports.length >= 2
      ? aggregateMonthsIntoHalfSnapshot(priorMReports, priorH.label, priorH.start, priorH.end)
      : null;

  const priorYearSnapshot =
    priorYearQReports.length >= 1
      ? aggregateQuartersIntoHalfSnapshot(priorYearQReports, priorYearH.label, priorYearH.start, priorYearH.end)
      : priorYearMReports.length >= 2
      ? aggregateMonthsIntoHalfSnapshot(priorYearMReports, priorYearH.label, priorYearH.start, priorYearH.end)
      : null;

  // ── Deltas ───────────────────────────────────────────────────────────────────

  let deltasVsPriorHalf = null;
  if (priorSnapshot) {
    const bdiDelta = safeDelta(currentSnapshot.avgBDI, priorSnapshot.avgBDI);
    const attritionRiskDelta = safeDelta(currentSnapshot.avgAttritionRisk, priorSnapshot.avgAttritionRisk);
    const executionDragDelta = safeDelta(currentSnapshot.executionDragAvg, priorSnapshot.executionDragAvg);
    const managerEffectivenessDelta = safeDelta(currentSnapshot.managerEffectivenessAvg, priorSnapshot.managerEffectivenessAvg);
    const teamWeeksAtRiskDelta = safeDelta(currentSnapshot.teamWeeksAtRisk, priorSnapshot.teamWeeksAtRisk);
    const improvingCount = [bdiDelta, attritionRiskDelta, teamWeeksAtRiskDelta].filter((d) => d != null && d < -2).length;
    const worseningCount = [bdiDelta, attritionRiskDelta, teamWeeksAtRiskDelta].filter((d) => d != null && d > 2).length;
    let overallDirection = 'stable';
    if (improvingCount >= 2) overallDirection = 'improving';
    else if (worseningCount >= 2) overallDirection = 'deteriorating';
    const maxAbs = Math.max(...([bdiDelta, attritionRiskDelta, teamWeeksAtRiskDelta].filter((d) => d != null).map(Math.abs)));
    deltasVsPriorHalf = {
      bdiDelta, attritionRiskDelta, executionDragDelta, managerEffectivenessDelta, teamWeeksAtRiskDelta,
      overallDirection,
      overallDirectionStrength: maxAbs > 10 ? 'strong' : maxAbs > 4 ? 'moderate' : 'weak',
    };
  }

  let deltasVsPriorYear = { yoyDataAvailable: false };
  if (priorYearSnapshot) {
    const bdiDelta = safeDelta(currentSnapshot.avgBDI, priorYearSnapshot.avgBDI);
    const attritionRiskDelta = safeDelta(currentSnapshot.avgAttritionRisk, priorYearSnapshot.avgAttritionRisk);
    const executionDragDelta = safeDelta(currentSnapshot.executionDragAvg, priorYearSnapshot.executionDragAvg);
    const improvingCount = [bdiDelta, attritionRiskDelta].filter((d) => d != null && d < -2).length;
    const worseningCount = [bdiDelta, attritionRiskDelta].filter((d) => d != null && d > 2).length;
    let overallDirection = 'stable';
    if (improvingCount >= 1) overallDirection = 'improving';
    else if (worseningCount >= 1) overallDirection = 'deteriorating';
    deltasVsPriorYear = { bdiDelta, attritionRiskDelta, executionDragDelta, overallDirection, yoyDataAvailable: true };
  }

  // ── AI narrative ──────────────────────────────────────────────────────────────

  const aiSummary = await generateSemiAnnualAINarrative({
    current: currentSnapshot,
    priorHalf: priorSnapshot,
    sameHalfPriorYear: priorYearSnapshot,
    halfLabel: reportH.label,
    priorHalfLabel: priorH.label,
    priorYearHalfLabel: priorYearH.label,
    deltasVsPriorHalf,
    deltasVsPriorYear,
  });

  // ── Save ──────────────────────────────────────────────────────────────────────

  const reportData = {
    orgId,
    halfLabel: reportH.label,
    halfNumber: reportH.halfNumber,
    year: reportH.year,
    periodStart: reportH.start,
    periodEnd: reportH.end,
    sourceQuarterlyReportIds: currentQReports.map((q) => q._id),
    sourceMonthlyReportIds: currentMReports.map((m) => m._id),
    current: currentSnapshot,
    priorHalf: priorSnapshot || undefined,
    sameHalfPriorYear: priorYearSnapshot || undefined,
    deltasVsPriorHalf: deltasVsPriorHalf || undefined,
    deltasVsPriorYear,
    aiSummary,
    reportVersion: '1.0',
    generatedAt: new Date(),
  };

  let report;
  if (existing) {
    Object.assign(existing, reportData);
    report = await existing.save();
  } else {
    report = await SemiAnnualReport.create(reportData);
  }

  console.log(`✅ [SemiAnnualReport] ${reportH.label} generated for org ${orgId}`);
  console.log(`   BDI: ${currentSnapshot.avgBDI} | Trajectory: ${aiSummary.organizationalTrajectory} | YoY: ${deltasVsPriorYear.yoyDataAvailable}`);

  return report;
}

// ── Generate for all orgs ─────────────────────────────────────────────────────

export async function generateSemiAnnualReportsForAllOrgs(options = {}) {
  const orgs = await Organization.find({});
  console.log(`\n📊 [SemiAnnualReport] Generating semi-annual reports for ${orgs.length} organizations...`);

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const results = [];

  for (const org of orgs) {
    try {
      const report = await generateSemiAnnualReportForOrg(org._id, options);
      if (report) {
        successCount++;
        results.push({ orgId: org._id, orgName: org.name, status: 'generated', halfLabel: report.halfLabel });
        await sendSemiAnnualReportEmail(org, report);
      } else {
        skippedCount++;
        results.push({ orgId: org._id, orgName: org.name, status: 'skipped' });
      }
    } catch (err) {
      failedCount++;
      results.push({ orgId: org._id, orgName: org.name, status: 'failed', error: err.message });
      console.error(`[SemiAnnualReport] ❌ Failed for ${org.name}:`, err.message);
    }
  }

  console.log(`✅ [SemiAnnualReport] Done: ${successCount} generated, ${skippedCount} skipped, ${failedCount} failed`);
  return { successCount, skippedCount, failedCount, results };
}

// ── Email delivery ─────────────────────────────────────────────────────────────

export async function sendSemiAnnualReportEmail(org, report) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[SemiAnnualReport] No RESEND_API_KEY — skipping email for ${org.name}`);
    return;
  }

  // Recipients: executive + master_admin, plus org overrides
  const recipients = await User.find({
    orgId: org._id,
    role: { $in: ['master_admin', 'executive'] },
  }).select('email');

  const recipientEmails = recipients.map((u) => u.email);
  const overrides = org.settings?.semiAnnualReportRecipients || [];
  const allRecipients = [...new Set([...recipientEmails, ...overrides])];

  if (allRecipients.length === 0) {
    console.warn(`[SemiAnnualReport] No recipients for ${org.name} — skipping email`);
    return;
  }

  const html = generateSemiAnnualEmailHTML({ org, report });
  const subject = `${report.halfLabel} Semi-Annual Health Report — ${org.name}`;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'SignalTrue <reports@signaltrue.ai>',
    to: allRecipients,
    subject,
    html,
  });

  if (error) {
    console.error(`[SemiAnnualReport] ❌ Email failed for ${org.name}:`, error);
    throw new Error(`Resend failed: ${error.message || error.name}`);
  }

  report.emailSentAt = new Date();
  report.emailRecipients = allRecipients;
  await report.save();

  console.log(`[SemiAnnualReport] ✅ Email sent to ${allRecipients.join(', ')} for ${org.name}`);

  await ccSuperadmin({
    subject,
    html,
    originalRecipient: allRecipients.join(', '),
    reportType: 'Semi-Annual Health Report',
    orgName: org.name,
  });
}

// ── Read helpers ───────────────────────────────────────────────────────────────

export async function getLatestSemiAnnualReport(orgId) {
  return SemiAnnualReport.getLatestForOrg(orgId);
}

export async function getSemiAnnualReportHistory(orgId, limit = 4) {
  return SemiAnnualReport.getHistoryForOrg(orgId, limit);
}

export default {
  generateSemiAnnualReportForOrg,
  generateSemiAnnualReportsForAllOrgs,
  sendSemiAnnualReportEmail,
  getLatestSemiAnnualReport,
  getSemiAnnualReportHistory,
  getHalfBounds,
};
