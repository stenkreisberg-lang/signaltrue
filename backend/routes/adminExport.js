import express from 'express';
import User from '../models/user.js';
import Organization from '../models/organization.js';
import Team from '../models/team.js';
import { Parser } from 'json2csv';

const router = express.Router();

// List all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export users as CSV
router.get('/users/export', async (req, res) => {
  try {
    const users = await User.find({});
    const parser = new Parser();
    const csv = parser.parse(users.map(u => u.toObject()));
    res.header('Content-Type', 'text/csv');
    res.attachment('users.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export teams as CSV
router.get('/teams/export', async (req, res) => {
  try {
    const teams = await Team.find({});
    const parser = new Parser();
    const csv = parser.parse(teams.map(t => t.toObject()));
    res.header('Content-Type', 'text/csv');
    res.attachment('teams.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
