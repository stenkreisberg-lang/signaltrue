/**
 * Goal Tracking Routes
 * API endpoints for goal management
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
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
} from '../services/goalService.js';

const router = express.Router();

/**
 * GET /api/goals
 * Get all goals for user's organization
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { status, teamId, metricType, priority } = req.query;
    
    const filters = {};
    if (status) filters.status = status.split(',');
    if (teamId) filters.teamId = teamId;
    if (metricType) filters.metricType = metricType;
    if (priority) filters.priority = priority;
    
    const goals = await getGoals(orgId, filters);
    
    res.json({
      success: true,
      count: goals.length,
      goals
    });
  } catch (error) {
    console.error('[Goals API] Error getting goals:', error);
    res.status(500).json({ message: 'Failed to get goals', error: error.message });
  }
});

/**
 * GET /api/goals/summary
 * Get goal summary statistics
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const summary = await getGoalSummary(orgId);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('[Goals API] Error getting summary:', error);
    res.status(500).json({ message: 'Failed to get goal summary', error: error.message });
  }
});

/**
 * GET /api/goals/suggestions
 * Get goal suggestions based on current metrics
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const suggestions = await getGoalSuggestions(orgId);
    
    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('[Goals API] Error getting suggestions:', error);
    res.status(500).json({ message: 'Failed to get goal suggestions', error: error.message });
  }
});

/**
 * GET /api/goals/:id
 * Get a single goal by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    // Verify user has access to this goal's org
    if (goal.orgId.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({
      success: true,
      goal
    });
  } catch (error) {
    console.error('[Goals API] Error getting goal:', error);
    res.status(500).json({ message: 'Failed to get goal', error: error.message });
  }
});

/**
 * POST /api/goals
 * Create a new goal
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const goalData = {
      ...req.body,
      orgId
    };
    
    // Validate required fields
    if (!goalData.title || !goalData.metricType || !goalData.targetValue || !goalData.deadline) {
      return res.status(400).json({ 
        message: 'Missing required fields: title, metricType, targetValue, deadline' 
      });
    }
    
    // Set start value if not provided
    if (goalData.startValue === undefined) {
      goalData.startValue = goalData.currentValue || 0;
    }
    
    const goal = await createGoal(goalData, req.user.userId);
    
    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      goal
    });
  } catch (error) {
    console.error('[Goals API] Error creating goal:', error);
    res.status(500).json({ message: 'Failed to create goal', error: error.message });
  }
});

/**
 * PUT /api/goals/:id
 * Update a goal
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    // Verify user has access
    if (goal.orgId.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const updatedGoal = await updateGoal(req.params.id, req.body, req.user.userId);
    
    res.json({
      success: true,
      message: 'Goal updated successfully',
      goal: updatedGoal
    });
  } catch (error) {
    console.error('[Goals API] Error updating goal:', error);
    res.status(500).json({ message: 'Failed to update goal', error: error.message });
  }
});

/**
 * PUT /api/goals/:id/value
 * Update goal's current value
 */
router.put('/:id/value', authenticateToken, async (req, res) => {
  try {
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ message: 'Value is required' });
    }
    
    const goal = await getGoalById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    // Verify user has access
    if (goal.orgId.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const updatedGoal = await updateGoalValue(req.params.id, value, req.user.userId);
    
    res.json({
      success: true,
      message: 'Goal value updated',
      goal: {
        id: updatedGoal._id,
        currentValue: updatedGoal.currentValue,
        progress: updatedGoal.progress,
        progressStatus: updatedGoal.progressStatus,
        status: updatedGoal.status
      }
    });
  } catch (error) {
    console.error('[Goals API] Error updating goal value:', error);
    res.status(500).json({ message: 'Failed to update goal value', error: error.message });
  }
});

/**
 * DELETE /api/goals/:id
 * Delete a goal
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    // Verify user has access
    if (goal.orgId.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await deleteGoal(req.params.id);
    
    res.json({
      success: true,
      message: 'Goal deleted successfully'
    });
  } catch (error) {
    console.error('[Goals API] Error deleting goal:', error);
    res.status(500).json({ message: 'Failed to delete goal', error: error.message });
  }
});

/**
 * POST /api/goals/:id/milestones
 * Add a milestone to a goal
 */
router.post('/:id/milestones', authenticateToken, async (req, res) => {
  try {
    const { title, targetValue, targetDate } = req.body;
    
    if (!title || targetValue === undefined) {
      return res.status(400).json({ message: 'Milestone title and targetValue are required' });
    }
    
    const goal = await getGoalById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    if (goal.orgId.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const updatedGoal = await addMilestone(req.params.id, {
      title,
      targetValue,
      targetDate: targetDate ? new Date(targetDate) : null
    });
    
    res.status(201).json({
      success: true,
      message: 'Milestone added',
      goal: updatedGoal
    });
  } catch (error) {
    console.error('[Goals API] Error adding milestone:', error);
    res.status(500).json({ message: 'Failed to add milestone', error: error.message });
  }
});

/**
 * PUT /api/goals/:id/milestones/:index/complete
 * Mark a milestone as complete
 */
router.put('/:id/milestones/:index/complete', authenticateToken, async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    
    if (!goal) {
      return res.status(404).json({ message: 'Goal not found' });
    }
    
    if (goal.orgId.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const updatedGoal = await completeMilestone(req.params.id, parseInt(req.params.index));
    
    res.json({
      success: true,
      message: 'Milestone completed',
      goal: updatedGoal
    });
  } catch (error) {
    console.error('[Goals API] Error completing milestone:', error);
    res.status(500).json({ message: 'Failed to complete milestone', error: error.message });
  }
});

/**
 * POST /api/goals/auto-update
 * Trigger auto-update of all active goals (admin/system use)
 */
router.post('/auto-update', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const updates = await autoUpdateGoals(orgId);
    
    res.json({
      success: true,
      message: `Updated ${updates.length} goals`,
      updates
    });
  } catch (error) {
    console.error('[Goals API] Error auto-updating goals:', error);
    res.status(500).json({ message: 'Failed to auto-update goals', error: error.message });
  }
});

export default router;
