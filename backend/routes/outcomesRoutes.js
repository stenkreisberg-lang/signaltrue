import express from 'express';
import OperationalOutcome from '../models/operationalOutcome.js';
import Intervention from '../models/intervention.js';
import Team from '../models/team.js';
import {
  authenticateToken,
  requireHROrAdmin,
  requireOrganizationAccess,
  requireTeamAccess,
} from '../middleware/auth.js';
import { privacyGate, privacyGateOrg } from '../middleware/privacyGate.js';
import { summarizeOutcomeEvidence } from '../services/outcomeAnalysisService.js';

const router = express.Router();

function mondayString(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function optionalNonNegative(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// Record independent operational labels. SignalTrue never converts these into
// a fabricated turnover multiplier or causal claim.
router.post(
  '/team/:teamId/record',
  authenticateToken,
  requireHROrAdmin,
  requireTeamAccess(),
  privacyGate,
  async (req, res) => {
    try {
      const team = await Team.findById(req.params.teamId).select('_id orgId').lean();
      if (!team) return res.status(404).json({ message: 'Team not found' });

      const weekStart = mondayString(req.body.weekStart || new Date());
      if (!weekStart) return res.status(400).json({ message: 'Invalid weekStart' });

      const voluntaryExits = optionalNonNegative(req.body.voluntaryExits ?? req.body.turnoverCount);
      const absenceDays = optionalNonNegative(req.body.absenceDays ?? req.body.absenteeismDays);
      const deliveryReliability = optionalNonNegative(req.body.deliveryReliability);
      if (voluntaryExits == null && absenceDays == null && deliveryReliability == null) {
        return res.status(400).json({ message: 'At least one measured outcome is required' });
      }

      const records = [];
      if (voluntaryExits != null || absenceDays != null) {
        records.push(
          await OperationalOutcome.findOneAndUpdate(
            { orgId: team.orgId, teamId: team._id, weekStart, family: 'people' },
            {
              $set: {
                orgId: team.orgId,
                teamId: team._id,
                weekStart,
                family: 'people',
                source: 'manual',
                voluntaryExits,
                absenceDays,
                confidence: 'medium',
              },
            },
            { upsert: true, new: true }
          )
        );
      }
      if (deliveryReliability != null) {
        records.push(
          await OperationalOutcome.findOneAndUpdate(
            { orgId: team.orgId, teamId: team._id, weekStart, family: 'delivery' },
            {
              $set: {
                orgId: team.orgId,
                teamId: team._id,
                weekStart,
                family: 'delivery',
                source: 'manual',
                value: deliveryReliability,
                label: 'delivery_reliability',
                confidence: 'medium',
              },
            },
            { upsert: true, new: true }
          )
        );
      }

      return res.json({ message: 'Measured outcomes recorded', records });
    } catch (error) {
      console.error('[Outcomes] Record error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
);

// Summarize only recorded outcomes and measured before/after action reviews.
router.get(
  '/org/:orgId/analysis',
  authenticateToken,
  requireOrganizationAccess(),
  privacyGateOrg,
  async (req, res) => {
    try {
      const days = Math.min(365, Math.max(28, Number(req.query.days) || 180));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const sinceWeek = since.toISOString().slice(0, 10);
      const suppressed = req.suppressedTeamIds || new Set();
      const orgTeams = await Team.find({ orgId: req.params.orgId }).select('_id').lean();
      const visibleTeams = orgTeams
        .filter((team) => !suppressed.has(String(team._id)))
        .map((team) => team._id);

      const [outcomes, interventions] = await Promise.all([
        OperationalOutcome.find({
          orgId: req.params.orgId,
          teamId: { $in: visibleTeams },
          weekStart: { $gte: sinceWeek },
        })
          .populate('teamId', 'name')
          .sort({ weekStart: 1 })
          .lean(),
        Intervention.find({
          orgId: req.params.orgId,
          teamId: { $in: visibleTeams },
          createdAt: { $gte: since },
          'outcomeDelta.metricAfter': { $type: 'number' },
        })
          .populate('teamId', 'name')
          .sort({ createdAt: -1 })
          .lean(),
      ]);

      return res.json({
        periodDays: days,
        ...summarizeOutcomeEvidence(outcomes, interventions),
      });
    } catch (error) {
      console.error('[Outcomes] Analysis error:', error);
      return res.status(500).json({ message: error.message });
    }
  }
);

export default router;
