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
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import WorkEvent from '../models/workEvent.js';
import Intervention from '../models/intervention.js';
import { Resend } from 'resend';
import { ccSuperadmin } from './superadminNotifyService.js';
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

export function selectWeeklySnapshots(records, limit = 5) {
  const orgRecords = records.filter((record) => !record.teamId);
  const preferred = orgRecords.length > 0 ? orgRecords : records;
  const latestByWeekAndTeam = new Map();
  [...preferred]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((record) => {
      const date = new Date(record.date);
      const day = date.getUTCDay() || 7;
      const monday = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
      );
      monday.setUTCDate(monday.getUTCDate() - day + 1);
      const week = monday.toISOString().slice(0, 10);
      const key = `${week}:${record.teamId || 'org'}`;
      if (!latestByWeekAndTeam.has(key)) latestByWeekAndTeam.set(key, { week, record });
    });

  const byWeek = new Map();
  for (const { week, record } of latestByWeekAndTeam.values()) {
    if (!byWeek.has(week)) byWeek.set(week, []);
    byWeek.get(week).push(record);
  }
  const totalFields = [
    'meetingDurationTotalHours7d',
    'meetingParticipantHours7d',
    'meetingCount7d',
    'meetingInstanceCount7d',
    'backToBackMeetingBlocks',
    'messageCount7d',
    'afterHoursMessageCount',
  ];
  const averageFields = [
    'afterHoursMessageRatio',
    'afterHoursSentRatio',
    'calendarFragmentationScore',
    'rci',
  ];
  const snapshots = [...byWeek.entries()].map(([week, weekRecords]) => {
    if (weekRecords.length === 1) return weekRecords[0];
    const aggregate = { date: new Date(`${week}T12:00:00.000Z`) };
    totalFields.forEach((field) => {
      aggregate[field] = weekRecords.reduce((sum, record) => sum + (record[field] || 0), 0);
    });
    averageFields.forEach((field) => {
      const values = weekRecords
        .map((record) => record[field])
        .filter((value) => Number.isFinite(value));
      aggregate[field] =
        values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    });
    return aggregate;
  });

  return snapshots.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-limit);
}

/**
 * Generate monthly report for an organization
 */
