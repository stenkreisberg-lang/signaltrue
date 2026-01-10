/**
 * AI Recommendation Context Service
 * Aggregates all relevant context for AI-powered recommendations
 */

import Team from '../models/team.js';
import Experiment from '../models/experiment.js';
import Impact from '../models/impact.js';
import RiskWeekly from '../models/riskWeekly.js';
import TeamState from '../models/teamState.js';
import { getLearnedPatterns } from './learningLoopService.js';
import { getTeamRiskSummary } from './attritionRiskService.js';
import { calculateManagerEffectiveness } from './managerEffectivenessService.js';
import { detectTeamCrisis } from './crisisDetectionService.js';
import { analyzeNetworkHealth } from './networkHealthService.js';
import { analyzeTeamSuccessionRisk } from './successionRiskService.js';
import { analyzeTeamEquity } from './equitySignalsService.js';

/**
 * Build comprehensive context for AI recommendation generation
 */
export async function buildRecommendationContext(teamId, riskType, drivers, weekStart) {
  try {
    const team = await Team.findById(teamId).populate('orgId');
    
    if (!team) {
      throw new Error('Team not found');
    }
    
    // 1. Current drift state
    const currentState = await getCurrentDriftState(team, weekStart);
    
    // 2. Team profile
    const teamProfile = getTeamProfile(team);
    
    // 3. Past experiments (what this team has tried before)
    const pastExperiments = await getPastExperiments(teamId, riskType);
    
    // 4. Learned patterns (what worked for similar teams)
    const learnedPatterns = await getLearnedPatterns(teamProfile, riskType, { limit: 10 });
    
    // 5. Recent team changes
    const recentChanges = getRecentChanges(team);
    
    // 6. Seasonality context
    const seasonality = getSeasonalityContext();
    
    // 7. NEW: Behavioral Intelligence Signals
    const intelligenceSignals = await fetchIntelligenceContext(teamId, team);
    
    return {
      currentState,
      teamProfile,
      pastExperiments,
      learnedPatterns,
      recentChanges,
      seasonality,
      intelligenceSignals,
      topDrivers: drivers.slice(0, 3) // Top 3 drivers
    };
  } catch (error) {
    console.error('Error building recommendation context:', error);
    throw error;
  }
}

/**
 * Get current drift state for the team
 */
async function getCurrentDriftState(team, weekStart) {
  const teamState = await TeamState.findOne({ 
    teamId: team._id, 
    weekStart 
  }).sort({ weekStart: -1 });
  
  const risks = await RiskWeekly.find({ 
    teamId: team._id, 
    weekStart 
  });
  
  return {
    state: teamState?.state || 'unknown',
    confidence: teamState?.confidence || 'low',
    dominantRisk: teamState?.dominantRisk,
    bdi: team.bdi,
    zone: team.zone,
    trend: team.trend,
    risks: risks.map(r => ({
      type: r.riskType,
      score: r.score,
      band: r.band
    }))
  };
}

/**
 * Extract team profile for matching
 */
function getTeamProfile(team) {
  return {
    industry: team.orgId?.industry || 'Other',
    function: team.metadata?.function || 'Other',
    size: team.metadata?.sizeBand || '1-5',
    actualSize: team.metadata?.actualSize || 0,
    name: team.name
  };
}

/**
 * Get this team's past experiments
 */
async function getPastExperiments(teamId, riskType) {
  const experiments = await Experiment.find({
    teamId,
    status: 'completed'
  })
  .populate('actionId')
  .sort({ endDate: -1 })
  .limit(5)
  .lean();
  
  // Get impacts for these experiments
  const experimentsWithImpact = await Promise.all(
    experiments.map(async (exp) => {
      const impact = await Impact.findOne({ experimentId: exp._id });
      return {
        action: exp.actionId?.title,
        duration: exp.actionId?.duration,
        linkedRisk: exp.actionId?.linkedRisk,
        result: impact?.result,
        metricChanges: impact?.metricChanges,
        completedAt: exp.endDate
      };
    })
  );
  
  // Filter for relevant risk type or general learnings
  const relevant = experimentsWithImpact.filter(exp => 
    !riskType || exp.linkedRisk === riskType || exp.result === 'positive'
  );
  
  return relevant;
}

/**
 * Detect recent organizational changes
 */
function getRecentChanges(team) {
  const changes = [];
  
  // Check if team size changed recently (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  if (team.bdiHistory && team.bdiHistory.length > 1) {
    const recent = team.bdiHistory[0];
    const previous = team.bdiHistory[1];
    
    // Significant BDI increase
    if (recent.bdi - previous.bdi > 15) {
      changes.push('Recent stress increase detected');
    }
    
    // Significant BDI decrease
    if (previous.bdi - recent.bdi > 15) {
      changes.push('Recent improvement detected');
    }
  }
  
  // Check for drift flags
  if (team.drift) {
    changes.push(`Current drift: ${team.drift}`);
  }
  
  return changes;
}

