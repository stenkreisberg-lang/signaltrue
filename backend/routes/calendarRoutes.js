import express from 'express';
import { refreshTeamCalendar, refreshAllTeamsCalendars } from '../services/calendarService.js';
import { getCalendarEvents } from '../services/googleCalendarService.js';
import { authenticateToken, requireApiKey, requireHROrAdmin } from '../middleware/auth.js';
import Team from '../models/team.js';

const router = express.Router();

/**
 * GET /api/calendar/events
 * Get calendar events for the authenticated user
 */
router.get('/calendar/events', authenticateToken, async (req, res) => {
  try {
    const events = await getCalendarEvents(req.user.userId);
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/calendar/refresh/:id
 * Manually refresh calendar data for a specific team
 */
router.post('/calendar/refresh/:id', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const accessibleTeam = await Team.exists({ _id: req.params.id, orgId: req.user.orgId });
    if (!accessibleTeam && !(req.user.role === 'master_admin' && req.user.isMasterAdmin === true)) {
      return res.status(404).json({ message: 'Team not found' });
    }
    const team = await refreshTeamCalendar(req.params.id);
    res.json({
      message: 'Calendar data refreshed successfully',
      team: {
        name: team.name,
        bdi: team.bdi,
        calendarSignals: team.calendarSignals,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/calendar/refresh-all
 * Manually refresh calendar data for all teams
 */
router.post('/calendar/refresh-all', requireApiKey, async (req, res) => {
  try {
    await refreshAllTeamsCalendars();
    res.json({ message: 'All team calendars refreshed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
