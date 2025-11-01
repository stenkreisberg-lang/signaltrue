import express from 'express';
import { refreshAllTeamsFromSlack, analyzeChannel } from '../services/slackService.js';
import Team from '../models/team.js';

const router = express.Router();

// Manual trigger for Slack data refresh
router.post('/slack/refresh', async (req, res) => {
  try {
    const result = await refreshAllTeamsFromSlack();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Analyze a specific channel and return data without saving
router.post('/slack/analyze/:channelId', async (req, res) => {
  try {
    const data = await analyzeChannel(req.params.channelId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Set a team's Slack channel ID
router.put('/teams/:id/slack-channel', async (req, res) => {
  try {
    const { channelId } = req.body;
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.slackChannelId = channelId;
    await team.save();
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