/**
 * Get seasonality context
 */
function getSeasonalityContext() {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const quarter = Math.floor(month / 3) + 1;
  
  const context = {
    month: now.toLocaleString('default', { month: 'long' }),
    quarter: `Q${quarter}`,
    isEndOfQuarter: month % 3 === 2,
    isYearEnd: month === 11,
    isSummer: month >= 5 && month <= 7, // June-August
    notes: []
  };
  
  if (context.isEndOfQuarter) {
    context.notes.push('End of quarter - higher workload expected');
  }
  
  if (context.isSummer) {
    context.notes.push('Summer period - vacation impact possible');
  }
  
  if (context.isYearEnd) {
    context.notes.push('Year-end planning period');
  }
  
  return context;
}

/**
 * Fetch behavioral intelligence context for the team
 */
async function fetchIntelligenceContext(teamId, team) {
  try {
    const [attritionRisks, managerScore, crises, networkHealth, successionRisk, equitySignals] = await Promise.all([
      getTeamRiskSummary(teamId).catch(() => null),
      team.managerId ? calculateManagerEffectiveness(team.managerId, teamId).catch(() => null) : Promise.resolve(null),
      detectTeamCrisis(teamId).catch(() => null),
      analyzeNetworkHealth(teamId).catch(() => null),
      analyzeTeamSuccessionRisk(teamId).catch(() => null),
      analyzeTeamEquity(teamId).catch(() => null)
    ]);
    
    return {
      attrition: {
        highRiskCount: attritionRisks?.highRiskCount || 0,
        criticalRiskCount: attritionRisks?.criticalRiskCount || 0,
        avgRiskScore: attritionRisks?.avgRiskScore || 0,
        topSignals: attritionRisks?.topSignals || []
      },
      manager: {
        effectivenessScore: managerScore?.effectivenessScore || null,
        effectivenessLevel: managerScore?.effectivenessLevel || null,
        improvementAreas: managerScore?.improvementAreas?.map(a => a.area) || []
      },
      crisis: {
        active: crises?.length > 0,
        type: crises?.[0]?.crisisType || null,
        severity: crises?.[0]?.severity || null,
        confidence: crises?.[0]?.confidence || null
      },
      network: {
        siloScore: networkHealth?.siloScore || 0,
        bottleneckCount: networkHealth?.bottlenecks?.length || 0,
        isolatedMemberCount: networkHealth?.isolatedMembers?.length || 0
      },
      succession: {
        busFactor: successionRisk?.busFactor || 100,
        criticalRoleCount: successionRisk?.criticalRoles?.length || 0
      },
      equity: {
        responseTimeEquity: equitySignals?.responseTimeEquity?.equityScore || 100,
        participationEquity: equitySignals?.participationEquity?.equityScore || 100,
        voiceEquity: equitySignals?.voiceEquity?.equityScore || 100,
        overallScore: equitySignals?.overallEquityScore || 100
      }
    };
  } catch (error) {
    console.error('Error fetching intelligence context:', error);
    // Return empty context if intelligence data unavailable
    return {
      attrition: { highRiskCount: 0, criticalRiskCount: 0, avgRiskScore: 0, topSignals: [] },
      manager: { effectivenessScore: null, effectivenessLevel: null, improvementAreas: [] },
      crisis: { active: false, type: null, severity: null, confidence: null },
      network: { siloScore: 0, bottleneckCount: 0, isolatedMemberCount: 0 },
      succession: { busFactor: 100, criticalRoleCount: 0 },
      equity: { responseTimeEquity: 100, participationEquity: 100, voiceEquity: 100, overallScore: 100 }
    };
  }
}

/**
 * Format context for AI prompt
 */
