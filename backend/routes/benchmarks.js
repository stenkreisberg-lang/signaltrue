import express from 'express';
import Team from '../models/team.js';
import Organization from '../models/organization.js';

const router = express.Router();

// GET /api/benchmarks/team/:teamId — get team benchmarks
router.get('/team/:teamId', async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    // Example: compare to org average
    const orgTeams = await Team.find({ orgId: team.orgId });
    const avgBdi = orgTeams.reduce((sum, t) => sum + (t.bdi || 0), 0) / (orgTeams.length || 1);
    res.json({ team: team.bdi, orgAvg: avgBdi });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/benchmarks/org/:orgId — get org peer comparisons
router.get('/org/:orgId', async (req, res) => {
  try {
    const teams = await Team.find({ orgId: req.params.orgId });
    // Return anonymized peer BDI scores
    const peers = teams.map(t => ({ bdi: t.bdi, name: t.name }));
    res.json({ peers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
