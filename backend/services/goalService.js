/**
 * Goal Tracking Service
 * Manages goal creation, progress tracking, and auto-updates from metrics
 */

import Goal from '../models/goal.js';
import OARScore from '../models/oarScore.js';
import TeamEnergyIndex from '../models/teamEnergyIndex.js';
import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';

/**
 * Create a new goal
 */
export async function createGoal(goalData, userId) {
  const goal = new Goal({
    ...goalData,
    createdBy: userId,
    valueHistory: [{
      value: goalData.startValue,
      date: new Date(),
      source: 'manual'
    }]
  });
  
  await goal.save();
  return goal;
}

/**
 * Update goal details
 */
export async function updateGoal(goalId, updates, userId) {
  const goal = await Goal.findById(goalId);
  
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  // Fields that can be updated
  const allowedFields = [
    'title', 'description', 'targetValue', 'deadline',
    'visibility', 'priority', 'tags', 'status'
  ];
  
  allowedFields.forEach(field => {
    if (updates[field] !== undefined) {
      goal[field] = updates[field];
    }
  });
  
  // Recalculate progress if target changed
  if (updates.targetValue !== undefined) {
    goal.progress = goal.calculateProgress();
    goal.progressStatus = goal.calculateProgressStatus();
  }
  
  await goal.save();
  return goal;
}

/**
 * Update goal's current value manually
 */
export async function updateGoalValue(goalId, newValue, userId) {
  const goal = await Goal.findById(goalId);
  
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  await goal.updateValue(newValue, 'manual');
  return goal;
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId) {
  const result = await Goal.findByIdAndDelete(goalId);
  return result !== null;
}

/**
 * Get goals for an organization with filters
 */
export async function getGoals(orgId, filters = {}) {
  const query = { orgId };
  
  if (filters.status) {
    if (Array.isArray(filters.status)) {
      query.status = { $in: filters.status };
    } else {
      query.status = filters.status;
    }
  }
  
  if (filters.teamId) {
    query.teamId = filters.teamId;
  }
  
  if (filters.metricType) {
    query.metricType = filters.metricType;
  }
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  const goals = await Goal.find(query)
    .populate('teamId', 'name')
    .populate('createdBy', 'firstName lastName email')
    .sort({ deadline: 1, priority: -1 })
    .lean();
  
  return goals;
}

/**
 * Get goal summary statistics
 */
export async function getGoalSummary(orgId) {
  return await Goal.getSummary(orgId);
}

/**
 * Get a single goal by ID
 */
export async function getGoalById(goalId) {
  const goal = await Goal.findById(goalId)
    .populate('teamId', 'name')
    .populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .lean();
  
  return goal;
}

/**
 * Auto-update goals based on current metrics
 * Called by scheduled job or manually
 */
export async function autoUpdateGoals(orgId) {
  const activeGoals = await Goal.find({
    orgId,
    status: 'active'
  });
  
  const updates = [];
  
  for (const goal of activeGoals) {
    try {
      const currentValue = await fetchCurrentMetricValue(goal);
      
      if (currentValue !== null && currentValue !== goal.currentValue) {
        await goal.updateValue(currentValue, 'automated');
        updates.push({
          goalId: goal._id,
          title: goal.title,
          previousValue: goal.currentValue,
          newValue: currentValue,
          progress: goal.progress
        });
      }
    } catch (error) {
      console.error(`[Goals] Error updating goal ${goal._id}:`, error);
    }
  }
  
  return updates;
}

/**
 * Fetch current metric value for a goal
 */
async function fetchCurrentMetricValue(goal) {
  const { metricType, orgId, teamId } = goal;
  
  switch (metricType) {
    case 'oar':
      return await fetchOARValue(orgId, teamId);
    case 'oar-execution':
      return await fetchOARPillarValue(orgId, teamId, 'execution');
    case 'oar-innovation':
      return await fetchOARPillarValue(orgId, teamId, 'innovation');
    case 'oar-wellbeing':
      return await fetchOARPillarValue(orgId, teamId, 'wellbeing');
    case 'oar-culture':
      return await fetchOARPillarValue(orgId, teamId, 'culture');
    case 'energy-index':
      return await fetchEnergyIndex(teamId || orgId);
    case 'meeting-load':
      return await fetchMetricAverage(orgId, teamId, 'meetingLoadIndex');
    case 'focus-time':
      return await fetchMetricAverage(orgId, teamId, 'focusTimeRatio');
    case 'response-latency':
      return await fetchMetricAverage(orgId, teamId, 'responseLatencyTrend');
    case 'sentiment':
      return await fetchMetricAverage(orgId, teamId, 'sentimentToneShift');
    case 'after-hours':
      return await fetchMetricAverage(orgId, teamId, 'afterHoursActivityRate');
    case 'network-breadth':
      return await fetchMetricAverage(orgId, teamId, 'collaborationNetworkBreadth');
    default:
      return null;
  }
}

/**
 * Fetch latest OAR score
 */
