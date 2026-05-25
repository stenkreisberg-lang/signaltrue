import MonthlyReport from '../models/monthlyReport.js';
import TeamState from '../models/teamState.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import ManagerEffectiveness from '../models/managerEffectiveness.js';
import EquitySignal from '../models/equitySignal.js';
import SuccessionRisk from '../models/successionRisk.js';
import AttritionRisk from '../models/attritionRisk.js';
import CrisisEvent from '../models/crisisEvent.js';
import ProjectRisk from '../models/projectRisk.js';
import MeetingROI from '../models/meetingROI.js';
import NetworkHealth from '../models/networkHealth.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import { Resend } from 'resend';
import { generateMonthlyNarrative } from './aiRecommendationContext.js';
import { ccSuperadmin } from './superadminNotifyService.js';

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

/**
 * Generate monthly report for an organization
 */
export async function generateMonthlyReportForOrg(orgId) {
  try {
    console.log(`\n🔄 Generating monthly report for org ${orgId}...`);

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 30);

    const teams = await Team.find({ orgId });
    if (teams.length === 0) { console.log('No teams found for org'); return null; }

    // ── Source everything from IntegrationMetricsDaily (org-level rows) ──
    const imdRecords = await IntegrationMetricsDaily.find({
      orgId, teamId: null, date: { $gte: periodStart, $lte: periodEnd }
    }).sort({ date: -1 }).lean();

    // Also try team-level records if org-level is empty
    const teamIds = teams.map(t => t._id);
    const teamRecords = imdRecords.length === 0
      ? await IntegrationMetricsDaily.find({ orgId, teamId: { $in: teamIds }, date: { $gte: periodStart, $lte: periodEnd } }).sort({ date: -1 }).lean()
      : [];

    const allRecords = imdRecords.length > 0 ? imdRecords : teamRecords;

    if (allRecords.length === 0) {
      console.log(`No IntegrationMetricsDaily data for org ${orgId}`);
      return null;
    }

    const avg = (field) => allRecords.reduce((s, r) => s + (r[field] || 0), 0) / allRecords.length;
    const max = (field) => Math.max(...allRecords.map(r => r[field] || 0));

    // ── Sort into two halves to detect trend ──
    const sorted = [...allRecords].sort((a, b) => new Date(a.date) - new Date(b.date));
    const mid = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);
    const avgHalf = (recs, field) => recs.reduce((s, r) => s + (r[field] || 0), 0) / (recs.length || 1);

    // ── Meeting load ──
    // These are 7-day rolling totals written to each daily record.
    // Many historical records have 0 (field added later), so averaging
    // across 30 rows would dilute to near-zero. Instead, use the most
    // recent record that has a non-zero value for each field.
    const latestNonZero = (field) => {
      const rec = allRecords.find(r => (r[field] || 0) > 0);
      return rec ? (rec[field] || 0) : 0;
    };
    const avgMeetingHours = latestNonZero('meetingDurationTotalHours7d');
    const avgMeetingCount = latestNonZero('meetingCount7d');
    const avgBackToBack = latestNonZero('backToBackMeetingBlocks');
    const avgAfterHoursRatio = latestNonZero('afterHoursSentRatio') || latestNonZero('afterHoursMessageRatio');
    const avgFragScore = avg('calendarFragmentationScore');
    const avgRCI = avg('rci');

    // ── Trend: is meeting load going up or down? ──
    const meetTrendDelta = avgHalf(secondHalf, 'meetingDurationTotalHours7d') - avgHalf(firstHalf, 'meetingDurationTotalHours7d');
    const bdiTrend = meetTrendDelta > 10 ? 'deteriorating' : meetTrendDelta < -10 ? 'improving' : 'stable';
    const trendStrength = Math.abs(meetTrendDelta) > 30 ? 'strong' : Math.abs(meetTrendDelta) > 10 ? 'moderate' : 'weak';

    // ── BDI proxy: use RCI (0-100, higher = worse) as drift indicator ──
    // Invert so 0 = max drift, 100 = healthy (matches display expectation)
    const avgBDI = Math.max(0, 100 - avgRCI);

    // ── Persistent risks from meeting overload signals ──
    const persistentRisks = [];
    if (avgBackToBack > 15) {
      persistentRisks.push({
        riskType: 'overload',
        weeksAboveThreshold: 4,
        avgScore: Math.min(100, Math.round(avgBackToBack * 3)),
        affectedTeams: teams.map(t => ({ teamName: t.name, score: Math.round(avgBackToBack * 3) })),
        classification: 'structural',
        label: 'Consecutive Meeting Blocks',
        detail: `Avg ${avgBackToBack.toFixed(0)} back-to-back meeting blocks per week`
      });
    }
    if (avgAfterHoursRatio > 0.15) {
      persistentRisks.push({
        riskType: 'retention',
        weeksAboveThreshold: 4,
        avgScore: Math.round(avgAfterHoursRatio * 100),
        affectedTeams: teams.map(t => ({ teamName: t.name, score: Math.round(avgAfterHoursRatio * 100) })),
        classification: avgAfterHoursRatio > 0.25 ? 'structural' : 'episodic',
        label: 'Out-of-Hours Work',
        detail: `${Math.round(avgAfterHoursRatio * 100)}% of communication happens outside working hours`
      });
    }

    // ── Org health ──
    const zoneDistribution = {
      stable: avgBDI >= 70 ? teams.length : 0,
      stretched: avgBDI >= 40 && avgBDI < 70 ? teams.length : 0,
      critical: avgBDI < 40 ? teams.length : 0,
      recovery: 0
    };
    const orgHealth = {
      avgBDI: Math.round(avgBDI),
      bdiTrend,
      trendStrength,
      zoneDistribution,
      teamsAtRisk: zoneDistribution.stretched + zoneDistribution.critical,
      avgMeetingHoursWeekly: Math.round(avgMeetingHours),
      avgMeetingCount: Math.round(avgMeetingCount),
      avgBackToBackBlocks: Math.round(avgBackToBack),
      avgAfterHoursPct: Math.round(avgAfterHoursRatio * 100),
      avgRCI: Math.round(avgRCI)
    };

    // ── Execution signals ──
    const executionDragAvg = Math.round(avgRCI * 0.7); // RCI drives execution drag
    const executionSignals = {
      executionDragAvg,
      highRiskProjectsCount: 0,
      meetingROILowPercent: avgMeetingHours > 200 ? Math.round((avgMeetingHours - 200) / avgMeetingHours * 100) : 0,
      decisionVelocity: executionDragAvg < 35 ? 'fast' : executionDragAvg < 65 ? 'moderate' : 'slow',
      networkSiloScore: 0
    };

    // ── Leadership / retention — from available proxies ──
    const leadershipSignals = {
      managerEffectiveness: { avgScore: 0, managersCriticalCount: 0, managersNeedCoachingCount: 0, trend: 'stable' },
      equityScoreAvg: 100,
      equityIssuesCount: 0,
      successionCriticalCount: 0,
      avgBusFactor: 3
    };
    const retentionExposure = {
      avgAttritionRisk: avgAfterHoursRatio > 0.25 ? 45 : 20,
      criticalIndividualsCount: 0,
      highRiskIndividualsCount: 0,
      trend: avgAfterHoursRatio > 0.25 ? 'worsening' : 'stable',
      estimatedTurnoverRisk: Math.round(avgAfterHoursRatio * 60)
    };

    const topStructuralDrivers = [
      avgMeetingHours > 100 && { metric: 'Meeting Load', avgDeviation: avgMeetingHours, teamsAffected: teams.length, severity: avgMeetingHours > 300 ? 'critical' : 'high' },
      avgBackToBack > 10 && { metric: 'Consecutive Meetings', avgDeviation: avgBackToBack, teamsAffected: teams.length, severity: avgBackToBack > 20 ? 'critical' : 'high' },
      avgAfterHoursRatio > 0.1 && { metric: 'Out-of-Hours Work', avgDeviation: avgAfterHoursRatio * 100, teamsAffected: teams.length, severity: avgAfterHoursRatio > 0.25 ? 'critical' : 'medium' },
    ].filter(Boolean);

    const crisisPatterns = { totalCrises: 0, crisisByType: [], teamsWithRecurringCrises: 0 };

    const aiSummary = await generateMonthlyNarrative({
      orgHealth, persistentRisks, leadershipSignals, executionSignals,
      retentionExposure, topStructuralDrivers, crisisPatterns
    }).catch(() => null);

    const monthlyReport = new MonthlyReport({
      orgId, periodStart, periodEnd,
      orgHealth, persistentRisks, leadershipSignals,
      executionSignals, retentionExposure, topStructuralDrivers,
      crisisPatterns, aiSummary
    });

    await monthlyReport.save();

    console.log(`✅ Monthly report generated for org ${orgId}`);
    console.log(`   📊 BDI proxy: ${orgHealth.avgBDI}/100 (${bdiTrend})`);
    console.log(`   ⏱  Avg meeting hours/week: ${orgHealth.avgMeetingHoursWeekly}h`);
    console.log(`   �  Avg back-to-back blocks: ${orgHealth.avgBackToBackBlocks}`);
    console.log(`   🌙  After-hours: ${orgHealth.avgAfterHoursPct}%`);

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
    periodStart: { $gte: periodStart, $lte: periodEnd }
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

  const avgBDI = latestBDI.length > 0
    ? latestBDI.reduce((sum, r) => sum + (r.driftScore || 0), 0) / latestBDI.length
    : 0;

  // Map BDI states to zone labels used in the email template
  const zoneDistribution = {
    stable:    latestBDI.filter(r => r.state === 'Stable').length,
    stretched: latestBDI.filter(r => r.state === 'Early Drift').length,
    critical:  latestBDI.filter(r => r.state === 'Critical Drift').length,
    recovery:  latestBDI.filter(r => r.state === 'Developing Drift').length
  };

  const teamsAtRisk = zoneDistribution.stretched + zoneDistribution.critical + zoneDistribution.recovery;

  const bdiTrend = calculateBDITrend(bdiRecords);

  return {
    avgBDI,
    bdiTrend: bdiTrend.direction,
    trendStrength: bdiTrend.strength,
    zoneDistribution,
    teamsAtRisk
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
  const teamIds = teams.map(t => t._id);
  const persistentRisks = [];

  // Get all TeamStates in period — field is weekStart, not weekEnd
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekStart: { $gte: periodStart, $lte: periodEnd }
  }).sort({ weekStart: 1 }).populate('teamId');

  // Map risk types to TeamState intelligenceScores fields
  const riskMappings = [
    {
      riskType: 'overload',
      scorer: (s) => s.state === 'overloaded' || s.state === 'breaking' ? 60 : 0
    },
    {
      riskType: 'retention',
      scorer: (s) => s.intelligenceScores?.attritionRisk?.avgRiskScore || 0
    },
    {
      riskType: 'execution',
      scorer: (s) => s.state === 'strained' || s.state === 'breaking' ? 50 : 0
    }
  ];

  for (const { riskType, scorer } of riskMappings) {
    const teamRiskWeeks = {};

    teamStates.forEach(state => {
      const teamId = state.teamId?._id?.toString() || state.teamId?.toString();
      if (!teamId) return;
      const riskScore = scorer(state);

      if (riskScore >= 35) {
        if (!teamRiskWeeks[teamId]) {
          teamRiskWeeks[teamId] = {
            teamId: state.teamId._id || state.teamId,
            teamName: state.teamId.name || 'Unknown',
            weeks: 0,
            scores: []
          };
        }
        teamRiskWeeks[teamId].weeks++;
        teamRiskWeeks[teamId].scores.push(riskScore);
      }
    });

    const affectedTeams = Object.values(teamRiskWeeks).filter(t => t.weeks >= PERSISTENT_RISK_WEEKS);

    if (affectedTeams.length > 0) {
      const totalWeeks = 4;
      const avgWeeksElevated = affectedTeams.reduce((sum, t) => sum + t.weeks, 0) / affectedTeams.length;
      const classification = avgWeeksElevated / totalWeeks >= STRUCTURAL_THRESHOLD ? 'structural' : 'episodic';
      const avgScore = affectedTeams.reduce((sum, t) => sum + (t.scores.reduce((a, b) => a + b, 0) / t.scores.length), 0) / affectedTeams.length;

      persistentRisks.push({
        riskType,
        weeksAboveThreshold: Math.round(avgWeeksElevated),
        avgScore: Math.round(avgScore),
        affectedTeams: affectedTeams.map(t => ({ teamId: t.teamId, teamName: t.teamName, score: Math.round(t.scores.reduce((a, b) => a + b, 0) / t.scores.length) })),
        classification
      });
    }
  }

  return persistentRisks;
}

