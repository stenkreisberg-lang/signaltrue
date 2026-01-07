/**
 * Loop Closing Routes
 * API endpoints for Phase 1, Phase 2, and Phase 3 pilot features:
 * - Meeting ROI Score
 * - Focus Recovery Forecast
 * - 30-Day Work Health Delta Report
 * - After-Hours Cost Calculator (Phase 2)
 * - Meeting Collision Heatmap (Phase 2)
 * - Intervention Simulator (Phase 3)
 * - Team Load Balance Index (Phase 3)
 * - Execution Drag Indicator (Phase 3)
 */

import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import {
  computeMeetingROI,
  storeMeetingROI,
  getMeetingROIHistory,
  getLatestMeetingROI
} from '../services/meetingROIService.js';
import {
  computeFocusForecast,
  storeFocusForecast,
  getFocusForecastHistory,
  getLatestFocusForecast,
  calculateFocusBlocks,
  calculateFragmentationIndex
} from '../services/focusForecastService.js';
import {
  computeWorkHealthDelta,
  storeWorkHealthDelta,
  getWorkHealthDeltaHistory,
  getLatestWorkHealthDelta,
  formatReportForPDF
} from '../services/workHealthDeltaService.js';
import {
  computeAfterHoursCost,
  storeAfterHoursCost,
  getAfterHoursCostHistory,
  getLatestAfterHoursCost
} from '../services/afterHoursCostService.js';
import {
  computeMeetingCollision,
  storeMeetingCollision,
  getMeetingCollisionHistory,
  getLatestMeetingCollision,
  formatHeatmapForDisplay
} from '../services/meetingCollisionService.js';
import {
  runSimulation,
  getInterventionPresets,
  INTERVENTION_TYPES
} from '../services/interventionSimulatorService.js';
import {
  computeLoadBalanceIndex,
  generateSampleMetrics
} from '../services/loadBalanceService.js';
import {
  computeExecutionDrag,
  getExecutionDragHistory
} from '../services/executionDragService.js';
import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

const router = express.Router();

// Helper to extract orgId from user (handles both string and object cases)
function getUserOrgId(user) {
  if (!user?.orgId) return null;
  if (typeof user.orgId === 'string') return user.orgId;
  if (user.orgId._id) return user.orgId._id.toString();
  return user.orgId.toString();
}

// ============================================
// MEETING ROI ENDPOINTS
// ============================================

/**
 * GET /api/loop-closing/meeting-roi/:teamId
 * Get latest Meeting ROI for a team
 */
