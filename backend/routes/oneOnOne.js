import express from 'express';
import OneOnOne from '../models/oneOnOne.js';

const router = express.Router();

// List 1:1s for a team or user
router.get('/', async (req, res) => {
  try {
    const { teamId, userId } = req.query;
    let query = {};
    if (teamId) query.teamId = teamId;
    if (userId) query.$or = [{ managerId: userId }, { employeeId: userId }];
    const list = await OneOnOne.find(query).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new 1:1
router.post('/', async (req, res) => {
  try {
    const { teamId, managerId, employeeId, date, notes } = req.body;
    const one = await OneOnOne.create({ teamId, managerId, employeeId, date, notes });
    res.json(one);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add feedback to a 1:1
router.post('/:id/feedback', async (req, res) => {
  try {
    const { authorId, text } = req.body;
    const one = await OneOnOne.findByIdAndUpdate(
      req.params.id,
      { $push: { feedback: { authorId, text } } },
      { new: true }
    );
    res.json(one);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
