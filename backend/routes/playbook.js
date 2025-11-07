import express from 'express';
import { generatePlaybook } from '../services/playbookService.js';

const router = express.Router();

// GET /api/playbook/:teamId — get AI playbook for a team
router.get('/:teamId', async (req, res) => {
  try {
    const playbook = await generatePlaybook(req.params.teamId);
    res.json(playbook);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
