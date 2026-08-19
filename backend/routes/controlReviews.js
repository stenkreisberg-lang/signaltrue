/**
 * Control review API (spec §5–§20).
 *
 * Every route runs behind authentication, the H&S role resolver and — where a
 * case is addressed — case-level access control that audits denials.
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  withHsRole,
  requireWriteAccess,
  requireCaseAccess,
  requireHsRole,
  canSeeConsultationDetail,
} from '../middleware/hsAccess.js';
import ControlReviewCase from '../models/controlReview/controlReviewCase.js';
import TriggerEvidence from '../models/controlReview/triggerEvidence.js';
import ControlIntervention from '../models/controlReview/controlIntervention.js';
import InterventionEvaluation from '../models/controlReview/interventionEvaluation.js';
import MigrationFinding from '../models/controlReview/migrationFinding.js';
import SignalObservation from '../models/controlReview/signalObservation.js';
import EvidencePack from '../models/controlReview/evidencePack.js';
import Team from '../models/team.js';
import {
  TRIGGER_TYPES,
  CASE_STATUSES,
  CLOSED_STATUSES,
  INTERVENTION_TYPES,
  CONSULTATION_METHODS,
  CONTEXT_EVENT_TYPES,
  P0_METRICS,
  METRIC_LABELS,
  METRIC_UNITS,
  REQUIRED_DISCLAIMER,
} from '../models/controlReview/constants.js';
import caseService from '../services/controlReview/controlReviewCaseService.js';
import consultationService from '../services/controlReview/consultationService.js';
import interventionService from '../services/controlReview/controlInterventionService.js';
import evaluationService from '../services/controlReview/interventionEvaluationService.js';
import migrationService from '../services/controlReview/workloadMigrationService.js';
import completenessService from '../services/controlReview/reviewCompletenessService.js';
import evidencePackService from '../services/controlReview/evidencePackService.js';
import interpretationService from '../services/controlReview/hsInterpretationService.js';
import { listAuditEvents } from '../services/controlReview/auditService.js';

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
      const status = error.code === 'TRUST_PACK_INCOMPLETE' ? 409 : 400;
      res.status(status).json({ error: true, message: error.message, code: error.code });
    }
  };
}

// ── Reference data for the UI ────────────────────────────────────────────────

router.get(
  '/meta',
  handle(async (req, res) => {
    res.json({
      triggerTypes: TRIGGER_TYPES,
      caseStatuses: CASE_STATUSES,
      closedStatuses: CLOSED_STATUSES,
      interventionTypes: INTERVENTION_TYPES,
      consultationMethods: CONSULTATION_METHODS,
      contextEventTypes: CONTEXT_EVENT_TYPES,
      metrics: P0_METRICS.map((metric) => ({
        key: metric,
        label: METRIC_LABELS[metric],
        unit: METRIC_UNITS[metric],
      })),
      suggestedInvestigationQuestions: consultationService.SUGGESTED_QUESTIONS,
      disclaimer: REQUIRED_DISCLAIMER,
      hsRole: req.hsRole,
      permissions: req.hsPermissions,
    });
  })
);

router.get(
  '/meta/expected-effects/:interventionType',
  handle(async (req, res) => {
    res.json({ suggestions: interventionService.suggestExpectedEffects(req.params.interventionType) });
  })
);

router.get(
  '/meta/recommended-metrics/:triggerType',
  handle(async (req, res) => {
    const metrics = caseService.recommendMetrics(req.params.triggerType);
    res.json({
      metrics: metrics.map((metric) => ({ key: metric, label: METRIC_LABELS[metric] })),
    });
  })
);

// ── Cases ────────────────────────────────────────────────────────────────────

router.get(
  '/cases',
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const query = { tenantId };

    if (req.query.status) query.status = req.query.status;
    if (req.query.open === 'true') query.status = { $nin: CLOSED_STATUSES };
    if (req.hsRole === 'CASE_OWNER') query.caseOwner = req.user.userId;
    if (req.hsRole === 'FUNCTION_LEADER') {
      query.teamIds = { $in: req.user.permittedTeamIds || [] };
    }

    const cases = await ControlReviewCase.find(query).sort({ updatedAt: -1 }).limit(200).lean();
    const teamIds = [...new Set(cases.flatMap((c) => (c.teamIds || []).map(String)))];
    const teams = await Team.find({ _id: { $in: teamIds } }).select('name').lean();
    const nameFor = new Map(teams.map((t) => [String(t._id), t.name]));

    res.json({
      cases: cases.map((c) => ({
        ...c,
        teamNames: (c.teamIds || []).map((id) => nameFor.get(String(id)) || 'Unknown team'),
      })),
    });
  })
);

router.post(
  '/cases',
  requireWriteAccess,
  handle(async (req, res) => {
    const created = await caseService.openCase({
      tenantId: tenantOf(req),
      actor: req.user,
      req,
      ...req.body,
    });
    res.status(201).json(created);
  })
);

router.get(
  '/cases/:caseId',
  requireCaseAccess,
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const { caseId } = req.params;

    const [caseDoc, evidence, consultations, interventions, packs] = await Promise.all([
      ControlReviewCase.findOne({ _id: caseId, tenantId }).lean(),
      TriggerEvidence.find({ tenantId, caseId }).sort({ createdAt: 1 }).lean(),
      consultationService.listConsultations({
        tenantId,
        caseId,
        includeRestricted: canSeeConsultationDetail(req),
      }),
      ControlIntervention.find({ tenantId, caseId }).sort({ implementationDate: 1 }).lean(),
      EvidencePack.find({ tenantId, caseId }).sort({ version: -1 }).select('-snapshot').lean(),
    ]);

    const interventionIds = interventions.map((i) => i._id);
    const [evaluations, migrations, observations, teams] = await Promise.all([
      interventionIds.length
        ? InterventionEvaluation.find({ tenantId, interventionId: { $in: interventionIds } }).lean()
        : [],
      interventionIds.length
        ? MigrationFinding.find({ tenantId, interventionId: { $in: interventionIds } }).lean()
        : [],
      SignalObservation.find({ tenantId, teamId: { $in: caseDoc.teamIds } })
        .sort({ periodStart: -1 })
        .limit(60)
        .lean(),
      Team.find({ _id: { $in: caseDoc.teamIds } }).select('name metadata.actualSize').lean(),
    ]);

    const completeness = await completenessService.assessCompleteness({ tenantId, caseId });
    const contextEvents = await caseService.overlappingContext({
      tenantId,
      teamIds: caseDoc.teamIds,
      from: caseDoc.openedAt,
      to: new Date(),
    });

    const interpretation = interpretationService.buildInterpretation({
      caseDoc,
      observations,
      evaluations,
      migrations,
      consultations,
      contextEvents,
      completeness,
    });

    res.json({
      case: caseDoc,
      teams,
      triggerEvidence: evidence,
      consultations,
      interventions,
      evaluations,
      migrations,
      observations,
      contextEvents,
      completeness,
      interpretation,
      evidencePacks: packs,
      disclaimer: REQUIRED_DISCLAIMER,
    });
  })
);

router.patch(
  '/cases/:caseId/investigation',
  requireCaseAccess,
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await caseService.saveInvestigation({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      investigation: req.body,
      req,
    });
    res.json(updated);
  })
);

router.patch(
  '/cases/:caseId/status',
  requireCaseAccess,
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await caseService.setStatus({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      status: req.body.status,
      req,
    });
    res.json(updated);
  })
);

// Only a person can record a decision or close a case (§6, §36.17).
router.post(
  '/cases/:caseId/decision',
  requireCaseAccess,
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await caseService.recordDecision({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      req,
      ...req.body,
    });
    res.json(updated);
  })
);

router.post(
  '/cases/:caseId/trigger-evidence',
  requireCaseAccess,
  requireWriteAccess,
  handle(async (req, res) => {
    const created = await caseService.addTriggerEvidence({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      req,
      ...req.body,
    });
    res.status(201).json(created);
  })
);

router.post(
  '/cases/:caseId/consultation-not-applicable',
  requireCaseAccess,
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await caseService.recordConsultationNotApplicable({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      reason: req.body.reason,
      req,
    });
    res.json(updated);
  })
);

router.get(
  '/cases/:caseId/completeness',
  requireCaseAccess,
  handle(async (req, res) => {
    res.json(
      await completenessService.assessCompleteness({
        tenantId: tenantOf(req),
        caseId: req.params.caseId,
      })
    );
  })
);

router.get(
  '/cases/:caseId/audit',
  requireCaseAccess,
  handle(async (req, res) => {
    res.json({
      events: await listAuditEvents({
        tenantId: tenantOf(req),
        objectType: 'ControlReviewCase',
        objectId: req.params.caseId,
      }),
    });
  })
);

// ── Consultation ─────────────────────────────────────────────────────────────

router.post(
  '/cases/:caseId/consultations',
  requireCaseAccess,
  requireWriteAccess,
  handle(async (req, res) => {
    const created = await consultationService.recordConsultation({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      req,
      ...req.body,
    });
    res.status(201).json(created);
  })
);

router.post(
  '/consultations/:consultationId/feedback',
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await consultationService.recordFeedbackToWorkers({
      tenantId: tenantOf(req),
      consultationId: req.params.consultationId,
      actor: req.user,
      description: req.body.description,
      date: req.body.date,
      req,
    });
    res.json(updated);
  })
);

// ── Controls ─────────────────────────────────────────────────────────────────

router.post(
  '/cases/:caseId/interventions',
  requireCaseAccess,
  requireWriteAccess,
  handle(async (req, res) => {
    const created = await interventionService.planIntervention({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      req,
      ...req.body,
    });
    res.status(201).json(created);
  })
);

router.patch(
  '/interventions/:interventionId/expected-effects',
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await interventionService.updateExpectedEffects({
      tenantId: tenantOf(req),
      interventionId: req.params.interventionId,
      actor: req.user,
      expectedEffects: req.body.expectedEffects,
      req,
    });
    res.json(updated);
  })
);

router.post(
  '/interventions/:interventionId/implement',
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await interventionService.confirmImplementation({
      tenantId: tenantOf(req),
      interventionId: req.params.interventionId,
      actor: req.user,
      implementationDate: req.body.implementationDate,
      req,
    });
    res.json(updated);
  })
);

/**
 * Run the before/after comparison, then the migration check. Both are
 * calculations over stored metrics — neither changes the case status to a
 * closed state.
 */
