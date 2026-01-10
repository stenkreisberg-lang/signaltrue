/**
 * Succession Risk Service
 * Identifies bus factor and succession risks from Slack Q&A patterns
 */

import SuccessionRisk from '../models/successionRisk.js';
import Team from '../models/team.js';
import User from '../models/user.js';

/**
 * Analyze succession risk for a team
 */
export async function analyzeTeamSuccessionRisk(teamId) {
  try {
    const team = await Team.findById(teamId).populate('members');
    
    if (!team || !team.members) {
      throw new Error('Team not found or has no members');
    }
    
    const results = [];
    
    // Analyze each team member
    for (const member of team.members) {
      const risk = await analyzeIndividualSuccessionRisk(member._id, teamId);
      if (risk) {
        results.push(risk);
      }
    }
    
    return results.sort((a, b) => b.riskScore - a.riskScore);
  } catch (error) {
    console.error('[Succession Risk] Error analyzing team:', error);
    throw error;
  }
}

/**
 * Analyze succession risk for an individual
 */
export async function analyzeIndividualSuccessionRisk(userId, teamId) {
  try {
    // Get Q&A data from Slack
    const qaData = await getSlackQAData(userId, teamId);
    
    if (qaData.totalQuestions < 10) {
      // Not enough dependency to be a risk
      return null;
    }
    
    // Identify knowledge areas
    const knowledgeAreas = identifyKnowledgeAreas(qaData);
    
    // Calculate dependency metrics
    const dependencyMetrics = calculateDependencyMetrics(qaData, teamId);
    
    // Find potential successors
    const successors = await findSuccessors(userId, teamId, knowledgeAreas);
    
    // Calculate bus factor
    const busFactor = calculateBusFactor(successors);
    
    // Calculate risk score
    const riskScore = calculateSuccessionRiskScore(dependencyMetrics, knowledgeAreas, successors);
    const riskLevel = getRiskLevel(riskScore);
    
    // Generate recommendations
    const recommendations = generateRecommendations(knowledgeAreas, successors, dependencyMetrics);
    
    // Save or update
    const team = await Team.findById(teamId);
    let risk = await SuccessionRisk.findOne({ teamId, userId });
    
    if (risk) {
      Object.assign(risk, {
        riskScore,
        riskLevel,
        knowledgeAreas,
        dependencyMetrics,
        successors,
        busFactor,
        recommendations,
        lastAnalyzed: new Date()
      });
    } else {
      risk = new SuccessionRisk({
        teamId,
        orgId: team.orgId || team.organizationId,
        userId,
        riskScore,
        riskLevel,
        knowledgeAreas,
        dependencyMetrics,
        successors,
        busFactor,
        recommendations
      });
    }
    
    await risk.save();
    return risk;
  } catch (error) {
    console.error('[Succession Risk] Error analyzing individual:', error);
    throw error;
  }
}

/**
 * Get Q&A data from Slack
 */
async function getSlackQAData(userId, teamId) {
  // Placeholder - query Slack API for:
  // - Questions directed at this user (mentions, DMs with question marks)
  // - Topics/keywords in questions
  // - Who asks questions
  
  return {
    totalQuestions: 245,
    uniqueQuestioners: 12,
    topics: [
      { keyword: 'deployment', count: 78, questioners: ['user1', 'user2', 'user3'] },
      { keyword: 'database', count: 54, questioners: ['user1', 'user4', 'user5'] },
      { keyword: 'auth system', count: 43, questioners: ['user2', 'user6'] }
    ],
    averageResponseTimeHours: 1.8
  };
}

/**
 * Identify knowledge areas
 */
function identifyKnowledgeAreas(qaData) {
  return qaData.topics.map(topic => ({
    topic: topic.keyword,
    questionVolume: topic.count,
    uniqueDependents: topic.questioners.length,
    backupCount: 0 // simplified - would need to check who else answers these questions
  }));
}

/**
 * Calculate dependency metrics
 */
function calculateDependencyMetrics(qaData, teamId) {
  // Assume team size of 10 for now
  const teamSize = 10;
  
  return {
    totalQuestions: qaData.totalQuestions,
    uniqueQuestioners: qaData.uniqueQuestioners,
    questionersAsPercentOfTeam: (qaData.uniqueQuestioners / teamSize) * 100,
    averageResponseTime: qaData.averageResponseTimeHours
  };
}

/**
 * Find potential successors
 */
async function findSuccessors(userId, teamId, knowledgeAreas) {
  // Placeholder - analyze who else talks about these topics in Slack
  
  return [
    {
      userId: 'user_backup_1',
      readinessScore: 45, // % of knowledge overlap
      knowledgeOverlap: 0.45
    },
    {
      userId: 'user_backup_2',
      readinessScore: 30,
      knowledgeOverlap: 0.30
    }
  ];
}

/**
 * Calculate bus factor
 */
function calculateBusFactor(successors) {
  // How many people need to be lost before team breaks
  const readySuccessors = successors.filter(s => s.readinessScore >= 60);
  
  if (readySuccessors.length === 0) return 1; // losing this one person breaks the team
  if (readySuccessors.length === 1) return 2;
  return 3;
}

/**
 * Calculate succession risk score
 */
function calculateSuccessionRiskScore(metrics, knowledge, successors) {
  let score = 0;
  
  // High dependency
  if (metrics.questionersAsPercentOfTeam > 50) score += 30;
  else if (metrics.questionersAsPercentOfTeam > 30) score += 20;
  
  // Critical knowledge areas with no backup
  const criticalKnowledge = knowledge.filter(k => k.backupCount === 0);
  score += criticalKnowledge.length * 15;
  
  // Successor readiness
  const readySuccessors = successors.filter(s => s.readinessScore >= 60);
  if (readySuccessors.length === 0) score += 40;
  else if (readySuccessors.length === 1) score += 20;
  
  return Math.min(score, 100);
}

/**
 * Get risk level
 */
function getRiskLevel(score) {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

/**
 * Generate recommendations
 */
function generateRecommendations(knowledge, successors, metrics) {
  const recs = [];
  
  const criticalKnowledge = knowledge.filter(k => k.backupCount === 0);
  if (criticalKnowledge.length > 0) {
    recs.push(`Document ${criticalKnowledge.length} critical knowledge area(s): ${criticalKnowledge.map(k => k.topic).join(', ')}`);
  }
  
  const readySuccessors = successors.filter(s => s.readinessScore >= 60);
  if (readySuccessors.length === 0) {
    recs.push('No ready successors - begin knowledge transfer immediately');
  }
  
  if (metrics.questionersAsPercentOfTeam > 50) {
    recs.push('Over 50% of team depends on this person - create documentation and training materials');
  }
  
  return recs;
}

/**
 * Get critical succession risks for org
 */
export async function getCriticalSuccessionRisks(orgId, minRiskScore = 65) {
  try {
    const risks = await SuccessionRisk.find({
      orgId,
      riskScore: { $gte: minRiskScore }
    })
    .populate('userId', 'name email')
    .populate('teamId', 'name')
    .sort({ riskScore: -1 });
    
    return risks;
  } catch (error) {
    console.error('[Succession Risk] Error fetching critical risks:', error);
    throw error;
  }
}

export default {
  analyzeTeamSuccessionRisk,
  analyzeIndividualSuccessionRisk,
  getCriticalSuccessionRisks
};
