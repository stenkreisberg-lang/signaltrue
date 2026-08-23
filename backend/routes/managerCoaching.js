import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const unavailable = (_req, res) =>
  res.status(410).json({
    available: false,
    code: 'MANAGER_COACHING_UNAVAILABLE',
    message:
      'Manager coaching is unavailable until calendar, one-to-one, and sentiment measurements are connected.',
  });

router.use(authenticateToken, unavailable);

export default router;
