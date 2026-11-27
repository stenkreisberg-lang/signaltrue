import {currentReportRecipients,verifyClaimRecipients} from './reportRecipients.js';
import MonthlyReport from '../models/monthlyReport.js';
import TeamState from '../models/teamState.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import ManagerEffectiveness from '../models/managerEffectiveness.js';
import EquitySignal from '../models/equitySignal.js';
import SuccessionRisk from '../models/successionRisk.js';
import CrisisEvent from '../models/crisisEvent.js';
import ProjectRisk from '../models/projectRisk.js';
import MeetingROI from '../models/meetingROI.js';
import NetworkHealth from '../models/networkHealth.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import { readMonthlyWorkPatterns } from './monthlyWorkPatternEvidence.js';
import mongoose from 'mongoose';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import WorkEvent from '../models/workEvent.js';
import Intervention from '../models/intervention.js';
import ManagerWorkAction from '../models/managerWorkAction.js';
import { Resend } from 'resend';
import { ccSuperadmin } from './superadminNotifyService.js';
import WeeklyBriefDispatch from '../models/weeklyBriefDispatch.js';
import { resolveMinimumTeamSize } from '../utils/privacyGate.js';

/**
 * Monthly Report Service
 *
 * Generates strategic organizational health review by aggregating 30-day patterns.
 * Detects persistent risks, classifies structural vs episodic issues.
 * Leadership-focused, not tactical.
 *
 * Triggered: Monthly on the 1st at 4:00 AM
 */

const PERSISTENT_RISK_WEEKS = 3; // Risk must be elevated for ≥3 weeks to be "persistent"
const STRUCTURAL_THRESHOLD = 0.7; // 70% of period = structural, not episodic
const CATCH_ALL_TEAM_RE = /^(unassigned|general|other|unknown|default|everyone|all)$/i;

/**
 * Generate monthly report for an organization
 */
