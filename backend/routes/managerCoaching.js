import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, canAccessOrg, referenceId, requireRoles } from '../middleware/auth.js';
import Intervention from '../models/intervention.js';
import ManagerCoachingEvent from '../models/managerCoachingEvent.js';
import ManagerWeekly from '../models/managerWeekly.js';
import OrgUnit from '../models/orgUnit.js';
import { generateManagerCoaching } from '../services/managerCoachingInsightService.js';
import {
  getManagerCoachingReadiness,
  publicReadiness,
} from '../services/managerCoachingReadinessService.js';

const router = express.Router();
router.use(authenticateToken);
router.use(['/v2/me', '/v2/events', '/v2/experiments'], requireRoles(['manager']));

router.get(
  '/v2/admin/adoption',
  requireRoles(['master_admin', 'admin', 'hr_admin', 'org_admin', 'executive']),
  validateSelfContext,
  async (req, res, next) => {
    try {
      const [knownManagers, eligibleManagerHashes, eventCounts, experiments] = await Promise.all([
        OrgUnit.countDocuments({
          orgId: req.coachingOrgId,
          isManager: true,
          effectiveTo: null,
        }),
        ManagerWeekly.distinct('managerHash', {
          orgId: req.coachingOrgId,
          suppressed: { $ne: true },
        }),
        ManagerCoachingEvent.aggregate([
          { $match: { orgId: new mongoose.Types.ObjectId(req.coachingOrgId) } },
          { $group: { _id: '$eventType', count: { $sum: 1 } } },
        ]),
        Intervention.find({
          orgId: req.coachingOrgId,
          source: 'manager_coaching',
        })
          .select('status reviews')
          .lean(),
      ]);
      const counts = Object.fromEntries(eventCounts.map((item) => [item._id, item.count]));
      const reviews14d = experiments.filter((item) =>
        item.reviews?.some((review) => review.day === 14 && review.measuredAt)
      ).length;
      const reviews28d = experiments.filter((item) =>
        item.reviews?.some((review) => review.day === 28 && review.measuredAt)
      ).length;
      return res.json({
        managers: {
          known: knownManagers,
          eligible: eligibleManagerHashes.length,
        },
        adoption: {
          opened: counts.opened || 0,
          dismissed: counts.dismissed || 0,
          experimentsStarted: experiments.length,
          reviews14d,
          reviews28d,
          useful: counts.feedback_useful || 0,
          notUseful: counts.feedback_not_useful || 0,
        },
        privacy: {
          aggregateOnly: true,
          individualCoachingContentReturned: false,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.get('/v2/me/readiness', validateSelfContext, async (req, res, next) => {
  try {
    const readiness = await getManagerCoachingReadiness(context(req));
    return res.json(publicReadiness(readiness));
  } catch (error) {
    return next(error);
  }
});

router.get('/v2/me', validateSelfContext, async (req, res, next) => {
  try {
    const coaching = await generateManagerCoaching(context(req));
    const insight = coaching.data?.primaryInsight;
    if (insight) {
      const dismissed = await ManagerCoachingEvent.exists({
        orgId: req.coachingOrgId,
        managerHash: coaching.data.manager.managerHash,
        insightId: insight.insightId,
        eventType: 'dismissed',
      });
      if (dismissed) {
        coaching.status = 'ready_no_change';
        coaching.reason = 'insight_dismissed_for_period';
        coaching.data.primaryInsight = null;
      }
    }
    return res.json(coaching);
  } catch (error) {
    return next(error);
  }
});

router.post('/v2/events', validateSelfContext, async (req, res, next) => {
  try {
    const coaching = await generateManagerCoaching(context(req));
    const insight = coaching.data?.primaryInsight;
    const { insightId, eventType } = req.body || {};
    if (!insight || insight.insightId !== insightId) {
      return res.status(409).json({ message: 'The coaching insight is no longer current.' });
    }
    const allowed = new Set([
      'shown',
      'opened',
      'acknowledged',
      'dismissed',
      'remind_later',
      'feedback_useful',
      'feedback_not_useful',
    ]);
    if (!allowed.has(eventType)) {
      return res.status(400).json({ message: 'Unsupported coaching event.' });
    }
    const event = await recordEvent({
      orgId: req.coachingOrgId,
      userId: req.user.userId,
      managerHash: coaching.data.manager.managerHash,
      teamId: coaching.data.manager.teamId,
      insight,
      eventType,
    });
    return res.status(201).json({ event });
  } catch (error) {
    return next(error);
  }
});

router.post('/v2/experiments', validateSelfContext, async (req, res, next) => {
  try {
    const coaching = await generateManagerCoaching(context(req));
    const insight = coaching.data?.primaryInsight;
    if (!insight || insight.insightId !== req.body?.insightId) {
      return res.status(409).json({ message: 'The coaching insight is no longer current.' });
    }
    const startedAt = new Date();
    const targetMetrics = insight.experiment.targetMetrics;
    const snapshots = targetMetrics.map((target) => {
      const source = coaching.data.metricSnapshot[target.metric];
      return {
        metric: target.metric,
        value: finiteOrUndefined(source?.value),
        baseline: finiteOrUndefined(source?.baseline),
        unit: source?.unit,
        coverage: finiteOrUndefined(source?.coverage),
        confidence: source?.confidence || 'low',
        sources: source?.sources || [],
        scoringVersion: source?.scoringVersion,
        dataQualityVersion: source?.dataQualityVersion,
        capturedAt: startedAt,
      };
    });
    const intervention = await Intervention.create({
      source: 'manager_coaching',
      managerHash: coaching.data.manager.managerHash,
      insightId: insight.insightId,
      privateToManager: true,
      teamId: coaching.data.manager.teamId,
      orgId: req.coachingOrgId,
      interventionType: 'manager_coaching_experiment',
      title: insight.experiment.title,
      description: insight.statement,
      actionTaken: insight.experiment.title,
      actionType: `manager_coaching_${insight.signal}`,
      expectedEffect: `Observe ${targetMetrics.map((item) => item.metric).join(', ')} over 14 and 28 days.`,
      targetMetric: targetMetrics[0]?.metric,
      targetMetricLabel: coaching.data.metricSnapshot[targetMetrics[0]?.metric]?.label,
      targetDirection: toLegacyDirection(targetMetrics[0]?.direction),
      targetMetrics: targetMetrics.map((target) => ({
        metric: target.metric,
        label: coaching.data.metricSnapshot[target.metric]?.label,
        unit: target.unit,
        direction: target.direction,
      })),
      evidenceSnapshots: snapshots,
      evidenceSnapshot: {
        value: snapshots[0]?.value,
        baselineValue: snapshots[0]?.baseline,
        contributorCount: coaching.data.readiness.requirements.privacy.activeReports,
        sources: snapshots[0]?.sources,
        capturedAt: startedAt,
      },
      governance: {
        measurementVersion: coaching.data.provenance.scoringVersion,
        privacyPolicyVersion: 'manager-coaching-2.1.0',
        reviewProtocolVersion: '14d-28d-1.0.0',
      },
      decision: {
        ownerRole: 'Manager',
        rationale: insight.statement,
        hypothesis: insight.experiment.title,
        selectedAt: startedAt,
      },
      startDate: startedAt,
      reviewDate: addDays(startedAt, 14),
      recheckDate: addDays(startedAt, 14),
      followUpReviewDate: addDays(startedAt, 28),
      reviews: [
        { day: 14, dueDate: addDays(startedAt, 14) },
        { day: 28, dueDate: addDays(startedAt, 28) },
      ],
      status: 'active',
      createdBy: req.user.userId,
    });
    await recordEvent({
      orgId: req.coachingOrgId,
      userId: req.user.userId,
      managerHash: coaching.data.manager.managerHash,
      teamId: coaching.data.manager.teamId,
      insight,
      eventType: 'experiment_started',
      experimentId: intervention._id,
    });
    return res.status(201).json({ experiment: intervention });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'An experiment already exists for this insight.' });
    }
    return next(error);
  }
});

router.get('/v2/me/experiments', validateSelfContext, async (req, res, next) => {
  try {
    const readiness = await getManagerCoachingReadiness(context(req));
    if (!readiness.manager) return res.json({ experiments: [] });
    const experiments = await Intervention.find({
      orgId: req.coachingOrgId,
      managerHash: readiness.manager.managerHash,
      source: 'manager_coaching',
      createdBy: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    return res.json({ experiments });
  } catch (error) {
    return next(error);
  }
});

router.get('/v2/experiments/:id', validateSelfContext, async (req, res, next) => {
  try {
    const experiment = await findOwnExperiment(req, req.params.id);
    if (!experiment) return res.status(404).json({ message: 'Experiment not found.' });
    return res.json({ experiment });
  } catch (error) {
    return next(error);
  }
});

router.post('/v2/experiments/:id/feedback', validateSelfContext, async (req, res, next) => {
  try {
    const experiment = await findOwnExperiment(req, req.params.id);
    if (!experiment) return res.status(404).json({ message: 'Experiment not found.' });
    if (typeof req.body?.useful !== 'boolean') {
      return res.status(400).json({ message: 'Feedback must specify useful as true or false.' });
    }
    const eventType = req.body.useful ? 'feedback_useful' : 'feedback_not_useful';
    const oppositeEventType = req.body.useful ? 'feedback_not_useful' : 'feedback_useful';
    await ManagerCoachingEvent.deleteOne({
      orgId: experiment.orgId,
      managerHash: experiment.managerHash,
      insightId: experiment.insightId,
      eventType: oppositeEventType,
    });
    const event = await ManagerCoachingEvent.findOneAndUpdate(
      {
        orgId: experiment.orgId,
        managerHash: experiment.managerHash,
        insightId: experiment.insightId,
        eventType,
      },
      {
        $setOnInsert: {
          teamId: experiment.teamId,
          signalKey: String(experiment.actionType).replace('manager_coaching_', ''),
          actorUserId: req.user.userId,
          occurredAt: new Date(),
          metadata: { experimentId: experiment._id },
        },
      },
      { upsert: true, returnDocument: 'after' }
    );
    return res.status(201).json({ event });
  } catch (error) {
    return next(error);
  }
});

router.post('/v2/experiments/:id/review', validateSelfContext, async (req, res, next) => {
  try {
    const experiment = await findOwnExperiment(req, req.params.id, false);
    if (!experiment) return res.status(404).json({ message: 'Experiment not found.' });
    const day = Number(req.body?.day);
    if (![14, 28].includes(day)) {
      return res.status(400).json({ message: 'Review day must be 14 or 28.' });
    }
    const review = experiment.reviews.find((item) => item.day === day);
    if (!review) return res.status(404).json({ message: 'Review is not configured.' });
    if (new Date(review.dueDate) > new Date()) {
      return res
        .status(409)
        .json({ message: 'This review is not due yet.', dueDate: review.dueDate });
    }
    const coaching = await generateManagerCoaching(context(req));
    if (!coaching.data?.metricSnapshot) {
      return res.status(409).json({ message: 'Current telemetry is insufficient for review.' });
    }
    const snapshots = experiment.evidenceSnapshots.map((baseline) => {
      const current = coaching.data.metricSnapshot[baseline.metric];
      return compareMetric(baseline, current, experiment.targetMetrics);
    });
    review.measuredAt = new Date();
    review.metricSnapshots = snapshots;
    review.result = summarizeResult(snapshots);
    review.interpretation = toLegacyInterpretation(review.result);
    if (snapshots.length === 1) {
      review.metricValue = snapshots[0].value;
      review.absoluteChange = snapshots[0].absoluteChange;
      review.percentChange = snapshots[0].percentChange;
    }
    if (day === 28) {
      experiment.status = 'completed';
      experiment.endDate = new Date();
      await ManagerCoachingEvent.findOneAndUpdate(
        {
          orgId: experiment.orgId,
          managerHash: experiment.managerHash,
          insightId: experiment.insightId,
          eventType: 'experiment_completed',
        },
        {
          $setOnInsert: {
            teamId: experiment.teamId,
            signalKey: String(experiment.actionType).replace('manager_coaching_', ''),
            actorUserId: req.user.userId,
            occurredAt: new Date(),
            metadata: { experimentId: experiment._id },
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
    }
    await experiment.save();
    return res.json({ review, experiment });
  } catch (error) {
    return next(error);
  }
});

router.use((_req, res) =>
  res.status(410).json({
    available: false,
    code: 'MANAGER_COACHING_V1_RETIRED',
    message:
      'This Manager Coaching endpoint has been retired. Use the authenticated v2 self-service API.',
  })
);

function validateSelfContext(req, res, next) {
  const orgId = req.query?.orgId || req.body?.orgId;
  if (!orgId) return res.status(400).json({ message: 'Organization ID required.' });
  if (!mongoose.isValidObjectId(orgId)) {
    return res.status(400).json({ message: 'Organization ID is invalid.' });
  }
  if (!canAccessOrg(req.user, orgId)) {
    return res.status(403).json({ message: 'Forbidden: Organization access denied.' });
  }
  if (!req.user?.userId) return res.status(403).json({ message: 'User identity required.' });
  req.coachingOrgId = orgId;
  return next();
}

function context(req) {
  return { orgId: req.coachingOrgId, userId: req.user.userId };
}

async function findOwnExperiment(req, id, lean = true) {
  if (!mongoose.isValidObjectId(id)) return null;
  const readiness = await getManagerCoachingReadiness(context(req));
  if (!readiness.manager) return null;
  const query = Intervention.findOne({
    _id: id,
    orgId: req.coachingOrgId,
    managerHash: readiness.manager.managerHash,
    source: 'manager_coaching',
    createdBy: referenceId(req.user.userId),
  });
  return lean ? query.lean() : query;
}

async function recordEvent({
  orgId,
  userId,
  managerHash,
  teamId,
  insight,
  eventType,
  experimentId,
}) {
  return ManagerCoachingEvent.findOneAndUpdate(
    { orgId, managerHash, insightId: insight.insightId, eventType },
    {
      $setOnInsert: {
        teamId,
        signalKey: insight.signal,
        actorUserId: userId,
        occurredAt: new Date(),
        metadata: {
          scoringVersion: insight.trigger?.scoringVersion,
          confidence: insight.confidence,
          experimentId,
        },
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
}

function compareMetric(baseline, current, targets) {
  const target = targets.find((item) => item.metric === baseline.metric);
  if (!Number.isFinite(baseline.value) || !Number.isFinite(current?.value)) {
    return {
      metric: baseline.metric,
      baselineValue: baseline.value,
      value: current?.value,
      direction: target?.direction,
      interpretation: 'insufficient_data',
      coverage: current?.coverage,
      confidence: current?.confidence || 'low',
    };
  }
  const absoluteChange = current.value - baseline.value;
  const percentChange =
    baseline.value === 0 ? null : (absoluteChange / Math.abs(baseline.value)) * 100;
  const material =
    percentChange == null ? Math.abs(absoluteChange) > 0 : Math.abs(percentChange) >= 5;
  const improved =
    target?.direction === 'up'
      ? absoluteChange > 0
      : target?.direction === 'stable'
        ? !material
        : absoluteChange < 0;
  return {
    metric: baseline.metric,
    baselineValue: baseline.value,
    value: current.value,
    absoluteChange,
    percentChange,
    direction: target?.direction,
    interpretation: !material ? 'unchanged' : improved ? 'improved' : 'worsened',
    coverage: current.coverage,
    confidence: current.confidence,
  };
}

function summarizeResult(snapshots) {
  const results = snapshots.map((snapshot) => snapshot.interpretation);
  if (results.every((result) => result === 'insufficient_data')) return 'insufficient_data';
  if (results.includes('improved') && results.includes('worsened')) return 'mixed';
  if (results.includes('worsened')) return 'worsened';
  if (results.includes('improved')) return 'improved';
  return 'unchanged';
}

function toLegacyInterpretation(result) {
  if (result === 'unchanged' || result === 'mixed') return 'no_material_change';
  return result;
}

function toLegacyDirection(direction) {
  return direction === 'up' ? 'increase' : direction === 'stable' ? 'stabilize' : 'decrease';
}

function finiteOrUndefined(value) {
  return Number.isFinite(value) ? value : undefined;
}

function addDays(date, days) {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

export const __pure = { compareMetric, summarizeResult, toLegacyInterpretation };

export default router;
