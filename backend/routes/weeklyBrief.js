import express from 'express';
import { sendWeeklyBrief, generateWeeklyBrief } from '../services/weeklyBriefService.js';
import Organization from '../models/organization.js';

const router = express.Router();

// POST /api/weekly-brief/:orgId/send — trigger manual send
router.post('/:orgId/send', async (req, res) => {
  try {
    await sendWeeklyBrief(req.params.orgId);
    res.json({ message: 'Weekly HR brief sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/weekly-brief/:orgId/preview — preview the email content
router.get('/:orgId/preview', async (req, res) => {
  try {
    const html = await generateWeeklyBrief(req.params.orgId);
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