router.get('/meeting-roi/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Verify team access
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Check user has access to this team's org
    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const latestROI = await getLatestMeetingROI(teamId);
    
    if (!latestROI) {
      // Return default values if no data yet
      return res.json({
        teamId,
        roiScore: 50,
        lowROIPercentage: 50,
        meetingCount: 0,
        message: 'No meeting data available yet',
        hasData: false
      });
    }

    res.json({ ...latestROI.toObject(), hasData: true });
  } catch (error) {
    console.error('[Loop Closing] Meeting ROI error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/loop-closing/meeting-roi/:teamId/history
 * Get Meeting ROI history for trend visualization
 */
router.get('/meeting-roi/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const days = parseInt(req.query.days) || 30;

    const history = await getMeetingROIHistory(teamId, days);
    res.json({ history });
  } catch (error) {
    console.error('[Loop Closing] Meeting ROI history error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/meeting-roi/:teamId/compute
 * Trigger Meeting ROI computation (admin only)
 */
router.post('/meeting-roi/:teamId/compute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { meetings = [], messagesAfterMeetings = 0 } = req.body;

    const roiData = await computeMeetingROI(teamId, meetings, messagesAfterMeetings);
    const saved = await storeMeetingROI(roiData);

    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[Loop Closing] Meeting ROI compute error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// FOCUS RECOVERY FORECAST ENDPOINTS
// ============================================

/**
 * GET /api/loop-closing/focus-forecast/:teamId
 * Get latest Focus Recovery Forecast
 */
router.get('/focus-forecast/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const latestForecast = await getLatestFocusForecast(teamId);

    if (!latestForecast) {
      return res.json({
        teamId,
        warningState: 'Stable',
        focusCapacityChange: 0,
        forecastMessage: 'Insufficient data for forecast',
        hasData: false
      });
    }

    res.json({ ...latestForecast.toObject(), hasData: true });
  } catch (error) {
    console.error('[Loop Closing] Focus forecast error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/loop-closing/focus-forecast/:teamId/history
 * Get Focus Forecast history
 */
router.get('/focus-forecast/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const days = parseInt(req.query.days) || 30;

    const history = await getFocusForecastHistory(teamId, days);
    res.json({ history });
  } catch (error) {
    console.error('[Loop Closing] Focus forecast history error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/focus-forecast/:teamId/compute
 * Trigger Focus Forecast computation
 */
router.post('/focus-forecast/:teamId/compute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // Get historical metrics for trend calculation
    const historicalMetrics = await MetricsDaily.find({
      teamId,
      date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
    }).sort({ date: 1 });

    const historicalData = historicalMetrics.map(m => ({
      date: m.date,
      focusBlocks: m.focusTimeRatio ? m.focusTimeRatio * 5 : 0, // Convert ratio to blocks
      fragmentation: m.responseMedianMins || 0
    }));

    // Get latest metrics for current state
    const latestMetric = historicalMetrics[historicalMetrics.length - 1];
    
    const forecastData = await computeFocusForecast(teamId, {
      currentFocusBlocks: latestMetric?.focusTimeRatio ? latestMetric.focusTimeRatio * 5 : 0,
      currentFragmentation: latestMetric?.responseMedianMins || 0,
      currentAfterHoursRate: latestMetric?.afterHoursRate || 0,
      historicalData
    });

    const saved = await storeFocusForecast(forecastData);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[Loop Closing] Focus forecast compute error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// WORK HEALTH DELTA REPORT ENDPOINTS
// ============================================

/**
 * GET /api/loop-closing/health-delta/:teamId
 * Get latest 30-Day Work Health Delta Report
 */
router.get('/health-delta/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const latestReport = await getLatestWorkHealthDelta(teamId);

    if (!latestReport) {
      return res.json({
        teamId,
        overallStatus: 'stable',
        summaryMessage: 'Insufficient data for comparison',
        hasData: false
      });
    }

    res.json({ ...latestReport.toObject(), hasData: true });
  } catch (error) {
    console.error('[Loop Closing] Health delta error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/loop-closing/health-delta/:teamId/history
 * Get Work Health Delta Report history
 */
router.get('/health-delta/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const count = parseInt(req.query.count) || 10;

    const history = await getWorkHealthDeltaHistory(teamId, count);
    res.json({ history });
  } catch (error) {
    console.error('[Loop Closing] Health delta history error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/health-delta/:teamId/compute
 * Generate new 30-Day Work Health Delta Report
 */
router.post('/health-delta/:teamId/compute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;

    const reportData = await computeWorkHealthDelta(teamId);
    const saved = await storeWorkHealthDelta(reportData);

    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[Loop Closing] Health delta compute error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/loop-closing/health-delta/:teamId/pdf
 * Get PDF-formatted report data
 */
router.get('/health-delta/:teamId/pdf', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const report = await getLatestWorkHealthDelta(teamId);
    if (!report) {
      return res.status(404).json({ message: 'No report available' });
    }

    const pdfData = formatReportForPDF(report);
    res.json(pdfData);
  } catch (error) {
    console.error('[Loop Closing] Health delta PDF error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// COMBINED DASHBOARD ENDPOINT
// ============================================

/**
 * GET /api/loop-closing/dashboard/:teamId
 * Get all loop-closing metrics for team dashboard
 */
router.get('/dashboard/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch all metrics in parallel
    const [meetingROI, focusForecast, healthDelta] = await Promise.all([
      getLatestMeetingROI(teamId),
      getLatestFocusForecast(teamId),
      getLatestWorkHealthDelta(teamId)
    ]);

    res.json({
      teamId,
      teamName: team.name,
      
      meetingROI: meetingROI ? {
        roiScore: meetingROI.roiScore,
        lowROIPercentage: meetingROI.lowROIPercentage,
        meetingCount: meetingROI.meetingCount,
        updatedAt: meetingROI.updatedAt,
        hasData: true
      } : {
        roiScore: 50,
        lowROIPercentage: 50,
        hasData: false
      },

      focusForecast: focusForecast ? {
        warningState: focusForecast.warningState,
        focusCapacityChange: focusForecast.focusCapacityChange,
        forecastMessage: focusForecast.forecastMessage,
        currentFocusBlocksPerDay: focusForecast.currentFocusBlocksPerDay,
        updatedAt: focusForecast.updatedAt,
        hasData: true
      } : {
        warningState: 'Stable',
        focusCapacityChange: 0,
        hasData: false
      },

      healthDelta: healthDelta ? {
        overallStatus: healthDelta.overallStatus,
        summaryMessage: healthDelta.summaryMessage,
        deltas: healthDelta.deltas,
        deltaStatus: healthDelta.deltaStatus,
        periodStart: healthDelta.periodStart,
        periodEnd: healthDelta.periodEnd,
        updatedAt: healthDelta.updatedAt,
        hasData: true
      } : {
        overallStatus: 'stable',
        hasData: false
      }
    });
  } catch (error) {
    console.error('[Loop Closing] Dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/compute-all/:teamId
 * Trigger computation of all loop-closing metrics (admin only)
 */
router.post('/compute-all/:teamId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;

    // Run all computations
    const results = {
      meetingROI: null,
      focusForecast: null,
      healthDelta: null
    };

    // Compute Meeting ROI (would need calendar data in production)
    try {
      const roiData = await computeMeetingROI(teamId, [], 0);
      results.meetingROI = await storeMeetingROI(roiData);
    } catch (e) {
      console.error('Meeting ROI compute failed:', e);
    }

    // Compute Focus Forecast
    try {
      const historicalMetrics = await MetricsDaily.find({
        teamId,
        date: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
      }).sort({ date: 1 });

      const historicalData = historicalMetrics.map(m => ({
        date: m.date,
        focusBlocks: m.focusTimeRatio ? m.focusTimeRatio * 5 : 0,
        fragmentation: m.responseMedianMins || 0
      }));

      const latestMetric = historicalMetrics[historicalMetrics.length - 1];
      
      const forecastData = await computeFocusForecast(teamId, {
        currentFocusBlocks: latestMetric?.focusTimeRatio ? latestMetric.focusTimeRatio * 5 : 0,
        currentFragmentation: latestMetric?.responseMedianMins || 0,
        currentAfterHoursRate: latestMetric?.afterHoursRate || 0,
        historicalData
      });

      results.focusForecast = await storeFocusForecast(forecastData);
    } catch (e) {
      console.error('Focus forecast compute failed:', e);
    }

    // Compute Work Health Delta
    try {
      const reportData = await computeWorkHealthDelta(teamId);
      results.healthDelta = await storeWorkHealthDelta(reportData);
    } catch (e) {
      console.error('Health delta compute failed:', e);
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('[Loop Closing] Compute all error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// AFTER-HOURS COST ENDPOINTS (Phase 2)
// ============================================

/**
 * GET /api/loop-closing/after-hours/:teamId
 * Get latest After-Hours Cost analysis
 */
router.get('/after-hours/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const latestCost = await getLatestAfterHoursCost(teamId);

    if (!latestCost) {
      return res.json({
        teamId,
        equivalentFTE: 0,
        afterHoursHours: 0,
        estimatedCost: 0,
        message: 'No after-hours data available yet',
        hasData: false
      });
    }

    res.json({ ...latestCost.toObject(), hasData: true });
  } catch (error) {
    console.error('[Loop Closing] After-hours cost error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/loop-closing/after-hours/:teamId/history
 * Get After-Hours Cost history for trend visualization
 */
router.get('/after-hours/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const weeks = parseInt(req.query.weeks) || 8;

    const history = await getAfterHoursCostHistory(teamId, weeks);
    res.json({ history });
  } catch (error) {
    console.error('[Loop Closing] After-hours history error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/after-hours/:teamId/compute
 * Trigger After-Hours Cost computation
 */
router.post('/after-hours/:teamId/compute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { messages = [], timezone = 'UTC' } = req.body;

    const costData = await computeAfterHoursCost(teamId, messages, { timezone });
    const saved = await storeAfterHoursCost(costData);

    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[Loop Closing] After-hours compute error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// MEETING COLLISION HEATMAP ENDPOINTS (Phase 2)
// ============================================

/**
 * GET /api/loop-closing/collision/:teamId
 * Get latest Meeting Collision Heatmap
 */
router.get('/collision/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const latestCollision = await getLatestMeetingCollision(teamId);

    if (!latestCollision) {
      return res.json({
        teamId,
        summary: {
          redZoneHours: 0,
          focusWindowHours: 0,
          congestionRate: 0
        },
        message: 'No calendar data available yet',
        hasData: false
      });
    }

    // Format heatmap for frontend display
    const formattedHeatmap = formatHeatmapForDisplay(latestCollision.heatmap);

    res.json({ 
      ...latestCollision.toObject(), 
      formattedHeatmap,
      hasData: true 
    });
  } catch (error) {
    console.error('[Loop Closing] Collision heatmap error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/loop-closing/collision/:teamId/history
 * Get Meeting Collision history
 */
router.get('/collision/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const weeks = parseInt(req.query.weeks) || 8;

    const history = await getMeetingCollisionHistory(teamId, weeks);
    res.json({ history });
  } catch (error) {
    console.error('[Loop Closing] Collision history error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/collision/:teamId/compute
 * Trigger Meeting Collision Heatmap computation
 */
router.post('/collision/:teamId/compute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { meetings = [], teamSize } = req.body;

    const collisionData = await computeMeetingCollision(teamId, meetings, { teamSize });
    const saved = await storeMeetingCollision(collisionData);

    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('[Loop Closing] Collision compute error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// EXTENDED DASHBOARD WITH PHASE 2
// ============================================

/**
 * GET /api/loop-closing/full-dashboard/:teamId
 * Get all loop-closing metrics including Phase 2
 */
router.get('/full-dashboard/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch all metrics in parallel
    const [meetingROI, focusForecast, healthDelta, afterHoursCost, meetingCollision] = await Promise.all([
      getLatestMeetingROI(teamId),
      getLatestFocusForecast(teamId),
      getLatestWorkHealthDelta(teamId),
      getLatestAfterHoursCost(teamId),
      getLatestMeetingCollision(teamId)
    ]);

    res.json({
      teamId,
      teamName: team.name,
      
      // Phase 1
      meetingROI: meetingROI ? {
        roiScore: meetingROI.roiScore,
        lowROIPercentage: meetingROI.lowROIPercentage,
        meetingCount: meetingROI.meetingCount,
        updatedAt: meetingROI.updatedAt,
        hasData: true
      } : { hasData: false },

      focusForecast: focusForecast ? {
        warningState: focusForecast.warningState,
        focusCapacityChange: focusForecast.focusCapacityChange,
        forecastMessage: focusForecast.forecastMessage,
        updatedAt: focusForecast.updatedAt,
        hasData: true
      } : { hasData: false },

      healthDelta: healthDelta ? {
        overallStatus: healthDelta.overallStatus,
        summaryMessage: healthDelta.summaryMessage,
        deltas: healthDelta.deltas,
        deltaStatus: healthDelta.deltaStatus,
        updatedAt: healthDelta.updatedAt,
        hasData: true
      } : { hasData: false },

      // Phase 2
      afterHoursCost: afterHoursCost ? {
        equivalentFTE: afterHoursCost.equivalentFTE,
        afterHoursHours: afterHoursCost.afterHoursHours,
        estimatedCost: afterHoursCost.estimatedCost,
        monthlyAccumulated: afterHoursCost.monthlyAccumulated,
        updatedAt: afterHoursCost.updatedAt,
        hasData: true
      } : { hasData: false },

      meetingCollision: meetingCollision ? {
        summary: meetingCollision.summary,
        redZoneCount: meetingCollision.redZones?.length || 0,
        focusWindowCount: meetingCollision.focusWindows?.length || 0,
        formattedHeatmap: formatHeatmapForDisplay(meetingCollision.heatmap),
        updatedAt: meetingCollision.updatedAt,
        hasData: true
      } : { hasData: false }
    });
  } catch (error) {
    console.error('[Loop Closing] Full dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// INTERVENTION SIMULATOR ENDPOINTS (Phase 3)
// ============================================

/**
 * GET /api/loop-closing/simulator/presets
 * Get available intervention presets
 */
router.get('/simulator/presets', authenticateToken, async (req, res) => {
  try {
    const presets = getInterventionPresets();
    res.json({ presets, interventionTypes: INTERVENTION_TYPES });
  } catch (error) {
    console.error('[Loop Closing] Simulator presets error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/simulator/:teamId/run
 * Run intervention simulation
 */
router.post('/simulator/:teamId/run', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { meetings = [], interventions = [], messages = [] } = req.body;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await runSimulation(teamId, meetings, interventions, { messages });
    res.json(result);
  } catch (error) {
    console.error('[Loop Closing] Simulator run error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/simulator/:teamId/quick
 * Run quick simulation with preset
 */
router.post('/simulator/:teamId/quick', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { presetId, meetings = [] } = req.body;

    const presets = getInterventionPresets();
    const preset = presets.find(p => p.id === presetId);

    if (!preset) {
      return res.status(400).json({ message: 'Invalid preset ID' });
    }

    const result = await runSimulation(teamId, meetings, [preset.intervention]);
    res.json({ 
      ...result, 
      presetUsed: preset.name 
    });
  } catch (error) {
    console.error('[Loop Closing] Quick simulation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// TEAM LOAD BALANCE ENDPOINTS (Phase 3)
// ============================================

/**
 * GET /api/loop-closing/load-balance/:teamId
 * Get Team Load Balance Index
 */
router.get('/load-balance/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Generate sample metrics based on team aggregates
    // In production, this would come from actual per-member data
    const teamSize = team.metadata?.actualSize || 5;
    const sampleMetrics = generateSampleMetrics({
      avgMeetingHours: 15,
      avgAfterHours: 3,
      avgResponsePressure: 50,
      variance: 0.4
    }, teamSize);

    const result = await computeLoadBalanceIndex(teamId, sampleMetrics);
    res.json(result);
  } catch (error) {
    console.error('[Loop Closing] Load balance error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/load-balance/:teamId/compute
 * Compute Load Balance with actual member metrics
 */
router.post('/load-balance/:teamId/compute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { memberMetrics = [] } = req.body;

    const result = await computeLoadBalanceIndex(teamId, memberMetrics);
    res.json(result);
  } catch (error) {
    console.error('[Loop Closing] Load balance compute error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// EXECUTION DRAG ENDPOINTS (Phase 3)
// ============================================

/**
 * GET /api/loop-closing/execution-drag/:teamId
 * Get Execution Drag Indicator
 */
router.get('/execution-drag/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const result = await computeExecutionDrag(teamId);
    res.json(result);
  } catch (error) {
    console.error('[Loop Closing] Execution drag error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/loop-closing/execution-drag/:teamId/history
 * Get Execution Drag history
 */
router.get('/execution-drag/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const weeks = parseInt(req.query.weeks) || 8;

    const history = await getExecutionDragHistory(teamId, weeks);
    res.json({ history });
  } catch (error) {
    console.error('[Loop Closing] Execution drag history error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/loop-closing/execution-drag/:teamId/compute
 * Compute Execution Drag with explicit period data
 */
router.post('/execution-drag/:teamId/compute', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { currentPeriod, previousPeriod } = req.body;

    const result = await computeExecutionDrag(teamId, currentPeriod, previousPeriod);
    res.json(result);
  } catch (error) {
    console.error('[Loop Closing] Execution drag compute error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ============================================
// COMPLETE DASHBOARD WITH ALL PHASES
// ============================================

/**
 * GET /api/loop-closing/complete-dashboard/:teamId
 * Get all metrics from all phases
 */
router.get('/complete-dashboard/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.orgId.toString() !== getUserOrgId(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch all metrics in parallel
    const [
      meetingROI,
      focusForecast,
      healthDelta,
      afterHoursCost,
      meetingCollision,
      loadBalance,
      executionDrag
    ] = await Promise.all([
      getLatestMeetingROI(teamId),
      getLatestFocusForecast(teamId),
      getLatestWorkHealthDelta(teamId),
      getLatestAfterHoursCost(teamId),
      getLatestMeetingCollision(teamId),
      computeLoadBalanceIndex(teamId, generateSampleMetrics({
        avgMeetingHours: 15, avgAfterHours: 3, avgResponsePressure: 50
      }, team.metadata?.actualSize || 5)),
      computeExecutionDrag(teamId)
    ]);

    res.json({
      teamId,
      teamName: team.name,
      
      // Phase 1
      phase1: {
        meetingROI: meetingROI ? {
          roiScore: meetingROI.roiScore,
          lowROIPercentage: meetingROI.lowROIPercentage,
          hasData: true
        } : { hasData: false },
        focusForecast: focusForecast ? {
          warningState: focusForecast.warningState,
          focusCapacityChange: focusForecast.focusCapacityChange,
          forecastMessage: focusForecast.forecastMessage,
          hasData: true
        } : { hasData: false },
        healthDelta: healthDelta ? {
          overallStatus: healthDelta.overallStatus,
          summaryMessage: healthDelta.summaryMessage,
          deltas: healthDelta.deltas,
          hasData: true
        } : { hasData: false }
      },
      
      // Phase 2
      phase2: {
        afterHoursCost: afterHoursCost ? {
          equivalentFTE: afterHoursCost.equivalentFTE,
          afterHoursHours: afterHoursCost.afterHoursHours,
          hasData: true
        } : { hasData: false },
        meetingCollision: meetingCollision ? {
          summary: meetingCollision.summary,
          redZoneCount: meetingCollision.redZones?.length || 0,
          hasData: true
        } : { hasData: false }
      },
      
      // Phase 3
      phase3: {
        loadBalance: {
          loadBalanceIndex: loadBalance.loadBalanceIndex,
          balanceState: loadBalance.balanceState,
          explanation: loadBalance.explanation,
          hasData: loadBalance.hasData
        },
        executionDrag: {
          executionDrag: executionDrag.executionDrag,
          dragState: executionDrag.dragState,
          explanation: executionDrag.explanation,
          hasData: executionDrag.hasData
        },
        simulatorPresets: getInterventionPresets().slice(0, 3) // Top 3 presets
      }
    });
  } catch (error) {
    console.error('[Loop Closing] Complete dashboard error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
