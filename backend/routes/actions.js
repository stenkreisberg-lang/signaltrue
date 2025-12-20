import express from 'express';
import Action from '../models/action.js';
import Signal from '../models/signal.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/actions/org/:orgId
 * Get all actions for an organization
 */
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { status, owner } = req.query;
    
    const filter = { orgId };
    if (status) filter.status = status;
    if (owner) filter.owner = owner;
    
    const actions = await Action.find(filter)
      .populate('teamId', 'name')
      .populate('signalId', 'title severity')
      .populate('owner', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ dueDate: 1, createdDate: -1 });
    
    res.json({ actions });
  } catch (err) {
    console.error('Error fetching actions:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/actions/user/:userId
 * Get all actions assigned to a specific user
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    const filter = { owner: userId };
    if (status) filter.status = status;
    
    const actions = await Action.find(filter)
      .populate('teamId', 'name')
      .populate('signalId', 'title severity')
      .sort({ dueDate: 1, createdDate: -1 });
    
    res.json({ actions });
  } catch (err) {
    console.error('Error fetching user actions:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/actions/signal/:signalId
 * Get all actions for a specific signal
 */
router.get('/signal/:signalId', authenticateToken, async (req, res) => {
  try {
    const { signalId } = req.params;
    
    const actions = await Action.find({ signalId })
      .populate('owner', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdDate: -1 });
    
    res.json({ actions });
  } catch (err) {
    console.error('Error fetching signal actions:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/actions
 * Create a new action
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const actionData = req.body;
    
    // Verify signal exists
    const signal = await Signal.findById(actionData.signalId);
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    // Set action metadata from signal
    actionData.orgId = signal.orgId;
    actionData.teamId = signal.teamId;
    
    // Capture pre-action baseline if not provided
    if (!actionData.preActionBaseline && signal.deviation) {
      actionData.preActionBaseline = {
        metricName: signal.signalType,
        value: signal.deviation.currentValue,
        timestamp: new Date()
      };
    }
    
    const action = await Action.create(actionData);
    
    // Update signal with action reference
    signal.selectedAction = action.action;
    signal.actionStartDate = new Date();
    if (signal.status === 'Open') {
      signal.status = 'Acknowledged';
    }
    await signal.save();
    
    const populatedAction = await Action.findById(action._id)
      .populate('owner', 'name email')
      .populate('assignedBy', 'name email');
    
    res.status(201).json({ action: populatedAction });
  } catch (err) {
    console.error('Error creating action:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/actions/:id
 * Update an action
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, dueDate, blockedReason, notes } = req.body;
    
    const action = await Action.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ message: 'Action not found' });
    }
    
    if (status) {
      action.status = status;
      
      if (status === 'In Progress' && !action.startDate) {
        action.startDate = new Date();
      } else if (status === 'Completed' && !action.completionDate) {
        action.completionDate = new Date();
      } else if (status === 'Blocked') {
        action.blockedDate = new Date();
        if (blockedReason) action.blockedReason = blockedReason;
      }
    }
    
    if (dueDate !== undefined) action.dueDate = dueDate;
    
    // Add update note if provided
    if (notes) {
      action.updates.push({
        note: notes,
        author: req.userId, // from auth middleware
        timestamp: new Date()
      });
    }
    
    await action.save();
    
    const populatedAction = await Action.findById(action._id)
      .populate('owner', 'name email')
      .populate('assignedBy', 'name email');
    
    res.json({ action: populatedAction });
  } catch (err) {
    console.error('Error updating action:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/actions/:id/outcome
 * Record outcome for a completed action
 */
router.post('/:id/outcome', authenticateToken, async (req, res) => {
  try {
    const { 
      rating, 
      timeToNormalization, 
      metricsImproved, 
      metricsUnaffected,
      unexpectedEffects,
      notes 
    } = req.body;
    
    const action = await Action.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ message: 'Action not found' });
    }
    
    action.outcome = {
      rating,
      timeToNormalization,
      metricsImproved: metricsImproved || [],
      metricsUnaffected: metricsUnaffected || [],
      unexpectedEffects,
      notes,
      recordedAt: new Date(),
      recordedBy: req.userId
    };
    
    // Calculate effectiveness score for telemetry
    let effectivenessScore = 5; // default
    if (rating === 'Worked') effectivenessScore = 9;
    else if (rating === 'Partially Worked') effectivenessScore = 6;
    else if (rating === 'Did Not Work') effectivenessScore = 2;
    
    action.telemetry = {
      ...action.telemetry,
      effectivenessScore,
      wouldRecommendAgain: rating === 'Worked' || rating === 'Partially Worked'
    };
    
    // Mark action as completed if not already
    if (action.status !== 'Completed') {
      action.status = 'Completed';
      action.completionDate = new Date();
    }
    
    await action.save();
    
    // Also update the signal outcome
    const signal = await Signal.findById(action.signalId);
    if (signal) {
      signal.outcome = {
        rating,
        timeToNormalization,
        notes,
        recordedAt: new Date()
      };
      
      if (rating === 'Worked') {
        signal.status = 'Resolved';
        signal.resolvedAt = new Date();
      }
      
      await signal.save();
    }
    
    res.json({ action });
  } catch (err) {
    console.error('Error recording action outcome:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/actions/:id/metrics
 * Add post-action metric measurement
 */
router.post('/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const { metricName, value } = req.body;
    
    const action = await Action.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ message: 'Action not found' });
    }
    
    const daysAfterCompletion = action.completionDate
      ? Math.floor((Date.now() - action.completionDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    action.postActionMetrics.push({
      metricName,
      value,
      timestamp: new Date(),
      daysAfterCompletion
    });
    
    await action.save();
    
    res.json({ action });
  } catch (err) {
    console.error('Error adding post-action metric:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/actions/:id
 * Delete an action
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const action = await Action.findById(req.params.id);
    if (!action) {
      return res.status(404).json({ message: 'Action not found' });
    }
    
    await Action.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'Action deleted' });
  } catch (err) {
    console.error('Error deleting action:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
