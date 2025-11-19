import express from 'express';
import { getRecommendation } from '../services/playbookService.js';

const router = express.Router();


// GET /api/playbook/:metric/:direction — get recommendation for a metric and direction
router.get('/:metric/:direction', (req, res) => {
  try {
    const { metric, direction } = req.params;
    const recommendation = getRecommendation(metric, direction);
    res.json({ recommendation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
