import express from 'express';
import Organization from '../models/organization.js';
import Team from '../models/team.js';

const router = express.Router();

// GET /api/benchmarks/industry?industry=SaaS&size=1-10
// Returns BDI and driver medians, percentiles for given industry/size
router.get('/industry', async (req, res) => {
  try {
    const { industry, size } = req.query;
    if (!industry) return res.status(400).json({ message: 'Industry required' });
    // Find all teams in orgs matching industry/size
    const orgs = await Organization.find({ industry });
    const orgIds = orgs.map(o => o._id);
    const teams = await Team.find({ orgId: { $in: orgIds } });
    if (!teams.length) return res.json({ bdi: null, drivers: {}, count: 0 });
    // Aggregate BDI and drivers
    const bdis = teams.map(t => t.bdi).filter(x => typeof x === 'number');
    const drivers = {};
    teams.forEach(t => {
      if (t.driverWeights) {
        Object.entries(t.driverWeights).forEach(([k, v]) => {
          if (!drivers[k]) drivers[k] = [];
          drivers[k].push(v);
        });
      }
    });
    // Compute medians
    const median = arr => {
      if (!arr.length) return null;
      const sorted = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const bdiMedian = median(bdis);
    const driverMedians = {};
    Object.entries(drivers).forEach(([k, arr]) => {
      driverMedians[k] = median(arr);
    });
    // Percentile for BDI
    const percentile = val => {
      if (!bdis.length) return null;
      return Math.round(100 * bdis.filter(x => x <= val).length / bdis.length);
    };
    res.json({
      bdiMedian,
      driverMedians,
      count: teams.length,
      percentiles: bdis.length ? { bdi: percentile } : {}
    });
  } catch (err) {
    console.error('Industry benchmark error', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/benchmarks/internal/:teamId
// Returns 3-month, 12-month moving averages and velocity for a team
router.get('/internal/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team || !team.bdiHistory) return res.status(404).json({ message: 'Team or history not found' });
    // Assume bdiHistory is [{ bdi, date }, ...] sorted desc
    const now = new Date();
    const monthsAgo = (n) => new Date(now.getFullYear(), now.getMonth() - n, now.getDate());
    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const bdi3m = avg(team.bdiHistory.filter(h => new Date(h.date) >= monthsAgo(3)).map(h => h.bdi));
    const bdi12m = avg(team.bdiHistory.filter(h => new Date(h.date) >= monthsAgo(12)).map(h => h.bdi));
    // Velocity: difference between last 4 weeks and previous 4 weeks
    const last4 = team.bdiHistory.slice(0, 4).map(h => h.bdi);
    const prev4 = team.bdiHistory.slice(4, 8).map(h => h.bdi);
    const velocity = last4.length && prev4.length ? avg(last4) - avg(prev4) : null;
    res.json({ bdi3m, bdi12m, velocity });
  } catch (err) {
    console.error('Internal benchmark error', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