export async function generateMonthlyReportForOrg(orgId) {
  orgId = new mongoose.Types.ObjectId(String(orgId));
  try {
    console.log(`\n🔄 Generating monthly report for org ${orgId}...`);

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 30);

    const minimumTeamSize = await resolveMinimumTeamSize(orgId);
    const allTeams = await Team.find({ orgId, isActive: { $ne: false } });
    const memberCounts = await User.aggregate([
      { $match: { orgId, accountStatus: { $ne: 'inactive' } } },
      { $group: { _id: '$teamId', count: { $sum: 1 } } },
    ]);
    const memberCountByTeam = new Map(
      memberCounts.map((row) => [String(row._id || 'unassigned'), row.count])
    );
    const teams = allTeams.filter(
      (team) =>
        !CATCH_ALL_TEAM_RE.test(team.name) &&
        team.analyticsEnabled !== false &&
        (memberCountByTeam.get(String(team._id)) || 0) >= minimumTeamSize
    );
    const memberIds = await User.distinct('_id', { orgId, accountStatus: { $ne: 'inactive' } });
    const totalUsers = memberIds.length;
    const mappedUsers = await WorkEvent.distinct('actorUserId', {
      orgId, actorUserId: { $in: memberIds }, timestamp: { $gte: periodStart, $lte: periodEnd },
    });
    const activeByTeam = await WorkEvent.aggregate([
      {
        $match: {
          orgId,
          teamId: { $in: teams.map((team) => team._id) },
          actorUserId: { $in: memberIds },
          timestamp: { $gte: periodStart, $lte: periodEnd },
        },
      },
      { $group: { _id: '$teamId', users: { $addToSet: '$actorUserId' } } },
    ]);
    const representedTeams = activeByTeam.filter(row => row.users.length >= minimumTeamSize).map(row => row._id);
    const readyTeams = representedTeams.length;
    const userCoveragePct =
      totalUsers > 0 ? Math.round((mappedUsers.length / totalUsers) * 100) : 0;
    const teamCoveragePct = teams.length > 0 ? Math.round((readyTeams / teams.length) * 100) : 0;

    const teamIds = teams.map(team => team._id);
    const { weeklySnapshots, calendarWeeks, messagingWeeks, ...workPatterns } =
      await readMonthlyWorkPatterns(orgId, periodStart, periodEnd, memberIds, minimumTeamSize);

    const [
      measuredOrgHealth,
      persistentRisks,
      leadershipSignals,
      executionSignals,
      retentionExposure,
      topStructuralDrivers,
      crisisPatterns,
    ] = await Promise.all([
      calculateOrgHealth(teams, orgId, periodStart, periodEnd),
      identifyPersistentRisks(teams, periodStart, periodEnd),
      calculateLeadershipSignals(teams, periodStart, periodEnd),
      calculateExecutionSignals(teams, periodStart, periodEnd),
      calculateRetentionExposure(),
      getTopStructuralDrivers(teams, periodStart, periodEnd),
      analyzeCrisisPatterns(teams, periodStart, periodEnd),
    ]);

    const orgHealth = { ...measuredOrgHealth, ...workPatterns };
    const engagementSignals = await calculateEngagementSignals(
      orgId,
      teamIds,
      periodStart,
      periodEnd,
      minimumTeamSize
    );
    const reportMode =
      userCoveragePct >= 80 &&
      teamCoveragePct >= 80 &&
      Math.max(calendarWeeks, messagingWeeks) >= 3 &&
      teams.length > 0
        ? 'decision'
        : 'setup';
    const readinessStatus =
      userCoveragePct >= 80 && teamCoveragePct >= 80
        ? 'ready'
        : userCoveragePct >= 40
          ? 'partial'
          : 'needs_mapping';

    const interventions = await Intervention.find({
      orgId, teamId: { $in: [null, ...representedTeams] },
      $or: [
        { startDate: { $gte: periodStart, $lte: periodEnd } },
        { endDate: { $gte: periodStart, $lte: periodEnd } },
        { reviewDate: { $gte: periodStart, $lte: periodEnd } },
        { recheckDate: { $gte: periodStart, $lte: periodEnd } },
        { 'outcomeDelta.computedAt': { $gte: periodStart, $lte: periodEnd } },
        { status: { $in: ['planned', 'active', 'pending-recheck'] } },
      ],
    })
      .populate('teamId', 'name')
      .sort({ updatedAt: -1 })
      .lean();
    const measuredInterventions = interventions.filter(
      (item) => item.outcomeDelta?.computedAt != null
    );
    const reviews = await ManagerWorkAction.find({ orgId, teamId: { $in: representedTeams },
      $or: [{ 'outcome14.measuredAt': { $gte: periodStart, $lte: periodEnd } },
        { 'outcome28.measuredAt': { $gte: periodStart, $lte: periodEnd } }],
    }).select('outcome14 outcome28').lean();
    const latestOutcomes = reviews.map(action => [action.outcome28, action.outcome14].find(review =>
      review?.measuredAt >= periodStart && review.measuredAt <= periodEnd));
    const actionOutcomes = {
      managerReviewed: latestOutcomes.length,
      managerImproved: latestOutcomes.filter(review => review?.status === 'improved').length,
      managerInsufficient: latestOutcomes.filter(review => review?.status === 'insufficient_evidence').length,
      measured: measuredInterventions.length,
      improved: measuredInterventions.filter((item) => item.outcomeDelta?.improved).length,
      active: interventions.filter((item) =>
        ['planned', 'active', 'pending-recheck'].includes(item.status)
      ).length,
      items: interventions.slice(0, 5).map((item) => ({
        title: item.title || item.actionTaken || item.interventionType || 'Action',
        teamName: item.teamId?.name || '',
        status: item.status,
        percentChange: item.outcomeDelta?.percentChange,
        improved: item.outcomeDelta?.improved,
        reviewDate: item.reviewDate || item.recheckDate,
      })),
    };

    const monthlyReport = new MonthlyReport({
      orgId,
      periodStart,
      periodEnd,
      reportMode,
      dataReadiness: {
        status: readinessStatus,
        mappedUsers: mappedUsers.length,
        totalUsers,
        userCoveragePct,
        readyTeams,
        eligibleTeams: teams.length,
        teamCoveragePct,
        weeklySnapshots, calendarWeeks, messagingWeeks,
        minimumTeamSize,
      },
      actionOutcomes,
      orgHealth,
      persistentRisks,
      leadershipSignals,
      executionSignals,
      retentionExposure,
      engagementSignals,
      topStructuralDrivers,
      crisisPatterns,
    });

    await monthlyReport.save();

    console.log(`Monthly report generated for org ${orgId}`);
    console.log(`   BDI: ${orgHealth.avgBDI}/100 (${orgHealth.bdiTrend})`);
    console.log(`   Avg participant-hours/week: ${orgHealth.avgMeetingHoursWeekly}h`);
    console.log(`   Avg back-to-back blocks: ${orgHealth.avgBackToBackBlocks}`);
    console.log(`   Outside work schedule: ${orgHealth.avgAfterHoursPct}%`);

    return monthlyReport;
  } catch (error) {
    console.error('Error generating monthly report:', error);
    throw error;
  }
}

/**
 * Calculate organizational health metrics
 */
async function calculateOrgHealth(teams, orgId, periodStart, periodEnd) {
  // Use BehavioralDriftIndex as the source of BDI scores and zone distribution
  const bdiRecords = await BehavioralDriftIndex.find({
    orgId, teamId: { $in: teams.map(team => team._id) }, driftScore: { $type: 'number' },
    periodStart: { $gte: periodStart, $lte: periodEnd },
  }).sort({ periodStart: -1 });

  // Get most recent BDI record per team
  const latestBDI = [];
  const seenTeams = new Set();
  for (const record of bdiRecords) {
    const key = record.teamId.toString();
    if (!seenTeams.has(key)) {
      latestBDI.push(record);
      seenTeams.add(key);
    }
  }

  const avgBDI =
    latestBDI.length > 0
      ? Math.round(latestBDI.reduce((sum, r) => sum + r.driftScore, 0) / latestBDI.length)
      : null;

  // Map BDI states to zone labels used in the email template
  const zoneDistribution = {
    stable: latestBDI.filter((r) => r.state === 'Stable').length,
    stretched: latestBDI.filter((r) => r.state === 'Early Drift').length,
    critical: latestBDI.filter((r) => r.state === 'Critical Drift').length,
    recovery: latestBDI.filter((r) => r.state === 'Developing Drift').length,
  };

  const teamsAtRisk =
    zoneDistribution.stretched + zoneDistribution.critical + zoneDistribution.recovery;

  const bdiTrend = calculateBDITrend(bdiRecords);

  return {
    avgBDI,
    bdiTrend: bdiTrend.direction,
    trendStrength: bdiTrend.strength,
    zoneDistribution,
    teamsAtRisk,
  };
}

