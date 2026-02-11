/**
 * Team State Routes
 * API endpoints for fetching team health data (BDI, signals, metrics)
 */

import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/team-state/team/:teamId/history
 * Get team state history for dashboard visualization
 */
router.get('/team/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const limit = parseInt(req.query.limit) || 12;

    // Use native MongoDB to bypass schema restrictions (our data has bdi, zone, signals)
    const db = mongoose.connection.db;
    const teamStatesCollection = db.collection('teamstates');

    // Try both ObjectId and string formats for teamId
    let teamStates = [];
    
    try {
      const teamIdObj = new mongoose.Types.ObjectId(teamId);
      teamStates = await teamStatesCollection
        .find({ teamId: teamIdObj })
        .sort({ weekEnd: 1 })
        .limit(limit)
        .toArray();
    } catch (e) {
      // If ObjectId conversion fails, try string
      teamStates = await teamStatesCollection
        .find({ teamId: teamId })
        .sort({ weekEnd: 1 })
        .limit(limit)
        .toArray();
    }

    res.json({
      teamId,
      count: teamStates.length,
      states: teamStates,
    });

  } catch (error) {
    console.error('Error fetching team state history:', error);
    res.status(500).json({ 
      message: 'Error fetching team state history', 
      error: error.message 
    });
  }
});

/**
 * GET /api/team-state/team/:teamId/latest
 * Get the most recent team state
 */
router.get('/team/:teamId/latest', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;

    const db = mongoose.connection.db;
    const teamStatesCollection = db.collection('teamstates');

    let teamState = null;
    
    try {
      const teamIdObj = new mongoose.Types.ObjectId(teamId);
      teamState = await teamStatesCollection
        .findOne({ teamId: teamIdObj }, { sort: { weekEnd: -1 } });
    } catch (e) {
      teamState = await teamStatesCollection
        .findOne({ teamId: teamId }, { sort: { weekEnd: -1 } });
    }

    if (!teamState) {
      return res.status(404).json({ message: 'No team state found' });
    }

    res.json(teamState);

  } catch (error) {
    console.error('Error fetching latest team state:', error);
    res.status(500).json({ 
      message: 'Error fetching team state', 
      error: error.message 
    });
  }
});

/**
 * GET /api/team-state/org/:orgId/summary
 * Get summary of all teams' states for an organization
 */
router.get('/org/:orgId/summary', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;

    const db = mongoose.connection.db;
    const teamsCollection = db.collection('teams');
    const teamStatesCollection = db.collection('teamstates');

    // Get all teams for this org
    let teams = [];
    try {
      const orgIdObj = new mongoose.Types.ObjectId(orgId);
      teams = await teamsCollection.find({ orgId: orgIdObj }).toArray();
    } catch (e) {
      teams = await teamsCollection.find({ orgId: orgId }).toArray();
    }

    // Get latest state for each team
    const summary = await Promise.all(teams.map(async (team) => {
      const latestState = await teamStatesCollection
        .findOne({ teamId: team._id }, { sort: { weekEnd: -1 } });
      
      return {
        teamId: team._id,
        teamName: team.name,
        hasData: !!latestState,
        bdi: latestState?.bdi || null,
        zone: latestState?.zone || null,
        lastUpdated: latestState?.weekEnd || null,
      };
    }));

    res.json({
      orgId,
      teamCount: teams.length,
      teamsWithData: summary.filter(t => t.hasData).length,
      teams: summary,
    });

  } catch (error) {
    console.error('Error fetching org summary:', error);
    res.status(500).json({ 
      message: 'Error fetching organization summary', 
      error: error.message 
    });
  }
});

export default router;
