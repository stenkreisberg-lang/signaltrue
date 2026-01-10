/**
 * Behavioral Intelligence API Routes
 * Advanced features: Attrition Risk, Manager Effectiveness, Crisis Detection
 */

import express from 'express';
import { authenticateToken, requireAdmin, requireHROrAdmin } from '../middleware/auth.js';
import {
  calculateAttritionRisk,
  calculateTeamAttritionRisk,
  getHighRiskIndividuals,
  getTeamRiskSummary
} from '../services/attritionRiskService.js';
import {
  calculateManagerEffectiveness,
  getOrgManagerEffectiveness,
  getManagersNeedingCoaching
} from '../services/managerEffectivenessService.js';
import {
  runCrisisDetection,
  detectTeamCrisis,
  getActiveCrises,
  acknowledgeCrisis,
  resolveCrisis
} from '../services/crisisDetectionService.js';

const router = express.Router();

// ============================================
// ATTRITION RISK ENDPOINTS
// ============================================

/**
 * GET /api/intelligence/attrition/team/:teamId
 * Get team attrition risk summary (for managers)
 */
router.get('/attrition/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const summary = await getTeamRiskSummary(teamId);
    
    res.json(summary);
  } catch (error) {
    console.error('[Intelligence API] Error fetching team attrition summary:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/attrition/org/:orgId
 * Get all high-risk individuals (HR only - privacy-sensitive)
 */
router.get('/attrition/org/:orgId', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { minRiskScore } = req.query;
    
    const highRisk = await getHighRiskIndividuals(
      orgId,
      minRiskScore ? parseInt(minRiskScore) : 60
    );
    
    res.json({
      count: highRisk.length,
      individuals: highRisk
    });
  } catch (error) {
    console.error('[Intelligence API] Error fetching high-risk individuals:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/attrition/:userId/calculate
 * Trigger attrition risk calculation for a user
 */
router.post('/attrition/:userId/calculate', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ message: 'teamId required in body' });
    }
    
    const risk = await calculateAttritionRisk(userId, teamId);
    
    res.json(risk);
  } catch (error) {
    console.error('[Intelligence API] Error calculating attrition risk:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/attrition/team/:teamId/calculate
 * Trigger attrition risk calculation for entire team
 */
router.post('/attrition/team/:teamId/calculate', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const risks = await calculateTeamAttritionRisk(teamId);
    
    res.json({
      count: risks.length,
      risks
    });
  } catch (error) {
    console.error('[Intelligence API] Error calculating team attrition risk:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// MANAGER EFFECTIVENESS ENDPOINTS
// ============================================

/**
 * GET /api/intelligence/managers/:orgId
 * Get all managers with effectiveness scores
 */
router.get('/managers/:orgId', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const managers = await getOrgManagerEffectiveness(orgId);
    
    res.json({
      count: managers.length,
      managers
    });
  } catch (error) {
    console.error('[Intelligence API] Error fetching manager effectiveness:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/managers/coaching/:orgId
 * Get managers needing coaching
 */
router.get('/managers/coaching/:orgId', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const managers = await getManagersNeedingCoaching(orgId);
    
    res.json({
      count: managers.length,
      managers
    });
  } catch (error) {
    console.error('[Intelligence API] Error fetching managers needing coaching:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/managers/:managerId/calculate
 * Trigger manager effectiveness calculation
 */
router.post('/managers/:managerId/calculate', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { managerId } = req.params;
    const { teamId } = req.body;
    
    if (!teamId) {
      return res.status(400).json({ message: 'teamId required in body' });
    }
    
    const effectiveness = await calculateManagerEffectiveness(managerId, teamId);
    
    res.json(effectiveness);
  } catch (error) {
    console.error('[Intelligence API] Error calculating manager effectiveness:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// CRISIS DETECTION ENDPOINTS
// ============================================

/**
 * GET /api/intelligence/crisis/:orgId
 * Get active crises for organization
 */
router.get('/crisis/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const crises = await getActiveCrises(orgId);
    
    res.json({
      count: crises.length,
      crises
    });
  } catch (error) {
    console.error('[Intelligence API] Error fetching active crises:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/crisis/team/:teamId
 * Check for crisis on specific team
 */
router.get('/crisis/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const crisis = await detectTeamCrisis(teamId);
    
    if (!crisis) {
      return res.json({ crisis: null, message: 'No crisis detected' });
    }
    
    res.json({ crisis });
  } catch (error) {
    console.error('[Intelligence API] Error detecting team crisis:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/crisis/:crisisId/acknowledge
 * Acknowledge a crisis
 */
router.post('/crisis/:crisisId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { crisisId } = req.params;
    const userId = req.user._id || req.user.id;
    
    const crisis = await acknowledgeCrisis(crisisId, userId);
    
    if (!crisis) {
      return res.status(404).json({ message: 'Crisis not found' });
    }
    
    res.json(crisis);
  } catch (error) {
    console.error('[Intelligence API] Error acknowledging crisis:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/crisis/:crisisId/resolve
 * Resolve a crisis
 */
router.post('/crisis/:crisisId/resolve', authenticateToken, async (req, res) => {
  try {
    const { crisisId } = req.params;
    const { notes } = req.body;
    const userId = req.user._id || req.user.id;
    
    const crisis = await resolveCrisis(crisisId, userId, notes);
    
    if (!crisis) {
      return res.status(404).json({ message: 'Crisis not found' });
    }
    
    res.json(crisis);
  } catch (error) {
    console.error('[Intelligence API] Error resolving crisis:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/crisis/run-detection
 * Manually trigger crisis detection (admin only)
 */
router.post('/crisis/run-detection', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const crises = await runCrisisDetection();
    
    res.json({
      message: 'Crisis detection completed',
      count: crises.length,
      crises
    });
  } catch (error) {
    console.error('[Intelligence API] Error running crisis detection:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