/**
 * Calculate BDI trend across period
 */
function calculateBDITrend(bdiRecords) {
  const periods = new Map();
  for (const row of bdiRecords) {
    const day = new Date(row.periodStart).toISOString().slice(0,10);
    if (!periods.has(day)) periods.set(day, new Map());
    periods.get(day).set(String(row.teamId), row.driftScore);
  }
  const days = [...periods.keys()].sort();
  if (days.length < 2) return { direction: 'unavailable', strength: null };
  const first = periods.get(days[0]);
  const last = periods.get(days[days.length - 1]);
  const teams = [...first.keys()];
  if (first.size !== last.size || !teams.every(id => last.has(id))) return { direction: 'unavailable', strength: null };
  const avgFirst = teams.reduce((total,id) => total + first.get(id), 0) / teams.length;
  const avgSecond = teams.reduce((total,id) => total + last.get(id), 0) / teams.length;
  const delta = avgSecond - avgFirst;

  let direction = 'stable';
  let strength = 'weak';

  if (delta < -5) {
    direction = 'improving';
    strength = delta < -15 ? 'strong' : 'moderate';
  } else if (delta > 5) {
    direction = 'deteriorating';
    strength = delta > 15 ? 'strong' : 'moderate';
  }

  return { direction, strength };
}

/**
 * Identify persistent risks (elevated ≥3 weeks)
 */
async function identifyPersistentRisks(teams, periodStart, periodEnd) {
  const teamIds = teams.map((t) => t._id);
  const persistentRisks = [];

  // Get all TeamStates in period — field is weekStart, not weekEnd
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekStart: { $gte: periodStart, $lte: periodEnd },
  })
    .sort({ weekStart: 1 })
    .populate('teamId');

  // Map risk types to TeamState intelligenceScores fields
  const riskMappings = [
    {
      riskType: 'overload',
      scorer: (s) => (s.state === 'overloaded' || s.state === 'breaking' ? 60 : 0),
    },
    {
      riskType: 'execution',
      scorer: (s) => (s.state === 'strained' || s.state === 'breaking' ? 50 : 0),
    },
  ];

  for (const { riskType, scorer } of riskMappings) {
    const teamRiskWeeks = {};

    teamStates.forEach((state) => {
      const teamId = state.teamId?._id?.toString() || state.teamId?.toString();
      if (!teamId) return;
      const riskScore = scorer(state);

      if (riskScore >= 35) {
        if (!teamRiskWeeks[teamId]) {
          teamRiskWeeks[teamId] = {
            teamId: state.teamId?._id || state.teamId,
            teamName: state.teamId?.name || 'Unknown',
            weeks: 0,
            scores: [],
          };
        }
        teamRiskWeeks[teamId].weeks++;
        teamRiskWeeks[teamId].scores.push(riskScore);
      }
    });

    const affectedTeams = Object.values(teamRiskWeeks).filter(
      (t) => t.weeks >= PERSISTENT_RISK_WEEKS
    );

    if (affectedTeams.length > 0) {
      const totalWeeks = Math.max(
        1,
        new Set(teamStates.map((state) => new Date(state.weekStart).toISOString().slice(0, 10)))
          .size
      );
      const avgWeeksElevated =
        affectedTeams.reduce((sum, t) => sum + t.weeks, 0) / affectedTeams.length;
      const classification =
        avgWeeksElevated / totalWeeks >= STRUCTURAL_THRESHOLD ? 'structural' : 'episodic';
      const avgScore =
        affectedTeams.reduce(
          (sum, t) => sum + t.scores.reduce((a, b) => a + b, 0) / t.scores.length,
          0
        ) / affectedTeams.length;

      persistentRisks.push({
        riskType,
        weeksAboveThreshold: Math.round(avgWeeksElevated),
        avgScore: Math.round(avgScore),
        affectedTeams: affectedTeams.map((t) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          score: Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length),
        })),
        classification,
      });
    }
  }

  return persistentRisks;
}

/**
 * Calculate leadership signals
 */
