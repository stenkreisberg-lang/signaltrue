/**
 * ROI Translation Layer Routes
 * API endpoints for ROI settings and savings calculations
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getROISettings,
  updateROISettings,
  calculateROISummary,
  calculateDriftCostProjection,
  getROIDashboardBanner
} from '../services/roiService.js';

const router = express.Router();

/**
 * GET /api/roi/settings
 * Get ROI settings for user's organization
 */
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const settings = await getROISettings(orgId);
    
    res.json({
      success: true,
      settings: {
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        averageSalary: settings.averageSalary,
        averageHourlyCost: settings.averageHourlyCost,
        teamSize: settings.teamSize,
        workingDaysPerYear: settings.workingDaysPerYear,
        hoursPerDay: settings.hoursPerDay,
        overheadMultiplier: settings.overheadMultiplier,
        showROIOverlay: settings.showROIOverlay,
        roiPeriod: settings.roiPeriod,
        costFactors: settings.costFactors,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('[ROI API] Error getting settings:', error);
    res.status(500).json({ message: 'Failed to get ROI settings', error: error.message });
  }
});

/**
 * PUT /api/roi/settings
 * Update ROI settings
 */
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const updates = req.body;
    const settings = await updateROISettings(orgId, updates, req.user.userId);
    
    res.json({
      success: true,
      message: 'ROI settings updated successfully',
      settings: {
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        averageSalary: settings.averageSalary,
        averageHourlyCost: settings.averageHourlyCost,
        teamSize: settings.teamSize,
        workingDaysPerYear: settings.workingDaysPerYear,
        hoursPerDay: settings.hoursPerDay,
        overheadMultiplier: settings.overheadMultiplier,
        showROIOverlay: settings.showROIOverlay,
        roiPeriod: settings.roiPeriod,
        costFactors: settings.costFactors
      }
    });
  } catch (error) {
    console.error('[ROI API] Error updating settings:', error);
    res.status(500).json({ message: 'Failed to update ROI settings', error: error.message });
  }
});

/**
 * GET /api/roi/summary
 * Get ROI summary with all savings calculations
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { period = 30 } = req.query;
    const summary = await calculateROISummary(orgId, { periodDays: parseInt(period) });
    
    res.json(summary);
  } catch (error) {
    console.error('[ROI API] Error getting summary:', error);
    res.status(500).json({ message: 'Failed to get ROI summary', error: error.message });
  }
});

/**
 * GET /api/roi/drift-cost
 * Get projected cost of active drift
 */
router.get('/drift-cost', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { days = 30 } = req.query;
    const projection = await calculateDriftCostProjection(orgId, { projectionDays: parseInt(days) });
    
    res.json(projection);
  } catch (error) {
    console.error('[ROI API] Error getting drift cost:', error);
    res.status(500).json({ message: 'Failed to get drift cost projection', error: error.message });
  }
});

/**
 * GET /api/roi/banner
 * Get ROI dashboard banner data
 */
router.get('/banner', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const banner = await getROIDashboardBanner(orgId);
    
    res.json({
      success: true,
      banner
    });
  } catch (error) {
    console.error('[ROI API] Error getting banner:', error);
    res.status(500).json({ message: 'Failed to get ROI banner', error: error.message });
  }
});

/**
 * POST /api/roi/toggle-overlay
 * Toggle ROI overlay visibility
 */
router.post('/toggle-overlay', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(400).json({ message: 'No organization found for user' });
    }
    
    const { show } = req.body;
    const settings = await updateROISettings(orgId, { showROIOverlay: show }, req.user.userId);
    
    res.json({
      success: true,
      showROIOverlay: settings.showROIOverlay
    });
  } catch (error) {
    console.error('[ROI API] Error toggling overlay:', error);
    res.status(500).json({ message: 'Failed to toggle ROI overlay', error: error.message });
  }
});

/**
 * GET /api/roi/team/:teamId
 * Get ROI data for a specific team
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { period = 30 } = req.query;
    
    // Import Team model
    const Team = (await import('../models/team.js')).default;
    const team = await Team.findById(teamId).lean();
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Calculate team-specific ROI (simplified version)
    const settings = await getROISettings(team.orgId);
    
    res.json({
      success: true,
      teamId,
      teamName: team.name,
      currency: settings.currency,
      currencySymbol: settings.currencySymbol,
      periodDays: parseInt(period),
      message: 'Team-level ROI calculation available in summary endpoint'
    });
  } catch (error) {
    console.error('[ROI API] Error getting team ROI:', error);
    res.status(500).json({ message: 'Failed to get team ROI', error: error.message });
  }
});

export default router;
