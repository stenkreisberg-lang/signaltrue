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
    
    return {
      currentState,
      teamProfile,
      pastExperiments,
      learnedPatterns,
      recentChanges,
      seasonality,
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
 * Format context for AI prompt
 */
export function formatContextForPrompt(context) {
  const { currentState, teamProfile, pastExperiments, learnedPatterns, recentChanges, seasonality, topDrivers } = context;
  
  let prompt = `TEAM CONTEXT:\n`;
  prompt += `- Industry: ${teamProfile.industry}\n`;
  prompt += `- Team Function: ${teamProfile.function}\n`;
  prompt += `- Team Size: ${teamProfile.size} (${teamProfile.actualSize} people)\n`;
  prompt += `- Current State: ${currentState.state} (${currentState.confidence} confidence)\n`;
  prompt += `- BDI Score: ${currentState.bdi}/100 (Zone: ${currentState.zone}, Trend: ${currentState.trend >= 0 ? '+' : ''}${currentState.trend}%)\n\n`;
  
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
