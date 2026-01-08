import express from 'express';
import { refreshAllTeamsFromGoogleChat, analyzeSpace, listSpaces } from '../services/googleChatService.js';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import { decryptString } from '../utils/crypto.js';

const router = express.Router();

// Manual trigger for Google Chat data refresh
router.post('/google-chat/refresh', async (req, res) => {
  try {
    const result = await refreshAllTeamsFromGoogleChat();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// List all available spaces for an organization
router.get('/google-chat/spaces/:orgId', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    
    if (!org.integrations?.googleChat?.accessToken) {
      return res.status(400).json({ message: 'Google Chat not connected for this organization' });
    }
    
    const accessToken = decryptString(org.integrations.googleChat.accessToken);
    const spaces = await listSpaces(accessToken);
    
    res.json({ spaces });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Analyze a specific Google Chat space and return data without saving
router.post('/google-chat/analyze/:spaceId', async (req, res) => {
  try {
    const { orgId } = req.body;
    
    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }
    
    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    
    if (!org.integrations?.googleChat?.accessToken) {
      return res.status(400).json({ message: 'Google Chat not connected for this organization' });
    }
    
    const accessToken = decryptString(org.integrations.googleChat.accessToken);
    const data = await analyzeSpace(accessToken, req.params.spaceId);
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set a team's Google Chat space ID
router.put('/teams/:id/google-chat-space', async (req, res) => {
  try {
    const { spaceId } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    
    team.googleChatSpaceId = spaceId;
    await team.save();
    
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
