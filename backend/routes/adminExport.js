import express from 'express';
import User from '../models/user.js';
import Team from '../models/team.js';
import { Parser } from 'json2csv';
import { authenticateToken, requireMasterAdmin } from '../middleware/auth.js';

const router = express.Router();

// List all users (admin only)
router.get('/users', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const users = await User.find({}).select('-password -resetPasswordToken -resetPasswordExpires');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export users as CSV
router.get('/users/export', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const users = await User.find({})
      .select('email name firstName lastName role orgId teamId createdAt updatedAt')
      .lean();
    const parser = new Parser();
    const csv = parser.parse(users);
    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export teams as CSV
router.get('/teams/export', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const teams = await Team.find({});
    const parser = new Parser();
    const csv = parser.parse(teams.map((t) => t.toObject()));
    res.header('Content-Type', 'text/csv');
    res.attachment('teams.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
