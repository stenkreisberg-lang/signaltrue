/**
 * Cost of Drift API Routes
 * Provides executive-level cost estimates for organizational drift
 */

import express from 'express';
import { calculateCostOfDrift, calculateOrgCostOfDrift } from '../services/costOfDriftService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/cost-of-drift/team/:teamId
 * Calculate cost of drift for a specific team
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { periodDays, hourlyCost } = req.query;
    
    const options = {};
    if (periodDays) options.periodDays = parseInt(periodDays);
    if (hourlyCost) options.hourlyCost = parseFloat(hourlyCost);
    
    const result = await calculateCostOfDrift(teamId, options);
    
    res.json(result);
  } catch (error) {
    console.error('[CostOfDrift API] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/cost-of-drift/org/:orgId
 * Calculate cost of drift for entire organization
 */
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { periodDays, hourlyCost } = req.query;
    
    const options = {};
    if (periodDays) options.periodDays = parseInt(periodDays);
    if (hourlyCost) options.hourlyCost = parseFloat(hourlyCost);
    
    const result = await calculateOrgCostOfDrift(orgId, options);
    
    res.json(result);
  } catch (error) {
    console.error('[CostOfDrift API] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/cost-of-drift/summary
 * Get cost of drift summary for current user's organization
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const result = await calculateOrgCostOfDrift(orgId);
    
    res.json(result);
  } catch (error) {
    console.error('[CostOfDrift API] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