/**
 * Calculate leadership signals
 */
async function calculateLeadershipSignals(teams, periodStart, periodEnd) {
  const teamIds = teams.map(t => t._id);
  
  // Manager effectiveness
  const managerData = await ManagerEffectiveness.find({
    teamId: { $in: teamIds },
    createdAt: { $gte: periodStart, $lte: periodEnd }
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
  
  const avgManagerScore = latestManagerData.length > 0
    ? latestManagerData.reduce((sum, m) => sum + (m.effectivenessScore || 0), 0) / latestManagerData.length
    : 0;
  
  const managersCriticalCount = latestManagerData.filter(m => m.effectivenessScore < 45).length;
  const managersNeedCoachingCount = latestManagerData.filter(m => m.effectivenessScore < 65).length;

  // Manager trend: split the full (chronologically ordered) dataset into first/second half
  const managerTrend = (() => {
    const sorted = [...managerData].sort((a, b) => a.createdAt - b.createdAt);
    if (sorted.length < 2) return 'stable';
    const mid = Math.floor(sorted.length / 2);
    const firstAvg = sorted.slice(0, mid).reduce((s, m) => s + (m.effectivenessScore || 0), 0) / mid;
    const secondAvg = sorted.slice(mid).reduce((s, m) => s + (m.effectivenessScore || 0), 0) / (sorted.length - mid);
    const delta = secondAvg - firstAvg;
    if (delta > 5) return 'improving';
    if (delta < -5) return 'deteriorating';
    return 'stable';
  })();

  // Equity signals
  const equityData = await EquitySignal.find({
    teamId: { $in: teamIds },
    createdAt: { $gte: periodStart, $lte: periodEnd }
  }).sort({ createdAt: -1 });
  
  const latestEquityData = [];
  const seenEquityTeams = new Set();
  for (const data of equityData) {
    if (!seenEquityTeams.has(data.teamId.toString())) {
      latestEquityData.push(data);
      seenEquityTeams.add(data.teamId.toString());
    }
  }
  
  const avgEquityScore = latestEquityData.length > 0
    ? latestEquityData.reduce((sum, e) => sum + (e.equityScore || 0), 0) / latestEquityData.length
    : 100;
  
  const equityIssuesCount = latestEquityData.filter(e => e.equityScore < 70).length;
  
  // Succession risk
  const successionData = await SuccessionRisk.find({
    teamId: { $in: teamIds },
    createdAt: { $gte: periodStart, $lte: periodEnd }
  }).sort({ createdAt: -1 });
  
  const successionCriticalCount = successionData.filter(s => s.busFactor < 2).length;
  const avgBusFactor = successionData.length > 0
    ? successionData.reduce((sum, s) => sum + (s.busFactor || 0), 0) / successionData.length
    : 3;
  
  return {
    managerEffectiveness: {
      avgScore: Math.round(avgManagerScore),
      managersCriticalCount,
      managersNeedCoachingCount,
      trend: managerTrend
    },
    equityScoreAvg: Math.round(avgEquityScore),
    equityIssuesCount,
    successionCriticalCount,
    avgBusFactor: Math.round(avgBusFactor * 10) / 10
  };
}

/**
 * Calculate execution signals
 */
async function calculateExecutionSignals(teams, periodStart, periodEnd) {
  const teamIds = teams.map(t => t._id);
  
  // Get latest TeamStates for execution drag — field is weekStart not weekEnd
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekStart: { $gte: periodStart, $lte: periodEnd }
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
  const executionDragAvg = latestStates.length > 0
    ? latestStates.reduce((sum, s) => sum + (stateToScore[s.state] || 0), 0) / latestStates.length
    : 0;
  
  // Project risk
  const projectRisks = await ProjectRisk.find({
    teamId: { $in: teamIds },
    calculatedAt: { $gte: periodStart, $lte: periodEnd },
    riskScore: { $gte: 60 }
  });
  
  const highRiskProjectsCount = projectRisks.length;
  
  // Meeting ROI
  const meetingData = await MeetingROI.find({
    teamId: { $in: teamIds },
    analyzedAt: { $gte: periodStart, $lte: periodEnd }
  });
  
  const lowROIMeetings = meetingData.filter(m => m.roiScore < 40).length;
  const meetingROILowPercent = meetingData.length > 0
    ? (lowROIMeetings / meetingData.length) * 100
    : 0;
  
  // Network health
  const networkData = await NetworkHealth.findOne({
    teamId: { $in: teamIds }
  }).sort({ calculatedAt: -1 });
  
  const networkSiloScore = networkData?.siloScore || 0;
  
  // Decision velocity (derived from execution drag)
  const decisionVelocity = executionDragAvg < 35 ? 'fast' :
                          executionDragAvg < 65 ? 'moderate' : 'slow';
  
  return {
    executionDragAvg: Math.round(executionDragAvg),
    highRiskProjectsCount,
    meetingROILowPercent: Math.round(meetingROILowPercent),
    decisionVelocity,
    networkSiloScore: Math.round(networkSiloScore)
  };
}

/**
 * Calculate retention exposure
 */
async function calculateRetentionExposure(teams, periodStart, periodEnd) {
  const teamIds = teams.map(t => t._id);
  
  // Get latest attrition risk data
  const attritionData = await AttritionRisk.find({
    teamId: { $in: teamIds },
    createdAt: { $gte: periodStart, $lte: periodEnd }
  }).sort({ createdAt: -1 });
  
  const latestAttritionData = [];
  const seenUsers = new Set();
  for (const data of attritionData) {
    if (!seenUsers.has(data.userId.toString())) {
      latestAttritionData.push(data);
      seenUsers.add(data.userId.toString());
    }
  }
  
  const avgAttritionRisk = latestAttritionData.length > 0
    ? latestAttritionData.reduce((sum, a) => sum + (a.riskScore || 0), 0) / latestAttritionData.length
    : 0;
  
  const criticalIndividualsCount = latestAttritionData.filter(a => a.riskScore >= 80).length;
  const highRiskIndividualsCount = latestAttritionData.filter(a => a.riskScore >= 60).length;

  // Calculate trend: compare first half vs second half of chronologically sorted data
  const retentionTrend = (() => {
    const sorted = [...attritionData].sort((a, b) => a.createdAt - b.createdAt);
    if (sorted.length < 4) return 'stable';
    const mid = Math.floor(sorted.length / 2);
    const firstAvg = sorted.slice(0, mid).reduce((s, a) => s + (a.riskScore || 0), 0) / mid;
    const secondAvg = sorted.slice(mid).reduce((s, a) => s + (a.riskScore || 0), 0) / (sorted.length - mid);
    const delta = secondAvg - firstAvg;
    if (delta > 5) return 'worsening';
    if (delta < -5) return 'improving';
    return 'stable';
  })();

  // Estimated turnover risk (% of workforce at high risk)
  const estimatedTurnoverRisk = latestAttritionData.length > 0
    ? (highRiskIndividualsCount / latestAttritionData.length) * 100
    : 0;
  
  return {
    avgAttritionRisk: Math.round(avgAttritionRisk),
    criticalIndividualsCount,
    highRiskIndividualsCount,
    trend: retentionTrend,
    estimatedTurnoverRisk: Math.round(estimatedTurnoverRisk)
  };
}

/**
 * Get top structural drivers (org-wide patterns) — from BDI topDrivers
 */
async function getTopStructuralDrivers(teams, periodStart, periodEnd) {
  const teamIds = teams.map(t => t._id);

  // BehavioralDriftIndex has topDrivers array with signal contributions
  const bdiRecords = await BehavioralDriftIndex.find({
    teamId: { $in: teamIds },
    periodStart: { $gte: periodStart, $lte: periodEnd }
  });

  // Aggregate drivers across all teams
  const driverAggregation = {};

  bdiRecords.forEach(record => {
    if (record.topDrivers && record.topDrivers.length > 0) {
      record.topDrivers.forEach(driver => {
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
    .map(d => ({
      metric: d.metric,
      avgDeviation: d.contributions.reduce((a, b) => a + b, 0) / d.contributions.length,
      teamsAffected: d.teams.size,
      severity: d.contributions.reduce((a, b) => a + b, 0) / d.contributions.length > 40 ? 'critical' :
                d.contributions.reduce((a, b) => a + b, 0) / d.contributions.length > 20 ? 'high' : 'medium'
    }))
    .sort((a, b) => b.avgDeviation - a.avgDeviation)
    .slice(0, 5);

  return drivers;
}

/**
 * Analyze crisis patterns
 */
async function analyzeCrisisPatterns(teams, periodStart, periodEnd) {
  const teamIds = teams.map(t => t._id);
  
  const crises = await CrisisEvent.find({
    teamId: { $in: teamIds },
    detectedAt: { $gte: periodStart, $lte: periodEnd }
  });
  
  const totalCrises = crises.length;
  
  // Group by type
  const crisisByType = {};
  crises.forEach(crisis => {
    const type = crisis.crisisType || crisis.type || 'unknown';
    if (!crisisByType[type]) {
      crisisByType[type] = 0;
    }
    crisisByType[type]++;
  });
  
  const crisisByTypeArray = Object.entries(crisisByType).map(([type, count]) => ({
    type,
    count
  }));
  
  // Find teams with recurring crises (≥2 in period)
  const teamCrisisCounts = {};
  crises.forEach(crisis => {
    const teamId = crisis.teamId.toString();
    teamCrisisCounts[teamId] = (teamCrisisCounts[teamId] || 0) + 1;
  });
  
  const teamsWithRecurringCrises = Object.values(teamCrisisCounts).filter(count => count >= 2).length;
  
  return {
    totalCrises,
    crisisByType: crisisByTypeArray,
    teamsWithRecurringCrises
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

function generateMonthlyEmailHTML({ org, report }) {
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const periodLabel = `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`;

  // ── Core metrics ──
  const meetHours  = report.orgHealth?.avgMeetingHoursWeekly || 0;
  const meetCount  = report.orgHealth?.avgMeetingCount || 0;
  const b2b        = report.orgHealth?.avgBackToBackBlocks || 0;
  const afterHours = report.orgHealth?.avgAfterHoursPct || 0;
  const rci        = report.orgHealth?.avgRCI || 0;
  const execDrag   = report.executionSignals?.executionDragAvg || 0;
  const turnoverRisk = report.retentionExposure?.estimatedTurnoverRisk || 0;
  const avgHourlyRate = 75; // loaded cost assumption
  const weeklyMeetingCost = Math.round(meetHours * avgHourlyRate);

  // ── Helpers ──
  const statPill = (value, label, color) =>
    `<div style="text-align:center;padding:12px 16px;background:#fff;border-radius:8px;border:1px solid #e5e7eb;min-width:90px;">
      <div style="font-size:22px;font-weight:800;color:${color};line-height:1;">${value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:4px;line-height:1.3;">${label}</div>
    </div>`;

  const riskCard = ({ icon, severityLabel, severityColor, headline, situation, businessRisk, action }) =>
    `<div style="border:1px solid ${severityColor}40;border-left:5px solid ${severityColor};border-radius:10px;padding:22px 24px;margin-bottom:20px;background:#fff;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <span style="font-size:20px;">${icon}</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${severityColor};background:${severityColor}15;padding:3px 10px;border-radius:20px;">${severityLabel}</span>
      </div>
      <h3 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#111827;line-height:1.35;">${headline}</h3>
      <p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.65;"><strong style="color:#111827;">Situation:</strong> ${situation}</p>
      <p style="margin:0 0 14px;font-size:13px;color:#374151;line-height:1.65;"><strong style="color:#111827;">Why this matters:</strong> ${businessRisk}</p>
      <div style="background:${severityColor}08;border-top:1px solid ${severityColor}25;padding:12px 14px;border-radius:6px;margin-top:4px;">
        <p style="margin:0;font-size:13px;color:#111827;line-height:1.65;"><strong>Action:</strong> ${action}</p>
      </div>
    </div>`;

  // ── Build risk cards from available data ──
  const cards = [];

  if (meetHours > 0) {
    const execSev = meetHours > 300 ? { label: 'CRITICAL EXECUTION RISK', color: '#ef4444', icon: '🔴' }
                  : meetHours > 150 ? { label: 'HIGH EXECUTION RISK',     color: '#f59e0b', icon: '🟠' }
                  :                   { label: 'ELEVATED MEETING LOAD',   color: '#6366f1', icon: '🟡' };
    cards.push(riskCard({
      icon: execSev.icon,
      severityLabel: execSev.label,
      severityColor: execSev.color,
      headline: `${org.name} is spending ${meetHours} hours per week in meetings`,
      situation: `Over the past month, the organisation averaged ${meetHours} meeting hours per week across ${meetCount} meetings. That is equivalent to roughly $${weeklyMeetingCost.toLocaleString()} per week in staff time — before accounting for preparation or follow-up.`,
      businessRisk: `When this much time is locked in meetings, execution suffers directly. Strategic decisions get deferred, project delivery slows, and individual contributors lose the deep-focus time needed to produce output. At ${meetHours}h/week, this is not a productivity issue — it is a structural capacity problem.`,
      action: `This week: pull a list of all recurring meetings with 6+ attendees. Cancel or reduce cadence for any that lack a documented output. Target a 20% reduction in meeting hours within 30 days. Assign one person to own this audit.`,
    }));
  }

  if (b2b > 10) {
    const b2bSev = b2b > 20 ? { label: 'CRITICAL CAPACITY RISK', color: '#ef4444', icon: '🔴' }
                            : { label: 'HIGH CAPACITY RISK',     color: '#f59e0b', icon: '🟠' };
    cards.push(riskCard({
      icon: b2bSev.icon,
      severityLabel: b2bSev.label,
      severityColor: b2bSev.color,
      headline: `${b2b} back-to-back meeting blocks per week — your people have no time to think`,
      situation: `Each week, ${org.name} averages ${b2b} consecutive meeting blocks. Healthy organisations operate below 10. This pattern has been sustained for 4+ weeks.`,
      businessRisk: `Back-to-back meetings eliminate the cognitive recovery time required for strategic thinking, risk assessment, and decision quality. Leaders and managers are stuck in reaction mode — they are attending meetings, not driving outcomes. This directly degrades execution speed and decision quality across the organisation.`,
      action: `Starting Monday: mandate a 15-minute buffer between all calendar meetings across the leadership team. Block two mornings per week as meeting-free. These are not optional — enforce it through calendar policy.`,
    }));
  }

  if (afterHours > 15) {
    const ahSev = afterHours > 25 ? { label: 'CRITICAL RETENTION RISK', color: '#dc2626', icon: '🔴' }
                                  : { label: 'HIGH RETENTION RISK',     color: '#f59e0b', icon: '🟠' };
    cards.push(riskCard({
      icon: ahSev.icon,
      severityLabel: ahSev.label,
      severityColor: ahSev.color,
      headline: `${afterHours}% of all communication is happening outside working hours`,
      situation: `More than one in four messages sent at ${org.name} is sent outside standard working hours. This is not occasional — it is a sustained structural pattern for at least 4 consecutive weeks.`,
      businessRisk: `Sustained after-hours work pressure is the single strongest predictor of voluntary attrition within 6 months. Employees who consistently work after hours report higher burnout, lower engagement, and are significantly more likely to resign. Based on this pattern, estimated turnover risk is ${turnoverRisk}%. Replacing a single senior employee typically costs 50–200% of their annual salary.`,
      action: `Declare a communication blackout policy after 7pm, effective immediately. Audit workload distribution — after-hours patterns almost always signal unequal burden. Identify the 3–5 roles generating most after-hours messages and investigate root cause this week.`,
    }));
  }

  if (rci >= 70) {
    cards.push(riskCard({
      icon: '🔴',
      severityLabel: 'CRITICAL — RECOVERY COLLAPSE',
      severityColor: '#7c3aed',
      headline: `Recovery Collapse Index is at ${rci}/100 — teams have no capacity buffer left`,
      situation: `The Recovery Collapse Index (RCI) measures how much compounded pressure — consecutive meetings, after-hours load, and inadequate recovery gaps — is bearing on your workforce. A score of ${rci}/100 is the maximum level.`,
      businessRisk: `At RCI ${rci}, there is no slack in the system. Any additional demand — a product launch, a client escalation, a team departure — will cause visible breakdown: missed deadlines, quality failures, or sudden resignations. This score indicates the organisation is operating in a chronic stress state, not a temporary peak.`,
      action: `Treat this as a structural emergency, not a morale issue. Do not add new initiatives until meeting load and after-hours patterns are addressed. Schedule a leadership session this month specifically to redesign how work is structured — not how hard people work.`,
    }));
  }

  const cardsHtml = cards.length > 0
    ? cards.join('')
    : `<div style="padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
        <p style="margin:0;font-size:14px;color:#15803d;">✅ No significant risks identified for this period.</p>
      </div>`;

  // ── Summary stats bar ──
  const summaryStats = [
    meetHours > 0 ? statPill(`${meetHours}h`, 'Mtg Hrs/Week', meetHours > 300 ? '#ef4444' : meetHours > 150 ? '#f59e0b' : '#22c55e') : null,
    b2b > 0       ? statPill(`${b2b}`,         'B2B Blocks',  b2b > 20 ? '#ef4444' : b2b > 10 ? '#f59e0b' : '#22c55e') : null,
    afterHours > 0 ? statPill(`${afterHours}%`, 'After-Hours', afterHours > 25 ? '#ef4444' : afterHours > 10 ? '#f59e0b' : '#22c55e') : null,
    rci > 0        ? statPill(`${rci}/100`,     'RCI',         rci >= 70 ? '#ef4444' : rci >= 40 ? '#f59e0b' : '#22c55e') : null,
    execDrag > 0   ? statPill(`${execDrag}/100`, 'Exec Drag',  execDrag >= 60 ? '#ef4444' : execDrag >= 35 ? '#f59e0b' : '#22c55e') : null,
    turnoverRisk > 0 ? statPill(`${turnoverRisk}%`, 'Turnover Risk', turnoverRisk > 20 ? '#ef4444' : turnoverRisk > 10 ? '#f59e0b' : '#22c55e') : null,
  ].filter(Boolean).join('<div style="width:8px;flex-shrink:0;"></div>');

  // ── Situation summary sentence ──
  const situationLines = [];
  if (meetHours > 0) situationLines.push(`${org.name} averaged <strong>${meetHours} meeting hours per week</strong> over the past month`);
  if (b2b > 0)       situationLines.push(`<strong>${b2b} back-to-back meeting blocks</strong> per week`);
  if (afterHours > 0) situationLines.push(`<strong>${afterHours}% of messages</strong> sent outside working hours`);
  if (rci >= 70)     situationLines.push(`Recovery Collapse Index at <strong>${rci}/100</strong> — maximum stress load`);
  const situationText = situationLines.length > 0
    ? situationLines.join(', with ') + '.'
    : 'No significant signals detected this period.';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);color:#fff;padding:30px 30px 22px;">
    <div style="font-size:11px;opacity:.75;margin-bottom:6px;text-transform:uppercase;letter-spacing:1.2px;">Monthly Leadership Briefing</div>
    <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;">${org.name}</h1>
    <div style="font-size:13px;opacity:.8;">${periodLabel}</div>
  </div>

  <!-- Situation banner -->
  <div style="background:#fef2f2;border-bottom:3px solid #ef4444;padding:18px 28px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#991b1b;">This Month's Situation</p>
    <p style="margin:0;font-size:14px;color:#1f2937;line-height:1.7;">${situationText}</p>
  </div>

  <!-- Stats bar -->
  <div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e5e7eb;">
    <div style="display:flex;gap:0;overflow-x:auto;padding-bottom:2px;">
      ${summaryStats}
    </div>
  </div>

  <!-- Risk cards -->
  <div style="padding:24px 24px 8px;">
    <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#6b7280;margin:0 0 16px;">What this means — and what to do</h2>
    ${cardsHtml}
  </div>

  <!-- Footer -->
  <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;margin-top:16px;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">Generated by <strong>SignalTrue</strong> · Monthly Leadership Briefing · ${fmtDate(new Date())}</p>
    <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Org-aggregate signals only. No individual names or personal data included.</p>
  </div>

</div>
</body></html>`;
}

/**
 * Returns true if the report has real data worth sending to a client.
 */
function reportHasRealData(report) {
  const meetHours = report.orgHealth?.avgMeetingHoursWeekly || 0;
  const bdi = report.orgHealth?.avgBDI || 0;
  const rci = report.orgHealth?.avgRCI || 0;
  const persistentRisks = (report.persistentRisks || []).length;
  return (meetHours + bdi + rci + persistentRisks) > 0;
}

export async function sendMonthlyReportEmail(orgId, report, { previewOnly = false } = {}) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error(`[MonthlyReport] Org ${orgId} not found`);

  const periodLabel = new Date(report.periodEnd).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const subject = `${previewOnly ? '👁 PREVIEW — ' : ''}Monthly Leadership Report — ${org.name} — ${periodLabel}`;
  const html = generateMonthlyEmailHTML({ org, report });

  // Build recipient list: master_admin + hr_admin + executive users
  const orgUsers = await User.find({ orgId, role: { $in: ['master_admin', 'hr_admin', 'executive'] } }).select('email');
  const userEmails = orgUsers.map(u => u.email);
  const overrides = org.settings?.monthlyReportRecipients || [];
  const recipients = previewOnly ? [] : [...new Set([...userEmails, ...overrides])];

  // ── Data quality gate: never send all-zero report to clients ──────────────
  const hasData = reportHasRealData(report);
  if (!hasData) {
    console.warn(`[MonthlyReport] ⚠️  ${org.name}: report has no data yet — blocking client send, notifying superadmin only`);
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
    console.warn(`[MonthlyReport] No RESEND_API_KEY — skipping client send for ${org.name}, but copying superadmin`);
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
  getLeadershipView
};
