/**
 * Intervention Routes
 * API endpoints for tracking signal-driven actions and 14-day follow-ups
 */

import express from 'express';
import Intervention from '../models/intervention.js';
import Signal from '../models/signal.js';
import SignalV2 from '../models/signalV2.js';
import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';
import {
  authenticateToken,
  canAccessOrg,
  isMasterAdmin,
  referenceId,
  requireOrganizationAccess,
  requireTeamAccess,
} from '../middleware/auth.js';
import { requireTier } from '../middleware/checkTier.js';
import { computeWorkNetworkInterventionOutcome } from '../services/workNetworkActionService.js';
import {
  getGovernanceSnapshot,
  getSignalMeasurementTarget,
} from '../config/measurementGovernance.js';

const router = express.Router();

/**
 * POST /api/interventions
 * Log a new intervention (user takes action on a signal)
 * Body: { signalId, actionTaken, actionType, expectedEffect, effort, timeframe, metricBefore }
 * REQUIRES: Detection tier or higher
 */
router.post('/', authenticateToken, requireTier('detection'), async (req, res) => {
  try {
    const {
      signalId,
      teamId,
      orgId,
      signalType,
      actionTaken,
      actionType,
      title,
      description,
      expectedEffect,
      effort,
      timeframe,
      metricBefore,
      targetMetric,
      targetMetricLabel,
      targetDirection,
      ownerRole,
      ownerName,
      decisionRationale,
      hypothesis,
      consultationStatus,
      consultationNotes,
      consultationParticipantCount,
    } = req.body;

    let resolvedTeamId = teamId;
    let resolvedOrgId = orgId;
    let resolvedSignalType = signalType;
    let resolvedMetricBefore = metricBefore;
    let resolvedSignal = null;

    // If signalId provided, fetch signal context
    if (signalId) {
      resolvedSignal =
        (await SignalV2.findOne({ _id: signalId, orgId: referenceId(req.user.orgId) })) ||
        (await Signal.findOne({ _id: signalId, orgId: referenceId(req.user.orgId) }));
      if (!resolvedSignal) {
        return res.status(404).json({ message: 'Signal not found' });
      }
      resolvedTeamId = resolvedSignal.teamId;
      resolvedOrgId = resolvedSignal.orgId;
      resolvedSignalType = resolvedSignal.signalType;
      resolvedMetricBefore =
        metricBefore ?? resolvedSignal.currentValue ?? resolvedSignal.deviation?.currentValue;
    } else if (!teamId || !orgId) {
      // Team-centric intervention requires teamId and orgId when no signalId
      return res
        .status(400)
        .json({ message: 'Either signalId or both teamId and orgId are required' });
    }

    if (!canAccessOrg(req.user, resolvedOrgId)) {
      return res.status(403).json({ message: 'Forbidden: Organization access denied' });
    }

    const team = await Team.findOne({ _id: resolvedTeamId, orgId: resolvedOrgId })
      .select('_id orgId')
      .lean();
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (
      req.user.role === 'manager' &&
      String(referenceId(req.user.teamId) || '') !== String(referenceId(resolvedTeamId) || '')
    ) {
      return res
        .status(403)
        .json({ message: 'Forbidden: Manager access is limited to their team' });
    }

    const configuredTarget = getSignalMeasurementTarget(resolvedSignalType);
    const reviewStart = new Date();
    const primaryReviewDate = addDays(reviewStart, 14);
    const followUpReviewDate = addDays(reviewStart, 28);
    const resolvedTitle = title || actionTaken;
    if (!resolvedTitle) {
      return res.status(400).json({ message: 'Action title is required' });
    }

    // Create intervention
    const intervention = new Intervention({
      signalId: signalId || undefined,
      signalType: resolvedSignalType,
      teamId: resolvedTeamId,
      orgId: resolvedOrgId,
      title: resolvedTitle,
      description,
      actionTaken: actionTaken || resolvedTitle,
      actionType,
      expectedEffect,
      effort,
      timeframe,
      targetMetric: targetMetric || configuredTarget?.metricKey,
      targetMetricLabel: targetMetricLabel || configuredTarget?.metricLabel,
      targetDirection: targetDirection || configuredTarget?.direction,
      decision: {
        ownerName: ownerName?.trim(),
        ownerRole: ownerRole || 'Team lead',
        rationale: decisionRationale,
        hypothesis: hypothesis || expectedEffect,
        selectedAt: reviewStart,
      },
      consultation: {
        status: consultationStatus || 'not_needed',
        notes: consultationNotes?.trim(),
        participantCount: Number(consultationParticipantCount) || 0,
        completedAt: consultationStatus === 'completed' ? reviewStart : undefined,
      },
      evidenceSnapshot: buildEvidenceSnapshot(resolvedSignal, resolvedMetricBefore),
      governance: getGovernanceSnapshot(),
      startDate: reviewStart,
      reviewDate: primaryReviewDate,
      recheckDate: primaryReviewDate,
      followUpReviewDate,
      status: 'active',
      outcomeDelta: {
        metricBefore: resolvedMetricBefore,
      },
      createdBy: req.user.userId,
    });

    await intervention.save();

    res.status(201).json({
      message: 'Intervention logged successfully',
      intervention,
      recheckDate: intervention.recheckDate,
      followUpReviewDate: intervention.followUpReviewDate,
    });
  } catch (error) {
    console.error('[Interventions] Error creating intervention:', error);
    res.status(500).json({ message: 'Failed to log intervention', error: error.message });
  }
});

