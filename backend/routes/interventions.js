/**
 * Intervention Routes
 * API endpoints for tracking signal-driven actions and 14-day follow-ups
 */

import express from 'express';
import Intervention from '../models/intervention.js';
import SignalV2 from '../models/signalV2.js';
import MetricsDaily from '../models/metricsDaily.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/interventions
 * Log a new intervention (user takes action on a signal)
 * Body: { signalId, actionTaken, actionType, expectedEffect, effort, timeframe, metricBefore }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { signalId, actionTaken, actionType, expectedEffect, effort, timeframe, metricBefore } = req.body;
    
    // Fetch signal to get context
    const signal = await SignalV2.findById(signalId);
    if (!signal) {
      return res.status(404).json({ message: 'Signal not found' });
    }
    
    // Create intervention
    const intervention = new Intervention({
      signalId,
      signalType: signal.signalType,
      teamId: signal.teamId,
      orgId: signal.orgId,
      actionTaken,
      actionType,
      expectedEffect,
      effort,
      timeframe,
      startDate: new Date(),
      outcomeDelta: {
        metricBefore: metricBefore || signal.currentValue
      },
      createdBy: req.user.userId
    });
    
    await intervention.save();
    
    res.status(201).json({
      message: 'Intervention logged successfully',
      intervention,
      recheckDate: intervention.recheckDate
    });
  } catch (error) {
    console.error('[Interventions] Error creating intervention:', error);
    res.status(500).json({ message: 'Failed to log intervention', error: error.message });
  }
});

/**
 * GET /api/interventions/pending
 * Get interventions needing recheck (recheckDate passed, status=active or pending-recheck)
 */
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    const now = new Date();
    
    const pendingInterventions = await Intervention.find({
      orgId: req.user.orgId,
      status: { $in: ['active', 'pending-recheck'] },
      recheckDate: { $lte: now }
    })
      .populate('signalId', 'signalType currentValue severity')
      .populate('teamId', 'name')
      .sort({ recheckDate: 1 })
      .limit(20);
    
    res.json({
      count: pendingInterventions.length,
      interventions: pendingInterventions
    });
  } catch (error) {
    console.error('[Interventions] Error fetching pending:', error);
    res.status(500).json({ message: 'Failed to fetch pending interventions', error: error.message });
  }
});

/**
 * GET /api/interventions/team/:teamId
 * Get all interventions for a team
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;
    
    const filter = { teamId };
    if (status) {
      filter.status = status;
    }
    
    const interventions = await Intervention.find(filter)
      .populate('signalId', 'signalType currentValue severity detectedAt')
      .populate('createdBy', 'name email')
      .populate('acknowledgedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ interventions });
  } catch (error) {
    console.error('[Interventions] Error fetching team interventions:', error);
    res.status(500).json({ message: 'Failed to fetch interventions', error: error.message });
  }
});

/**
 * PUT /api/interventions/:id/outcome
 * Update intervention outcome (after auto-compute or manual entry)
 * Body: { metricAfter?, acknowledgedBy, userNotes? }
 */
router.put('/:id/outcome', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { metricAfter, userNotes } = req.body;
    
    const intervention = await Intervention.findById(id);
    if (!intervention) {
      return res.status(404).json({ message: 'Intervention not found' });
    }
    
    // If metricAfter provided, compute outcome
    if (metricAfter !== undefined) {
      await intervention.computeOutcome(metricAfter);
    }
    
    // Mark as acknowledged
    intervention.acknowledgedBy = req.user.userId;
    intervention.acknowledgedAt = new Date();
    intervention.status = 'completed';
    
    if (userNotes) {
      intervention.userNotes = userNotes;
    }
    
    await intervention.save();
    
    res.json({
      message: 'Intervention outcome updated',
      intervention
    });
  } catch (error) {
    console.error('[Interventions] Error updating outcome:', error);
    res.status(500).json({ message: 'Failed to update outcome', error: error.message });
  }
});

/**
 * POST /api/interventions/:id/auto-compute
 * Automatically compute outcome by fetching current metric value
 */
router.post('/:id/auto-compute', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const intervention = await Intervention.findById(id).populate('signalId');
    if (!intervention) {
      return res.status(404).json({ message: 'Intervention not found' });
    }
    
    // Fetch current metric value from recent metrics
    const recentMetric = await MetricsDaily.findOne({
      teamId: intervention.teamId,
      date: { $gte: intervention.recheckDate }
    })
      .sort({ date: -1 })
      .select(getMetricField(intervention.signalType));
    
    if (!recentMetric) {
      return res.status(404).json({ message: 'No recent metric data available for auto-compute' });
    }
    
    const metricField = getMetricField(intervention.signalType);
    const currentValue = recentMetric[metricField];
    
    if (currentValue === undefined) {
      return res.status(404).json({ message: 'Metric value not found in recent data' });
    }
    
    // Compute outcome
    const outcome = await intervention.computeOutcome(currentValue);
    intervention.status = 'pending-recheck'; // Waiting for user acknowledgment
    await intervention.save();
    
    res.json({
      message: 'Outcome computed automatically',
      intervention,
      outcome
    });
  } catch (error) {
    console.error('[Interventions] Error auto-computing outcome:', error);
    res.status(500).json({ message: 'Failed to auto-compute outcome', error: error.message });
  }
});

/**
 * DELETE /api/interventions/:id
 * Mark intervention as abandoned (user decides not to continue)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const intervention = await Intervention.findById(id);
    if (!intervention) {
      return res.status(404).json({ message: 'Intervention not found' });
    }
    
    intervention.status = 'abandoned';
    intervention.acknowledgedBy = req.user.userId;
    intervention.acknowledgedAt = new Date();
    await intervention.save();
    
    res.json({ message: 'Intervention marked as abandoned' });
  } catch (error) {
    console.error('[Interventions] Error abandoning intervention:', error);
    res.status(500).json({ message: 'Failed to abandon intervention', error: error.message });
  }
});

/**
 * Helper: Map signal type to metric field name
 */
function getMetricField(signalType) {
  const mapping = {
    'coordination-risk': 'meetingLoadIndex',
    'boundary-erosion': 'afterHoursActivity',
    'execution-drag': 'responseLatency',
    'focus-erosion': 'focusTime',
    'morale-volatility': 'sentimentScore',
    'dependency-spread': 'collaborationBreadth',
    'recovery-deficit': 'recoveryScore',
    'handoff-bottleneck': 'handoffDelay'
  };
  return mapping[signalType] || 'value';
}

export default router;