export async function generateMonthlyReportForOrg(orgId) {
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
    const totalUsers = await User.countDocuments({ orgId, accountStatus: { $ne: 'inactive' } });
    const mappedUsers = await WorkEvent.distinct('actorUserId', {
      orgId,
      actorUserId: { $ne: null },
      timestamp: { $gte: periodStart, $lte: periodEnd },
    });
    const activeByTeam = await WorkEvent.aggregate([
      {
        $match: {
          orgId,
          teamId: { $in: teams.map((team) => team._id) },
          actorUserId: { $ne: null },
          timestamp: { $gte: periodStart, $lte: periodEnd },
        },
      },
      { $group: { _id: '$teamId', users: { $addToSet: '$actorUserId' } } },
    ]);
    const readyTeams = activeByTeam.filter((row) => row.users.length >= minimumTeamSize).length;
    const userCoveragePct =
      totalUsers > 0 ? Math.round((mappedUsers.length / totalUsers) * 100) : 0;
    const teamCoveragePct = teams.length > 0 ? Math.round((readyTeams / teams.length) * 100) : 0;

    // ── Source everything from IntegrationMetricsDaily (org-level rows) ──
    const imdRecords = await IntegrationMetricsDaily.find({
      orgId,
      teamId: null,
      date: { $gte: periodStart, $lte: periodEnd },
    })
      .sort({ date: -1 })
      .lean();

    // Also try team-level records if org-level is empty
    const teamIds = teams.map((t) => t._id);
    const teamRecords =
      imdRecords.length === 0
        ? await IntegrationMetricsDaily.find({
            orgId,
            teamId: { $in: teamIds },
            date: { $gte: periodStart, $lte: periodEnd },
          })
            .sort({ date: -1 })
            .lean()
        : [];

    const allRecords = imdRecords.length > 0 ? imdRecords : teamRecords;
    const weeklySnapshots = selectWeeklySnapshots(allRecords);
    const avg = (field) =>
      weeklySnapshots.length > 0
        ? weeklySnapshots.reduce((sum, record) => sum + (record[field] || 0), 0) /
          weeklySnapshots.length
        : 0;

    // ── Sort into two halves to detect trend ──
    const sorted = [...weeklySnapshots].sort((a, b) => new Date(a.date) - new Date(b.date));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const avgHalf = (recs, field) =>
      recs.reduce((s, r) => s + (r[field] || 0), 0) / (recs.length || 1);

    // Every record is a rolling 7-day value, so one latest record per calendar
    // week is used. Averaging daily rolling rows would count the same days many times.
    const avgMeetingHours = avg('meetingParticipantHours7d') || avg('meetingDurationTotalHours7d');
    const avgMeetingCount = avg('meetingInstanceCount7d') || avg('meetingCount7d');
    const avgBackToBack = avg('backToBackMeetingBlocks');
    const avgAfterHoursRatio = avg('afterHoursMessageRatio') || avg('afterHoursSentRatio');
    const avgRCI = avg('rci');

    const firstMeetingHours =
      avgHalf(firstHalf, 'meetingParticipantHours7d') ||
      avgHalf(firstHalf, 'meetingDurationTotalHours7d');
    const secondMeetingHours =
      avgHalf(secondHalf, 'meetingParticipantHours7d') ||
      avgHalf(secondHalf, 'meetingDurationTotalHours7d');
    const meetTrendPct =
      firstMeetingHours > 0
        ? ((secondMeetingHours - firstMeetingHours) / firstMeetingHours) * 100
        : 0;
    const measuredTrend =
      meetTrendPct > 10 ? 'deteriorating' : meetTrendPct < -10 ? 'improving' : 'stable';
    const measuredTrendStrength =
      Math.abs(meetTrendPct) >= 25 ? 'strong' : Math.abs(meetTrendPct) >= 10 ? 'moderate' : 'weak';

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

    const orgHealth = {
      avgBDI: Math.round(measuredOrgHealth.avgBDI || 0),
      bdiTrend: measuredOrgHealth.avgBDI > 0 ? measuredOrgHealth.bdiTrend : measuredTrend,
      trendStrength:
        measuredOrgHealth.avgBDI > 0 ? measuredOrgHealth.trendStrength : measuredTrendStrength,
      zoneDistribution: measuredOrgHealth.zoneDistribution,
      teamsAtRisk: measuredOrgHealth.teamsAtRisk,
      avgMeetingHoursWeekly: Math.round(avgMeetingHours),
      avgMeetingCount: Math.round(avgMeetingCount),
      avgBackToBackBlocks: Math.round(avgBackToBack),
      avgAfterHoursPct: Math.round(avgAfterHoursRatio * 100),
      avgRCI: Math.round(avgRCI),
    };
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
      weeklySnapshots.length >= 3 &&
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
      orgId,
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
    const actionOutcomes = {
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
        weeklySnapshots: weeklySnapshots.length,
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
    orgId,
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
      ? latestBDI.reduce((sum, r) => sum + (r.driftScore || 0), 0) / latestBDI.length
      : 0;

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
  if (bdiRecords.length < 2) {
    return { direction: 'stable', strength: 'weak' };
  }

  const sorted = [...bdiRecords].sort((a, b) => a.periodStart - b.periodStart);
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const avgFirst = firstHalf.reduce((sum, r) => sum + (r.driftScore || 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, r) => sum + (r.driftScore || 0), 0) / secondHalf.length;

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

export function generateMonthlyEmailHTML({ org, report }) {
  const fmtDate = (date) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  const periodLabel = `${fmtDate(report.periodStart)} - ${fmtDate(report.periodEnd)}`;
  const appUrl = process.env.FRONTEND_URL || 'https://app.signaltrue.ai';
  const readiness = report.dataReadiness || {};
  const shellStart = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:28px 18px;background:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #d9e2ee;box-shadow:0 18px 45px rgba(15,23,42,.08);">
<div style="background:#0f172a;color:#fff;padding:30px 34px 25px;">
<div style="font-size:10px;color:#94a3b8;margin-bottom:8px;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;">Monthly ${report.reportMode === 'decision' ? 'Decision Brief' : 'Setup Brief'}</div>
<h1 style="margin:0 0 6px;font-size:25px;">${escapeHtml(org.name)}</h1>
<div style="font-size:13px;color:#cbd5e1;">${periodLabel}</div>
</div>`;
  const shellEnd = `<div style="padding:16px 34px;background:#f8fafc;border-top:1px solid #e2e8f0;">
<p style="color:#64748b;font-size:12px;margin:0;">Generated by <strong>SignalTrue</strong> on ${fmtDate(new Date())}</p>
<p style="color:#94a3b8;font-size:11px;margin:5px 0 0;">Team-level metadata only. Counts and durations are observed; ratios are derived; 0-100 indices and review bands are internal descriptive models, not probabilities, diagnoses, validated predictions, or individual performance scores. <a href="${appUrl}/app/methodology" style="color:#2563eb;">Methods and limits</a>.</p>
</div></div></body></html>`;

  if (report.reportMode !== 'decision') {
    return `${shellStart}
<div style="padding:24px 34px;border-bottom:1px solid #e2e8f0;">
<p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;margin:0 0 8px;">Executive readout</p>
<h2 style="font-size:20px;margin:0 0 9px;">Leadership conclusions are paused</h2>
<p style="font-size:14px;line-height:1.65;color:#334155;margin:0;">SignalTrue does not have enough representative team data to make a trustworthy monthly recommendation. This brief shows exactly what must be fixed.</p>
</div>
<div style="padding:20px 26px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:10px;flex-wrap:wrap;">
${monthlyStat(`${readiness.mappedUsers || 0}/${readiness.totalUsers || 0}`, 'Mapped users')}
${monthlyStat(`${readiness.readyTeams || 0}/${readiness.eligibleTeams || 0}`, 'Ready teams')}
${monthlyStat(`${readiness.weeklySnapshots || 0}/3`, 'Weekly snapshots')}
</div>
<div style="padding:26px 34px;">
<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#475569;margin:0 0 14px;">Required before the next brief</h2>
${setupStep('1', 'Review people without a named team', `Directory departments are the primary source. Use public website suggestions only for remaining gaps, then approve each assignment.`)}
${setupStep('2', 'Reach the privacy-safe team threshold', `Each reported team needs at least ${readiness.minimumTeamSize || 5} active mapped members. Catch-all and smaller groups remain suppressed.`)}
${setupStep('3', 'Collect independent weekly evidence', `The monthly brief needs at least three weekly snapshots; ${readiness.weeklySnapshots || 0} are currently available.`)}
<div style="text-align:center;margin-top:20px;"><a href="${appUrl}/app/employees" style="display:inline-block;background:#0f172a;color:#fff;padding:11px 25px;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">Review team setup</a></div>
</div>${shellEnd}`;
  }

  const health = report.orgHealth || {};
  const engagement = report.engagementSignals || {};
  const outcomes = report.actionOutcomes || {};
  const persistentRisks = [...(report.persistentRisks || [])]
    .filter((item) => item.riskType !== 'retention')
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
  const primaryRisk = persistentRisks[0];
  const decision = getMonthlyDecision(primaryRisk, health, engagement);
  const measuredItems = (outcomes.items || []).filter((item) => item.percentChange != null);

  return `${shellStart}
<div style="padding:24px 34px;border-bottom:1px solid #e2e8f0;">
<p style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;margin:0 0 8px;">Decision for this month</p>
<h2 style="font-size:20px;line-height:1.35;margin:0 0 9px;">${escapeHtml(decision.headline)}</h2>
<p style="font-size:14px;line-height:1.65;color:#334155;margin:0;">${escapeHtml(decision.evidence)}</p>
</div>
<div style="padding:20px 26px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;gap:10px;flex-wrap:wrap;">
${monthlyStat(`${health.avgMeetingHoursWeekly || 0}h`, 'Participant-hours / week')}
${monthlyStat(`${health.avgMeetingCount || 0}`, 'Unique meetings / week')}
${monthlyStat(`${health.avgBackToBackBlocks || 0}`, 'Person-level B2B blocks')}
${monthlyStat(`${health.avgAfterHoursPct || 0}%`, 'Outside work schedule')}
</div>
<div style="padding:26px 34px 8px;">
<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#475569;margin:0 0 14px;">Did last month's actions work?</h2>
${
  measuredItems.length > 0
    ? measuredItems
        .slice(0, 3)
        .map(
          (
            item
          ) => `<div style="padding:13px 15px;margin-bottom:10px;border:1px solid ${item.improved ? '#bbf7d0' : '#fde68a'};background:${item.improved ? '#f0fdf4' : '#fffbeb'};border-radius:9px;">
<p style="font-size:13px;margin:0 0 4px;"><strong>${escapeHtml(item.title)}</strong>${item.teamName ? ` - ${escapeHtml(item.teamName)}` : ''}</p>
<p style="font-size:12px;color:#475569;margin:0;">Measured change: <strong>${Number(item.percentChange) > 0 ? '+' : ''}${Number(item.percentChange).toFixed(1)}%</strong> - ${item.improved ? 'improvement recorded' : 'target not yet met'}</p></div>`
        )
        .join('')
    : `<div style="padding:13px 15px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:9px;"><p style="font-size:13px;line-height:1.6;margin:0;">No completed action has a measured before/after result this month. ${outcomes.active || 0} action(s) are active. Log decisions in SignalTrue so the next brief can prove what changed.</p></div>`
}
</div>
<div style="padding:18px 34px 28px;">
<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#475569;margin:0 0 14px;">Action card</h2>
<div style="border:1px solid #c7d2fe;border-left:4px solid #4f46e5;border-radius:10px;padding:17px 18px;">
<p style="font-size:14px;line-height:1.6;margin:0 0 9px;"><strong>Decision:</strong> ${escapeHtml(decision.action)}</p>
<p style="font-size:12px;color:#475569;line-height:1.6;margin:0;"><strong>Owner:</strong> ${escapeHtml(decision.owner)} &nbsp;|&nbsp; <strong>Measure:</strong> ${escapeHtml(decision.measure)} &nbsp;|&nbsp; <strong>Review:</strong> next monthly brief</p>
</div>
<p style="font-size:11px;color:#94a3b8;line-height:1.55;margin:14px 0 0;">Monthly values average ${readiness.weeklySnapshots || 0} independent weekly snapshots. Persistence is reported only when the underlying weekly records meet the configured threshold for at least ${PERSISTENT_RISK_WEEKS} weeks.</p>
</div>${shellEnd}`;
}

function monthlyStat(value, label) {
  return `<div style="flex:1;min-width:118px;padding:13px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:9px;"><div style="font-size:20px;font-weight:750;">${escapeHtml(value)}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.6px;margin-top:5px;">${escapeHtml(label)}</div></div>`;
}

function setupStep(number, title, detail) {
  return `<div style="padding:14px 15px;margin-bottom:10px;border:1px solid #e2e8f0;background:#f8fafc;border-radius:9px;"><p style="font-size:13px;margin:0 0 4px;"><strong>${number}. ${escapeHtml(title)}</strong></p><p style="font-size:12px;line-height:1.55;color:#475569;margin:0;">${escapeHtml(detail)}</p></div>`;
}

function getMonthlyDecision(primaryRisk, health, engagement) {
  if (primaryRisk?.riskType === 'overload') {
    return {
      headline: 'Reduce the most persistent meeting-pressure pattern',
      evidence: `${primaryRisk.affectedTeams?.length || 0} team(s) crossed SignalTrue's internal overload review band in ${primaryRisk.weeksAboveThreshold} measured weeks. This band is a prioritization rule, not a validated risk threshold.`,
      action:
        'Choose the affected team with the highest score and remove or shorten one recurring meeting block before adding new coordination rules.',
      owner: 'Leadership with the team lead',
      measure: 'back-to-back blocks and participant-hours',
    };
  }
  if (primaryRisk?.riskType === 'execution') {
    return {
      headline: 'Resolve one persistent execution bottleneck',
      evidence: `${primaryRisk.affectedTeams?.length || 0} team(s) remained above SignalTrue's internal execution review band for ${primaryRisk.weeksAboveThreshold} measured weeks. This band is not a validated probability.`,
      action:
        'Select the workflow with the strongest modeled deviation, name one decision owner, and remove one recurring handoff or approval step.',
      owner: 'Executive sponsor',
      measure: 'the direct workflow metric targeted by the action',
    };
  }
  if ((engagement.teamsInStrain || 0) > 0) {
    return {
      headline: 'Review the strongest team work-pattern deviation',
      evidence: `${engagement.teamsInStrain} measured team(s) crossed an elevated or strong internal review band; the average deviation index is ${engagement.avgStrainRisk || 0}/100. This is a descriptive model, not an engagement or health measure.`,
      action:
        'Ask the relevant team lead what changed, then test one adjustment tied to the strongest measured driver.',
      owner: 'HR with the team lead',
      measure: 'the underlying direct metric and strongest modeled driver',
    };
  }
  return {
    headline: 'No persistent pattern crossed an internal monthly review band',
    evidence: `Across the measured weekly snapshots, no team-level model pattern remained elevated for ${PERSISTENT_RISK_WEEKS} weeks. Meeting participant-hours trend is ${health.bdiTrend || 'stable'}. This does not prove the absence of employee or business risk.`,
    action:
      'Keep current operating practices and log any planned change so its effect can be measured next month.',
    owner: 'Operations or HR',
    measure: 'the metric targeted by the logged action',
  };
}

/**
 * Returns true if the report has real data worth sending to a client.
 */
function reportHasRealData(report) {
  if (report.reportMode === 'setup') {
    return (report.dataReadiness?.totalUsers || 0) > 0;
  }
  const meetHours = report.orgHealth?.avgMeetingHoursWeekly || 0;
  const bdi = report.orgHealth?.avgBDI || 0;
  const rci = report.orgHealth?.avgRCI || 0;
  const persistentRisks = (report.persistentRisks || []).length;
  return meetHours + bdi + rci + persistentRisks > 0;
}

export async function sendMonthlyReportEmail(orgId, report, { previewOnly = false } = {}) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error(`[MonthlyReport] Org ${orgId} not found`);

  const periodLabel = new Date(report.periodEnd).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  const subject = `${previewOnly ? 'PREVIEW - ' : ''}${report.reportMode === 'setup' ? 'Monthly Setup Brief' : 'Monthly Decision Brief'} - ${org.name} - ${periodLabel}`;
  const html = generateMonthlyEmailHTML({ org, report });

  // Setup issues go to admins/HR. Leadership recipients receive decision-ready reports only.
  const recipientRoles =
    report.reportMode === 'setup'
      ? ['master_admin', 'hr_admin', 'admin']
      : ['master_admin', 'hr_admin', 'admin', 'executive'];
  const orgUsers = await User.find({
    orgId,
    role: { $in: recipientRoles },
  }).select('email');
  const userEmails = orgUsers.map((u) => u.email);
  const overrides =
    report.reportMode === 'decision' ? org.settings?.monthlyReportRecipients || [] : [];
  const recipients = previewOnly ? [] : [...new Set([...userEmails, ...overrides])];

  // ── Data quality gate: never send all-zero report to clients ──────────────
  const hasData = reportHasRealData(report);
  if (!hasData) {
    console.warn(
      `[MonthlyReport] ⚠️  ${org.name}: report has no data yet — blocking client send, notifying superadmin only`
    );
    await ccSuperadmin({
      subject: `⚠️ DATA MISSING — ${subject}`,
      html: `<div style="background:#fef3c7;border:2px solid #f59e0b;padding:16px;border-radius:8px;font-family:sans-serif;margin-bottom:24px">
        <strong>⚠️ This report was NOT sent to the client.</strong><br/>
        All metrics returned 0 — the data pipeline has not yet populated data for <strong>${org.name}</strong>.<br/>
        Intended recipients: ${recipients.length > 0 ? recipients.join(', ') : '(none found)'}<br/>
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
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: 'SignalTrue <reports@signaltrue.ai>',
      to: recipients,
      subject,
      html,
    });
    if (error) {
      console.error(`[MonthlyReport] ❌ Resend error for ${org.name}:`, JSON.stringify(error));
    } else {
      console.log(`[MonthlyReport] ✅ Sent to ${recipients.join(', ')} for ${org.name}`);
      report.emailSentAt = new Date();
      report.emailRecipients = recipients;
      await report.save().catch(() => {}); // non-fatal
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
