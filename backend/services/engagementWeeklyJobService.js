/**
 * Engagement Weekly Job Service
 *
 * Orchestrates the full weekly Engagement Strain Risk calculation pipeline.
 * Implements the pseudo-process from spec Section 14.
 *
 * Pipeline per team:
 *   1. Privacy gate — apply the organization's minimum active-person threshold
 *   2. Aggregate weekly metrics from EngagementTeamDaily
 *   3. Get or create EngagementBaseline
 *   4. Compute per-metric risks → 7 subscores
 *   5. Compute overall Engagement Strain Risk
 *   6. Compute confidence score
 *   7. Determine trend vs previous week
 *   8. Detect top drivers
 *   9. Save EngagementStrainWeekly
 *
 * This job is intended to run every Monday morning via the scheduler.
 * It can also be triggered manually for backfill.
 *
 * Usage:
 *   import { runWeeklyEngagementStrainJob } from './engagementWeeklyJobService.js';
 *   await runWeeklyEngagementStrainJob(orgId, new Date('2026-05-11'));
 */

import Team from '../models/team.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import TeamSizeGate from '../models/teamSizeGate.js';

import { aggregateWeeklyMetrics } from './engagementWeeklyMetricsService.js';
import { computeAndSaveBaseline } from './engagementBaselineService.js';
import { calculateSubscores } from './engagementSubscoreService.js';
import {
  calculateOverallScore,
  getRiskState,
  getTrend,
  getPreviousWeekScore,
  calculateConfidenceScore,
  getTopDrivers,
} from './engagementScoringService.js';
import { checkTeamSize, resolveMinimumTeamSize } from '../utils/privacyGate.js';
import { detectPatterns } from './engagementPatternService.js';
import { generateRecommendations } from './engagementRecommendationService.js';

export const SCORING_VERSION = '2.0.0';

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Run the full weekly Engagement Strain Risk calculation for all eligible
 * teams in an org.
 *
 * @param {string|ObjectId} orgId
 * @param {Date|string} weekStart  — Monday of the week to compute (Date or YYYY-MM-DD)
 * @returns {Object}               — { processed, suppressed, errors }
 */
export async function runWeeklyEngagementStrainJob(orgId, weekStart) {
  const weekStartStr = toDateStr(weekStart);

  console.info(`[EngagementWeeklyJob] Starting for org ${orgId}, week ${weekStartStr}`);

  const teams = await Team.find({ orgId }).lean();
  const minimumTeamSize = await resolveMinimumTeamSize(orgId);

  let processed = 0;
  let suppressed = 0;
  const errors = [];

  for (const team of teams) {
    try {
      const result = await runForTeam(orgId, team._id, weekStartStr, minimumTeamSize);
      if (result === 'suppressed') {
        suppressed++;
      } else {
        processed++;
      }
    } catch (err) {
      console.error(`[EngagementWeeklyJob] Error for team ${team._id}:`, err.message);
      errors.push({ teamId: String(team._id), error: err.message });
    }
  }

  console.info(
    `[EngagementWeeklyJob] Done for org ${orgId} week ${weekStartStr}: ` +
      `processed=${processed}, suppressed=${suppressed}, errors=${errors.length}`
  );

  return { processed, suppressed, errors };
}

// ── Per-Team Pipeline ──────────────────────────────────────────────────────────

