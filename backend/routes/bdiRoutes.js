import express from 'express';
import { calculateBDI, getLatestBDI, getBDIHistory, getOrgBDISummary } from '../services/bdiService.js';
import { calculateAllIndices, getLatestCLI, getLatestBTI, getLatestSRI } from '../services/indicesService.js';
import CapacityStatus from '../models/capacityStatus.js';
import DriftTimeline from '../models/driftTimeline.js';
import DriftPlaybook from '../models/driftPlaybook.js';
import { requireAuth } from '../middleware/auth.js';
import { applyAntiWeaponizationGuards } from '../middleware/antiWeaponizationGuards.js';

const router = express.Router();

/**
 * GET /api/bdi/team/:teamId/latest
 * Get latest Behavioral Drift Index for a team
 * PROTECTED: Requires 5+ team members, team-level only, audit logged
 */
router.get('/team/:teamId/latest', requireAuth, ...applyAntiWeaponizationGuards, async (req, res) => {
  try {
    const { teamId } = req.params;
    const bdi = await getLatestBDI(teamId);
    
    if (!bdi) {
      return res.status(404).json({ message: 'No BDI data found for this team' });
    }
    
    res.json(bdi);
  } catch (error) {
    console.error('Error getting latest BDI:', error);
    res.status(500).json({ message: 'Error retrieving BDI data' });
  }
});

/**
 * GET /api/bdi/team/:teamId/history
 * Get BDI history for a team
 * PROTECTED: Requires 5+ team members, team-level only, audit logged
 */
router.get('/team/:teamId/history', requireAuth, ...applyAntiWeaponizationGuards, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limit = 30 } = req.query;
    
    const history = await getBDIHistory(teamId, parseInt(limit));
    res.json(history);
  } catch (error) {
    console.error('Error getting BDI history:', error);
    res.status(500).json({ message: 'Error retrieving BDI history' });
  }
});

/**
 * POST /api/bdi/team/:teamId/calculate
 * Calculate BDI for a team for a specific period
 */
router.post('/team/:teamId/calculate', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { periodStart, periodEnd } = req.body;
    
    const bdi = await calculateBDI(
      teamId,
      new Date(periodStart),
      new Date(periodEnd)
    );
    
    res.json(bdi);
  } catch (error) {
    console.error('Error calculating BDI:', error);
    res.status(500).json({ message: 'Error calculating BDI' });
  }
});

/**
 * GET /api/bdi/org/:orgId/summary
 * Get BDI summary for an organization
 */
router.get('/org/:orgId/summary', requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const summary = await getOrgBDISummary(orgId);
    res.json(summary);
  } catch (error) {
    console.error('Error getting org BDI summary:', error);
    res.status(500).json({ message: 'Error retrieving organization summary' });
  }
});

/**
 * GET /api/indices/team/:teamId/all
 * Get all indices (CLI, BTI, SRI) for a team
 */
router.get('/team/:teamId/all', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const [cli, bti, sri] = await Promise.all([
      getLatestCLI(teamId),
      getLatestBTI(teamId),
      getLatestSRI(teamId)
    ]);
    
    res.json({ cli, bti, sri });
  } catch (error) {
    console.error('Error getting indices:', error);
    res.status(500).json({ message: 'Error retrieving indices' });
  }
});

/**
 * POST /api/indices/team/:teamId/calculate
 * Calculate all indices for a team
 */
router.post('/team/:teamId/calculate', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { periodStart, periodEnd } = req.body;
    
    const indices = await calculateAllIndices(
      teamId,
      new Date(periodStart),
      new Date(periodEnd)
    );
    
    res.json(indices);
  } catch (error) {
    console.error('Error calculating indices:', error);
    res.status(500).json({ message: 'Error calculating indices' });
  }
});

/**
 * GET /api/capacity/team/:teamId/latest
 * Get latest capacity status for a team
 */
router.get('/capacity/team/:teamId/latest', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const capacity = await CapacityStatus.findOne({ teamId })
      .sort({ periodStart: -1 });
    
    if (!capacity) {
      return res.status(404).json({ message: 'No capacity data found for this team' });
    }
    
    res.json(capacity);
  } catch (error) {
    console.error('Error getting capacity status:', error);
    res.status(500).json({ message: 'Error retrieving capacity status' });
  }
});

/**
 * GET /api/timeline/team/:teamId
 * Get drift timeline for a team
 */
router.get('/timeline/team/:teamId', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status } = req.query;
    
    const query = { teamId };
    if (status) {
      query.status = status;
    }
    
    const timelines = await DriftTimeline.find(query)
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(timelines);
  } catch (error) {
    console.error('Error getting drift timeline:', error);
    res.status(500).json({ message: 'Error retrieving drift timeline' });
  }
});

/**
 * GET /api/timeline/:timelineId
 * Get specific drift timeline
 */
router.get('/timeline/:timelineId', requireAuth, async (req, res) => {
  try {
    const { timelineId } = req.params;
    const timeline = await DriftTimeline.findOne({ timelineId });
    
    if (!timeline) {
      return res.status(404).json({ message: 'Timeline not found' });
    }
    
    res.json(timeline);
  } catch (error) {
    console.error('Error getting timeline:', error);
    res.status(500).json({ message: 'Error retrieving timeline' });
  }
});

