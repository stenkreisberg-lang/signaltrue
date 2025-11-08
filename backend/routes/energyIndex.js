import express from 'express';
import TeamEnergyIndex from '../models/teamEnergyIndex.js';

const router = express.Router();

// GET /api/energy-index/:teamId
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const data = await TeamEnergyIndex.find({ teamId }).sort({ week: -1 }).limit(12);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
