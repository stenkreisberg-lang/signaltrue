/**
 * Learning Loop Service
 * Records outcomes from experiments and provides learned patterns for AI recommendations
 */

import ActionLearning from '../models/actionLearning.js';
import Experiment from '../models/experiment.js';
import Impact from '../models/impact.js';
import Team from '../models/team.js';
import TeamAction from '../models/teamAction.js';

/**
 * Record an action outcome when experiment completes
 * This is the core of the learning loop - every completed experiment becomes a learning
 */
export async function recordActionOutcome(experimentId) {
  try {
    // Get experiment with all related data
    const experiment = await Experiment.findById(experimentId)
      .populate('teamId')
      .populate('actionId');
    
    if (!experiment) {
      throw new Error('Experiment not found');
    }
    
    // Get impact assessment
    const impact = await Impact.findOne({ experimentId });
    
    if (!impact) {
      console.warn(`No impact found for experiment ${experimentId}, skipping learning record`);
      return null;
    }
    
    // Get team organization for industry
    const team = await Team.findById(experiment.teamId._id).populate('orgId');
    
    if (!team) {
      throw new Error('Team not found');
    }
    
    // Extract top drivers from the action
    const topDrivers = extractDriversFromAction(experiment.actionId);
    
    // Create learning record
    const learning = await ActionLearning.create({
      experimentId: experiment._id,
      teamProfile: {
        industry: team.orgId?.industry || 'Other',
        function: team.metadata?.function || 'Other',
        size: team.metadata?.sizeBand || '1-5',
        actualSize: team.metadata?.actualSize
      },
      riskType: experiment.actionId.linkedRisk,
      topDrivers,
      action: {
        title: experiment.actionId.title,
        duration: experiment.actionId.duration,
        generatedBy: experiment.actionId.generatedBy || 'template'
      },
      outcome: impact.result, // 'positive', 'neutral', 'negative'
      metricImpact: impact.metricChanges,
      confidence: impact.confidence,
      recordedAt: new Date()
    });
    
    console.log(`✅ Learning recorded: ${learning.outcome} outcome for ${learning.action.title} (${learning.teamProfile.function} team)`);
    
    return learning;
  } catch (error) {
    console.error('Error recording action outcome:', error);
    throw error;
  }
}

/**
 * Get learned patterns for a specific team profile and risk type
 * Returns successful and failed actions to inform AI recommendations
 */
export async function getLearnedPatterns(teamProfile, riskType, options = {}) {
  const { limit = 10, minConfidence = 'medium' } = options;
  
  try {
    // Get successful actions for similar teams
    const successes = await ActionLearning.find({
      'teamProfile.industry': teamProfile.industry,
      'teamProfile.function': teamProfile.function,
      riskType: riskType,
      outcome: 'positive',
      confidence: { $in: minConfidence === 'high' ? ['high'] : ['medium', 'high'] }
    })
    .sort({ recordedAt: -1 })
    .limit(limit)
    .lean();
    
    // Get failed actions to avoid repeating mistakes
    const failures = await ActionLearning.find({
      'teamProfile.industry': teamProfile.industry,
      'teamProfile.function': teamProfile.function,
      riskType: riskType,
      outcome: 'negative'
    })
    .sort({ recordedAt: -1 })
    .limit(5)
    .lean();
    
    // Get cross-industry successes (if we don't have enough same-industry data)
    let crossIndustrySuccesses = [];
    if (successes.length < 3) {
      crossIndustrySuccesses = await ActionLearning.find({
        'teamProfile.function': teamProfile.function, // Same function, different industry
        'teamProfile.size': teamProfile.size,
        riskType: riskType,
        outcome: 'positive',
        confidence: 'high'
      })
      .sort({ recordedAt: -1 })
      .limit(5)
      .lean();
    }
    
    return {
      successes,
      failures,
      crossIndustrySuccesses,
      totalLearnings: successes.length + failures.length + crossIndustrySuccesses.length
    };
  } catch (error) {
    console.error('Error getting learned patterns:', error);
    return { successes: [], failures: [], crossIndustrySuccesses: [], totalLearnings: 0 };
  }
}

/**
 * Get overall learning statistics for a team
 */
export async function getLearningStats(teamId) {
  try {
    const team = await Team.findById(teamId).populate('orgId');
    
    const stats = await ActionLearning.aggregate([
      {
        $match: {
          'teamProfile.industry': team.orgId?.industry,
          'teamProfile.function': team.metadata?.function
        }
      },
      {
        $group: {
          _id: '$outcome',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const successRate = stats.reduce((acc, s) => {
      if (s._id === 'positive') acc.successes = s.count;
      if (s._id === 'negative') acc.failures = s.count;
      if (s._id === 'neutral') acc.neutrals = s.count;
      return acc;
    }, { successes: 0, failures: 0, neutrals: 0 });
    
    const total = successRate.successes + successRate.failures + successRate.neutrals;
    successRate.rate = total > 0 ? (successRate.successes / total * 100).toFixed(1) : 0;
    
    return successRate;
  } catch (error) {
    console.error('Error getting learning stats:', error);
    return { successes: 0, failures: 0, neutrals: 0, rate: 0 };
  }
}

/**
 * Helper: Extract drivers from action metadata
 */
function extractDriversFromAction(action) {
  const drivers = [];
  
  // Parse common driver patterns from action title
  const title = action.title.toLowerCase();
  
  if (title.includes('meeting')) drivers.push('meeting_load');
  if (title.includes('after-hours') || title.includes('quiet hours')) drivers.push('after_hours_activity');
  if (title.includes('response') || title.includes('async')) drivers.push('response_time');
  if (title.includes('focus')) drivers.push('focus_time');
  if (title.includes('collaboration')) drivers.push('collaboration_breadth');
  
  return drivers.length > 0 ? drivers : ['general'];
}

export default {
  recordActionOutcome,
  getLearnedPatterns,
  getLearningStats
};
