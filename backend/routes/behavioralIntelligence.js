import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use((_req, res) => {
  res.status(410).json({
    error: 'LEGACY_BEHAVIORAL_INTELLIGENCE_UNAVAILABLE',
    available: false,
    message:
      'Legacy behavioral intelligence is paused pending independent validation. Use team-level observed metrics and descriptive work-pattern models instead.',
  });
});

export default router;
