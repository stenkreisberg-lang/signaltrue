import express from 'express';
import { refreshAllTeamsFromSlack, analyzeChannel } from '../services/slackService.js';
import Team from '../models/team.js';
import { requireHROrAdmin, requireMasterAdmin, isMasterAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(requireHROrAdmin);

// Manual trigger for Slack data refresh
router.post('/slack/refresh', requireMasterAdmin, async (req, res) => {
  try {
    const result = await refreshAllTeamsFromSlack();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Analyze a specific channel and return data without saving
router.post('/slack/analyze/:channelId', requireMasterAdmin, async (req, res) => {
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
    const filter = { _id: req.params.id };
    if (!isMasterAdmin(req.user)) filter.orgId = req.user.orgId;
    const team = await Team.findOne(filter);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.slackChannelId = channelId;
    await team.save();
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
