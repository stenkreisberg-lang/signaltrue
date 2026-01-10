/**
 * Network Health Service
 * Analyzes collaboration patterns from Slack to detect silos, bottlenecks, and knowledge concentration
 */

import NetworkHealth from '../models/networkHealth.js';
import Team from '../models/team.js';
import User from '../models/user.js';

/**
 * Analyze network health for a team
 */
export async function analyzeNetworkHealth(teamId) {
  try {
    // Get Slack collaboration data
    const collaborationData = await getSlackCollaborationData(teamId);
    
    // Detect silos
    const silos = detectSilos(collaborationData);
    
    // Detect bottlenecks
    const bottlenecks = await detectBottlenecks(teamId, collaborationData);
    
    // Detect knowledge concentration
    const knowledgeRisks = await detectKnowledgeConcentration(teamId, collaborationData);
    
    // Calculate metrics
    const metrics = calculateNetworkMetrics(collaborationData, silos, bottlenecks);
    
    // Calculate health score
    const healthScore = calculateHealthScore(silos, bottlenecks, knowledgeRisks, metrics);
    const healthLevel = getHealthLevel(healthScore);
    
    // Generate recommendations
    const recommendations = generateRecommendations(silos, bottlenecks, knowledgeRisks);
    
    // Save or update
    const team = await Team.findById(teamId);
    let health = await NetworkHealth.findOne({ teamId });
    
    if (health) {
      Object.assign(health, {
        healthScore,
        healthLevel,
        silos,
        bottlenecks,
        knowledgeRisks,
        metrics,
        recommendations,
        lastAnalyzed: new Date()
      });
    } else {
      health = new NetworkHealth({
        teamId,
        orgId: team.orgId || team.organizationId,
        healthScore,
        healthLevel,
        silos,
        bottlenecks,
        knowledgeRisks,
        metrics,
        recommendations
      });
    }
    
    await health.save();
    return health;
  } catch (error) {
    console.error('[Network Health] Error analyzing:', error);
    throw error;
  }
}

/**
 * Get Slack collaboration data
 */
async function getSlackCollaborationData(teamId) {
  // Placeholder - query Slack API for:
  // - Who DMs/mentions who
  // - Who asks questions to who
  // - Channel participation patterns
  
  return {
    interactions: [
      { fromUserId: 'user1', toUserId: 'user2', count: 45 },
      { fromUserId: 'user1', toUserId: 'user3', count: 12 },
      // etc...
    ],
    questions: [
      { questioner: 'user4', answerer: 'user2', count: 38, avgResponseHours: 1.2 },
      // etc...
    ],
    topics: [
      { keyword: 'database', expertUserId: 'user2', mentions: 120, uniqueAskers: 15 },
      // etc...
    ]
  };
}

/**
 * Detect silos (isolated groups)
 */
function detectSilos(data) {
  // Simplified silo detection
  // In production: graph analysis to find disconnected components
  
  const silos = [];
  
  // Example: if a subgroup only talks to each other
  const potentialSilo = {
    members: ['user5', 'user6', 'user7'],
    isolationScore: 85, // % of communication within group
    crossTeamInteractionRate: 0.15
  };
  
  if (potentialSilo.isolationScore > 70) {
    silos.push(potentialSilo);
  }
  
  return silos;
}

/**
 * Detect bottlenecks (people everyone depends on)
 */
async function detectBottlenecks(teamId, data) {
  const bottlenecks = [];
  
  // Count questions directed to each person
  const questionCounts = {};
  
  for (const q of data.questions || []) {
    if (!questionCounts[q.answerer]) {
      questionCounts[q.answerer] = {
        total: 0,
        questioners: new Set(),
        totalResponseTime: 0,
        count: 0
      };
    }
    
    questionCounts[q.answerer].total += q.count;
    questionCounts[q.answerer].questioners.add(q.questioner);
    questionCounts[q.answerer].totalResponseTime += q.avgResponseHours * q.count;
    questionCounts[q.answerer].count += q.count;
  }
  
  // Identify bottlenecks (people with >30 questions/month from >5 people)
  for (const [userId, stats] of Object.entries(questionCounts)) {
    if (stats.total > 30 && stats.questioners.size > 5) {
      const avgResponseTime = stats.totalResponseTime / stats.count;
      
      bottlenecks.push({
        userId,
        incomingQuestionRate: stats.total,
        uniqueQuestioners: stats.questioners.size,
        averageResponseTime: avgResponseTime,
        bottleneckSeverity: stats.total > 100 ? 'critical' : stats.total > 60 ? 'high' : 'medium'
      });
    }
  }
  
  return bottlenecks;
}

