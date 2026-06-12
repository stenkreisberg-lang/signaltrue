/**
 * Internal Scoring Routes
 *
 * These routes are service-internal — not exposed to public clients.
 * Protected by a service token (X-Service-Token header) in addition to
 * optional JWT auth for admin callers.
 *
 * POST /internal/scoring/run/:teamId          – Full scoring for one team
 * POST /internal/scoring/run-org/:orgId       – Full scoring for all teams in org
 * POST /internal/scoring/bdi/:teamId          – BDI only
 * POST /internal/scoring/risks/:teamId        – Risk scores only
 * POST /internal/scoring/composite/:teamId    – Composite drift only
 * GET  /internal/scoring/status/:teamId       – Last run status + output summary
 */

import express from 'express';
import crypto from 'node:crypto';
import {
  runFullScoring,
  runBDI,
  runRiskScores,
  runCompositeDrift,
  runOrgScoring,
} from '../services/scoringEngineService.js';
import ScoringAuditLog from '../models/scoringAuditLog.js';

const router = express.Router();

// ── Service token auth ────────────────────────────────────────────────────────

function requireServiceToken(req, res, next) {
  const token = req.headers['x-service-token'];
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!expectedToken) {
    return res.status(503).json({
      error: true,
      message: 'Internal scoring routes are disabled: INTERNAL_SERVICE_TOKEN not configured.',
      code: 'SERVICE_NOT_CONFIGURED',
    });
  }

  const provided = Buffer.from(String(token || ''), 'utf8');
  const expected = Buffer.from(expectedToken, 'utf8');
  const tokenMatches =
    provided.length === expected.length && crypto.timingSafeEqual(provided, expected);

  if (!tokenMatches) {
    return res
      .status(401)
      .json({ error: true, message: 'Invalid service token', code: 'UNAUTHORIZED' });
  }
  return next();
}

// ── Helper: resolve weekStart ──────────────────────────────────────────────────

function resolveWeekStart(body) {
  if (body?.weekStart) return new Date(body.weekStart);
  // Default: most recent Monday 00:00 UTC
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff)
  );
  return monday;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// Full scoring for one team
router.post('/run/:teamId', requireServiceToken, async (req, res) => {
  try {
    const weekStart = resolveWeekStart(req.body);
    const trigger = req.body?.trigger ?? 'manual';
    const result = await runFullScoring(req.params.teamId, weekStart, trigger);
    return res.json({ data: result });
  } catch (err) {
    console.error('[/internal/scoring/run]', err.message);
    return res
      .status(500)
      .json({ error: true, message: err.message, code: err.code ?? 'SCORING_ERROR' });
  }
});

// Full scoring for all teams in org
router.post('/run-org/:orgId', requireServiceToken, async (req, res) => {
  try {
    const weekStart = resolveWeekStart(req.body);
    const trigger = req.body?.trigger ?? 'manual';
    const results = await runOrgScoring(req.params.orgId, weekStart, trigger);
    return res.json({ data: results, meta: { count: results.length } });
  } catch (err) {
    console.error('[/internal/scoring/run-org]', err.message);
    return res
      .status(500)
      .json({ error: true, message: err.message, code: err.code ?? 'SCORING_ERROR' });
  }
});

// BDI only
router.post('/bdi/:teamId', requireServiceToken, async (req, res) => {
  try {
    const weekStart = resolveWeekStart(req.body);
    const result = await runBDI(req.params.teamId, weekStart, req.body?.trigger ?? 'manual');
    return res.json({ data: result });
  } catch (err) {
    console.error('[/internal/scoring/bdi]', err.message);
    return res
      .status(500)
      .json({ error: true, message: err.message, code: err.code ?? 'SCORING_ERROR' });
  }
});

// Risk scores only
router.post('/risks/:teamId', requireServiceToken, async (req, res) => {
  try {
    const weekStart = resolveWeekStart(req.body);
    const result = await runRiskScores(req.params.teamId, weekStart, req.body?.trigger ?? 'manual');
    return res.json({ data: result });
  } catch (err) {
    console.error('[/internal/scoring/risks]', err.message);
    return res
      .status(500)
      .json({ error: true, message: err.message, code: err.code ?? 'SCORING_ERROR' });
  }
});

// Composite drift only
router.post('/composite/:teamId', requireServiceToken, async (req, res) => {
  try {
    const weekStart = resolveWeekStart(req.body);
    const result = await runCompositeDrift(
      req.params.teamId,
      weekStart,
      req.body?.trigger ?? 'manual'
    );
    return res.json({ data: result });
  } catch (err) {
    console.error('[/internal/scoring/composite]', err.message);
    return res
      .status(500)
      .json({ error: true, message: err.message, code: err.code ?? 'SCORING_ERROR' });
  }
});

// Last run status for a team
router.get('/status/:teamId', requireServiceToken, async (req, res) => {
  try {
    const lastRun = await ScoringAuditLog.findOne({ teamId: req.params.teamId })
      .sort({ runAt: -1 })
      .lean();

    if (!lastRun) {
      return res
        .status(404)
        .json({ error: true, message: 'No scoring runs found for this team.', code: 'NOT_FOUND' });
    }

    return res.json({
      data: {
        teamId: lastRun.teamId,
        runAt: lastRun.runAt,
        trigger: lastRun.trigger,
        scoreType: lastRun.scoreType,
        scoringVersion: lastRun.scoringVersion,
        privacySuppressed: lastRun.privacySuppressed,
        outputSnapshot: lastRun.outputSnapshot,
        durationMs: lastRun.durationMs,
        error: lastRun.error,
      },
    });
  } catch (err) {
    console.error('[/internal/scoring/status]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

export default router;