/**
 * GET /api/playbooks
 * Get all active drift playbooks
 */
router.get('/playbooks', requireAuth, async (req, res) => {
  try {
    const { category, driftState } = req.query;
    
    const query = { isActive: true };
    if (category) {
      query.category = category;
    }
    if (driftState) {
      query['appliesTo.driftStates'] = driftState;
    }
    
    const playbooks = await DriftPlaybook.find(query)
      .sort({ priority: -1, 'usage.successRate': -1 });
    
    res.json(playbooks);
  } catch (error) {
    console.error('Error getting playbooks:', error);
    res.status(500).json({ message: 'Error retrieving playbooks' });
  }
});

/**
 * GET /api/playbooks/:playbookId
 * Get specific playbook details
 */
router.get('/playbooks/:playbookId', requireAuth, async (req, res) => {
  try {
    const { playbookId } = req.params;
    const playbook = await DriftPlaybook.findById(playbookId);
    
    if (!playbook) {
      return res.status(404).json({ message: 'Playbook not found' });
    }
    
    res.json(playbook);
  } catch (error) {
    console.error('Error getting playbook:', error);
    res.status(500).json({ message: 'Error retrieving playbook' });
  }
});

/**
 * GET /api/dashboard/:teamId
 * Get comprehensive dashboard data for a team
 * Returns: BDI, Capacity, CLI, BTI, SRI, Timeline
 * PROTECTED: Requires 5+ team members, team-level only, audit logged
 */
router.get('/dashboard/:teamId', requireAuth, ...applyAntiWeaponizationGuards, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const [bdi, capacity, cli, bti, sri, timeline] = await Promise.all([
      getLatestBDI(teamId),
      CapacityStatus.findOne({ teamId }).sort({ periodStart: -1 }),
      getLatestCLI(teamId),
      getLatestBTI(teamId),
      getLatestSRI(teamId),
      DriftTimeline.findOne({ teamId, status: 'Active' })
    ]);
    
    // Add privacy headers
    res.setHeader('X-Privacy-Level', 'team-aggregated');
    res.setHeader('X-Min-Team-Size', '5');
    res.setHeader('X-Data-Type', 'behavioral-drift-metrics');
    
    res.json({
      bdi,
      capacity,
      cli,
      bti,
      sri,
      timeline,
      interpretation: 'Behavioral Drift Index shows whether a team\'s working patterns are changing compared to their own historical baseline. It detects early coordination and capacity issues before outcomes are affected.',
      privacyNotice: 'All metrics are team-level aggregated. Minimum 5 members required. No individual data.'
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ message: 'Error retrieving dashboard data' });
  }
});

/**
 * POST /api/bdi/team/:teamId/generate-state
 * Generate TeamState record from current Team data for dashboard display
 * This creates the records that the BDIDashboard component expects
 */
router.post('/team/:teamId/generate-state', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const mongoose = (await import('mongoose')).default;
    const Team = (await import('../models/team.js')).default;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }
    
    // Calculate zone from BDI
    let zone = 'Stable';
    if (team.bdi >= 70) zone = 'Alert';
    else if (team.bdi >= 50) zone = 'Watch';
    else if (team.bdi < 30) zone = 'Stable';
    
    // Calculate signal scores from team data
    const communicationScore = Math.max(0, Math.min(100, 
      100 - (team.slackSignals?.avgResponseDelayHours || 0) * 5 + 
      (team.slackSignals?.sentiment || 0) * 20
    ));
    
    const engagementScore = Math.max(0, Math.min(100,
      Math.min(100, (team.slackSignals?.messageCount || 0) / 2) +
      (team.googleChatSignals?.messageCount || 0) / 2
    ));
    
    const workloadScore = Math.max(0, Math.min(100,
      100 - (team.calendarSignals?.meetingHoursWeek || 0) * 2 -
      (team.calendarSignals?.afterHoursMeetings || 0) * 5
    ));
    
    const collaborationScore = Math.max(0, Math.min(100,
      (team.calendarSignals?.recoveryScore || 50) +
      (team.calendarSignals?.focusToMeetingRatio || 0.5) * 20
    ));
    
    // Create TeamState document in the format the dashboard expects
    const weekEnd = new Date();
    weekEnd.setHours(23, 59, 59, 999);
    
    const teamStateData = {
      teamId: team._id,
      orgId: team.orgId,
      weekEnd,
      bdi: team.bdi || 50,
      zone,
      riskScore: team.bdi > 60 ? 'high' : team.bdi > 40 ? 'medium' : 'low',
      signals: {
        communication: { score: Math.round(communicationScore), trend: 'stable' },
        engagement: { score: Math.round(engagementScore), trend: 'stable' },
        workload: { score: Math.round(workloadScore), trend: 'stable' },
        collaboration: { score: Math.round(collaborationScore), trend: 'stable' }
      },
      metrics: {
        messageCount: (team.slackSignals?.messageCount || 0) + (team.googleChatSignals?.messageCount || 0),
        meetingHours: team.calendarSignals?.meetingHoursWeek || 0,
        afterHoursActivity: team.calendarSignals?.afterHoursMeetings || 0,
        responseTime: team.slackSignals?.avgResponseDelayHours || 0
      },
      insights: [],
      createdAt: new Date()
    };
    
    // Add insights based on signals
    if (workloadScore < 50) {
      teamStateData.insights.push('High meeting load detected - consider reducing recurring meetings');
    }
    if (communicationScore < 50) {
      teamStateData.insights.push('Response times are elevated - team may be overloaded');
    }
    if (team.calendarSignals?.afterHoursMeetings > 3) {
      teamStateData.insights.push('After-hours meetings detected - watch for burnout signals');
    }
    
    // Insert into teamstates collection using native MongoDB
    const db = mongoose.connection.db;
    const teamStatesCollection = db.collection('teamstates');
    
    // Check if recent state exists (within last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingState = await teamStatesCollection.findOne({
      teamId: team._id,
      createdAt: { $gte: oneDayAgo }
    });
    
    if (existingState) {
      // Update existing
      await teamStatesCollection.updateOne(
        { _id: existingState._id },
        { $set: teamStateData }
      );
      res.json({ message: 'TeamState updated', state: teamStateData, updated: true });
    } else {
      // Insert new
      await teamStatesCollection.insertOne(teamStateData);
      res.json({ message: 'TeamState created', state: teamStateData, created: true });
    }
    
  } catch (error) {
    console.error('Error generating team state:', error);
    res.status(500).json({ message: 'Error generating team state', error: error.message });
  }
});

