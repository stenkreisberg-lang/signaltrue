import express from 'express';
import Signal from '../models/signal.js';
import Action from '../models/action.js';
import Organization from '../models/organizationModel.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/signals/org/:orgId
 * Get all signals for an organization with filtering
 */
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { severity, status, teamId } = req.query;
    
    // Check if org is in calibration - if so, don't show signals
    const org = await Organization.findById(orgId);
    if (org?.calibration?.isInCalibration) {
      return res.json({
        message: 'Signals will be available after calibration is complete',
        signals: [],
        inCalibration: true
      });
    }
    
    const filter = { orgId };
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (teamId) filter.teamId = teamId;
    
    const signals = await Signal.find(filter)
      .populate('teamId', 'name')
      .populate('owner', 'name email')
      .sort({ severity: -1, firstDetected: -1 }); // Critical first, then by date
    
    res.json({ signals });
  } catch (err) {
    console.error('Error fetching signals:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/team/:teamId
 * Get all signals for a specific team
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;
    
    const filter = { teamId };
    if (status) filter.status = status;
    
    const signals = await Signal.find(filter)
      .populate('owner', 'name email')
      .sort({ severity: -1, firstDetected: -1 });
    
    res.json({ signals });
  } catch (err) {
    console.error('Error fetching team signals:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/:id
 * Get a specific signal with full details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const signal = await Signal.findById(req.params.id)
      .populate('teamId', 'name')
      .populate('orgId', 'name')
      .populate('owner', 'name email');
    
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    // Get associated actions
    const actions = await Action.find({ signalId: signal._id })
      .populate('owner', 'name email')
      .sort({ createdDate: -1 });
    
    res.json({ signal, actions });
  } catch (err) {
    console.error('Error fetching signal:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/signals
 * Create a new signal (typically called by signal generation service)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const signalData = req.body;
    
    // Check if org is in calibration
    const org = await Organization.findById(signalData.orgId);
    if (org?.calibration?.isInCalibration) {
      return res.status(403).json({ 
        message: 'Signals cannot be created during calibration period' 
      });
    }
    
    const signal = await Signal.create(signalData);
    res.status(201).json({ signal });
  } catch (err) {
    console.error('Error creating signal:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * PUT /api/signals/:id
 * Update a signal (status, owner, etc.)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status, owner, dueDate, selectedAction, actionStartDate } = req.body;
    
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    if (status) signal.status = status;
    if (owner) signal.owner = owner;
    if (dueDate) signal.dueDate = dueDate;
    if (selectedAction) {
      signal.selectedAction = selectedAction;
      signal.actionStartDate = actionStartDate || new Date();
    }
    
    // Track status changes
    if (status === 'Resolved') {
      signal.resolvedAt = new Date();
    } else if (status === 'Ignored') {
      signal.ignoredAt = new Date();
      if (req.body.ignoredReason) {
        signal.ignoredReason = req.body.ignoredReason;
      }
    }
    
    await signal.save();
    
    res.json({ signal });
  } catch (err) {
    console.error('Error updating signal:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/signals/:id/outcome
 * Record outcome for a resolved signal
 */
router.post('/:id/outcome', authenticateToken, async (req, res) => {
  try {
    const { rating, timeToNormalization, notes } = req.body;
    
    const signal = await Signal.findById(req.params.id);
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    signal.outcome = {
      rating,
      timeToNormalization,
      notes,
      recordedAt: new Date()
    };
    
    await signal.save();
    
    res.json({ signal });
  } catch (err) {
    console.error('Error recording outcome:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/org/:orgId/ignored
 * Get all ignored signals for visibility
 */
router.get('/org/:orgId/ignored', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const ignoredSignals = await Signal.find({ 
      orgId, 
      status: 'Ignored' 
    })
      .populate('teamId', 'name')
      .populate('owner', 'name email')
      .sort({ ignoredAt: -1 });
    
    res.json({ ignoredSignals });
  } catch (err) {
    console.error('Error fetching ignored signals:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/signals/org/:orgId/summary
 * Get signal summary for weekly digest
 */
router.get('/org/:orgId/summary', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    // Check if in calibration
    const org = await Organization.findById(orgId);
    if (org?.calibration?.isInCalibration) {
      return res.json({
        message: 'Signal summary will be available after calibration',
        inCalibration: true
      });
    }
    
    // Get critical signals
    const criticalSignals = await Signal.find({ 
      orgId, 
      severity: 'Critical',
      status: { $in: ['Open', 'Acknowledged'] }
    })
      .populate('teamId', 'name')
      .limit(3)
      .sort({ firstDetected: -1 });
    
    // Get ignored signals
    const ignoredCount = await Signal.countDocuments({ 
      orgId, 
      status: 'Ignored' 
    });
    
    // Get new signals this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newSignalsThisWeek = await Signal.countDocuments({
      orgId,
      firstDetected: { $gte: oneWeekAgo }
    });
    
    // Get top recommended actions
    const openSignals = await Signal.find({
      orgId,
      status: { $in: ['Open', 'Acknowledged'] }
    })
      .sort({ severity: -1 })
      .limit(5);
    
    const recommendedActions = openSignals
      .filter(s => s.recommendedActions && s.recommendedActions.length > 0)
      .map(s => ({
        signalId: s._id,
        signalTitle: s.title,
        severity: s.severity,
        action: s.recommendedActions[0] // First recommended action
      }));
    
    res.json({
      criticalSignals,
      ignoredCount,
      newSignalsThisWeek,
      recommendedActions: recommendedActions.slice(0, 3)
    });
  } catch (err) {
    console.error('Error fetching signal summary:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
