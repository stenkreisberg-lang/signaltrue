import express from 'express';
import { sendWeeklySummaries, generateWeeklySummary } from '../services/notificationService.js';
import Team from '../models/team.js';

const router = express.Router();

/**
 * POST /api/notifications/weekly
 * Manually trigger weekly summaries for all teams
 */
router.post('/notifications/weekly', async (req, res) => {
  try {
    // Optional API key protection
    const apiKey = req.headers['x-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { includeSlack = true, includeEmail = true } = req.body;
    await sendWeeklySummaries({ includeSlack, includeEmail });
    
    res.json({ message: 'Weekly summaries sent successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/notifications/preview/:id
 * Preview AI-generated summary for a specific team
 */
router.get('/notifications/preview/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const summary = await generateWeeklySummary(team);
    
    res.json({
      teamName: team.name,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
