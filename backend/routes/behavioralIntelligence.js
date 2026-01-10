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
import {
  analyzeTeamProjects,
  getHighRiskProjects
} from '../services/projectRiskService.js';
import {
  analyzeNetworkHealth,
  getOrgNetworkHealth
} from '../services/networkHealthService.js';
import {
  analyzeTeamSuccessionRisk,
  analyzeIndividualSuccessionRisk,
  getCriticalSuccessionRisks
} from '../services/successionRiskService.js';
import {
  analyzeTeamEquity,
  getOrgEquityIssues
} from '../services/equitySignalsService.js';
import {
  analyzeMeetingROI,
  analyzeTeamRecentMeetings,
  getLowROIMeetings
} from '../services/enhancedMeetingROIService.js';
import {
  analyzeUserOutlookSignals,
  analyzeTeamOutlookSignals,
  getCriticalOutlookSignals
} from '../services/outlookSignalsService.js';

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

// ============================================
// PROJECT RISK ENDPOINTS
// ============================================

/**
 * GET /api/intelligence/projects/team/:teamId
 * Analyze all projects for a team
 */
router.get('/projects/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const projects = await analyzeTeamProjects(teamId);
    
    res.json(projects);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing team projects:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/projects/org/:orgId/high-risk
 * Get all high-risk projects for org
 */
router.get('/projects/org/:orgId/high-risk', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { minRiskScore } = req.query;
    
    const projects = await getHighRiskProjects(orgId, parseInt(minRiskScore) || 55);
    
    res.json(projects);
  } catch (error) {
    console.error('[Intelligence API] Error fetching high-risk projects:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// NETWORK HEALTH ENDPOINTS
// ============================================

/**
 * POST /api/intelligence/network/team/:teamId/analyze
 * Analyze network health for a team
 */
router.post('/network/team/:teamId/analyze', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const health = await analyzeNetworkHealth(teamId);
    
    res.json(health);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing network health:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/network/org/:orgId
 * Get network health for all teams in org
 */
router.get('/network/org/:orgId', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const health = await getOrgNetworkHealth(orgId);
    
    res.json(health);
  } catch (error) {
    console.error('[Intelligence API] Error fetching org network health:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// SUCCESSION RISK ENDPOINTS
// ============================================

/**
 * POST /api/intelligence/succession/team/:teamId/analyze
 * Analyze succession risk for a team
 */
router.post('/succession/team/:teamId/analyze', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const risks = await analyzeTeamSuccessionRisk(teamId);
    
    res.json(risks);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing succession risk:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/succession/user/:userId/analyze
 * Analyze succession risk for an individual
 */
router.post('/succession/user/:userId/analyze', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId } = req.body;
    
    const risk = await analyzeIndividualSuccessionRisk(userId, teamId);
    
    res.json(risk);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing individual succession risk:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/succession/org/:orgId/critical
 * Get critical succession risks for org
 */
router.get('/succession/org/:orgId/critical', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { minRiskScore } = req.query;
    
    const risks = await getCriticalSuccessionRisks(orgId, parseInt(minRiskScore) || 65);
    
    res.json(risks);
  } catch (error) {
    console.error('[Intelligence API] Error fetching critical succession risks:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// EQUITY SIGNALS ENDPOINTS
// ============================================

/**
 * POST /api/intelligence/equity/team/:teamId/analyze
 * Analyze equity for a team
 */
router.post('/equity/team/:teamId/analyze', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const equity = await analyzeTeamEquity(teamId);
    
    res.json(equity);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing team equity:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/equity/org/:orgId/issues
 * Get equity issues for org
 */
router.get('/equity/org/:orgId/issues', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { maxScore } = req.query;
    
    const issues = await getOrgEquityIssues(orgId, parseInt(maxScore) || 65);
    
    res.json(issues);
  } catch (error) {
    console.error('[Intelligence API] Error fetching equity issues:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// ENHANCED MEETING ROI ENDPOINTS
// ============================================

/**
 * POST /api/intelligence/meeting-roi/:meetingId/analyze
 * Analyze ROI for a specific meeting
 */
router.post('/meeting-roi/:meetingId/analyze', authenticateToken, async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { teamId } = req.body;
    
    const roi = await analyzeMeetingROI(meetingId, teamId);
    
    res.json(roi);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing meeting ROI:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/meeting-roi/team/:teamId/analyze-recent
 * Analyze recent meetings for a team
 */
router.post('/meeting-roi/team/:teamId/analyze-recent', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { days } = req.query;
    
    const meetings = await analyzeTeamRecentMeetings(teamId, parseInt(days) || 7);
    
    res.json(meetings);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing recent meetings:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/meeting-roi/org/:orgId/low-roi
 * Get low ROI meetings for org
 */
router.get('/meeting-roi/org/:orgId/low-roi', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { maxScore } = req.query;
    
    const meetings = await getLowROIMeetings(orgId, parseInt(maxScore) || 40);
    
    res.json(meetings);
  } catch (error) {
    console.error('[Intelligence API] Error fetching low ROI meetings:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// OUTLOOK SIGNALS ENDPOINTS
// ============================================

/**
 * POST /api/intelligence/outlook/user/:userId/analyze
 * Analyze Outlook signals for a user
 */
router.post('/outlook/user/:userId/analyze', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { teamId, periodDays } = req.body;
    
    const signals = await analyzeUserOutlookSignals(userId, teamId, parseInt(periodDays) || 30);
    
    res.json(signals);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing user Outlook signals:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/intelligence/outlook/team/:teamId/analyze
 * Analyze Outlook signals for a team
 */
router.post('/outlook/team/:teamId/analyze', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { periodDays } = req.query;
    
    const signals = await analyzeTeamOutlookSignals(teamId, parseInt(periodDays) || 30);
    
    res.json(signals);
  } catch (error) {
    console.error('[Intelligence API] Error analyzing team Outlook signals:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/intelligence/outlook/org/:orgId/critical
 * Get critical Outlook signals for org
 */
router.get('/outlook/org/:orgId/critical', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { maxScore } = req.query;
    
    const signals = await getCriticalOutlookSignals(orgId, parseInt(maxScore) || 50);
    
    res.json(signals);
  } catch (error) {
    console.error('[Intelligence API] Error fetching critical Outlook signals:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
