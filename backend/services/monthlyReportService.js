import MonthlyReport from '../models/monthlyReport.js';
import TeamState from '../models/teamState.js';
import Team from '../models/team.js';
import ManagerEffectiveness from '../models/managerEffectiveness.js';
import EquitySignal from '../models/equitySignal.js';
import SuccessionRisk from '../models/successionRisk.js';
import AttritionRisk from '../models/attritionRisk.js';
import CrisisEvent from '../models/crisisEvent.js';
import ProjectRisk from '../models/projectRisk.js';
import MeetingROI from '../models/meetingROI.js';
import NetworkHealth from '../models/networkHealth.js';
import { generateMonthlyNarrative } from './aiRecommendationContext.js';

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
    const teams = await Team.find({ organizationId: orgId });
    
    if (teams.length === 0) {
      console.log('No teams found for org');
      return null;
    }
    
    // Aggregate organizational health
    const orgHealth = await calculateOrgHealth(teams, periodStart, periodEnd);
    
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
async function calculateOrgHealth(teams, periodStart, periodEnd) {
  const teamIds = teams.map(t => t._id);
  
  // Get last 4 weekly TeamState snapshots for each team
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekEnd: { $gte: periodStart, $lte: periodEnd }
  }).sort({ weekEnd: -1 });
  
  // Get most recent state per team
  const latestStates = [];
  const seenTeams = new Set();
  for (const state of teamStates) {
    if (!seenTeams.has(state.teamId.toString())) {
      latestStates.push(state);
      seenTeams.add(state.teamId.toString());
    }
  }
  
  // Calculate average BDI
  const avgBDI = latestStates.reduce((sum, s) => sum + (s.bdi || 0), 0) / (latestStates.length || 1);
  
  // Calculate BDI trend (comparing first 2 weeks vs last 2 weeks)
  const bdiTrend = calculateBDITrend(teamStates);
  
  // Zone distribution
  const zoneDistribution = {
    stable: latestStates.filter(s => s.zone === 'Stable').length,
    stretched: latestStates.filter(s => s.zone === 'Stretched').length,
    critical: latestStates.filter(s => s.zone === 'Critical').length,
    recovery: latestStates.filter(s => s.zone === 'Recovery').length
  };
  
  const teamsAtRisk = zoneDistribution.stretched + zoneDistribution.critical;
  
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
function calculateBDITrend(teamStates) {
  if (teamStates.length < 2) {
    return { direction: 'stable', strength: 'weak' };
  }
  
  // Sort by date
  const sorted = [...teamStates].sort((a, b) => a.weekEnd - b.weekEnd);
  
  // Split into first half and second half
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);
  
  const avgFirst = firstHalf.reduce((sum, s) => sum + (s.bdi || 0), 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, s) => sum + (s.bdi || 0), 0) / secondHalf.length;
  
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
  
  // Get all TeamStates in period
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekEnd: { $gte: periodStart, $lte: periodEnd }
  }).sort({ weekEnd: 1 }).populate('teamId');
  
  // Group by risk type
  const riskTypes = ['overload', 'execution', 'retention'];
  
  for (const riskType of riskTypes) {
    const riskKey = riskType === 'overload' ? 'overloadRisk' :
                    riskType === 'execution' ? 'executionDrag' :
                    'retentionStrain';
    
    // Track teams with this risk elevated
    const affectedTeams = [];
    const teamRiskWeeks = {};
    
    // Count weeks each team has this risk elevated (≥35)
    teamStates.forEach(state => {
      const teamId = state.teamId._id.toString();
      const riskScore = state[riskKey] || 0;
      
      if (riskScore >= 35) {
        if (!teamRiskWeeks[teamId]) {
          teamRiskWeeks[teamId] = {
            teamId: state.teamId._id,
            teamName: state.teamId.name,
            weeks: 0,
            scores: []
          };
        }
        teamRiskWeeks[teamId].weeks++;
        teamRiskWeeks[teamId].scores.push(riskScore);
      }
    });
    
    // Filter teams with ≥3 weeks elevated
    Object.values(teamRiskWeeks).forEach(team => {
      if (team.weeks >= PERSISTENT_RISK_WEEKS) {
        affectedTeams.push({
          teamId: team.teamId,
          teamName: team.teamName,
          score: team.scores.reduce((a, b) => a + b, 0) / team.scores.length
        });
      }
    });
    
    if (affectedTeams.length > 0) {
      const totalWeeks = 4; // Assuming 4 weeks in period
      const avgWeeksElevated = Object.values(teamRiskWeeks)
        .reduce((sum, t) => sum + t.weeks, 0) / affectedTeams.length;
      
      // Classify as structural if elevated >70% of period
      const classification = avgWeeksElevated / totalWeeks >= STRUCTURAL_THRESHOLD 
        ? 'structural' 
        : 'episodic';
      
      const avgScore = affectedTeams.reduce((sum, t) => sum + t.score, 0) / affectedTeams.length;
      
      persistentRisks.push({
        riskType,
        weeksAboveThreshold: Math.round(avgWeeksElevated),
        avgScore: Math.round(avgScore),
        affectedTeams,
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
    calculatedAt: { $gte: periodStart, $lte: periodEnd }
  }).sort({ calculatedAt: -1 });
  
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
  
  // Equity signals
  const equityData = await EquitySignal.find({
    teamId: { $in: teamIds },
    calculatedAt: { $gte: periodStart, $lte: periodEnd }
  }).sort({ calculatedAt: -1 });
  
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
    calculatedAt: { $gte: periodStart, $lte: periodEnd }
  }).sort({ calculatedAt: -1 });
  
  const successionCriticalCount = successionData.filter(s => s.busFactor < 2).length;
  const avgBusFactor = successionData.length > 0
    ? successionData.reduce((sum, s) => sum + (s.busFactor || 0), 0) / successionData.length
    : 3;
  
  return {
    managerEffectiveness: {
      avgScore: Math.round(avgManagerScore),
      managersCriticalCount,
      managersNeedCoachingCount,
      trend: 'stable' // TODO: Calculate trend from historical data
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
  
  // Get latest TeamStates for execution drag
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekEnd: { $gte: periodStart, $lte: periodEnd }
  }).sort({ weekEnd: -1 });
  
  const latestStates = [];
  const seenTeams = new Set();
  for (const state of teamStates) {
    if (!seenTeams.has(state.teamId.toString())) {
      latestStates.push(state);
      seenTeams.add(state.teamId.toString());
    }
  }
  
  const executionDragAvg = latestStates.length > 0
    ? latestStates.reduce((sum, s) => sum + (s.executionDrag || 0), 0) / latestStates.length
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
    calculatedAt: { $gte: periodStart, $lte: periodEnd }
  }).sort({ calculatedAt: -1 });
  
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
  
  // Calculate trend (compare first half vs second half of period)
  const trend = 'stable'; // TODO: Implement trend calculation
  
  // Estimated turnover risk (% of workforce at high risk)
  const estimatedTurnoverRisk = latestAttritionData.length > 0
    ? (highRiskIndividualsCount / latestAttritionData.length) * 100
    : 0;
  
  return {
    avgAttritionRisk: Math.round(avgAttritionRisk),
    criticalIndividualsCount,
    highRiskIndividualsCount,
    trend,
    estimatedTurnoverRisk: Math.round(estimatedTurnoverRisk)
  };
}

