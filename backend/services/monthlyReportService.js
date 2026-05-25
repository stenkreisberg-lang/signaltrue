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
    const avgMeetingHours = avg('meetingDurationTotalHours7d');
    const avgMeetingCount = avg('meetingCount7d');
    const avgBackToBack = avg('backToBackMeetingBlocks');
    const avgAfterHoursRatio = avg('afterHoursSentRatio') || avg('afterHoursMessageRatio');
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
  const bdi = report.orgHealth.avgBDI || 0;
  const bdiColor = bdi >= 70 ? '#22c55e' : bdi >= 40 ? '#f59e0b' : '#ef4444';
  const trendEmoji = { improving: '📉', stable: '➡️', deteriorating: '📈' }[report.orgHealth.bdiTrend] || '➡️';
  const trendColor = { improving: '#22c55e', stable: '#6b7280', deteriorating: '#ef4444' }[report.orgHealth.bdiTrend] || '#6b7280';
  const periodLabel = `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`;

  const metricBox = (value, label, color = '#111827') =>
    `<td style="padding:16px;background:#f8fafc;border-radius:8px;text-align:center;border:1px solid #e5e7eb;">
      <div style="font-size:26px;font-weight:700;color:${color};">${value}</div>
      <div style="font-size:11px;color:#6b7280;margin-top:2px;">${label}</div>
    </td>`;

  const execDrag = report.executionSignals?.executionDragAvg || 0;
  const mgrScore = report.leadershipSignals?.managerEffectiveness?.avgScore || 0;
  const attrColor = (report.retentionExposure?.criticalIndividualsCount || 0) > 0 ? '#ef4444' : '#22c55e';
  const execColor = execDrag >= 60 ? '#ef4444' : execDrag >= 35 ? '#f59e0b' : '#22c55e';
  const mgrColor  = mgrScore > 0 ? (mgrScore < 45 ? '#ef4444' : mgrScore < 65 ? '#f59e0b' : '#22c55e') : '#9ca3af';

  // ── Meeting load numbers ──
  const meetHours   = report.orgHealth?.avgMeetingHoursWeekly || 0;
  const meetCount   = report.orgHealth?.avgMeetingCount || 0;
  const b2b         = report.orgHealth?.avgBackToBackBlocks || 0;
  const afterHours  = report.orgHealth?.avgAfterHoursPct || 0;
  const rci         = report.orgHealth?.avgRCI || 0;
  const meetHoursColor = meetHours > 300 ? '#ef4444' : meetHours > 150 ? '#f59e0b' : '#22c55e';
  const b2bColor       = b2b > 20 ? '#ef4444' : b2b > 10 ? '#f59e0b' : '#22c55e';
  const afterHoursColor = afterHours > 25 ? '#ef4444' : afterHours > 10 ? '#f59e0b' : '#22c55e';
  const rciColor        = rci >= 70 ? '#ef4444' : rci >= 40 ? '#f59e0b' : '#22c55e';

  const persistentRisksHtml = (report.persistentRisks || []).length > 0
    ? report.persistentRisks.map(r => {
        const rc = r.classification === 'structural' ? '#ef4444' : '#f59e0b';
        const teamNames = (r.affectedTeams || []).map(t => t.teamName).filter(Boolean).join(', ');
        const label = r.label || (r.riskType === 'overload' ? 'Workload Overload' : r.riskType === 'execution' ? 'Execution Drag' : 'Retention Strain');
        const detail = r.detail || `Avg score: ${r.avgScore}/100`;
        return `<div style="padding:10px 14px;margin-bottom:8px;background:${rc}10;border-left:4px solid ${rc};border-radius:4px;">
          <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#111827;">${label}
            <span style="font-size:11px;font-weight:400;background:${rc}20;color:${rc};padding:1px 6px;border-radius:10px;margin-left:6px;">${r.classification} · ${r.weeksAboveThreshold}w elevated</span>
          </p>
          <p style="margin:0;font-size:13px;color:#6b7280;">${detail}${teamNames ? ` · Teams: ${teamNames}` : ''}</p>
        </div>`;
      }).join('')
    : `<p style="font-size:14px;color:#22c55e;margin:0;">✅ No persistent risks identified this month.</p>`;

  const aiNarrative = report.aiSummary?.narrative
    ? report.aiSummary.narrative.split('\n\n').filter(Boolean)
        .map(p => `<p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 10px;">${p}</p>`).join('')
    : '<p style="font-size:14px;color:#6b7280;font-style:italic;">Organizational health analysis pending AI generation.</p>';

  const leadershipActions = (report.aiSummary?.recommendedLeadershipActions || []).length > 0
    ? report.aiSummary.recommendedLeadershipActions.slice(0, 4).map(a => {
        const uc = a.urgency === 'immediate' ? '#ef4444' : a.urgency === 'this-month' ? '#f59e0b' : '#6366f1';
        const ul = a.urgency === 'immediate' ? 'Immediate' : a.urgency === 'this-month' ? 'This Month' : 'Strategic';
        return `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;margin-bottom:8px;">
          <div style="margin-bottom:4px;">
            <span style="font-size:13px;font-weight:600;color:#111827;">${a.action}</span>
            <span style="font-size:11px;font-weight:600;color:${uc};background:${uc}15;padding:2px 8px;border-radius:10px;margin-left:8px;">${ul}</span>
          </div>
          <p style="margin:0;font-size:12px;color:#6b7280;">${a.rationale || ''}</p>
        </div>`;
      }).join('')
    : '';

  const structuralDriversHtml = (report.topStructuralDrivers || []).length > 0
    ? report.topStructuralDrivers.map(d => {
        const sc = d.severity === 'critical' ? '#ef4444' : d.severity === 'high' ? '#f59e0b' : '#6366f1';
        return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border-radius:6px;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:600;color:#111827;">${d.metric}</span>
          <span style="font-size:11px;font-weight:700;color:${sc};background:${sc}15;padding:2px 8px;border-radius:10px;">${d.severity?.toUpperCase()}</span>
        </div>`;
      }).join('')
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e3a5f 0%,#3b82f6 100%);color:#fff;padding:32px 30px 24px;">
    <div style="font-size:12px;opacity:.8;margin-bottom:6px;text-transform:uppercase;letter-spacing:1px;">Monthly Leadership Report</div>
    <h1 style="margin:0 0 4px;font-size:26px;font-weight:700;">${org.name}</h1>
    <div style="font-size:14px;opacity:.85;">${periodLabel}</div>
  </div>

  <!-- BDI banner -->
  <div style="background:#f8fafc;padding:16px 30px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">
    <span style="font-size:24px;">${trendEmoji}</span>
    <div style="flex:1;">
      <div style="font-size:15px;font-weight:600;color:#111827;">
        Organisation BDI: <span style="color:${bdiColor};">${bdi.toFixed(1)}/100</span>
      </div>
      <div style="font-size:13px;color:${trendColor};text-transform:capitalize;">
        Trend: ${report.orgHealth.bdiTrend}${report.orgHealth.trendStrength ? ` (${report.orgHealth.trendStrength})` : ''}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:13px;color:#6b7280;">${report.orgHealth.teamsAtRisk} of ${Object.values(report.orgHealth.zoneDistribution||{}).reduce((a,b)=>a+b,0)} teams at risk</div>
      <div style="font-size:12px;color:#9ca3af;">
        Stable ${report.orgHealth.zoneDistribution?.stable||0} · Stretched ${report.orgHealth.zoneDistribution?.stretched||0} · Critical ${report.orgHealth.zoneDistribution?.critical||0}
      </div>
    </div>
  </div>

  <div style="padding:24px 30px;">

    <!-- Meeting Load — primary data we have -->
    ${meetHours > 0 ? `
    <div style="background:linear-gradient(135deg,#fef3c710,#fff);border:1px solid #fde68a;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
      <h2 style="color:#92400e;font-size:16px;font-weight:700;margin:0 0 14px;">📅 Meeting Load — 30-Day Average</h2>
      <table style="width:100%;border-collapse:separate;border-spacing:8px;">
        <tr>
          ${metricBox(`${meetHours}h`, 'Avg Meeting Hrs/Week', meetHoursColor)}
          <td style="width:8px;"></td>
          ${metricBox(`${meetCount}`, 'Avg Meetings/Week', meetCount > 100 ? '#ef4444' : '#f59e0b')}
          <td style="width:8px;"></td>
          ${metricBox(`${b2b}`, 'Back-to-Back Blocks', b2bColor)}
          <td style="width:8px;"></td>
          ${metricBox(`${afterHours}%`, 'Out-of-Hours Messages', afterHoursColor)}
        </tr>
      </table>
      ${b2b > 20 ? `<p style="margin:12px 0 0;font-size:13px;color:#92400e;">⚠️ <strong>${b2b} consecutive meeting blocks per week</strong> is significantly above healthy levels (≤10). This leaves no recovery time between meetings and is a direct cause of cognitive fatigue and poor decision quality.</p>` : ''}
      ${meetHours > 200 ? `<p style="margin:8px 0 0;font-size:13px;color:#92400e;">⚠️ <strong>${meetHours} hours of meetings per week</strong> across the organisation means an average of ${(meetHours / Math.max(1, meetCount > 0 ? 10 : 1)).toFixed(0)} hours per person — leaving insufficient time for focused execution work.</p>` : ''}
    </div>` : ''}

    <!-- Recovery Collapse Index -->
    ${rci > 0 ? `
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <p style="margin:0 0 2px;font-size:13px;font-weight:700;color:#991b1b;">Recovery Collapse Index (RCI)</p>
          <p style="margin:0;font-size:13px;color:#7f1d1d;">A score of <strong>${rci}/100</strong> means back-to-back meetings, after-hours pressure, and gaps between meetings are compounding into a high-stress work pattern. <strong>${rci >= 80 ? 'This is critical.' : rci >= 50 ? 'This needs attention.' : 'Monitor closely.'}</strong></p>
        </div>
        <div style="font-size:32px;font-weight:800;color:${rciColor};margin-left:16px;white-space:nowrap;">${rci}/100</div>
      </div>
    </div>` : ''}

    <!-- 4 Key metrics -->
    <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">📊 Key Signals</h2>
    <table style="border-collapse:separate;border-spacing:8px;width:100%;margin-bottom:24px;">
      <tr>
        ${metricBox(`${report.retentionExposure?.criticalIndividualsCount||0}`, 'Critical Attrition Risk', attrColor)}
        <td style="width:8px;"></td>
        ${metricBox(`${execDrag}/100`, 'Execution Drag', execColor)}
        <td style="width:8px;"></td>
        ${metricBox(mgrScore > 0 ? `${mgrScore}/100` : 'N/A', 'Manager Effectiveness', mgrColor)}
        <td style="width:8px;"></td>
        ${metricBox(`${report.crisisPatterns?.totalCrises||0}`, 'Crisis Events', (report.crisisPatterns?.totalCrises||0) > 0 ? '#f97316' : '#22c55e')}
      </tr>
    </table>

    <!-- Persistent risks -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">⚠️ Persistent Risks</h2>
      ${persistentRisksHtml}
    </div>

    <!-- Structural drivers -->
    ${structuralDriversHtml ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">🔍 Top Structural Drivers</h2>
      ${structuralDriversHtml}
    </div>` : ''}

    <!-- AI narrative -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">📋 Strategic Assessment</h2>
      ${aiNarrative}
    </div>

    <!-- Leadership actions -->
    ${leadershipActions ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">✅ Recommended Leadership Actions</h2>
      ${leadershipActions}
    </div>` : ''}

    <!-- Retention detail -->
    <div style="background:#fef9f0;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:12px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">Retention Exposure</p>
      <p style="margin:0;font-size:13px;color:#78350f;">
        ${report.retentionExposure?.highRiskIndividualsCount||0} individuals at high risk ·
        ${report.retentionExposure?.criticalIndividualsCount||0} critical ·
        Trend: ${report.retentionExposure?.trend||'stable'} ·
        Est. turnover risk: ${report.retentionExposure?.estimatedTurnoverRisk||0}%
        ${afterHours > 15 ? ` · ⚠️ ${afterHours}% of messages sent outside working hours` : ''}
      </p>
    </div>

    <!-- Leadership detail -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 16px;margin-bottom:12px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0369a1;">Leadership Health</p>
      <p style="margin:0;font-size:13px;color:#075985;">
        ${mgrScore > 0 ? `Manager effectiveness avg: ${mgrScore}/100 · ${report.leadershipSignals?.managerEffectiveness?.managersNeedCoachingCount||0} managers need coaching · ` : 'Manager effectiveness: insufficient data · '}
        Equity score: ${report.leadershipSignals?.equityScoreAvg||100}/100
      </p>
    </div>

  </div>

  <!-- Footer -->
  <div style="padding:14px 30px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">Generated by <strong>SignalTrue</strong> · Monthly Leadership Report · ${fmtDate(new Date())}</p>
    <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Team-aggregate data only. No individual names or personal data included.</p>
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
