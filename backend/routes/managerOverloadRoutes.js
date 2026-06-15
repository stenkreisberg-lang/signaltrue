/**
 * Manager Overload Routes — the pivoted brief API.
 *
 * GET  /api/manager-overload/summary/:orgId           — flattening + manager list
 * GET  /api/manager-overload/brief/:orgId             — full assembled pivoted brief
 * POST /api/manager-overload/run                       — admin: run the weekly job
 *
 * All routes require auth + org access (tenant isolation). See
 * docs/PIVOT_REPORT_SPEC.md §4.
 */

import express from 'express';
import { authenticateToken, requireOrganizationAccess, canAccessOrg } from '../middleware/auth.js';
import ManagerWeekly from '../models/managerWeekly.js';
import { computeFlatteningSignal } from '../services/flatteningService.js';
import { assembleBrief } from '../services/managerOverloadReportService.js';
import { runManagerOverloadForOrg } from '../services/managerOverloadService.js';
import { buildCommunicationGraph } from '../services/communicationGraphService.js';

const router = express.Router();
router.use(authenticateToken);

function latestMonday(d = new Date()) {
  const dt = new Date(d);
  const day = dt.getUTCDay(); // 0 Sun..6 Sat
  const diff = (day + 6) % 7; // days since Monday
  dt.setUTCDate(dt.getUTCDate() - diff);
  return dt.toISOString().slice(0, 10);
}

// ── GET /summary/:orgId ──────────────────────────────────────────────────────
router.get('/summary/:orgId', requireOrganizationAccess(), async (req, res) => {
  try {
    const { orgId } = req.params;
    const weekStart = req.query.weekStart || latestMonday();
    const [flattening, managers] = await Promise.all([
      computeFlatteningSignal(orgId, weekStart),
      ManagerWeekly.find({ orgId, weekStart, suppressed: { $ne: true } })
        .sort({ spanOverloadIndex: -1 })
        .lean(),
    ]);
    res.json({ weekStart, flattening, managers });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /brief/:orgId ────────────────────────────────────────────────────────
router.get('/brief/:orgId', requireOrganizationAccess(), async (req, res) => {
  try {
    const { orgId } = req.params;
    const weekStart = req.query.weekStart || latestMonday();
    const brief = await assembleBrief(orgId, weekStart);
    res.json(brief);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /run ────────────────────────────────────────────────────────────────
router.post('/run', async (req, res) => {
  try {
    const { orgId, weekStart } = req.body || {};
    if (!orgId) return res.status(400).json({ error: true, message: 'orgId required' });
    // Tenant isolation: caller must belong to org (master admin bypass in canAccessOrg)
    if (!canAccessOrg(req.user, orgId)) {
      return res.status(403).json({ error: true, message: 'Forbidden' });
    }
    const week = weekStart || latestMonday();
    const graph = await buildCommunicationGraph(orgId, week);
    const result = await runManagerOverloadForOrg(orgId, week, { graph });
    res.json({ weekStart: week, ...result });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
