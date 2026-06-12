/**
 * Engagement Strain Routes
 *
 * 5 API endpoints for the Engagement Strain Risk system.
 *
 * All routes require authentication (authenticateToken middleware).
 * All routes enforce team-size privacy (8-person minimum) before returning data.
 *
 * ─── Endpoints ────────────────────────────────────────────────────────────────
 *
 * GET  /api/engagement-strain/summary/:orgId
 *   Returns the latest EngagementStrainWeekly record for every team in the org.
 *   Useful for the executive dashboard tile.
 *
 * GET  /api/engagement-strain/team/:teamId
 *   Returns the most recent full EngagementStrainWeekly document for a team,
 *   including subscores, top drivers, patterns, and recommended actions.
 *
 * GET  /api/engagement-strain/team/:teamId/drivers
 *   Returns the topDrivers array for the most recent week, optionally with
 *   an LLM-generated explanation if ?explain=true is provided.
 *
 * GET  /api/engagement-strain/team/:teamId/history
 *   Returns up to 12 weeks of weekly score history for trend charting.
 *   Query param: ?weeks=12 (default 12, max 26)
 *
 * POST /api/engagement-strain/report
 *   Triggers the weekly scoring job for a specific org and week.
 *   Body: { orgId, weekStart } — weekStart must be a Monday (ISO date string).
 *   Restricted to admin role.
 */

import express from 'express';
import mongoose from 'mongoose';

import {
  authenticateToken,
  requireOrganizationAccess,
  requireTeamAccess,
  isMasterAdmin,
} from '../middleware/auth.js';
import { privacyGate, privacyGateOrg } from '../middleware/privacyGate.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import Team from '../models/team.js';
import { runWeeklyEngagementStrainJob } from '../services/engagementWeeklyJobService.js';
import { sendWeeklyEngagementReport } from '../services/engagementWeeklyEmailService.js';
import { generateExplanation } from '../services/engagementExplanationService.js';
import { evaluateAlerts } from '../services/engagementAlertService.js';

const router = express.Router();

// All engagement strain routes require authentication
router.use(authenticateToken);

// ── GET /summary/:orgId ────────────────────────────────────────────────────────

