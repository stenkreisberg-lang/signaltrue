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
    
    // Define 30-day period
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 30);
    
    // Get all teams for this org
    const teams = await Team.find({ orgId });
    
    if (teams.length === 0) {
      console.log('No teams found for org');
      return null;
    }
    
    // Aggregate organizational health
    const orgHealth = await calculateOrgHealth(teams, orgId, periodStart, periodEnd);
    
    // Identify persistent risks (≥3 weeks elevated)
    const persistentRisks = await identifyPersistentRisks(teams, periodStart, periodEnd);
    
    // Calculate leadership signals
    const leadershipSignals = await calculateLeadershipSignals(teams, periodStart, periodEnd);
    
    // Calculate execution signals
    const executionSignals = await calculateExecutionSignals(teams, periodStart, periodEnd);
    
    // Calculate retention exposure
    const retentionExposure = await calculateRetentionExposure(teams, periodStart, periodEnd);
    
    // Get top structural drivers (org-wide patterns)
    const topStructuralDrivers = await getTopStructuralDrivers(teams, periodStart, periodEnd);
    
    // Analyze crisis patterns
    const crisisPatterns = await analyzeCrisisPatterns(teams, periodStart, periodEnd);
    
    // Generate AI strategic summary
    const aiSummary = await generateMonthlyNarrative({
      orgHealth,
      persistentRisks,
      leadershipSignals,
      executionSignals,
      retentionExposure,
      topStructuralDrivers,
      crisisPatterns
    });
    
    // Create monthly report
    const monthlyReport = new MonthlyReport({
      orgId,
      periodStart,
      periodEnd,
      orgHealth,
      persistentRisks,
      leadershipSignals,
      executionSignals,
      retentionExposure,
      topStructuralDrivers,
      crisisPatterns,
      aiSummary
    });
    
    await monthlyReport.save();
    
    console.log(`✅ Monthly report generated for org ${orgId}`);
    console.log(`   📊 Org BDI: ${orgHealth.avgBDI.toFixed(1)}/100 (${orgHealth.bdiTrend})`);
    console.log(`   ⚠️  Persistent risks: ${persistentRisks.length}`);
    console.log(`   🚨 Critical individuals at risk: ${retentionExposure.criticalIndividualsCount}`);
    console.log(`   📉 Manager coaching needed: ${leadershipSignals.managerEffectiveness.managersNeedCoachingCount}`);
    
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
  const bdiColor = (report.orgHealth.avgBDI || 0) < 35 ? '#22c55e' : (report.orgHealth.avgBDI || 0) < 60 ? '#f59e0b' : '#ef4444';
  const trendEmoji = { improving: '📉', stable: '➡️', deteriorating: '📈' }[report.orgHealth.bdiTrend] || '➡️';
  const trendColor = { improving: '#22c55e', stable: '#6b7280', deteriorating: '#ef4444' }[report.orgHealth.bdiTrend] || '#6b7280';
  const periodLabel = `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`;

  const metricBox = (value, label, color = '#111827') =>
    `<td style="padding:16px; background:#f8fafc; border-radius:8px; text-align:center; border:1px solid #e5e7eb; width:25%;">
      <div style="font-size:26px; font-weight:700; color:${color};">${value}</div>
      <div style="font-size:11px; color:#6b7280; margin-top:2px;">${label}</div>
    </td>`;

  const attrColor = (report.retentionExposure.criticalIndividualsCount || 0) > 0 ? '#ef4444' : '#22c55e';
  const execColor = (report.executionSignals.executionDragAvg || 0) >= 60 ? '#ef4444' : (report.executionSignals.executionDragAvg || 0) >= 35 ? '#f59e0b' : '#22c55e';
  const mgrColor  = (report.leadershipSignals.managerEffectiveness.avgScore || 0) < 45 ? '#ef4444' : (report.leadershipSignals.managerEffectiveness.avgScore || 0) < 65 ? '#f59e0b' : '#22c55e';

  const persistentRisksHtml = (report.persistentRisks || []).length > 0
    ? report.persistentRisks.map(r => {
        const riskColor = r.classification === 'structural' ? '#ef4444' : '#f59e0b';
        const teams = (r.affectedTeams || []).map(t => t.teamName).join(', ');
        const label = r.riskType === 'overload' ? 'Workload Overload' : r.riskType === 'execution' ? 'Execution Drag' : 'Retention Strain';
        return `<div style="padding:10px 14px; margin-bottom:8px; background:${riskColor}10; border-left:4px solid ${riskColor}; border-radius:4px;">
          <p style="margin:0 0 2px; font-size:14px; font-weight:600; color:#111827;">${label}
            <span style="font-size:11px; font-weight:400; background:${riskColor}20; color:${riskColor}; padding:1px 6px; border-radius:10px; margin-left:6px;">${r.classification} · ${r.weeksAboveThreshold}w elevated</span>
          </p>
          <p style="margin:0; font-size:13px; color:#6b7280;">Avg score: ${r.avgScore}/100 · Teams: ${teams || 'multiple'}</p>
        </div>`;
      }).join('')
    : `<p style="font-size:14px; color:#22c55e; margin:0;">✅ No persistent risks identified this month.</p>`;

  const aiNarrative = report.aiSummary?.narrative
    ? report.aiSummary.narrative.split('\n\n').filter(Boolean)
        .map(p => `<p style="font-size:14px; color:#374151; line-height:1.7; margin:0 0 10px;">${p}</p>`).join('')
    : '<p style="font-size:14px; color:#6b7280;">No AI narrative available.</p>';

  const leadershipActions = (report.aiSummary?.recommendedLeadershipActions || []).length > 0
    ? report.aiSummary.recommendedLeadershipActions.slice(0, 4).map(a => {
        const uc = a.urgency === 'immediate' ? '#ef4444' : a.urgency === 'this-month' ? '#f59e0b' : '#6366f1';
        const ul = a.urgency === 'immediate' ? 'Immediate' : a.urgency === 'this-month' ? 'This Month' : 'Strategic';
        return `<div style="background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:12px 14px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <span style="font-size:13px; font-weight:600; color:#111827;">${a.action}</span>
            <span style="font-size:11px; font-weight:600; color:${uc}; background:${uc}15; padding:2px 8px; border-radius:10px;">${ul}</span>
          </div>
          <p style="margin:0; font-size:12px; color:#6b7280;">${a.rationale || ''}</p>
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

  <!-- Org health banner -->
  <div style="background:#f8fafc;padding:16px 30px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;">
    <span style="font-size:24px;">${trendEmoji}</span>
    <div>
      <div style="font-size:15px;font-weight:600;color:#111827;">
        Organisation BDI: <span style="color:${bdiColor};">${(report.orgHealth.avgBDI || 0).toFixed(1)}/100</span>
      </div>
      <div style="font-size:13px;color:${trendColor};text-transform:capitalize;">Trend: ${report.orgHealth.bdiTrend}${report.orgHealth.trendStrength ? ` (${report.orgHealth.trendStrength})` : ''}</div>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <div style="font-size:13px;color:#6b7280;">${report.orgHealth.teamsAtRisk} of ${(report.orgHealth.zoneDistribution?.stable || 0) + (report.orgHealth.zoneDistribution?.stretched || 0) + (report.orgHealth.zoneDistribution?.critical || 0) + (report.orgHealth.zoneDistribution?.recovery || 0)} teams at risk</div>
      <div style="font-size:12px;color:#9ca3af;">Stable ${report.orgHealth.zoneDistribution?.stable || 0} · Stretched ${report.orgHealth.zoneDistribution?.stretched || 0} · Critical ${report.orgHealth.zoneDistribution?.critical || 0}</div>
    </div>
  </div>

  <div style="padding:24px 30px;">

    <!-- Key metrics -->
    <table style="border-collapse:collapse;width:100%;margin-bottom:24px;" cellspacing="8">
      <tr>
        ${metricBox(`${report.retentionExposure.criticalIndividualsCount}`, 'Critical Attrition Risk', attrColor)}
        <td style="padding:4px;"></td>
        ${metricBox(`${report.executionSignals.executionDragAvg}/100`, 'Execution Drag', execColor)}
        <td style="padding:4px;"></td>
        ${metricBox(`${report.leadershipSignals.managerEffectiveness.avgScore}/100`, 'Manager Effectiveness', mgrColor)}
        <td style="padding:4px;"></td>
        ${metricBox(`${report.crisisPatterns.totalCrises}`, 'Crisis Events', report.crisisPatterns.totalCrises > 0 ? '#f97316' : '#22c55e')}
      </tr>
    </table>

    <!-- Persistent risks -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">⚠️ Persistent Risks</h2>
      ${persistentRisksHtml}
    </div>

    <!-- AI narrative -->
    ${report.aiSummary?.narrative ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">📋 Strategic Assessment</h2>
      ${aiNarrative}
    </div>` : ''}

    <!-- Leadership actions -->
    ${leadershipActions ? `
    <div style="margin-bottom:24px;">
      <h2 style="color:#111827;font-size:17px;font-weight:700;margin:0 0 12px;">✅ Recommended Leadership Actions</h2>
      ${leadershipActions}
    </div>` : ''}

    <!-- Retention detail -->
    <div style="background:#fef9f0;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e;">Retention Exposure</p>
      <p style="margin:0;font-size:13px;color:#78350f;">
        ${report.retentionExposure.highRiskIndividualsCount} individuals at high risk ·
        ${report.retentionExposure.criticalIndividualsCount} critical ·
        Trend: ${report.retentionExposure.trend} ·
        Est. turnover risk: ${report.retentionExposure.estimatedTurnoverRisk}%
      </p>
    </div>

    <!-- Leadership detail -->
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0369a1;">Leadership Health</p>
      <p style="margin:0;font-size:13px;color:#075985;">
        Manager effectiveness avg: ${report.leadershipSignals.managerEffectiveness.avgScore}/100 ·
        ${report.leadershipSignals.managerEffectiveness.managersNeedCoachingCount} managers need coaching ·
        Equity score: ${report.leadershipSignals.equityScoreAvg}/100
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
 * Send the monthly leadership report email for one org.
 * Always CCs sten.kreisberg@gmail.com regardless of client recipient status.
 */
/**
 * Returns true if the report has real data worth sending to a client.
 * All-zero reports are held back from clients and only sent to superadmin.
 */
function reportHasRealData(report) {
  const bdi = report.orgHealth?.avgBDI || 0;
  const teamsAtRisk = report.orgHealth?.teamsAtRisk || 0;
  const attrition = report.retentionExposure?.criticalIndividualsCount || 0;
  const managerScore = report.leadershipSignals?.managerEffectiveness?.avgScore || 0;
  const crises = report.crisisPatterns?.totalCrises || 0;
  const execDrag = report.executionSignals?.executionDragAvg || 0;
  const persistentRisks = (report.persistentRisks || []).length;
  // If every single metric is 0, the data pipeline hasn't populated yet
  return (bdi + teamsAtRisk + attrition + managerScore + crises + execDrag + persistentRisks) > 0;
}

export async function sendMonthlyReportEmail(orgId, report) {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error(`[MonthlyReport] Org ${orgId} not found`);

  const periodLabel = new Date(report.periodEnd).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const subject = `Monthly Leadership Report — ${org.name} — ${periodLabel}`;
  const html = generateMonthlyEmailHTML({ org, report });

  // Build recipient list: master_admin + hr_admin + executive users
  const orgUsers = await User.find({ orgId, role: { $in: ['master_admin', 'hr_admin', 'executive'] } }).select('email');
  const userEmails = orgUsers.map(u => u.email);
  const overrides = org.settings?.monthlyReportRecipients || [];
  const recipients = [...new Set([...userEmails, ...overrides])];

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
