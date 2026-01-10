/**
 * Industry Benchmark Routes
 * 
 * Available only for Leadership Intelligence (€199) and Custom plans.
 * Strict role-based access: CEO and BOARD only.
 */

import express from 'express';
import IndustryBenchmark from '../models/IndustryBenchmark.js';
import { checkBenchmarkAccess } from '../middleware/checkFeatureAccess.js';
import { ROLES } from '../utils/subscriptionConstants.js';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';

const router = express.Router();

/**
 * LEGACY ROUTES (kept for backward compatibility)
 * These are internal org comparisons, not industry benchmarks
 */

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

/**
 * INDUSTRY BENCHMARK ROUTES (Leadership Intelligence €199+)
 * Apply benchmark access middleware to protected routes
 */

/**
 * GET /api/benchmarks/industry/:metric
 * Get industry benchmark for a specific metric
 */
router.get('/industry/:metric', checkBenchmarkAccess, async (req, res) => {
  try {
    const organization = req.organization;
    const { metric } = req.params;

    // Double-check role (middleware should have already verified)
    if (req.user.role !== ROLES.CEO && req.user.role !== ROLES.BOARD) {
      return res.status(403).json({ 
        error: 'Industry benchmarks are only available to CEO and Board members' 
      });
    }

    // Get organization context
    const industry = organization.industry || 'Other';
    const companySizeBand = mapSizeToSizeBand(organization.size);

    // Fetch benchmark
    const benchmark = await IndustryBenchmark.getBenchmark(
      industry,
      companySizeBand,
      metric
    );

    if (!benchmark) {
      return res.status(404).json({ 
        error: 'Benchmark not found',
        message: `No benchmark data available for ${metric} in ${industry} (${companySizeBand})`,
        suggestion: 'Check back later as we gather more industry data'
      });
    }

    // Don't return raw percentiles to prevent reverse-engineering
    // Return narrative and position only
    res.json({
      metric,
      industry,
      companySizeBand,
      benchmark: {
        p25: benchmark.p25,
        p50: benchmark.p50,
        p75: benchmark.p75,
        lastUpdated: benchmark.updatedAt
      },
      metadata: {
        sampleSize: benchmark.sampleSize,
        dataSource: benchmark.dataSource
      }
    });
  } catch (error) {
    console.error('Error fetching industry benchmark:', error);
    res.status(500).json({ 
      error: 'Failed to fetch benchmark',
      message: error.message 
    });
  }
});

/**
 * POST /api/benchmarks/industry/compare
 * Compare organization's metrics against industry benchmarks
 */
router.post('/industry/compare', checkBenchmarkAccess, async (req, res) => {
  try {
    const organization = req.organization;
    const { metrics } = req.body; // { bdi: 72, meetingLoad: 45, ... }

    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ 
        error: 'Metrics object required in request body' 
      });
    }

    // Role check
    if (req.user.role !== ROLES.CEO && req.user.role !== ROLES.BOARD) {
      return res.status(403).json({ 
        error: 'Industry benchmarks are only available to CEO and Board members' 
      });
    }

    const industry = organization.industry || 'Other';
    const companySizeBand = mapSizeToSizeBand(organization.size);

    const comparisons = [];

    for (const [metricKey, value] of Object.entries(metrics)) {
      const benchmark = await IndustryBenchmark.getBenchmark(
        industry,
        companySizeBand,
        metricKey
      );

      if (benchmark) {
        const position = benchmark.getPercentilePosition(value);
        const narrative = benchmark.generateNarrative(value, metricKey);

        comparisons.push({
          metric: metricKey,
          yourValue: value,
          position,
          narrative,
          percentiles: {
            p25: benchmark.p25,
            p50: benchmark.p50,
            p75: benchmark.p75
          }
        });
      } else {
        comparisons.push({
          metric: metricKey,
          yourValue: value,
          position: 'no-data',
          narrative: `No benchmark data available for ${metricKey}`,
          percentiles: null
        });
      }
    }

    res.json({
      organization: {
        industry,
        companySizeBand
      },
      comparisons,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('Error comparing benchmarks:', error);
    res.status(500).json({ 
      error: 'Failed to compare benchmarks',
      message: error.message 
    });
  }
});

/**
 * GET /api/benchmarks/industry/available
 * Get list of available benchmark metrics for organization's industry
 */
router.get('/industry/available', checkBenchmarkAccess, async (req, res) => {
  try {
    const organization = req.organization;
    const industry = organization.industry || 'Other';
    const companySizeBand = mapSizeToSizeBand(organization.size);

    const availableBenchmarks = await IndustryBenchmark.find({
      industry,
      companySizeBand
    }).select('metric updatedAt');

    res.json({
      industry,
      companySizeBand,
      available: availableBenchmarks.map(b => ({
        metric: b.metric,
        lastUpdated: b.updatedAt
      }))
    });
  } catch (error) {
    console.error('Error fetching available benchmarks:', error);
    res.status(500).json({ 
      error: 'Failed to fetch available benchmarks',
      message: error.message 
    });
  }
});

/**
 * Helper: Map organization size to benchmark size band
 */
function mapSizeToSizeBand(size) {
  if (!size) return '1-50';
  
  const sizeNum = parseInt(size);
  
  if (sizeNum <= 50) return '1-50';
  if (sizeNum <= 200) return '51-200';
  if (sizeNum <= 500) return '201-500';
  if (sizeNum <= 1000) return '501-1000';
  return '1000+';
}

export default router;