/**
 * POST /api/bdi/org/:orgId/generate-all-states
 * Generate TeamState records for all teams in an organization
 */
router.post('/org/:orgId/generate-all-states', requireAuth, async (req, res) => {
  try {
    const { orgId } = req.params;
    const mongoose = (await import('mongoose')).default;
    const Team = (await import('../models/team.js')).default;
    
    const teams = await Team.find({ orgId });
    
    if (teams.length === 0) {
      return res.status(404).json({ message: 'No teams found for this organization' });
    }
    
    const results = [];
    const db = mongoose.connection.db;
    const teamStatesCollection = db.collection('teamstates');
    
    for (const team of teams) {
      // Calculate zone from BDI
      let zone = 'Stable';
      if (team.bdi >= 70) zone = 'Alert';
      else if (team.bdi >= 50) zone = 'Watch';
      else if (team.bdi < 30) zone = 'Stable';
      
      // Calculate signal scores
      const communicationScore = Math.max(0, Math.min(100, 
        100 - (team.slackSignals?.avgResponseDelayHours || 0) * 5 + 
        (team.slackSignals?.sentiment || 0) * 20
      ));
      
      const engagementScore = Math.max(0, Math.min(100,
        Math.min(100, (team.slackSignals?.messageCount || 0) / 2) +
        (team.googleChatSignals?.messageCount || 0) / 2
      ));
      
      const workloadScore = Math.max(0, Math.min(100,
        100 - (team.calendarSignals?.meetingHoursWeek || 0) * 2 -
        (team.calendarSignals?.afterHoursMeetings || 0) * 5
      ));
      
      const collaborationScore = Math.max(0, Math.min(100,
        (team.calendarSignals?.recoveryScore || 50) +
        (team.calendarSignals?.focusToMeetingRatio || 0.5) * 20
      ));
      
      const weekEnd = new Date();
      weekEnd.setHours(23, 59, 59, 999);
      
      const teamStateData = {
        teamId: team._id,
        orgId: team.orgId,
        weekEnd,
        bdi: team.bdi || 50,
        zone,
        riskScore: team.bdi > 60 ? 'high' : team.bdi > 40 ? 'medium' : 'low',
        signals: {
          communication: { score: Math.round(communicationScore), trend: 'stable' },
          engagement: { score: Math.round(engagementScore), trend: 'stable' },
          workload: { score: Math.round(workloadScore), trend: 'stable' },
          collaboration: { score: Math.round(collaborationScore), trend: 'stable' }
        },
        metrics: {
          messageCount: (team.slackSignals?.messageCount || 0) + (team.googleChatSignals?.messageCount || 0),
          meetingHours: team.calendarSignals?.meetingHoursWeek || 0,
          afterHoursActivity: team.calendarSignals?.afterHoursMeetings || 0,
          responseTime: team.slackSignals?.avgResponseDelayHours || 0
        },
        insights: [],
        createdAt: new Date()
      };
      
      // Upsert
      await teamStatesCollection.updateOne(
        { teamId: team._id, weekEnd: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        { $set: teamStateData },
        { upsert: true }
      );
      
      results.push({ teamId: team._id, teamName: team.name, bdi: team.bdi, zone });
    }
    
    res.json({ 
      message: `Generated TeamState records for ${teams.length} teams`, 
      teams: results 
    });
    
  } catch (error) {
    console.error('Error generating all team states:', error);
    res.status(500).json({ message: 'Error generating team states', error: error.message });
  }
});

export default router;