async function runForTeam(orgId, teamId, weekStartStr, minimumTeamSize) {
  // ── Step 1: Aggregate weekly metrics ──────────────────────────────────────
  const weekly = await aggregateWeeklyMetrics(teamId, weekStartStr);

  if (!weekly) {
    await suppressWeek(teamId, orgId, weekStartStr, 'no_weekly_data', 0, minimumTeamSize);
    return 'suppressed';
  }

  // ── Step 2: Privacy gate ───────────────────────────────────────────────────
  if (!checkTeamSize(weekly.activePeopleCount, minimumTeamSize)) {
    await suppressWeek(
      teamId,
      orgId,
      weekStartStr,
      'below_minimum_team_size',
      weekly.activePeopleCount,
      minimumTeamSize
    );
    return 'suppressed';
  }

  // ── Step 3: Get or refresh baseline ───────────────────────────────────────
  // computeAndSaveBaseline returns the current baseline (upserts if stale)
  const asOfDate = new Date(weekStartStr + 'T00:00:00Z');
  const baseline = await computeAndSaveBaseline(orgId, teamId, asOfDate);
  if (!baseline?.isValid) {
    await suppressWeek(
      teamId,
      orgId,
      weekStartStr,
      'insufficient_baseline',
      weekly.activePeopleCount,
      minimumTeamSize
    );
    return 'suppressed';
  }

  // ── Step 4: Compute subscores ──────────────────────────────────────────────
  const { subscores, metricRisks } = calculateSubscores(weekly, baseline);

  // ── Step 5: Overall score ──────────────────────────────────────────────────
  const engagementStrainRisk = calculateOverallScore(subscores);
  const engagementConditionsScore = 100 - engagementStrainRisk;

  // ── Step 6: Confidence ────────────────────────────────────────────────────
  const { score: confidenceScore, label: confidenceLabel } = calculateConfidenceScore({
    baseline,
    weeklyMetrics: weekly,
    activePeopleCount: weekly.activePeopleCount,
    minimumTeamSize,
    integrationCoverage: weekly.integrationCoverage,
    subscores,
  });

  // ── Step 7: Trend ─────────────────────────────────────────────────────────
  const previousScore = await getPreviousWeekScore(teamId, weekStartStr);
  const trend = getTrend(engagementStrainRisk, previousScore);

  // ── Step 8: Top drivers ───────────────────────────────────────────────────
  const topDrivers = getTopDrivers(subscores, metricRisks, baseline, weekly);

  // ── Step 9: Pattern detection ─────────────────────────────────────────────
  const patterns = detectPatterns(subscores, metricRisks, weekly);

  // ── Step 10: Recommended actions ─────────────────────────────────────────
  const recommendedActions = generateRecommendations(subscores, patterns);

  // ── Step 11: Save ──────────────────────────────────────────────────────────
  const doc = await EngagementStrainWeekly.findOneAndUpdate(
    { teamId, weekStart: weekStartStr },
    {
      $set: {
        orgId,
        teamId,
        weekStart: weekStartStr,
        activePeopleCount: weekly.activePeopleCount,
        engagementStrainRisk,
        engagementConditionsScore,
        riskState: getRiskState(engagementStrainRisk),
        trend,
        confidenceScore,
        confidenceLabel,
        subscores: {
          recoveryDebt: subscores.recoveryDebt,
          focusErosion: subscores.focusErosion,
          coordinationFriction: subscores.coordinationFriction,
          responsivenessPressure: subscores.responsivenessPressure,
          collaborationWithdrawal: subscores.collaborationWithdrawal,
          managerSupportGap: subscores.managerSupportGap,
          workloadVolatility: subscores.workloadVolatility,
        },
        topDrivers,
        patterns,
        recommendedActions,
        scoringVersion: SCORING_VERSION,
        _weeklyMetricsSnapshot: weekly,
      },
    },
    { upsert: true, new: true }
  );

  console.info(
    `[EngagementWeeklyJob] Team ${teamId} week ${weekStartStr}: ` +
      `risk=${engagementStrainRisk} (${getRiskState(engagementStrainRisk)}), ` +
      `trend=${trend}, confidence=${confidenceScore}`
  );

  return doc;
}

// ── Suppression Logging ────────────────────────────────────────────────────────

async function suppressWeek(teamId, orgId, weekStart, reason, reportedSize, minRequired) {
  await EngagementStrainWeekly.deleteOne({ teamId, weekStart });
  await logSuppression(teamId, orgId, weekStart, reason, reportedSize, minRequired);
}

async function logSuppression(teamId, orgId, weekStart, reason, reportedSize, minRequired = 1) {
  try {
    await TeamSizeGate.create({
      teamId,
      orgId,
      endpoint: `engagementWeeklyJob:${weekStart}`,
      reportedSize,
      minRequired,
      reason,
      suppressedAt: new Date(),
    });
  } catch {
    // Non-fatal — suppression logging must not block the main job
  }
}

// ── Utility ────────────────────────────────────────────────────────────────────

function toDateStr(date) {
  if (typeof date === 'string') return date;
  return new Date(date).toISOString().split('T')[0];
}