router.get('/summary/:orgId', requireOrganizationAccess(), privacyGateOrg, async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ message: 'Invalid orgId' });
    }

    // Get all teams in the org
    const teams = await Team.find({ orgId }).select('_id name').lean();
    const teamIds = teams.map((t) => t._id);

    if (!teamIds.length) {
      return res.json({ orgId, teams: [] });
    }

    // For each team, get their latest weekly record
    const latestDocs = await EngagementStrainWeekly.aggregate([
      { $match: { teamId: { $in: teamIds } } },
      { $sort: { teamId: 1, weekStart: -1 } },
      {
        $group: {
          _id: '$teamId',
          doc: { $first: '$$ROOT' },
        },
      },
      {
        $project: {
          _id: 0,
          teamId: '$_id',
          weekStart: '$doc.weekStart',
          engagementStrainRisk: '$doc.engagementStrainRisk',
          engagementConditionsScore: '$doc.engagementConditionsScore',
          riskState: '$doc.riskState',
          trend: '$doc.trend',
          confidenceScore: '$doc.confidenceScore',
          confidenceLabel: '$doc.confidenceLabel',
          activePeopleCount: '$doc.activePeopleCount',
          topDrivers: '$doc.topDrivers',
        },
      },
    ]);

    // Build a lookup map for team names
    const teamMap = Object.fromEntries(teams.map((t) => [String(t._id), t.name]));

    const result = latestDocs
      .filter((d) => !req.suppressedTeamIds.has(String(d.teamId)))
      .map((d) => ({
        ...d,
        teamName: teamMap[String(d.teamId)] ?? null,
      }));

    res.json({ orgId, teams: result });
  } catch (err) {
    console.error('[EngagementStrain] GET /summary error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /team/:teamId ──────────────────────────────────────────────────────────

router.get('/team/:teamId', requireTeamAccess(), privacyGate, async (req, res) => {
  try {
    const { teamId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: 'Invalid teamId' });
    }

    const doc = await EngagementStrainWeekly.findOne({ teamId }).sort({ weekStart: -1 }).lean();

    if (!doc) {
      return res.status(404).json({ message: 'No engagement strain data found for this team' });
    }
    if (!isMasterAdmin(req.user) && String(doc.orgId) !== String(req.user.orgId)) {
      return res.status(403).json({ message: 'Forbidden: Organization access denied' });
    }

    // Fetch alerts for this record (evaluated on-demand, not persisted)
    const alerts = await evaluateAlerts(doc, teamId, doc.orgId);

    res.json({ ...doc, alerts });
  } catch (err) {
    console.error('[EngagementStrain] GET /team/:teamId error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /team/:teamId/drivers ──────────────────────────────────────────────────

router.get('/team/:teamId/drivers', requireTeamAccess(), privacyGate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const withExplain = req.query.explain === 'true';

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: 'Invalid teamId' });
    }

    const doc = await EngagementStrainWeekly.findOne({ teamId }).sort({ weekStart: -1 }).lean();

    if (!doc) {
      return res.status(404).json({ message: 'No engagement strain data found for this team' });
    }
    if (!isMasterAdmin(req.user) && String(doc.orgId) !== String(req.user.orgId)) {
      return res.status(403).json({ message: 'Forbidden: Organization access denied' });
    }

    const team = await Team.findById(teamId).select('name').lean();

    let explanation = null;
    if (withExplain) {
      explanation = await generateExplanation({
        teamName: team?.name ?? 'the team',
        weekStart: doc.weekStart,
        engagementStrainRisk: doc.engagementStrainRisk,
        riskState: doc.riskState,
        trend: doc.trend,
        subscores: doc.subscores,
        topDrivers: doc.topDrivers,
        patterns: doc.patterns,
        confidenceScore: doc.confidenceScore,
        confidenceLabel: doc.confidenceLabel,
      });
    }

    res.json({
      teamId,
      teamName: team?.name ?? null,
      weekStart: doc.weekStart,
      topDrivers: doc.topDrivers ?? [],
      patterns: doc.patterns ?? [],
      explanation,
    });
  } catch (err) {
    console.error('[EngagementStrain] GET /team/:teamId/drivers error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /team/:teamId/history ──────────────────────────────────────────────────

router.get('/team/:teamId/history', requireTeamAccess(), privacyGate, async (req, res) => {
  try {
    const { teamId } = req.params;
    const weeks = Math.min(parseInt(req.query.weeks ?? '12', 10), 26);

    if (!mongoose.Types.ObjectId.isValid(teamId)) {
      return res.status(400).json({ message: 'Invalid teamId' });
    }

    const filter = { teamId };
    if (!isMasterAdmin(req.user)) filter.orgId = req.user.orgId;
    const docs = await EngagementStrainWeekly.find(filter, {
      weekStart: 1,
      engagementStrainRisk: 1,
      engagementConditionsScore: 1,
      riskState: 1,
      trend: 1,
      confidenceScore: 1,
      confidenceLabel: 1,
      subscores: 1,
      activePeopleCount: 1,
    })
      .sort({ weekStart: -1 })
      .limit(weeks)
      .lean();

    // Return oldest-first for charting
    docs.reverse();

    res.json({ teamId, weeks: docs });
  } catch (err) {
    console.error('[EngagementStrain] GET /team/:teamId/history error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /report ───────────────────────────────────────────────────────────────
// Admin-only. Triggers the full scoring job for a given org + week.

router.post('/report', requireOrganizationAccess(), async (req, res) => {
  try {
    // Only admins and superadmins may trigger manual runs
    const role = req.user?.role;
    if (!['admin', 'hr_admin', 'master_admin'].includes(role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { orgId, weekStart } = req.body;

    if (!orgId || !weekStart) {
      return res.status(400).json({ message: 'orgId and weekStart are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return res.status(400).json({ message: 'Invalid orgId' });
    }

    // Validate weekStart is a Monday
    const weekDate = new Date(weekStart + 'T00:00:00Z');
    if (isNaN(weekDate.getTime())) {
      return res.status(400).json({ message: 'weekStart must be a valid ISO date string' });
    }
    if (weekDate.getUTCDay() !== 1) {
      return res.status(400).json({ message: 'weekStart must be a Monday (ISO date)' });
    }

    // Run asynchronously — respond immediately with accepted status
    res.status(202).json({
      message: 'Engagement strain scoring job accepted',
      orgId,
      weekStart,
    });

    // Fire-and-forget — job logs its own progress, then sends email report
    runWeeklyEngagementStrainJob(orgId, weekDate)
      .then(() => sendWeeklyEngagementReport(orgId, weekDate.toISOString().slice(0, 10)))
      .catch((err) => {
        console.error('[EngagementStrain] POST /report job error:', err);
      });
  } catch (err) {
    console.error('[EngagementStrain] POST /report error:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