async function calculateLeadershipSignals(teams, periodStart, periodEnd) {
  const teamIds = teams.map((t) => t._id);

  // Manager effectiveness
  const managerData = await ManagerEffectiveness.find({
    teamId: { $in: teamIds },
    createdAt: { $gte: periodStart, $lte: periodEnd },
  }).sort({ createdAt: -1 });

  const latestManagerData = [];
  const seenManagers = new Set();
  for (const data of managerData) {
    const key = `${data.managerId}-${data.teamId}`;
    if (!seenManagers.has(key)) {
      latestManagerData.push(data);
      seenManagers.add(key);
    }
  }

  const avgManagerScore =
    latestManagerData.length > 0
      ? latestManagerData.reduce((sum, m) => sum + (m.effectivenessScore || 0), 0) /
        latestManagerData.length
      : 0;

  const managersCriticalCount = latestManagerData.filter((m) => m.effectivenessScore < 45).length;
  const managersNeedCoachingCount = latestManagerData.filter(
    (m) => m.effectivenessScore < 65
  ).length;

  // Manager trend: split the full (chronologically ordered) dataset into first/second half
  const managerTrend = (() => {
    const sorted = [...managerData].sort((a, b) => a.createdAt - b.createdAt);
    if (sorted.length < 2) return 'stable';
    const mid = Math.floor(sorted.length / 2);
    const firstAvg =
      sorted.slice(0, mid).reduce((s, m) => s + (m.effectivenessScore || 0), 0) / mid;
    const secondAvg =
      sorted.slice(mid).reduce((s, m) => s + (m.effectivenessScore || 0), 0) /
      (sorted.length - mid);
    const delta = secondAvg - firstAvg;
    if (delta > 5) return 'improving';
    if (delta < -5) return 'deteriorating';
    return 'stable';
  })();

  // Equity signals
  const equityData = await EquitySignal.find({
    teamId: { $in: teamIds },
    createdAt: { $gte: periodStart, $lte: periodEnd },
  }).sort({ createdAt: -1 });

  const latestEquityData = [];
  const seenEquityTeams = new Set();
  for (const data of equityData) {
    if (!seenEquityTeams.has(data.teamId.toString())) {
      latestEquityData.push(data);
      seenEquityTeams.add(data.teamId.toString());
    }
  }

  const avgEquityScore =
    latestEquityData.length > 0
      ? latestEquityData.reduce((sum, e) => sum + (e.equityScore || 0), 0) / latestEquityData.length
      : 100;

  const equityIssuesCount = latestEquityData.filter((e) => e.equityScore < 70).length;

  // Succession risk
  const successionData = await SuccessionRisk.find({
    teamId: { $in: teamIds },
    createdAt: { $gte: periodStart, $lte: periodEnd },
  }).sort({ createdAt: -1 });

  const successionCriticalCount = successionData.filter((s) => s.busFactor < 2).length;
  const avgBusFactor =
    successionData.length > 0
      ? successionData.reduce((sum, s) => sum + (s.busFactor || 0), 0) / successionData.length
      : 3;

  return {
    managerEffectiveness: {
      avgScore: Math.round(avgManagerScore),
      managersCriticalCount,
      managersNeedCoachingCount,
      trend: managerTrend,
    },
    equityScoreAvg: Math.round(avgEquityScore),
    equityIssuesCount,
    successionCriticalCount,
    avgBusFactor: Math.round(avgBusFactor * 10) / 10,
  };
}

/**
 * Calculate execution signals
 */
async function calculateExecutionSignals(teams, periodStart, periodEnd) {
  const teamIds = teams.map((t) => t._id);

  // Get latest TeamStates for execution drag — field is weekStart not weekEnd
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekStart: { $gte: periodStart, $lte: periodEnd },
  }).sort({ weekStart: -1 });

  const latestStates = [];
  const seenTeams = new Set();
  for (const state of teamStates) {
    if (!seenTeams.has(state.teamId.toString())) {
      latestStates.push(state);
      seenTeams.add(state.teamId.toString());
    }
  }

  // Derive execution drag from TeamState: 'breaking'→80, 'strained'→50, 'overloaded'→60, 'healthy'→10
  const stateToScore = { healthy: 10, strained: 50, overloaded: 60, breaking: 80 };
  const executionDragAvg =
    latestStates.length > 0
      ? latestStates.reduce((sum, s) => sum + (stateToScore[s.state] || 0), 0) / latestStates.length
      : 0;

  // Project risk
  const projectRisks = await ProjectRisk.find({
    teamId: { $in: teamIds },
    calculatedAt: { $gte: periodStart, $lte: periodEnd },
    riskScore: { $gte: 60 },
  });

  const highRiskProjectsCount = projectRisks.length;

  // Meeting ROI
  const meetingData = await MeetingROI.find({
    teamId: { $in: teamIds },
    analyzedAt: { $gte: periodStart, $lte: periodEnd },
  });

  const lowROIMeetings = meetingData.filter((m) => m.roiScore < 40).length;
  const meetingROILowPercent =
    meetingData.length > 0 ? (lowROIMeetings / meetingData.length) * 100 : 0;

  // Network health
  const networkData = await NetworkHealth.findOne({
    teamId: { $in: teamIds },
  }).sort({ calculatedAt: -1 });

  const networkSiloScore = networkData?.siloScore || 0;

  // Decision velocity (derived from execution drag)
  const decisionVelocity =
    executionDragAvg < 35 ? 'fast' : executionDragAvg < 65 ? 'moderate' : 'slow';

  return {
    executionDragAvg: Math.round(executionDragAvg),
    highRiskProjectsCount,
    meetingROILowPercent: Math.round(meetingROILowPercent),
    decisionVelocity,
    networkSiloScore: Math.round(networkSiloScore),
  };
}

/**
 * Calculate retention exposure
 */
function calculateRetentionExposure() {
  return {
    avgAttritionRisk: 0,
    criticalIndividualsCount: 0,
    highRiskIndividualsCount: 0,
    trend: 'stable',
    estimatedTurnoverRisk: 0,
    validationStatus: 'unavailable',
    disabledReason:
      'Workplace metadata is not a validated basis for individual attrition prediction.',
  };
}

