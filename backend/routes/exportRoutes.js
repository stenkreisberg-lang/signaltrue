import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { requireTier } from '../middleware/checkTier.js';
import MetricsDaily from '../models/metricsDaily.js';
import DriftEvent from '../models/driftEvent.js';
import Team from '../models/team.js';

const router = express.Router();

// GET /api/export/metrics-csv - Export team metrics as CSV
// REQUIRES: Impact Proof tier
router.get('/export/metrics-csv', authenticateToken, requireTier('impact_proof'), async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30*24*3600*1000);
    const end = endDate ? new Date(endDate) : new Date();
    const teams = await Team.find({ orgId });
    const teamIds = teams.map(t => t._id);
    const metrics = await MetricsDaily.find({ teamId: { $in: teamIds }, date: { $gte: start, $lte: end } }).sort({ date: 1 });
    const csv = [
      'Date,TeamName,MeetingHours,MeetingLoadIndex,AfterHoursRate,ResponseMedianMins,SentimentAvg,UniqueContacts,FocusTimeRatio,RecoveryDays,EnergyIndex'
    ];
    for (const m of metrics) {
      const team = teams.find(t => String(t._id) === String(m.teamId));
      csv.push([
        m.date.toISOString().split('T')[0],
        team?.name || 'Unknown',
        m.meetingHoursWeek,
        m.meetingLoadIndex,
        m.afterHoursRate,
        m.responseMedianMins,
        m.sentimentAvg,
        m.uniqueContacts,
        m.focusTimeRatio,
        m.recoveryDays,
        m.energyIndex
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="signaltrue-metrics-${Date.now()}.csv"`);
    res.send(csv.join('\n'));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/export/drift-csv - Export drift events as CSV
// REQUIRES: Impact Proof tier
router.get('/export/drift-csv', authenticateToken, requireTier('impact_proof'), async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30*24*3600*1000);
    const end = endDate ? new Date(endDate) : new Date();
    const events = await DriftEvent.find({ orgId, date: { $gte: start, $lte: end } }).sort({ date: -1 });
    const csv = [
      'Date,TeamID,Metric,Direction,Magnitude,Acknowledged,Recommendation,TopContributors'
    ];
    for (const e of events) {
      csv.push([
        e.date.toISOString().split('T')[0],
        e.teamId,
        e.metric,
        e.direction,
        e.magnitude,
        e.acknowledged,
        `"${e.recommendation || ''}"`,
        `"${e.topContributors?.map(c => `${c.metric}:${c.change}`).join(';') || ''}"`
      ].join(','));
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="signaltrue-drift-${Date.now()}.csv"`);
    res.send(csv.join('\n'));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
