/**
 * Insights API Routes
 * Provides diagnosis, risk, and action data for teams
 */

import express from 'express';
import TeamState from '../models/teamState.js';
import RiskWeekly from '../models/riskWeekly.js';
import RiskDriver from '../models/riskDriver.js';
import TeamAction from '../models/teamAction.js';
import Experiment from '../models/experiment.js';
import Impact from '../models/impact.js';
import { authenticateToken } from '../middleware/auth.js';
import { diagnoseSingleTeam } from '../services/weeklySchedulerService.js';

const router = express.Router();

/**
 * GET /api/insights/team/:teamId
 * Get complete insights for a team (current week)
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Get most recent week's data
    const latestState = await TeamState.findOne({ teamId })
      .sort({ weekStart: -1 })
      .lean();
    
    if (!latestState) {
      return res.json({
        teamState: null,
        risks: [],
        action: null,
        experiment: null
      });
    }
    
    const { weekStart } = latestState;
    
    // Get risks for this week
    const risks = await RiskWeekly.find({ teamId, weekStart })
      .lean();
    
    // Get risk drivers
    const riskDriversData = await Promise.all(
      risks.map(async (risk) => {
        const drivers = await RiskDriver.find({
          teamId,
          weekStart,
          riskType: risk.riskType
        }).lean();
        
        return {
          ...risk,
          drivers
        };
      })
    );
    
    // Get current action (suggested or active)
    const action = await TeamAction.findOne({
      teamId,
      status: { $in: ['suggested', 'active'] }
    }).sort({ createdAt: -1 }).lean();
    
    // Get active experiment if any
    const experiment = await Experiment.findOne({
      teamId,
      status: 'running'
    }).populate('actionId').lean();
    
    res.json({
      teamState: latestState,
      risks: riskDriversData,
      action,
      experiment
    });
  } catch (error) {
    console.error('Error fetching team insights:', error);
    res.status(500).json({ message: 'Error fetching insights' });
  }
});

/**
 * GET /api/insights/team/:teamId/history
 * Get historical state and risk data
 */
router.get('/team/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { weeks = 12 } = req.query;
    
    const states = await TeamState.find({ teamId })
      .sort({ weekStart: -1 })
      .limit(parseInt(weeks))
      .lean();
    
    const risks = await RiskWeekly.find({ teamId })
      .sort({ weekStart: -1 })
      .limit(parseInt(weeks) * 3) // 3 risk types per week
      .lean();
    
    res.json({
      states,
      risks
    });
  } catch (error) {
    console.error('Error fetching team history:', error);
    res.status(500).json({ message: 'Error fetching history' });
  }
});

/**
 * POST /api/insights/action/:actionId/activate
 * Activate a suggested action
 */
router.post('/action/:actionId/activate', authenticateToken, async (req, res) => {
  try {
    const { actionId } = req.params;
    const userId = req.user._id;
    
    const action = await TeamAction.findById(actionId);
    
    if (!action || action.status !== 'suggested') {
      return res.status(400).json({ message: 'Action not found or not in suggested state' });
    }
    
    // Check if team already has active action
    const hasActive = await TeamAction.hasActiveAction(action.teamId);
    if (hasActive) {
      return res.status(400).json({ message: 'Team already has an active action' });
    }
    
    action.status = 'active';
    action.createdBy = userId;
    await action.save();
    
    // Create experiment
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (action.duration * 7));
    
    const experiment = await Experiment.create({
      teamId: action.teamId,
      actionId: action._id,
      startDate,
      endDate,
      hypothesis: generateHypothesis(action),
      successMetrics: getSuccessMetrics(action.linkedRisk),
      status: 'running'
    });
    
    res.json({ action, experiment });
  } catch (error) {
    console.error('Error activating action:', error);
    res.status(500).json({ message: 'Error activating action' });
  }
});

/**
 * POST /api/insights/action/:actionId/dismiss
 * Dismiss a suggested action
 */
router.post('/action/:actionId/dismiss', authenticateToken, async (req, res) => {
  try {
    const { actionId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;
    
    const action = await TeamAction.findById(actionId);
    
    if (!action) {
      return res.status(404).json({ message: 'Action not found' });
    }
    
    action.status = 'dismissed';
    action.dismissedBy = userId;
    action.dismissedAt = new Date();
    action.dismissalReason = reason;
    await action.save();
    
    res.json({ action });
  } catch (error) {
    console.error('Error dismissing action:', error);
    res.status(500).json({ message: 'Error dismissing action' });
  }
});

/**
 * GET /api/insights/experiments/:teamId
 * Get experiment history for a team
 */
router.get('/experiments/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const experiments = await Experiment.find({ teamId })
      .populate('actionId')
      .sort({ startDate: -1 })
      .lean();
    
    // Get impacts for completed experiments
    const experimentsWithImpact = await Promise.all(
      experiments.map(async (exp) => {
        if (exp.status === 'completed') {
          const impact = await Impact.findOne({ experimentId: exp._id }).lean();
          return { ...exp, impact };
        }
        return exp;
      })
    );
    
    res.json({ experiments: experimentsWithImpact });
  } catch (error) {
    console.error('Error fetching experiments:', error);
    res.status(500).json({ message: 'Error fetching experiments' });
  }
});

/**
 * Helper functions
 */
function generateHypothesis(action) {
  const riskNames = {
    overload: 'overload risk',
    execution: 'execution risk',
    retention_strain: 'retention strain'
  };
  
  return `If we apply "${action.title}" for ${action.duration} weeks, then ${riskNames[action.linkedRisk]} will decrease without harming team coordination.`;
}

function getSuccessMetrics(riskType) {
  if (riskType === 'overload') {
    return [
      { metricKey: 'after_hours_activity', expectedDirection: 'decrease' },
      { metricKey: 'meeting_load', expectedDirection: 'decrease' },
      { metricKey: 'focus_time', expectedDirection: 'increase' }
    ];
  } else if (riskType === 'execution') {
    return [
      { metricKey: 'response_time', expectedDirection: 'decrease' },
      { metricKey: 'participation_drift', expectedDirection: 'decrease' },
      { metricKey: 'focus_time', expectedDirection: 'increase' }
    ];
  } else {
    return [
      { metricKey: 'after_hours_activity', expectedDirection: 'decrease' },
      { metricKey: 'meeting_load', expectedDirection: 'decrease' },
      { metricKey: 'response_time', expectedDirection: 'decrease' }
    ];
  }
}

/**
 * POST /api/insights/team/:teamId/diagnose
 * Manually trigger diagnosis for a team (for testing)
 */
router.post('/team/:teamId/diagnose', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const results = await diagnoseSingleTeam(teamId);
    
    res.json({
      message: 'Diagnosis completed',
      results
    });
  } catch (error) {
    console.error('Error running manual diagnosis:', error);
    res.status(500).json({ message: 'Error running diagnosis' });
  }
});

export default router;
