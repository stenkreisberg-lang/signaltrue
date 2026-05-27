import express from 'express';
import Team from '../models/team.js';
import {
  getHistoryRange,
  calculateTrend,
  setBaseline,
  compareToBaseline,
  createSnapshot,
} from '../utils/bdiHistory.js';
import { authenticateToken, isMasterAdmin } from '../middleware/auth.js';
import { requireTier, attachTierLimits } from '../middleware/checkTier.js';

const router = express.Router();

async function findAccessibleTeam(req, teamId) {
  const filter = { _id: teamId };
  if (!isMasterAdmin(req.user)) filter.orgId = req.user.orgId;
  return Team.findOne(filter);
}

// GET /api/teams/:id/history?days=30
// REQUIRES: Detection tier (30 days) or Impact Proof tier (90 days)
router.get('/teams/:id/history', authenticateToken, attachTierLimits, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    // Enforce tier limits
    const maxDays = req.tierLimits.historyDays;
    const limitedDays = Math.min(days, maxDays);

    if (days > maxDays) {
      console.log(
        `[History] User requested ${days} days but tier ${req.currentTier} allows ${maxDays}`
      );
    }

    const team = await findAccessibleTeam(req, req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const history = getHistoryRange(team, limitedDays);
    res.json({
      history,
      tierLimit: maxDays,
      requestedDays: days,
      returnedDays: limitedDays,
      upgrade: days > maxDays,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teams/:id/trend?days=7
router.get('/teams/:id/trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const team = await findAccessibleTeam(req, req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const trend = calculateTrend(team, startDate);

    if (!trend) {
      return res.json({ message: 'Not enough history data', days });
    }

    res.json(trend);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/teams/:id/baseline
router.post('/teams/:id/baseline', async (req, res) => {
  try {
    if (!(await findAccessibleTeam(req, req.params.id)))
      return res.status(404).json({ message: 'Team not found' });
    const { bdi, date } = req.body;
    const baseline = await setBaseline(req.params.id, bdi, date ? new Date(date) : null);
    res.json(baseline);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teams/:id/baseline-comparison
router.get('/teams/:id/baseline-comparison', async (req, res) => {
  try {
    const team = await findAccessibleTeam(req, req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    const comparison = compareToBaseline(team);
    if (!comparison) {
      return res.status(404).json({ message: 'No baseline set for this team' });
    }

    res.json(comparison);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/teams/:id/snapshot
router.post('/teams/:id/snapshot', async (req, res) => {
  try {
    if (!(await findAccessibleTeam(req, req.params.id)))
      return res.status(404).json({ message: 'Team not found' });
    const snapshot = await createSnapshot(req.params.id);
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