export function formatContextForPrompt(context) {
  const { currentState, teamProfile, pastExperiments, learnedPatterns, recentChanges, seasonality, intelligenceSignals, topDrivers } = context;
  
  let prompt = `TEAM CONTEXT:\n`;
  prompt += `- Industry: ${teamProfile.industry}\n`;
  prompt += `- Team Function: ${teamProfile.function}\n`;
  prompt += `- Team Size: ${teamProfile.size} (${teamProfile.actualSize} people)\n`;
  prompt += `- Current State: ${currentState.state} (${currentState.confidence} confidence)\n`;
  prompt += `- BDI Score: ${currentState.bdi}/100 (Zone: ${currentState.zone}, Trend: ${currentState.trend >= 0 ? '+' : ''}${currentState.trend}%)\n\n`;
  
  // NEW: Add Intelligence Signals
  if (intelligenceSignals) {
    prompt += `BEHAVIORAL INTELLIGENCE SIGNALS:\n`;
    
    if (intelligenceSignals.crisis.active) {
      prompt += `- 🚨 ACTIVE CRISIS: ${intelligenceSignals.crisis.type} (${intelligenceSignals.crisis.severity} severity, ${intelligenceSignals.crisis.confidence}% confidence)\n`;
    }
    
    if (intelligenceSignals.attrition.criticalRiskCount > 0) {
      prompt += `- ⚠️ CRITICAL ATTRITION RISK: ${intelligenceSignals.attrition.criticalRiskCount} team members at critical flight risk\n`;
    } else if (intelligenceSignals.attrition.highRiskCount > 0) {
      prompt += `- ⚠️ Attrition Risk: ${intelligenceSignals.attrition.highRiskCount} team members at high flight risk\n`;
    }
    
    if (intelligenceSignals.manager.effectivenessScore !== null) {
      if (intelligenceSignals.manager.effectivenessLevel === 'critical' || intelligenceSignals.manager.effectivenessLevel === 'needs-improvement') {
        prompt += `- ⚠️ Manager Effectiveness: ${intelligenceSignals.manager.effectivenessLevel} (${intelligenceSignals.manager.effectivenessScore}/100)\n`;
        if (intelligenceSignals.manager.improvementAreas.length > 0) {
          prompt += `  Areas needing improvement: ${intelligenceSignals.manager.improvementAreas.join(', ')}\n`;
        }
      }
    }
    
    if (intelligenceSignals.network.siloScore >= 60) {
      prompt += `- ⚠️ Network Silos: Score ${intelligenceSignals.network.siloScore}/100 (${intelligenceSignals.network.bottleneckCount} bottlenecks, ${intelligenceSignals.network.isolatedMemberCount} isolated)\n`;
    }
    
    if (intelligenceSignals.succession.busFactor < 50) {
      prompt += `- ⚠️ Succession Risk: Bus factor ${intelligenceSignals.succession.busFactor}/100 (${intelligenceSignals.succession.criticalRoleCount} critical knowledge holders)\n`;
    }
    
    if (intelligenceSignals.equity.overallScore < 70) {
      prompt += `- ⚠️ Equity Issues: Overall equity score ${intelligenceSignals.equity.overallScore}/100\n`;
      if (intelligenceSignals.equity.responseTimeEquity < 70) {
        prompt += `  Response time inequity detected (${intelligenceSignals.equity.responseTimeEquity}/100)\n`;
      }
      if (intelligenceSignals.equity.participationEquity < 70) {
        prompt += `  Participation inequity detected (${intelligenceSignals.equity.participationEquity}/100)\n`;
      }
    }
    
    prompt += `\n`;
  }
  
  prompt += `CURRENT ISSUE:\n`;
  prompt += `- Risk Type: ${currentState.dominantRisk}\n`;
  prompt += `- Top Drivers: ${topDrivers.map(d => d.metricKey || d).join(', ')}\n\n`;
  
  if (pastExperiments.length > 0) {
    prompt += `THIS TEAM'S PAST EXPERIMENTS:\n`;
    pastExperiments.forEach(exp => {
      prompt += `- "${exp.action}" → ${exp.result} (${exp.metricChanges?.map(m => `${m.metricKey}: ${m.percentChange > 0 ? '+' : ''}${m.percentChange}%`).join(', ') || 'no metrics'})\n`;
    });
    prompt += `\n`;
  }
  
  if (learnedPatterns.successes.length > 0) {
    prompt += `WHAT WORKED FOR SIMILAR TEAMS:\n`;
    learnedPatterns.successes.forEach(learning => {
      prompt += `- "${learning.action.title}" (${learning.teamProfile.function}, ${learning.teamProfile.size}) → ${learning.metricImpact.map(m => `${m.metricKey}: ${m.percentChange > 0 ? '+' : ''}${m.percentChange}%`).join(', ')}\n`;
    });
    prompt += `\n`;
  }
  
  if (learnedPatterns.failures.length > 0) {
    prompt += `WHAT DIDN'T WORK (AVOID THESE):\n`;
    learnedPatterns.failures.forEach(learning => {
      prompt += `- "${learning.action.title}" → failed (${learning.metricImpact.map(m => m.metricKey).join(', ')} worsened)\n`;
    });
    prompt += `\n`;
  }
  
  if (recentChanges.length > 0) {
    prompt += `RECENT CHANGES:\n`;
    recentChanges.forEach(change => prompt += `- ${change}\n`);
    prompt += `\n`;
  }
  
  prompt += `TIMING CONTEXT:\n`;
  prompt += `- ${seasonality.month} ${new Date().getFullYear()} (${seasonality.quarter})\n`;
  if (seasonality.notes.length > 0) {
    seasonality.notes.forEach(note => prompt += `- ${note}\n`);
  }
  
  return prompt;
}

export default {
  buildRecommendationContext,
  formatContextForPrompt
};
