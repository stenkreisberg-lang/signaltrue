import express from 'express';
import OneOnOne from '../models/oneOnOne.js';
import Team from '../models/team.js';
import { isMasterAdmin } from '../middleware/auth.js';

const router = express.Router();

async function canAccessTeam(req, teamId) {
  const filter = { _id: teamId };
  if (!isMasterAdmin(req.user)) filter.orgId = req.user.orgId;
  return Team.exists(filter);
}

// List 1:1s for a team or user
router.get('/', async (req, res) => {
  try {
    const { teamId, userId } = req.query;
    if (!teamId || !(await canAccessTeam(req, teamId))) {
      return res.status(403).json({ message: 'Forbidden: Team access denied' });
    }
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
    if (!(await canAccessTeam(req, teamId))) {
      return res.status(403).json({ message: 'Forbidden: Team access denied' });
    }
    const one = await OneOnOne.create({ teamId, managerId, employeeId, date, notes });
    res.json(one);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add feedback to a 1:1
router.post('/:id/feedback', async (req, res) => {
  try {
    const { text } = req.body;
    const existing = await OneOnOne.findById(req.params.id);
    if (!existing || !(await canAccessTeam(req, existing.teamId))) {
      return res.status(404).json({ message: 'One-to-one not found' });
    }
    const one = await OneOnOne.findByIdAndUpdate(
      req.params.id,
      { $push: { feedback: { authorId: req.user.userId, text } } },
      { new: true }
    );
    res.json(one);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
