import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const DCR_UNAVAILABLE = Object.freeze({
  error: 'DECISION_CLOSURE_RATE_UNAVAILABLE',
  message:
    'Decision Closure Rate is disabled until calendar and collaboration decision events are fully supported and validated.',
  available: false,
});

// DCR previously returned results from incomplete calendar/Slack parsers. Keep
// the authenticated endpoint stable, but fail explicitly instead of publishing
// a metric that cannot yet be supported by the connected data.
router.use(authenticateToken);
router.use((_req, res) => res.status(410).json(DCR_UNAVAILABLE));

export default router;