/**
 * Get top structural drivers (org-wide patterns)
 */
async function getTopStructuralDrivers(teams, periodStart, periodEnd) {
  const teamIds = teams.map(t => t._id);
  
  // Get all TeamStates in period
  const teamStates = await TeamState.find({
    teamId: { $in: teamIds },
    weekEnd: { $gte: periodStart, $lte: periodEnd }
  });
  
  // Aggregate drivers across all teams
  const driverAggregation = {};
  
  teamStates.forEach(state => {
    if (state.topDrivers) {
      state.topDrivers.forEach(driver => {
        if (!driverAggregation[driver.metric]) {
          driverAggregation[driver.metric] = {
            metric: driver.metric,
            deviations: [],
            teams: new Set()
          };
        }
        driverAggregation[driver.metric].deviations.push(driver.deviation);
        driverAggregation[driver.metric].teams.add(state.teamId.toString());
      });
    }
  });
  
  // Calculate averages and rank
  const drivers = Object.values(driverAggregation)
    .map(d => ({
      metric: d.metric,
      avgDeviation: d.deviations.reduce((a, b) => a + b, 0) / d.deviations.length,
      teamsAffected: d.teams.size,
      severity: Math.abs(d.deviations.reduce((a, b) => a + b, 0) / d.deviations.length) > 0.7 ? 'critical' :
                Math.abs(d.deviations.reduce((a, b) => a + b, 0) / d.deviations.length) > 0.4 ? 'high' : 'medium'
    }))
    .sort((a, b) => Math.abs(b.avgDeviation) - Math.abs(a.avgDeviation))
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
    if (!crisisByType[crisis.type]) {
      crisisByType[crisis.type] = 0;
    }
    crisisByType[crisis.type]++;
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

export default {
  generateMonthlyReportForOrg,
  getLatestMonthlyReport,
  getMonthlyReportHistory,
  getLeadershipView
};