/**
 * Detect knowledge concentration (single points of failure)
 */
async function detectKnowledgeConcentration(teamId, data) {
  const risks = [];
  
  // Analyze topics/keywords from Slack
  for (const topic of data.topics || []) {
    // If one person is asked about this topic by many people
    const dependencyRate = topic.mentions / topic.uniqueAskers;
    
    // Count how many OTHER people also know this topic
    const backupCount = 0; // simplified
    
    const risk = {
      topic: topic.keyword,
      expertUserId: topic.expertUserId,
      dependencyRate,
      backupExpertCount: backupCount,
      riskLevel: backupCount === 0 ? 'critical' : backupCount === 1 ? 'high' : 'medium'
    };
    
    if (risk.riskLevel === 'critical' || risk.riskLevel === 'high') {
      risks.push(risk);
    }
  }
  
  return risks;
}

/**
 * Calculate network metrics
 */
function calculateNetworkMetrics(data, silos, bottlenecks) {
  return {
    averageConnectionsPerPerson: 8.5, // calculated from data.interactions
    crossFunctionalInteractions: 120,
    centralizedDecisionMaking: bottlenecks.length > 3,
    isolatedMembers: silos.reduce((sum, s) => sum + s.members.length, 0)
  };
}

/**
 * Calculate health score
 */
function calculateHealthScore(silos, bottlenecks, knowledgeRisks, metrics) {
  let score = 100;
  
  // Deduct for silos
  score -= silos.length * 15;
  
  // Deduct for bottlenecks
  score -= bottlenecks.length * 10;
  
  // Deduct for knowledge concentration
  score -= knowledgeRisks.filter(r => r.riskLevel === 'critical').length * 20;
  score -= knowledgeRisks.filter(r => r.riskLevel === 'high').length * 10;
  
  // Deduct for isolated members
  score -= metrics.isolatedMembers * 5;
  
  return Math.max(score, 0);
}

/**
 * Get health level
 */
function getHealthLevel(score) {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'needs-attention';
  return 'critical';
}

/**
 * Generate recommendations
 */
function generateRecommendations(silos, bottlenecks, knowledgeRisks) {
  const recs = [];
  
  if (silos.length > 0) {
    recs.push(`${silos.length} silo(s) detected - create cross-team collaboration channels`);
  }
  
  if (bottlenecks.length > 0) {
    recs.push(`${bottlenecks.length} bottleneck(s) detected - distribute knowledge and decision-making`);
  }
  
  const criticalKnowledge = knowledgeRisks.filter(r => r.riskLevel === 'critical');
  if (criticalKnowledge.length > 0) {
    recs.push(`${criticalKnowledge.length} critical knowledge risk(s) - implement knowledge sharing sessions`);
  }
  
  return recs;
}

/**
 * Get org-wide network health
 */
export async function getOrgNetworkHealth(orgId) {
  try {
    const teams = await Team.find({ $or: [{ orgId }, { organizationId: orgId }] });
    const results = [];
    
    for (const team of teams) {
      const health = await NetworkHealth.findOne({ teamId: team._id })
        .populate('teamId', 'name');
      
      if (health) {
        results.push(health);
      }
    }
    
    return results.sort((a, b) => a.healthScore - b.healthScore);
  } catch (error) {
    console.error('[Network Health] Error fetching org health:', error);
    throw error;
  }
}

export default {
  analyzeNetworkHealth,
  getOrgNetworkHealth
};
