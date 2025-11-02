import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import ProgramImpact from '../models/programImpact.js';
import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

const router = express.Router();

function startOfDayUTC(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// GET /api/programs - List all programs
router.get('/programs', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const programs = await ProgramImpact.find({ orgId }).sort({ startDate: -1 }).populate('teams', 'name');
    res.json(programs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/programs - Create a new program
router.post('/programs', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const { name, description, startDate, endDate, teams } = req.body;
    if (!name || !startDate) return res.status(400).json({ message: 'Name and startDate required' });
    // Compute baseline Energy Index for selected teams
    const teamDocs = teams?.length ? await Team.find({ _id: { $in: teams }, orgId }) : [];
    const baselineEnergyIndex = teamDocs.length ? teamDocs.reduce((sum, t) => sum + (t.energyIndex || 50), 0) / teamDocs.length : null;
    const program = await ProgramImpact.create({ orgId, name, description, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null, teams, baselineEnergyIndex });
    res.json(program);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/programs/:id/close - Close program and compute impact
router.put('/programs/:id/close', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const program = await ProgramImpact.findOne({ _id: req.params.id, orgId });
    if (!program) return res.status(404).json({ message: 'Program not found' });
    program.endDate = new Date();
    // Compute post Energy Index
    const teamDocs = program.teams?.length ? await Team.find({ _id: { $in: program.teams } }) : [];
    const postEnergyIndex = teamDocs.length ? teamDocs.reduce((sum, t) => sum + (t.energyIndex || 50), 0) / teamDocs.length : null;
    program.postEnergyIndex = postEnergyIndex;
    program.energyDelta = postEnergyIndex != null && program.baselineEnergyIndex != null ? postEnergyIndex - program.baselineEnergyIndex : null;
    program.roi = program.energyDelta != null ? `Energy Index ${program.energyDelta > 0 ? '↑' : '↓'} ${Math.abs(Math.round(program.energyDelta))} points` : 'Insufficient data';
    await program.save();
    res.json(program);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