async function fetchOARValue(orgId, teamId = null) {
  const query = { orgId };
  if (teamId) {
    query.teamId = teamId;
  } else {
    query.teamId = null;
  }
  
  const oar = await OARScore.findOne(query).sort({ periodEnd: -1 }).lean();
  return oar?.score || null;
}

/**
 * Fetch OAR pillar score
 */
async function fetchOARPillarValue(orgId, teamId, pillar) {
  const query = { orgId };
  if (teamId) {
    query.teamId = teamId;
  } else {
    query.teamId = null;
  }
  
  const oar = await OARScore.findOne(query).sort({ periodEnd: -1 }).lean();
  return oar?.pillars?.[pillar]?.score || null;
}

/**
 * Fetch latest energy index
 */
async function fetchEnergyIndex(teamOrOrgId) {
  // Try as team first
  const energyData = await TeamEnergyIndex.findOne({ teamId: teamOrOrgId })
    .sort({ week: -1 })
    .lean();
  
  if (energyData) {
    return energyData.energyIndex;
  }
  
  // If not found, might be org-level - get average of all teams
  const teams = await Team.find({ orgId: teamOrOrgId }).select('_id').lean();
  if (teams.length === 0) return null;
  
  const latestEnergy = await TeamEnergyIndex.aggregate([
    { $match: { teamId: { $in: teams.map(t => t._id) } } },
    { $sort: { week: -1 } },
    { $group: { _id: '$teamId', latest: { $first: '$$ROOT' } } },
    { $group: { _id: null, avgEnergy: { $avg: '$latest.energyIndex' } } }
  ]);
  
  return latestEnergy[0]?.avgEnergy || null;
}

/**
 * Fetch average metric value from MetricsDaily
 */
async function fetchMetricAverage(orgId, teamId, metricField) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  
  let teamIds;
  if (teamId) {
    teamIds = [teamId];
  } else {
    const teams = await Team.find({ orgId }).select('_id').lean();
    teamIds = teams.map(t => t._id);
  }
  
  const metrics = await MetricsDaily.find({
    teamId: { $in: teamIds },
    date: { $gte: startDate, $lte: endDate }
  }).lean();
  
  if (metrics.length === 0) return null;
  
  const values = metrics
    .map(m => m[metricField])
    .filter(v => v !== null && v !== undefined);
  
  if (values.length === 0) return null;
  
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  // Round appropriately based on metric type
  if (metricField === 'focusTimeRatio' || metricField === 'sentimentToneShift') {
    return Math.round(avg * 100) / 100; // 2 decimal places
  }
  return Math.round(avg * 10) / 10; // 1 decimal place
}

/**
 * Add a milestone to a goal
 */
export async function addMilestone(goalId, milestone) {
  const goal = await Goal.findById(goalId);
  
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  goal.milestones.push(milestone);
  await goal.save();
  
  return goal;
}

/**
 * Complete a milestone
 */
export async function completeMilestone(goalId, milestoneIndex) {
  const goal = await Goal.findById(goalId);
  
  if (!goal) {
    throw new Error('Goal not found');
  }
  
  if (!goal.milestones[milestoneIndex]) {
    throw new Error('Milestone not found');
  }
  
  goal.milestones[milestoneIndex].completed = true;
  goal.milestones[milestoneIndex].completedAt = new Date();
  
  await goal.save();
  return goal;
}

/**
 * Get goal suggestions based on current metrics
 */
export async function getGoalSuggestions(orgId) {
  const suggestions = [];
  
  // Check OAR score
  const oar = await OARScore.findOne({ orgId, teamId: null }).sort({ periodEnd: -1 }).lean();
  
  if (oar) {
    // Suggest improving weak pillars
    const pillars = oar.pillars;
    
    if (pillars.execution.score < 50) {
      suggestions.push({
        metricType: 'oar-execution',
        title: 'Improve Execution Score',
        description: 'Your execution score is below 50. Set a goal to improve focus time and reduce meeting load.',
        suggestedTarget: 60,
        currentValue: pillars.execution.score,
        priority: 'high'
      });
    }
    
    if (pillars.wellbeing.score < 50) {
      suggestions.push({
        metricType: 'oar-wellbeing',
        title: 'Improve Wellbeing Score',
        description: 'Team wellbeing is at risk. Focus on reducing after-hours work and improving energy levels.',
        suggestedTarget: 60,
        currentValue: pillars.wellbeing.score,
        priority: 'high'
      });
    }
    
    if (oar.score < 60) {
      suggestions.push({
        metricType: 'oar',
        title: 'Raise Overall OAR Score',
        description: 'Your overall organizational agility rating needs improvement.',
        suggestedTarget: 70,
        currentValue: oar.score,
        priority: 'medium'
      });
    }
  }
  
  return suggestions;
}

export default {
  createGoal,
  updateGoal,
  updateGoalValue,
  deleteGoal,
  getGoals,
  getGoalSummary,
  getGoalById,
  autoUpdateGoals,
  addMilestone,
  completeMilestone,
  getGoalSuggestions
};
