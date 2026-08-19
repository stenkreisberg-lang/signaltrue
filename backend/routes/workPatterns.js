/**
 * Work-pattern metrics, observations, pattern findings and context events
 * (spec §9–§12).
 *
 * Everything returned here is team-level and already privacy-gated. There is no
 * individual endpoint because there is no individual output.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { withHsRole, requireWriteAccess, requireHsRole } from '../middleware/hsAccess.js';
import TeamWorkPatternMetric from '../models/controlReview/teamMetric.js';
import SignalObservation from '../models/controlReview/signalObservation.js';
import PatternFinding from '../models/controlReview/patternFinding.js';
import ContextEvent from '../models/controlReview/contextEvent.js';
import WorkingSchedule from '../models/controlReview/workingSchedule.js';
import Team from '../models/team.js';
import { METRIC_LABELS, METRIC_UNITS, CONTEXT_EVENT_TYPES } from '../models/controlReview/constants.js';
import metricsService from '../services/controlReview/workPatternMetricsService.js';
import baselineService from '../services/controlReview/baselineDeviationService.js';
import patternService from '../services/controlReview/patternDetectionService.js';
import scheduleService from '../services/controlReview/workingScheduleService.js';
import { resolveMinGroupSize } from '../services/controlReview/hsPrivacyService.js';
import { recordAudit } from '../services/controlReview/auditService.js';

const router = express.Router();
router.use(authenticateToken, withHsRole);

function tenantOf(req) {
  return req.user.orgId;
}

function handle(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      res.status(400).json({ error: true, message: error.message, code: error.code });
    }
  };
}

/** Weekly metric series for a team. Suppressed periods come back valueless. */
router.get(
  '/teams/:teamId/metrics',
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const { teamId } = req.params;
    const weeks = Math.min(Number(req.query.weeks) || 12, 52);

    const rows = await TeamWorkPatternMetric.find({ tenantId, teamId })
      .sort({ periodStart: -1 })
      .limit(weeks * 6)
      .lean();

    const byMetric = {};
    for (const row of rows) {
      if (!byMetric[row.metric]) {
        byMetric[row.metric] = {
          metric: row.metric,
          label: METRIC_LABELS[row.metric],
          unit: METRIC_UNITS[row.metric],
          periods: [],
        };
      }
      byMetric[row.metric].periods.push({
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        value: row.value,
        components: row.components,
        dataQuality: row.dataQuality,
        dataCoverage: row.dataCoverage,
        suppressed: row.suppressed,
        suppressionReason: row.suppressionReason,
      });
    }

    for (const entry of Object.values(byMetric)) {
      entry.periods.reverse();
    }

    res.json({
      teamId,
      minGroupSize: await resolveMinGroupSize(tenantId),
      metrics: Object.values(byMetric),
    });
  })
);

router.get(
  '/teams/:teamId/observations',
  handle(async (req, res) => {
    const observations = await SignalObservation.find({
      tenantId: tenantOf(req),
      teamId: req.params.teamId,
    })
      .sort({ periodStart: -1 })
      .limit(120)
      .lean();

    res.json({
      observations: observations.map((o) => ({ ...o, label: METRIC_LABELS[o.metric] })),
    });
  })
);

/**
 * Recompute metrics, observations and pattern findings for a team.
 * Calculation is a system action; the request that triggered it is audited.
 */
router.post(
  '/teams/:teamId/recalculate',
  requireHsRole('HS_ADMIN', 'SYSTEM_ADMIN'),
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const { teamId } = req.params;
    const weeks = Math.min(Number(req.body.weeks) || 12, 52);

    const schedule = await scheduleService.resolveSchedule({ tenantId, teamId });
    const periods = scheduleService.weeklyPeriods({ weeks, schedule });

    await metricsService.persistTeamMetrics({ tenantId, teamId, periods });

    const findings = [];
    for (const { periodStart } of periods) {
      await baselineService.observeTeamPeriod({ tenantId, teamId, periodStart });
      const finding = await patternService.evaluateTeamPeriod({
        tenantId,
        teamId,
        periodStart,
        actor: req.user,
      });
      if (finding) findings.push(finding);
    }

    await recordAudit({
      tenantId,
      actor: req.user,
      action: 'METRICS_RECALCULATED',
      objectType: 'Team',
      objectId: teamId,
      metadata: { weeks, findings: findings.length },
      req,
    });

    res.json({ periods: periods.length, patternFindings: findings.length });
  })
);

