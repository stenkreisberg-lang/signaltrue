import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import TimelineEvent from '../models/timelineEvent.js';

const router = express.Router();

// GET /api/timeline - Get timeline events
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const { teamId, startDate, endDate } = req.query;
    const filter = { orgId };
    if (teamId) filter.teamId = teamId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const events = await TimelineEvent.find(filter).sort({ date: -1 });
    res.json(events);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/timeline - Create timeline event
router.post('/timeline', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const { teamId, date, label, description, category } = req.body;
    if (!date || !label) return res.status(400).json({ message: 'Date and label required' });
    const event = await TimelineEvent.create({ orgId, teamId: teamId || null, date: new Date(date), label, description, category });
    res.json(event);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/timeline/:id - Delete timeline event
router.delete('/timeline/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const event = await TimelineEvent.findOne({ _id: req.params.id, orgId });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await event.deleteOne();
    res.json({ message: 'Event deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
