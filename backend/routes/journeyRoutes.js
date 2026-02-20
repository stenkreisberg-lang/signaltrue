/**
 * Recovery Journey Timeline Routes
 * API endpoints for journey event management and timeline visualization
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  createJourneyEvent,
  getJourneyTimeline,
  getJourneySummary,
  getOARTrendData,
  deleteJourneyEvent,
  updateJourneyEvent,
  getNarrativeSummary
} from '../services/journeyService.js';

const router = express.Router();

/**
 * GET /api/journey/timeline
 * Get journey timeline events
 */
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { teamId, limit = 50, offset = 0, types, startDate, endDate } = req.query;
    
    const result = await getJourneyTimeline(orgId, {
      teamId: teamId || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
      types: types ? types.split(',') : null,
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('[Journey API] Error getting timeline:', error);
    res.status(500).json({ message: 'Failed to get journey timeline', error: error.message });
  }
});

/**
 * GET /api/journey/summary
 * Get journey summary with key statistics
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { teamId } = req.query;
    const summary = await getJourneySummary(orgId, teamId || null);
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('[Journey API] Error getting summary:', error);
    res.status(500).json({ message: 'Failed to get journey summary', error: error.message });
  }
});

/**
 * GET /api/journey/oar-trend
 * Get OAR trend data for visualization
 */
router.get('/oar-trend', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { teamId, limit = 20 } = req.query;
    const trend = await getOARTrendData(orgId, {
      teamId: teamId || null,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      dataPoints: trend
    });
  } catch (error) {
    console.error('[Journey API] Error getting OAR trend:', error);
    res.status(500).json({ message: 'Failed to get OAR trend', error: error.message });
  }
});

/**
 * GET /api/journey/narrative
 * Get board-ready narrative summary
 */
router.get('/narrative', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const narrative = await getNarrativeSummary(orgId);
    
    res.json({
      success: true,
      ...narrative
    });
  } catch (error) {
    console.error('[Journey API] Error getting narrative:', error);
    res.status(500).json({ message: 'Failed to get narrative', error: error.message });
  }
});

/**
 * POST /api/journey/events
 * Create a new journey event
 */
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { type, title, description, teamId, oarScore, impact, isHighlight } = req.body;
    
    if (!type || !title) {
      return res.status(400).json({ message: 'Type and title are required' });
    }
    
    const event = await createJourneyEvent({
      orgId,
      teamId: teamId || null,
      type,
      title,
      description,
      oarScore,
      impact,
      isHighlight: isHighlight || false,
      createdBy: req.user.userId
    });
    
    res.status(201).json({
      success: true,
      message: 'Journey event created',
      event
    });
  } catch (error) {
    console.error('[Journey API] Error creating event:', error);
    res.status(500).json({ message: 'Failed to create journey event', error: error.message });
  }
});

/**
 * PUT /api/journey/events/:id
 * Update a journey event
 */
router.put('/events/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const event = await updateJourneyEvent(req.params.id, req.body, orgId);
    
    res.json({
      success: true,
      message: 'Journey event updated',
      event
    });
  } catch (error) {
    console.error('[Journey API] Error updating event:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.status(500).json({ message: 'Failed to update journey event', error: error.message });
  }
});

/**
 * DELETE /api/journey/events/:id
 * Delete a journey event
 */
router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const deleted = await deleteJourneyEvent(req.params.id, orgId);
    
    if (!deleted) {
      return res.status(404).json({ message: 'Event not found' });
    }
    
    res.json({
      success: true,
      message: 'Journey event deleted'
    });
  } catch (error) {
    console.error('[Journey API] Error deleting event:', error);
    res.status(500).json({ message: 'Failed to delete journey event', error: error.message });
  }
});

/**
 * GET /api/journey/team/:teamId
 * Get journey for a specific team
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { teamId } = req.params;
    const { limit = 30 } = req.query;
    
    const [timeline, summary] = await Promise.all([
      getJourneyTimeline(orgId, { teamId, limit: parseInt(limit) }),
      getJourneySummary(orgId, teamId)
    ]);
    
    res.json({
      success: true,
      teamId,
      timeline: timeline.events,
      summary
    });
  } catch (error) {
    console.error('[Journey API] Error getting team journey:', error);
    res.status(500).json({ message: 'Failed to get team journey', error: error.message });
  }
});

/**
 * GET /api/journey/highlights
 * Get highlighted journey events
 */
router.get('/highlights', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { limit = 10 } = req.query;
    
    const JourneyEvent = (await import('../models/journeyEvent.js')).default;
    const highlights = await JourneyEvent.find({
      orgId,
      isHighlight: true
    })
      .populate('teamId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      success: true,
      highlights
    });
  } catch (error) {
    console.error('[Journey API] Error getting highlights:', error);
    res.status(500).json({ message: 'Failed to get highlights', error: error.message });
  }
});

export default router;
