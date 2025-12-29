/**
 * Comparison Routes
 * Internal benchmarks API - REQUIRES Impact Proof tier
 * All comparisons labeled: "Internal comparison. Not industry benchmark."
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTier } from '../middleware/checkTier.js';
import { 
  compareTeamToOrgAverage, 
  compareThisMonthVsLast, 
  compareBeforeAfterIntervention 
} from '../services/comparisonService.js';

const router = express.Router();

/**
 * GET /api/comparisons/team-vs-org/:teamId?days=30
 * Compare team to organization average
 * REQUIRES: Impact Proof tier
 */
router.get('/team-vs-org/:teamId', authenticateToken, requireTier('impact_proof'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { days } = req.query;
    const { orgId } = req.user;
    
    const comparison = await compareTeamToOrgAverage(teamId, orgId, parseInt(days) || 30);
    
    res.json(comparison);
  } catch (error) {
    console.error('[Comparisons] Error in team-vs-org:', error);
    res.status(500).json({ message: 'Failed to compute comparison', error: error.message });
  }
});

/**
 * GET /api/comparisons/month-over-month/:teamId
 * Compare this month vs last month
 * REQUIRES: Impact Proof tier
 */
router.get('/month-over-month/:teamId', authenticateToken, requireTier('impact_proof'), async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const comparison = await compareThisMonthVsLast(teamId);
    
    res.json(comparison);
  } catch (error) {
    console.error('[Comparisons] Error in month-over-month:', error);
    res.status(500).json({ message: 'Failed to compute comparison', error: error.message });
  }
});

/**
 * GET /api/comparisons/intervention/:interventionId
 * Compare before vs after intervention
 * REQUIRES: Impact Proof tier
 */
router.get('/intervention/:interventionId', authenticateToken, requireTier('impact_proof'), async (req, res) => {
  try {
    const { interventionId } = req.params;
    
    const comparison = await compareBeforeAfterIntervention(interventionId);
    
    res.json(comparison);
  } catch (error) {
    console.error('[Comparisons] Error in intervention comparison:', error);
    res.status(500).json({ message: 'Failed to compute comparison', error: error.message });
  }
});

export default router;
