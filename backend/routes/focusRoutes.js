import express from 'express';
import Team from '../models/team.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/focus/team/:teamId
// Returns focus-to-meeting ratio and trends
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const { calendarSignals, bdiHistory } = team;
    const focusHours = calendarSignals.focusHoursWeek || 0;
    const meetingHours = calendarSignals.meetingHoursWeek || 0;
    const ratio = meetingHours > 0 ? focusHours / meetingHours : null;

    // Compute historical trend (last 12 weeks)
    const historicalRatios = bdiHistory
      .filter(h => h.calendarSignals?.meetingHoursWeek && h.calendarSignals?.focusHoursWeek)
      .slice(0, 12)
      .map(h => ({
        date: h.timestamp,
        ratio: h.calendarSignals.focusHoursWeek / h.calendarSignals.meetingHoursWeek
      }));

    res.json({
      teamName: team.name,
      current: {
        focusHours,
        meetingHours,
        ratio: ratio ? ratio.toFixed(2) : null
      },
      historical: historicalRatios,
      recommendation: ratio < 1 ? 'Consider adding focus blocks to balance meeting load' : 'Good focus-to-meeting balance'
    });
  } catch (err) {
    console.error('Focus ratio error', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/focus/org/:orgId
// Returns aggregate focus-to-meeting ratio for all teams in org
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const teams = await Team.find({ orgId });
    if (!teams.length) return res.json({ teams: [], avgRatio: null });

    const teamRatios = teams.map(t => {
      const focusHours = t.calendarSignals.focusHoursWeek || 0;
      const meetingHours = t.calendarSignals.meetingHoursWeek || 0;
      const ratio = meetingHours > 0 ? focusHours / meetingHours : null;
      return {
        teamId: t._id,
        teamName: t.name,
        focusHours,
        meetingHours,
        ratio: ratio ? parseFloat(ratio.toFixed(2)) : null
      };
    });

    const validRatios = teamRatios.filter(t => t.ratio !== null).map(t => t.ratio);
    const avgRatio = validRatios.length ? (validRatios.reduce((a, b) => a + b, 0) / validRatios.length).toFixed(2) : null;

    res.json({ teams: teamRatios, avgRatio: parseFloat(avgRatio) });
  } catch (err) {
    console.error('Org focus ratio error', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
