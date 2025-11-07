import express from 'express';
import DriftEvent from '../models/driftEvent.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/drift-events/:teamId
// Returns recent drift events for a team, including top 3 drivers
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const events = await DriftEvent.find({ teamId })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
