import express from 'express';
import { refreshTeamCalendar, refreshAllTeamsCalendars } from '../services/calendarService.js';

const router = express.Router();

/**
 * POST /api/calendar/refresh/:id
 * Manually refresh calendar data for a specific team
 */
router.post('/calendar/refresh/:id', async (req, res) => {
  try {
    const team = await refreshTeamCalendar(req.params.id);
    res.json({
      message: 'Calendar data refreshed successfully',
      team: {
        name: team.name,
        bdi: team.bdi,
        calendarSignals: team.calendarSignals
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/calendar/refresh-all
 * Manually refresh calendar data for all teams
 */
router.post('/calendar/refresh-all', async (req, res) => {
  try {
    // Optional API key protection
    const apiKey = req.headers['x-api-key'];
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await refreshAllTeamsCalendars();
    res.json({ message: 'All team calendars refreshed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