router.post(
  '/interventions/:interventionId/evaluate',
  requireWriteAccess,
  handle(async (req, res) => {
    const tenantId = tenantOf(req);
    const { interventionId } = req.params;

    const evaluations = await evaluationService.evaluateIntervention({
      tenantId,
      interventionId,
      actor: req.user,
      req,
    });
    const migrations = await migrationService.detectMigration({
      tenantId,
      interventionId,
      actor: req.user,
      req,
    });

    const intervention = await ControlIntervention.findById(interventionId).lean();
    await ControlReviewCase.updateOne(
      { _id: intervention.caseId, tenantId, status: { $nin: CLOSED_STATUSES } },
      { $set: { status: 'DECISION_REQUIRED' } }
    );

    res.json({ evaluations, migrations });
  })
);

router.patch(
  '/migrations/:findingId',
  requireWriteAccess,
  handle(async (req, res) => {
    const updated = await migrationService.updateMigrationStatus({
      tenantId: tenantOf(req),
      findingId: req.params.findingId,
      actor: req.user,
      status: req.body.status,
      investigationNotes: req.body.investigationNotes,
      req,
    });
    res.json(updated);
  })
);

// ── Evidence Pack ────────────────────────────────────────────────────────────

router.post(
  '/cases/:caseId/evidence-pack',
  requireCaseAccess,
  requireHsRole('HS_ADMIN', 'CASE_OWNER', 'AUDITOR_READONLY'),
  handle(async (req, res) => {
    const { pack, buffer, fileName } = await evidencePackService.generateEvidencePack({
      tenantId: tenantOf(req),
      caseId: req.params.caseId,
      actor: req.user,
      req,
    });

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(buffer);
    }

    return res.status(201).json({
      packId: pack._id,
      version: pack.version,
      fileName,
      byteLength: pack.byteLength,
      completeness: pack.completenessAtGeneration,
    });
  })
);

router.get(
  '/evidence-packs/:packId/download',
  requireHsRole('HS_ADMIN', 'CASE_OWNER', 'AUDITOR_READONLY'),
  handle(async (req, res) => {
    // Re-renders the requested version rather than generating a new one, and
    // logs the export as its own audit event.
    const { buffer, fileName } = await evidencePackService.exportEvidencePack({
      tenantId: tenantOf(req),
      packId: req.params.packId,
      actor: req.user,
      req,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  })
);

export default router;
