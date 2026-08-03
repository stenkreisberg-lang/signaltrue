import express from 'express';
import Intervention from '../models/intervention.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { getWorkNetworkMap } from '../services/workNetworkService.js';

const router = express.Router();
const leadershipOnly = requireRoles([
  'master_admin',
  'admin',
  'hr_admin',
  'org_admin',
  'executive',
]);

router.use(authenticateToken, leadershipOnly);

router.get('/', async (req, res) => {
  try {
    const days = Number(req.query.days || 28);
    if (!Number.isFinite(days) || days < 14 || days > 90) {
      return res.status(400).json({ message: 'Days must be between 14 and 90.' });
    }
    const network = await getWorkNetworkMap(req.user.orgId, { days });
    const trackedActions = network.insights.length
      ? await Intervention.find({
          orgId: req.user.orgId,
          status: { $in: ['planned', 'active', 'pending-recheck'] },
          'expectedEffectJson.workNetworkInsightId': {
            $in: network.insights.map((insight) => insight.id),
          },
        })
          .select('_id status recheckDate expectedEffectJson.workNetworkInsightId')
          .lean()
      : [];
    const trackedByInsight = new Map(
      trackedActions.map((action) => [
        action.expectedEffectJson.workNetworkInsightId,
        {
          interventionId: action._id,
          status: action.status,
          recheckDate: action.recheckDate,
        },
      ])
    );
    network.insights = network.insights.map((insight) => ({
      ...insight,
      tracking: trackedByInsight.get(insight.id) || null,
    }));
    res.set('Cache-Control', 'private, no-store');
    return res.json(network);
  } catch (error) {
    console.error('[WorkNetwork] Map error:', error);
    return res.status(500).json({ message: 'Failed to build the work network.' });
  }
});

router.post('/actions', async (req, res) => {
  try {
    const insightId = String(req.body.insightId || '').trim();
    const days = Number(req.body.days || 28);
    if (!insightId || insightId.length > 200) {
      return res.status(400).json({ message: 'A valid insight ID is required.' });
    }
    if (!Number.isFinite(days) || days < 14 || days > 90) {
      return res.status(400).json({ message: 'Days must be between 14 and 90.' });
    }

    const network = await getWorkNetworkMap(req.user.orgId, { days });
    if (!network.readiness.ready) {
      return res
        .status(409)
        .json({ message: 'Work Network data is not ready for action tracking.' });
    }
    const insight = network.insights.find((item) => item.id === insightId);
    if (!insight) {
      return res.status(404).json({ message: 'This insight is no longer active.' });
    }

    const existing = await Intervention.findOne({
      orgId: req.user.orgId,
      status: { $in: ['planned', 'active', 'pending-recheck'] },
      'expectedEffectJson.workNetworkInsightId': insight.id,
    }).lean();
    if (existing) {
      return res.status(409).json({
        message: 'This Work Network action is already being tracked.',
        interventionId: existing._id,
      });
    }

    const signalType =
      insight.type === 'interface_overload'
        ? 'coordination-risk'
        : insight.type === 'unusual_isolation'
          ? 'dependency-spread'
          : 'handoff-bottleneck';
    const intervention = await Intervention.create({
      orgId: req.user.orgId,
      teamId: insight.primaryTeamId,
      signalType,
      interventionType: `work_network_${insight.type}`,
      actionType: `work_network_${insight.type}`,
      title: insight.title,
      description: insight.summary,
      actionTaken: insight.action.action,
      expectedEffect: insight.action.measure,
      expectedEffectJson: {
        workNetworkInsightId: insight.id,
        owner: insight.action.owner,
        measure: insight.action.measure,
        metric: insight.metric,
        evidence: insight.evidence,
        teamIds: insight.teamIds,
        measurementWindowDays: days,
      },
      monitoredSignals: ['coordination_strain'],
      effort: 'Low',
      timeframe: '2 weeks',
      status: 'active',
      outcomeDelta: { metricBefore: insight.metric?.value },
      createdBy: req.user.userId,
    });

    return res.status(201).json({
      message: 'Action added to the 14-day measurement loop.',
      interventionId: intervention._id,
      recheckDate: intervention.recheckDate,
    });
  } catch (error) {
    console.error('[WorkNetwork] Action error:', error);
    return res.status(500).json({ message: 'Failed to track the Work Network action.' });
  }
});

export default router;