async function calculateEngagementSignals(orgId, teamIds, periodStart, periodEnd, minimumTeamSize) {
  const docs = await EngagementStrainWeekly.aggregate([
    {
      $match: {
        orgId,
        scoringVersion: '2.1.0',
        teamId: { $in: teamIds },
        weekStart: {
          $gte: periodStart.toISOString().slice(0, 10),
          $lte: periodEnd.toISOString().slice(0, 10),
        },
        activePeopleCount: { $gte: minimumTeamSize },
      },
    },
    { $sort: { teamId: 1, weekStart: -1 } },
    { $group: { _id: '$teamId', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
  ]);

  if (docs.length === 0) {
    return {
      avgStrainRisk: 0,
      avgConditionsScore: 0,
      worstRiskState: 'unknown',
      teamsMeasured: 0,
      teamsInStrain: 0,
      trend: 'unknown',
      topDrivers: [],
    };
  }

  const avg = (field) =>
    Math.round(docs.reduce((sum, doc) => sum + (doc[field] || 0), 0) / docs.length);
  const stateOrder = ['healthy', 'watch', 'strain', 'critical'];
  const worstRiskState = docs.reduce(
    (worst, doc) =>
      stateOrder.indexOf(doc.riskState) > stateOrder.indexOf(worst) ? doc.riskState : worst,
    'healthy'
  );
  const trendCounts = docs.reduce((counts, doc) => {
    counts[doc.trend] = (counts[doc.trend] || 0) + 1;
    return counts;
  }, {});
  const trend =
    trendCounts.rising > trendCounts.improving && trendCounts.rising > trendCounts.stable
      ? 'rising'
      : trendCounts.improving > trendCounts.rising && trendCounts.improving > trendCounts.stable
        ? 'improving'
        : 'stable';
  const driverScores = {};
  docs.forEach((doc) => {
    (doc.topDrivers || []).forEach((driver) => {
      if (!driverScores[driver.driver]) driverScores[driver.driver] = [];
      driverScores[driver.driver].push(driver.score || 0);
    });
  });
  const topDrivers = Object.entries(driverScores)
    .map(([driver, scores]) => ({
      driver,
      score: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    avgStrainRisk: avg('engagementStrainRisk'),
    avgConditionsScore: avg('engagementConditionsScore'),
    worstRiskState,
    teamsMeasured: docs.length,
    teamsInStrain: docs.filter((doc) => ['strain', 'critical'].includes(doc.riskState)).length,
    trend,
    topDrivers,
  };
}

/**
 * Get top structural drivers (org-wide patterns) — from BDI topDrivers
 */
async function getTopStructuralDrivers(teams, periodStart, periodEnd) {
  const teamIds = teams.map((t) => t._id);

  // BehavioralDriftIndex has topDrivers array with signal contributions
  const bdiRecords = await BehavioralDriftIndex.find({
    teamId: { $in: teamIds },
    periodStart: { $gte: periodStart, $lte: periodEnd },
  });

  // Aggregate drivers across all teams
  const driverAggregation = {};

  bdiRecords.forEach((record) => {
    if (record.topDrivers && record.topDrivers.length > 0) {
      record.topDrivers.forEach((driver) => {
        const metric = driver.signal || driver.metric;
        if (!metric) return;
        if (!driverAggregation[metric]) {
          driverAggregation[metric] = { metric, contributions: [], teams: new Set() };
        }
        driverAggregation[metric].contributions.push(driver.contribution || 0);
        driverAggregation[metric].teams.add(record.teamId.toString());
      });
    }
  });

  const drivers = Object.values(driverAggregation)
    .map((d) => ({
      metric: d.metric,
      avgDeviation: d.contributions.reduce((a, b) => a + b, 0) / d.contributions.length,
      teamsAffected: d.teams.size,
      severity:
        d.contributions.reduce((a, b) => a + b, 0) / d.contributions.length > 40
          ? 'critical'
          : d.contributions.reduce((a, b) => a + b, 0) / d.contributions.length > 20
            ? 'high'
            : 'medium',
    }))
    .sort((a, b) => b.avgDeviation - a.avgDeviation)
    .slice(0, 5);

  return drivers;
}

/**
 * Analyze crisis patterns
 */
async function analyzeCrisisPatterns(teams, periodStart, periodEnd) {
  const teamIds = teams.map((t) => t._id);

  const crises = await CrisisEvent.find({
    teamId: { $in: teamIds },
    detectedAt: { $gte: periodStart, $lte: periodEnd },
  });

  const totalCrises = crises.length;

  // Group by type
  const crisisByType = {};
  crises.forEach((crisis) => {
    const type = crisis.crisisType || crisis.type || 'unknown';
    if (!crisisByType[type]) {
      crisisByType[type] = 0;
    }
    crisisByType[type]++;
  });

  const crisisByTypeArray = Object.entries(crisisByType).map(([type, count]) => ({
    type,
    count,
  }));

  // Find teams with recurring crises (≥2 in period)
  const teamCrisisCounts = {};
  crises.forEach((crisis) => {
    const teamId = crisis.teamId.toString();
    teamCrisisCounts[teamId] = (teamCrisisCounts[teamId] || 0) + 1;
  });

  const teamsWithRecurringCrises = Object.values(teamCrisisCounts).filter(
    (count) => count >= 2
  ).length;

  return {
    totalCrises,
    crisisByType: crisisByTypeArray,
    teamsWithRecurringCrises,
  };
}

/**
 * Get latest monthly report for organization
 */
export async function getLatestMonthlyReport(orgId) {
  return MonthlyReport.getLatestForOrg(orgId);
}

/**
 * Get monthly report history
 */
export async function getMonthlyReportHistory(orgId, limit = 12) {
  return MonthlyReport.getHistoryForOrg(orgId, limit);
}

/**
 * Get leadership view of monthly report (filtered)
 */
export async function getLeadershipView(orgId) {
  const report = await MonthlyReport.getLatestForOrg(orgId);
  return report ? report.getLeadershipView() : null;
}

// ── HTML Email Generator ───────────────────────────────────────────────────────

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function monthlyLanguage(org) {
  return org.settings?.reportLanguage || (org.settings?.timezone === 'Europe/Tallinn' ? 'et' : 'en');
}

function monthlyTitle(org, report) {
  if (monthlyLanguage(org) === 'et') return report.reportMode === 'decision' ? 'Juhtkonna kuuaruanne' : 'Kuuaruanne andmete valmisoleku kohta';
  return report.reportMode === 'decision' ? 'Monthly Decision Brief' : 'Monthly Setup Brief';
}

export function generateMonthlyEmailHTML({ org, report }) {
  const language = monthlyLanguage(org);
  const locale = language === 'et' ? 'et-EE' : 'en-GB';
  const t = (en, et) => language === 'et' ? et : en;
  const formatDate = date => new Date(date).toLocaleDateString(locale, { timeZone: org.settings?.timezone || 'UTC', year:'numeric', month:'short', day:'numeric' });
  const unavailable = t('Insufficient evidence','Andmeid ei piisa');
  const value = (number, unit = '') => Number.isFinite(number) ? number.toLocaleString(locale) + unit : unavailable;
  const readiness = report.dataReadiness || {};
  const health = report.orgHealth || {};
  const outcomes = report.actionOutcomes || {};
  const rawUrl = process.env.FRONTEND_URL || 'https://www.signaltrue.ai';
  const appUrl = escapeHtml(rawUrl.replace(/\/$/, ''));
  const title = monthlyTitle(org, report);
  const header = `<!DOCTYPE html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="padding:24px 12px;background:#eff4f4;color:#173438;font-family:Arial,sans-serif;line-height:1.55"><div style="max-width:650px;margin:auto;background:white;padding:28px;border:1px solid #d5e2e0;border-radius:12px">
<p style="color:#12635e;font-weight:bold">${title}</p><h1 style="font-size:25px">${escapeHtml(org.name)}</h1>
<p>${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}</p>`;
  const footer = `<hr style="border:0;border-top:1px solid #d5e2e0"><p style="color:#586a70;font-size:12px">SignalTrue · ${t('Team-level metadata only.','Aruanne põhineb tiimide koondandmetel.')}</p></div></body></html>`;
  const stat = (label, result) => `<tr><td style="padding:6px 12px 6px 0;border-bottom:1px solid #d5e2e0">${escapeHtml(label)}</td><td style="padding:6px;text-align:right;border-bottom:1px solid #d5e2e0"><strong>${escapeHtml(result)}</strong></td></tr>`;
  if (report.reportMode !== 'decision') {
    return `${header}<h2>${t('Leadership conclusions are paused','Juhtimisjäreldusteks on andmeid liiga vähe')}</h2>
<p>${t('Check employee mapping and collect at least three full weeks with sufficient source coverage.','Kontrolli töötajate seost tiimidega. Aruandeks on vaja vähemalt kolme täisnädalat piisava andmekatvusega.')}</p>
<table>${stat(t('Mapped people','Seotud töötajaid'),value(readiness.mappedUsers)+' / '+value(readiness.totalUsers))}
${stat(t('Represented teams','Esindatud tiime'),value(readiness.readyTeams)+' / '+value(readiness.eligibleTeams))}
${stat(t('Calendar weeks with sufficient coverage','Piisava katvusega kalendrinädalaid'),value(readiness.calendarWeeks))}
${stat(t('Messaging weeks with sufficient coverage','Piisava katvusega sõnuminädalaid'),value(readiness.messagingWeeks))}</table>
<p><a href="${appUrl}/app/employees">${t('Review team setup','Kontrolli tiimide koosseisu')}</a></p>${footer}`;
  }
  const metric = (field, weeks, unit='') => {
    const number = health[field];
    // Earlier reports did not record source-specific coverage and defaulted nulls to zero.
    if ((weeks == null && number === 0) || (Number.isFinite(weeks) && weeks < 3)) return unavailable;
    return value(number, unit);
  };
  const risks = (report.persistentRisks || []).filter(r => ['overload','execution'].includes(r.riskType) && r.weeksAboveThreshold >= PERSISTENT_RISK_WEEKS);
  const risk = [...risks].sort((a,b) => (b.avgScore || 0) - (a.avgScore || 0))[0];
  const observedStrain = report.engagementSignals?.teamsInStrain > 0;
  const decision = risk?.riskType === 'overload'
    ? t('Review meeting schedules in the affected teams.','Vaadake nende tiimide koosolekute ajakava.')
    : risk?.riskType === 'execution' ? t('Review handoffs and approval steps with the affected team.','Vaadake tiimiga üle töö üleandmine ja kinnituste ooteajad.')
    : observedStrain ? t('Ask the team lead to review the work pattern behind the elevated score.','Uurige tiimijuhiga, milline töömuster selgitab kõrgemat näitu.')
    : t('Review the measured changes with team leads before changing work arrangements.','Enne töökorralduse muutmist arutage mõõdetud muutusi tiimijuhtidega.');
  const context = risk
    ? t(`The pattern reached an internal review threshold in ${risk.weeksAboveThreshold} measured weeks.`,`Töömuster ületas sisemise kontrolliläve ${risk.weeksAboveThreshold} mõõdetud nädalal.`)
    : observedStrain ? t('An internal measure crossed its review threshold. Its cause still needs investigation.','Sisemine näitaja ületas kontrolliläve. Muutuse põhjus vajab veel uurimist.')
    : t('These records provide no confirmed persistent pattern to prioritise.','Nendest andmetest ei ilmne kinnitatud püsivat mustrit, mida esmajärjekorras uurida.');
  const measure = risk?.riskType === 'overload'
    ? t('Compare participant-hours and back-to-back meeting counts at the next review.','Võrrelge järgmisel ülevaatusel osalejatunde ja järjestikuste kohtumiste arvu.')
    : t('Agree on one measured indicator with the team lead and review its baseline and follow-up in the next brief.','Valige tiimijuhiga üks mõõdetav näitaja ning võrrelge järgmises aruandes algtaset ja järelmõõtmist.');
  const measured = (outcomes.items || []).filter(item => Number.isFinite(item.percentChange)).slice(0,3);
  return `${header}<h2 style="font-size:20px">${decision}</h2><p>${context} ${measure}</p>
<p><strong>${t('Owner:', 'Vastutaja:')}</strong> ${t('Operations or HR with the team lead','Tegevusjuht või personalijuht koos tiimijuhiga')}</p>
<table style="width:100%;border-collapse:collapse">${stat(t('Meeting participant-hours per week','Koosolekute osalejatunnid nädalas'),metric('avgMeetingHoursWeekly',readiness.calendarWeeks,' h'))}
${stat(t('Distinct meetings per week','Eri koosolekuid nädalas'),metric('avgMeetingCount',readiness.calendarWeeks))}
${stat(t('Back-to-back transitions per week','Järjestikuseid kohtumisi nädalas'),metric('avgBackToBackBlocks',readiness.calendarWeeks))}
${stat(t('Share of messages sent outside working hours','Töövälisel ajal saadetud sõnumite osakaal'),metric('avgAfterHoursPct',readiness.messagingWeeks,'%'))}</table>
<p style="color:#52646a;font-size:13px">${t('Weeks represented','Esindatud nädalaid')} · ${t('Calendar','Kalender')} ${value(readiness.calendarWeeks)} · ${t('Messaging','Sõnumid')} ${value(readiness.messagingWeeks)}. ${t('Messaging share uses all observed messages in eligible weeks.','Sõnumite osakaal põhineb kõigil piisava katvusega nädalatel mõõdetud sõnumitel.')}</p>
<h2 style="font-size:18px">${t("Did last month's actions work?",'Mis muutus pärast juhtimisotsuseid?')}</h2>
${Number.isFinite(outcomes.managerReviewed) ? '<p>' + t('Manager actions reviewed','Järelkontrollitud juhtimistegevusi') + ': ' + value(outcomes.managerReviewed) + ' · ' + t('Improved','Soovitud suunas muutunud') + ': ' + value(outcomes.managerImproved) + ' · ' + t('Insufficient evidence','Andmeid ei piisa') + ': ' + value(outcomes.managerInsufficient) + '</p>' : ''}
${measured.length ? '<ul>'+measured.map(item=>`<li><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(value(item.percentChange,'%'))}</li>`).join('')+'</ul>' : '<p>'+t('No additional intervention has a recorded before-and-after result for this period.','Teiste tegevuste kohta pole selle perioodi enne-pärast tulemust salvestatud.')+'</p>'}
<p>${t('Other changes may also explain an observed result.','Mõõdetud muutusel võib olla ka teisi põhjuseid.')}</p>
<p><a href="${appUrl}/app/actions">${t('Review actions','Vaata tegevusi ja järelkontrolle')}</a></p>${footer}`;
}

/**
 * Returns true if the report has real data worth sending to a client.
 */
function reportHasRealData(report) {
  if (report.reportMode === 'setup') {
    return (report.dataReadiness?.totalUsers || 0) > 0;
  }
  if (Math.max(report.dataReadiness?.calendarWeeks ?? 0, report.dataReadiness?.messagingWeeks ?? 0) >= 3) return true;
  const meetHours = report.orgHealth?.avgMeetingHoursWeekly || 0;
  const bdi = report.orgHealth?.avgBDI || 0;
  const rci = report.orgHealth?.avgRCI || 0;
  const persistentRisks = (report.persistentRisks || []).length;
  return meetHours + bdi + rci + persistentRisks > 0;
}

export async function claimMonthlyDispatch(orgId, periodEnd, recipientCount) {
  const period = new Date(periodEnd);
  const start = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth(), 1));
  const end = new Date(Date.UTC(period.getUTCFullYear(), period.getUTCMonth() + 1, 1));
  const dispatchId = 'monthly:' + String(orgId) + ':' + start.toISOString().slice(0,7);
  // Earlier releases keyed sends by generation timestamp. Respect accepted and
  // ambiguous legacy claims before creating a claim for the entire month.
  const filter = { orgId: orgId, periodStart: { $gte: start, $lt: end },
    _id: { $regex: '^monthly:' + String(orgId) + ':' } };
  const existing = await WeeklyBriefDispatch.findOne(filter).select('status').lean();
  if (existing) {
    if (existing.status === 'sent') return { skipped: true, reason: 'already_sent', dispatchId };
    throw new Error('Monthly email send requires delivery reconciliation: ' + dispatchId);
  }
  const alreadySent = await MonthlyReport.exists({ orgId: orgId, periodEnd: { $gte: start, $lt: end }, emailSentAt: { $type: 'date' } });
  if (alreadySent) return { skipped: true, reason: 'already_sent', dispatchId };
  try {
    await WeeklyBriefDispatch.create({
      _id: dispatchId, orgId: orgId,
      periodStart: new Date(periodEnd),
      status: 'sending', recipientCount,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    const existing = await WeeklyBriefDispatch.findById(dispatchId).lean();
    if (existing?.status === 'sent') return { skipped: true, reason: 'already_sent', dispatchId };
    throw new Error('Monthly email send requires delivery reconciliation: ' + dispatchId);
  }
  return { dispatchId, skipped: false };
}

export async function sendMonthlyReportEmail(orgId, report, { previewOnly = false } = {}) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error(`[MonthlyReport] Org ${orgId} not found`);

  const periodLabel = new Date(report.periodEnd).toLocaleDateString(monthlyLanguage(org) === 'et' ? 'et-EE' : 'en-GB', {
    timeZone: org.settings?.timezone || 'UTC',
    month: 'long',
    year: 'numeric',
  });
  const subject = `${previewOnly ? 'PREVIEW - ' : ''}${monthlyTitle(org, report)} - ${org.name} - ${periodLabel}`;
  const html = generateMonthlyEmailHTML({ org, report });

  // Match the HR-approved organisation-wide weekly report recipient policy.
  const recipients = previewOnly ? [] : await currentReportRecipients(orgId);

  // ── Data quality gate: never send unmeasured report to clients ──────────────
  const hasData = reportHasRealData(report);
  if (!hasData) {
    console.warn(
      `[MonthlyReport] ⚠️  ${org.name}: report has no data yet — blocking client send, notifying superadmin only`
    );
    await ccSuperadmin({
      subject: `⚠️ DATA MISSING — ${subject}`,
      html: `<div style="background:#fef3c7;border:2px solid #f59e0b;padding:16px;border-radius:8px;font-family:sans-serif;margin-bottom:24px">
        <strong>⚠️ This report was NOT sent to the client.</strong><br/>
        There is insufficient evidence for a client report for <strong>${escapeHtml(org.name)}</strong>.<br/>
        Intended recipients: ${recipients.length > 0 ? recipients.map(escapeHtml).join(', ') : '(none found)'}<br/>
        Please check integrations and re-trigger once data is available.
      </div>${html}`,
      originalRecipient: '(blocked — no data)',
      reportType: 'Monthly Leadership Report',
      orgName: org.name,
    });
    return;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[MonthlyReport] No RESEND_API_KEY — skipping client send for ${org.name}, but copying superadmin`
    );
  } else if (recipients.length > 0) {
    const claim = await claimMonthlyDispatch(orgId, report.periodEnd, recipients.length);
    if (claim.skipped) return claim;
    const {dispatchId} = claim;
    await verifyClaimRecipients(orgId,dispatchId,recipients);
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: 'SignalTrue <reports@signaltrue.ai>',
        to: recipients,
        subject,
        html,
      });
      if (error) throw new Error('Monthly report provider returned an error');
      report.emailSentAt = new Date();
      report.emailRecipients = recipients;
      await report.save();
      await WeeklyBriefDispatch.updateOne({ _id: dispatchId }, {
        $set: { status: 'sent', providerMessageId: data?.id, sentAt: new Date() },
      });
      console.log('[MonthlyReport] Sent report for org ' + String(org._id));
    } catch (error) {
      await WeeklyBriefDispatch.updateOne({ _id: dispatchId }, {
        $set: { status: 'unknown', lastError: String(error?.message || 'send_failed').slice(0, 200) },
      }).catch(() => {});
      throw error;
    }
  } else {
    console.warn(`[MonthlyReport] No client recipients for ${org.name} — skipping client send`);
  }

  // Always send superadmin copy
  await ccSuperadmin({
    subject,
    html,
    originalRecipient: recipients.length > 0 ? recipients.join(', ') : '(none)',
    reportType: 'Monthly Leadership Report',
    orgName: org.name,
  });
}

export default {
  generateMonthlyReportForOrg,
  sendMonthlyReportEmail,
  getLatestMonthlyReport,
  getMonthlyReportHistory,
  getLeadershipView,
};
