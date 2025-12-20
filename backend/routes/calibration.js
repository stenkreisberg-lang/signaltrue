import express from 'express';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import Baseline from '../models/baseline.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/calibration/status/:orgId
 * Get calibration status for an organization
 */
router.get('/status/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId);
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    const { calibration } = org;
    
    // Calculate calibration day if in calibration
    let currentDay = calibration.calibrationDay;
    if (calibration.isInCalibration && calibration.calibrationStartDate) {
      const daysSinceStart = Math.floor(
        (Date.now() - new Date(calibration.calibrationStartDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      currentDay = Math.min(daysSinceStart, 30);
    }
    
    res.json({
      isInCalibration: calibration.isInCalibration,
      calibrationDay: currentDay,
      calibrationProgress: Math.floor((currentDay / 30) * 100),
      calibrationConfidence: calibration.calibrationConfidence,
      calibrationStartDate: calibration.calibrationStartDate,
      calibrationEndDate: calibration.calibrationEndDate,
      dataSourcesConnected: calibration.dataSourcesConnected || [],
      featuresUnlocked: calibration.featuresUnlocked,
      daysRemaining: Math.max(0, 30 - currentDay)
    });
  } catch (err) {
    console.error('Error fetching calibration status:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/calibration/start/:orgId
 * Start calibration period for an organization
 */
router.post('/start/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId);
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30); // 30-day calibration
    
    org.calibration = {
      isInCalibration: true,
      calibrationStartDate: startDate,
      calibrationEndDate: endDate,
      calibrationDay: 0,
      calibrationProgress: 0,
      calibrationConfidence: 'Low',
      dataSourcesConnected: org.calibration?.dataSourcesConnected || [],
      featuresUnlocked: false
    };
    
    await org.save();
    
    res.json({
      message: 'Baseline calibration started',
      calibration: org.calibration
    });
  } catch (err) {
    console.error('Error starting calibration:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/calibration/connect-source/:orgId
 * Register a data source connection during calibration
 */
router.post('/connect-source/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { source } = req.body; // 'slack', 'google-calendar', etc.
    
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Add data source if not already connected
    const existingSource = org.calibration.dataSourcesConnected?.find(s => s.source === source);
    if (!existingSource) {
      if (!org.calibration.dataSourcesConnected) {
        org.calibration.dataSourcesConnected = [];
      }
      org.calibration.dataSourcesConnected.push({
        source,
        connectedAt: new Date()
      });
      
      // Start calibration if not already started
      if (!org.calibration.isInCalibration) {
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);
        
        org.calibration.isInCalibration = true;
        org.calibration.calibrationStartDate = startDate;
        org.calibration.calibrationEndDate = endDate;
        org.calibration.calibrationDay = 0;
      }
      
      await org.save();
    }
    
    res.json({
      message: `${source} connected`,
      dataSourcesConnected: org.calibration.dataSourcesConnected
    });
  } catch (err) {
    console.error('Error connecting data source:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/calibration/complete/:orgId
 * Complete calibration and unlock features
 */
router.post('/complete/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId);
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    if (!org.calibration.isInCalibration) {
      return res.status(400).json({ message: 'Organization is not in calibration' });
    }
    
    // Get all teams for this org
    const teams = await Team.find({ orgId });
    
    // Create baseline records for each team
    for (const team of teams) {
      // Check if baseline already exists
      const existingBaseline = await Baseline.findOne({ orgId, teamId: team._id });
      if (!existingBaseline) {
        await Baseline.create({
          orgId,
          teamId: team._id,
          calibrationStartDate: org.calibration.calibrationStartDate,
          calibrationEndDate: new Date(),
          calibrationDay: 30,
          isCalibrationComplete: true,
          confidence: org.calibration.calibrationConfidence || 'Medium',
          confidenceScore: 65,
          // Metrics will be populated by baseline computation service
          metrics: {},
          sampleSize: {
            days: 30,
            dataPoints: 0 // will be updated by computation
          }
        });
      }
    }
    
    // Update org calibration state
    org.calibration.isInCalibration = false;
    org.calibration.featuresUnlocked = true;
    org.calibration.calibrationDay = 30;
    org.calibration.calibrationProgress = 100;
    
    await org.save();
    
    res.json({
      message: 'Calibration complete. Signal Intelligence unlocked.',
      calibration: org.calibration
    });
  } catch (err) {
    console.error('Error completing calibration:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/calibration/progress/:orgId
 * Get detailed calibration progress
 */
router.get('/progress/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId);
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    const teams = await Team.find({ orgId });
    const baselines = await Baseline.find({ orgId });
    
    // Calculate progress based on data sources and days elapsed
    const dataSourcesConnected = org.calibration.dataSourcesConnected?.length || 0;
    const requiredSources = 2; // Slack + Calendar
    const sourcesProgress = (dataSourcesConnected / requiredSources) * 50;
    
    const daysSinceStart = org.calibration.calibrationStartDate
      ? Math.floor((Date.now() - new Date(org.calibration.calibrationStartDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const daysProgress = (Math.min(daysSinceStart, 30) / 30) * 50;
    
    const totalProgress = Math.floor(sourcesProgress + daysProgress);
    
    // Determine confidence based on progress
    let confidence = 'Low';
    if (totalProgress >= 75) confidence = 'High';
    else if (totalProgress >= 40) confidence = 'Medium';
    
    res.json({
      calibrationDay: Math.min(daysSinceStart, 30),
      totalProgress,
      confidence,
      dataSourcesConnected: org.calibration.dataSourcesConnected || [],
      teamsConfigured: teams.length,
      baselinesCreated: baselines.length,
      daysRemaining: Math.max(0, 30 - daysSinceStart),
      canComplete: totalProgress >= 50 && daysSinceStart >= 7 // minimum 7 days
    });
  } catch (err) {
    console.error('Error fetching calibration progress:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