/**
 * GET /api/interventions/pending
 * Get interventions needing recheck (recheckDate passed, status=active or pending-recheck)
 * REQUIRES: Detection tier or higher
 */
router.get('/pending', authenticateToken, requireTier('detection'), async (req, res) => {
  try {
    const now = new Date();

    const pendingInterventions = await Intervention.find({
      orgId: referenceId(req.user.orgId),
      status: { $in: ['active', 'pending-recheck'] },
      recheckDate: { $lte: now },
    })
      .populate('signalId', 'signalType currentValue severity')
      .populate('teamId', 'name')
      .sort({ recheckDate: 1 })
      .limit(20);

    res.json({
      count: pendingInterventions.length,
      interventions: pendingInterventions,
    });
  } catch (error) {
    console.error('[Interventions] Error fetching pending:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch pending interventions', error: error.message });
  }
});

/**
 * GET /api/interventions/team/:teamId
 * Get all interventions for a team
 * REQUIRES: Detection tier or higher (30-day history) or Impact Proof (90-day)
 */
router.get(
  '/team/:teamId',
  authenticateToken,
  requireTier('detection'),
  requireTeamAccess(),
  async (req, res) => {
    try {
      const { teamId } = req.params;
      const { status } = req.query;

      const filter = { teamId, orgId: req.team.orgId };
      if (status) filter.status = { $in: String(status).split(',') };

      const interventions = await Intervention.find(filter)
        .populate('signalId', 'signalType currentValue severity detectedAt')
        .populate('createdBy', 'name email')
        .populate('acknowledgedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(50);

      res.json({ interventions });
    } catch (error) {
      console.error('[Interventions] Error fetching team interventions:', error);
      res.status(500).json({ message: 'Failed to fetch interventions', error: error.message });
    }
  }
);

/**
 * GET /api/interventions/org/:orgId
 * Organization-wide action register for HR and executive review.
 */
router.get(
  '/org/:orgId',
  authenticateToken,
  requireTier('detection'),
  requireOrganizationAccess(),
  async (req, res) => {
    try {
      const filter = { orgId: req.params.orgId };
      if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
      if (req.query.teamId) filter.teamId = req.query.teamId;

      const interventions = await Intervention.find(filter)
        .populate('signalId', 'signalType currentValue severity detectedAt weekStart')
        .populate('teamId', 'name')
        .populate('createdBy', 'name email')
        .populate('acknowledgedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(100);

      res.json({ interventions });
    } catch (error) {
      console.error('[Interventions] Error fetching organization interventions:', error);
      res.status(500).json({ message: 'Failed to fetch interventions', error: error.message });
    }
  }
);

router.put('/:id/consultation', authenticateToken, async (req, res) => {
  try {
    const intervention = await findAccessibleIntervention(req, req.params.id);
    if (!intervention) return res.status(404).json({ message: 'Intervention not found' });

    const participantCount = Number(req.body.participantCount);
    const notes = String(req.body.notes || '').trim();
    if (!Number.isFinite(participantCount) || participantCount < 1 || !notes) {
      return res.status(400).json({
        message: 'Participant count and consultation notes are required.',
      });
    }

    intervention.consultation = {
      status: 'completed',
      participantCount,
      notes,
      completedAt: new Date(),
    };
    await intervention.save();
    return res.json({ message: 'Consultation recorded', intervention });
  } catch (error) {
    console.error('[Interventions] Error recording consultation:', error);
    return res.status(500).json({ message: 'Failed to record consultation' });
  }
});

/**
 * PUT /api/interventions/:id/outcome
 * Update intervention outcome (after auto-compute or manual entry)
 * Body: { metricAfter?, acknowledgedBy, userNotes? }
 */
router.put('/:id/outcome', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { metricAfter, userNotes } = req.body;

    const intervention = await findAccessibleIntervention(req, id);
    if (!intervention) {
      return res.status(404).json({ message: 'Intervention not found' });
    }

    // If metricAfter provided, compute outcome
    if (metricAfter !== undefined) {
      await intervention.computeOutcome(metricAfter);
    }

    // Mark as acknowledged
    intervention.acknowledgedBy = req.user.userId;
    intervention.acknowledgedAt = new Date();
    intervention.status = 'completed';

    if (userNotes) {
      intervention.userNotes = userNotes;
    }

    await intervention.save();

    res.json({
      message: 'Intervention outcome updated',
      intervention,
    });
  } catch (error) {
    console.error('[Interventions] Error updating outcome:', error);
    res.status(500).json({ message: 'Failed to update outcome', error: error.message });
  }
});

