/**
 * OAR (Organizational Agility Rating) Routes
 * API endpoints for composite health scoring
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import OARScore from '../models/oarScore.js';
import { calculateOrgOAR, calculateTeamOAR, getOARHistory } from '../services/oarService.js';

const router = express.Router();

/**
 * GET /api/oar/org
 * Get current OAR score for user's organization
 */
router.get('/org', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    // Get or calculate current OAR
    const oar = await calculateOrgOAR(orgId);
    
    res.json({
      success: true,
      oar: {
        score: oar.score,
        zone: oar.zone,
        trend: oar.trend,
        trendPct: oar.trendPct,
        pillars: oar.pillars,
        weights: oar.weights,
        periodLabel: oar.periodLabel,
        periodStart: oar.periodStart,
        periodEnd: oar.periodEnd,
        previousScore: oar.previousScore,
        dataQuality: oar.dataQuality,
        calculatedAt: oar.calculatedAt
      }
    });
  } catch (error) {
    console.error('[OAR API] Error getting org OAR:', error);
    res.status(500).json({ message: 'Failed to get OAR score', error: error.message });
  }
});

/**
 * GET /api/oar/org/history
 * Get OAR history for trend visualization
 */
router.get('/org/history', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { limit = 12 } = req.query;
    
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const history = await getOARHistory(orgId, { limit: parseInt(limit) });
    
    res.json({
      success: true,
      history: history.map(h => ({
        score: h.score,
        zone: h.zone,
        periodLabel: h.periodLabel,
        periodEnd: h.periodEnd,
        pillars: {
          execution: h.pillars.execution.score,
          innovation: h.pillars.innovation.score,
          wellbeing: h.pillars.wellbeing.score,
          culture: h.pillars.culture.score
        }
      }))
    });
  } catch (error) {
    console.error('[OAR API] Error getting OAR history:', error);
    res.status(500).json({ message: 'Failed to get OAR history', error: error.message });
  }
});

/**
 * GET /api/oar/team/:teamId
 * Get OAR score for a specific team
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const oar = await calculateTeamOAR(teamId);
    
    res.json({
      success: true,
      oar: {
        teamId,
        score: oar.score,
        zone: oar.zone,
        trend: oar.trend,
        trendPct: oar.trendPct,
        pillars: oar.pillars,
        periodLabel: oar.periodLabel,
        periodStart: oar.periodStart,
        periodEnd: oar.periodEnd,
        previousScore: oar.previousScore,
        dataQuality: oar.dataQuality,
        calculatedAt: oar.calculatedAt
      }
    });
  } catch (error) {
    console.error('[OAR API] Error getting team OAR:', error);
    res.status(500).json({ message: 'Failed to get team OAR score', error: error.message });
  }
});

/**
 * GET /api/oar/team/:teamId/history
 * Get OAR history for a specific team
 */
router.get('/team/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limit = 12 } = req.query;
    
    const history = await getOARHistory(req.user.orgId, { teamId, limit: parseInt(limit) });
    
    res.json({
      success: true,
      history: history.map(h => ({
        score: h.score,
        zone: h.zone,
        periodLabel: h.periodLabel,
        periodEnd: h.periodEnd,
        pillars: {
          execution: h.pillars.execution.score,
          innovation: h.pillars.innovation.score,
          wellbeing: h.pillars.wellbeing.score,
          culture: h.pillars.culture.score
        }
      }))
    });
  } catch (error) {
    console.error('[OAR API] Error getting team OAR history:', error);
    res.status(500).json({ message: 'Failed to get team OAR history', error: error.message });
  }
});

/**
 * GET /api/oar/all-teams
 * Get OAR scores for all teams in the organization
 */
router.get('/all-teams', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    // Get latest OAR for all teams
    const teamOARs = await OARScore.aggregate([
      { $match: { orgId: orgId, teamId: { $ne: null } } },
      { $sort: { periodEnd: -1 } },
      {
        $group: {
          _id: '$teamId',
          latestOAR: { $first: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: '_id',
          foreignField: '_id',
          as: 'team'
        }
      },
      { $unwind: { path: '$team', preserveNullAndEmptyArrays: true } }
    ]);
    
    res.json({
      success: true,
      teams: teamOARs.map(t => ({
        teamId: t._id,
        teamName: t.team?.name || 'Unknown Team',
        score: t.latestOAR.score,
        zone: t.latestOAR.zone,
        trend: t.latestOAR.trend,
        trendPct: t.latestOAR.trendPct,
        pillars: {
          execution: t.latestOAR.pillars.execution.score,
          innovation: t.latestOAR.pillars.innovation.score,
          wellbeing: t.latestOAR.pillars.wellbeing.score,
          culture: t.latestOAR.pillars.culture.score
        },
        periodLabel: t.latestOAR.periodLabel
      }))
    });
  } catch (error) {
    console.error('[OAR API] Error getting all teams OAR:', error);
    res.status(500).json({ message: 'Failed to get teams OAR scores', error: error.message });
  }
});

/**
 * POST /api/oar/recalculate
 * Force recalculation of OAR scores
 */
router.post('/recalculate', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const { teamId } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    let oar;
    if (teamId) {
      oar = await calculateTeamOAR(teamId, { forceRecalculate: true });
    } else {
      oar = await calculateOrgOAR(orgId, { forceRecalculate: true });
    }
    
    res.json({
      success: true,
      message: 'OAR recalculated successfully',
      oar: {
        score: oar.score,
        zone: oar.zone,
        calculatedAt: oar.calculatedAt
      }
    });
  } catch (error) {
    console.error('[OAR API] Error recalculating OAR:', error);
    res.status(500).json({ message: 'Failed to recalculate OAR', error: error.message });
  }
});

/**
 * GET /api/oar/widget
 * Get OAR widget data for dashboard display
 */
router.get('/widget', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    // Get current OAR
    const oar = await calculateOrgOAR(orgId);
    
    // Get history for sparkline
    const history = await getOARHistory(orgId, { limit: 8 });
    
    res.json({
      success: true,
      widget: {
        score: oar.score,
        maxScore: 100,
        zone: oar.zone,
        trend: oar.trend,
        trendPct: oar.trendPct,
        pillars: [
          { name: 'Execution', score: oar.pillars.execution.score, color: '#3B82F6' },
          { name: 'Innovation', score: oar.pillars.innovation.score, color: '#8B5CF6' },
          { name: 'Wellbeing', score: oar.pillars.wellbeing.score, color: '#10B981' },
          { name: 'Culture', score: oar.pillars.culture.score, color: '#F59E0B' }
        ],
        sparkline: history.map(h => h.score),
        dataQuality: oar.dataQuality,
        lastUpdated: oar.calculatedAt
      }
    });
  } catch (error) {
    console.error('[OAR API] Error getting OAR widget:', error);
    res.status(500).json({ message: 'Failed to get OAR widget', error: error.message });
  }
});

export default router;
