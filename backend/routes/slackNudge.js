import express from 'express';
import {
  createSlackNudge,
  getSlackNudges,
  updateSlackNudge,
  deleteSlackNudge
} from '../services/slackNudgeService.js';

const router = express.Router();

router.get('/:orgId', async (req, res) => {
  try {
    const nudges = await getSlackNudges(req.params.orgId);
    res.json(nudges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const nudge = await createSlackNudge(req.body);
    res.status(201).json(nudge);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await updateSlackNudge(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await deleteSlackNudge(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