// ── Pattern findings ─────────────────────────────────────────────────────────

router.get(
  '/pattern-findings',
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const query = { tenantId, status: req.query.status || 'REVIEW_RECOMMENDED' };

    const findings = await PatternFinding.find(query).sort({ periodStart: -1 }).limit(100).lean();
    const teams = await Team.find({ _id: { $in: findings.map((f) => f.teamId) } })
      .select('name')
      .lean();
    const nameFor = new Map(teams.map((t) => [String(t._id), t.name]));

    res.json({
      findings: findings.map((finding) => ({
        ...finding,
        teamName: nameFor.get(String(finding.teamId)) || 'Unknown team',
        signals: finding.signals.map((s) => ({ ...s, label: METRIC_LABELS[s.metric] })),
      })),
    });
  })
);

router.post(
  '/pattern-findings/:findingId/dismiss',
  requireWriteAccess,
  handle(async (req, res) => {
    const finding = await patternService.dismissFinding({
      tenantId: tenantOf(req),
      findingId: req.params.findingId,
      reason: req.body.reason,
      actor: req.user,
    });
    res.json(finding);
  })
);

// ── Context events ───────────────────────────────────────────────────────────

router.get(
  '/context-events',
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const query = { tenantId };
    if (req.query.teamId) {
      query.$or = [{ teamIds: req.query.teamId }, { teamIds: { $size: 0 } }];
    }
    const events = await ContextEvent.find(query).sort({ startDate: -1 }).limit(200).lean();
    res.json({ events, eventTypes: CONTEXT_EVENT_TYPES });
  })
);

router.post(
  '/context-events',
  requireWriteAccess,
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const event = await ContextEvent.create({
      tenantId,
      name: req.body.name,
      eventType: req.body.eventType,
      teamIds: req.body.teamIds || [],
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      notes: req.body.notes || '',
      createdBy: req.user.userId,
    });

    await recordAudit({
      tenantId,
      actor: req.user,
      action: 'CONTEXT_EVENT_RECORDED',
      objectType: 'ContextEvent',
      objectId: event._id,
      metadata: { name: event.name, eventType: event.eventType },
      req,
    });

    res.status(201).json(event);
  })
);

router.delete(
  '/context-events/:eventId',
  requireWriteAccess,
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    await ContextEvent.deleteOne({ _id: req.params.eventId, tenantId });
    await recordAudit({
      tenantId,
      actor: req.user,
      action: 'CONTEXT_EVENT_DELETED',
      objectType: 'ContextEvent',
      objectId: req.params.eventId,
      req,
    });
    res.json({ deleted: true });
  })
);

// ── Working schedules ────────────────────────────────────────────────────────

router.get(
  '/working-schedules',
  requireHsRole('HS_ADMIN', 'SYSTEM_ADMIN'),
  handle(async (req, res) => {
    // Person-scoped schedules exist for calculation only and are never listed
    // in the H&S UI (§11.1, §22).
    const schedules = await WorkingSchedule.find({
      tenantId: tenantOf(req),
      scope: { $in: ['ORG', 'TEAM'] },
    }).lean();
    res.json({ schedules });
  })
);

router.post(
  '/working-schedules',
  requireHsRole('HS_ADMIN', 'SYSTEM_ADMIN'),
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const schedule = await WorkingSchedule.findOneAndUpdate(
      {
        tenantId,
        scope: req.body.scope || 'ORG',
        teamId: req.body.teamId || null,
        personId: null,
      },
      { $set: { ...req.body, tenantId, createdBy: req.user.userId } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await recordAudit({
      tenantId,
      actor: req.user,
      action: 'CONFIG_CHANGED',
      objectType: 'WorkingSchedule',
      objectId: schedule._id,
      metadata: { scope: schedule.scope, timezone: schedule.timezone },
      req,
    });

    res.json(schedule);
  })
);

export default router;
