import express from 'express';
import CommHygieneScore from '../models/commHygieneScore.js';

const router = express.Router();

// GET /api/comm-hygiene/:teamId
router.get('/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const data = await CommHygieneScore.find({ teamId }).sort({ week: -1 }).limit(12);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