/**
 * POST /api/interventions/:id/auto-compute
 * Automatically compute outcome by fetching current metric value
 */
router.post('/:id/auto-compute', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const intervention = await findAccessibleIntervention(req, id, { populateSignal: true });
    if (!intervention) {
      return res.status(404).json({ message: 'Intervention not found' });
    }

    if (String(intervention.actionType || '').startsWith('work_network_')) {
      const recheck = await computeWorkNetworkInterventionOutcome(intervention);
      if (recheck.reason === 'not_ready') {
        return res.status(409).json({
          message: 'Work Network coverage is not ready for a reliable recheck.',
        });
      }
      if (!recheck.computed && recheck.reason !== 'privacy_suppressed') {
        return res.status(400).json({ message: 'Work Network measurement is incomplete.' });
      }

      return res.json({
        message: recheck.computed
          ? 'Work Network outcome computed automatically'
          : 'Work Network outcome was privacy-suppressed',
        intervention,
        outcome: recheck.outcome || null,
      });
    }

    const metricField = intervention.targetMetric || getMetricField(intervention.signalType);
    if (!metricField) {
      return res.status(422).json({
        message:
          'This action has no reproducible metric mapping. Add a target metric before measuring it.',
      });
    }

    // Fetch current metric value from recent metrics
    const recentMetric = await MetricsDaily.findOne({
      teamId: intervention.teamId,
      date: { $gte: intervention.recheckDate },
    })
      .sort({ date: -1 })
      .select(metricField);

    if (!recentMetric) {
      return res.status(404).json({ message: 'No recent metric data available for auto-compute' });
    }

    const currentValue = recentMetric[metricField];

    if (currentValue === undefined) {
      return res.status(404).json({ message: 'Metric value not found in recent data' });
    }

    // Compute outcome
    const outcome = await intervention.computeOutcome(currentValue);
    intervention.status = 'pending-recheck'; // Waiting for user acknowledgment
    await intervention.save();

    res.json({
      message: 'Outcome computed automatically',
      intervention,
      outcome,
    });
  } catch (error) {
    console.error('[Interventions] Error auto-computing outcome:', error);
    res.status(500).json({ message: 'Failed to auto-compute outcome', error: error.message });
  }
});

/**
 * DELETE /api/interventions/:id
 * Mark intervention as abandoned (user decides not to continue)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const intervention = await findAccessibleIntervention(req, id);
    if (!intervention) {
      return res.status(404).json({ message: 'Intervention not found' });
    }

    intervention.status = 'abandoned';
    intervention.acknowledgedBy = req.user.userId;
    intervention.acknowledgedAt = new Date();
    await intervention.save();

    res.json({ message: 'Intervention marked as abandoned' });
  } catch (error) {
    console.error('[Interventions] Error abandoning intervention:', error);
    res.status(500).json({ message: 'Failed to abandon intervention', error: error.message });
  }
});

/**
 * Helper: Map signal type to metric field name
 */
function getMetricField(signalType) {
  return getSignalMeasurementTarget(signalType)?.metricKey || null;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildEvidenceSnapshot(signal, metricBefore) {
  if (!signal && metricBefore == null) return undefined;
  return {
    value: metricBefore,
    baselineValue: signal?.baselineValue ?? signal?.deviation?.baselineValue,
    deltaPct: signal?.deltaPct ?? signal?.deviation?.deltaPercent,
    periodStart: signal?.periodStart ?? signal?.deviation?.startDate,
    periodEnd: signal?.periodEnd,
    confidence:
      typeof signal?.confidence === 'number'
        ? signal.confidence
        : signal?.confidenceScore != null
          ? signal.confidenceScore / 100
          : undefined,
    contributorCount: signal?.dataQuality?.activeUsersCount,
    sources: signal?.sources || [],
    capturedAt: new Date(),
  };
}

async function findAccessibleIntervention(req, id, { populateSignal = false } = {}) {
  const filter = { _id: id };
  if (!isMasterAdmin(req.user)) filter.orgId = referenceId(req.user.orgId);
  let query = Intervention.findOne(filter);
  if (populateSignal) query = query.populate('signalId');
  const intervention = await query;
  if (!intervention) return null;
  if (
    req.user.role === 'manager' &&
    String(referenceId(req.user.teamId) || '') !== String(referenceId(intervention.teamId) || '')
  ) {
    return null;
  }
  return intervention;
}

export default router;
