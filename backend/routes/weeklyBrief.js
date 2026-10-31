import express from 'express';
import { sendWeeklyBrief, generateWeeklyBrief, generateClientWeeklyEmail } from '../services/weeklyBriefService.js';
import { requireHROrAdmin, requireOrganizationAccess, requireRoles } from '../middleware/auth.js';
import {
  getLatestWeeklyBriefSnapshot,
  getWeeklyBriefSnapshotHistory,
} from '../services/weeklyBriefSnapshotService.js';
import { askWeeklyBrief } from '../services/weeklyBriefAssistantService.js';
import WeekContext from '../models/weekContext.js';
import User from '../models/user.js';
import mongoose from 'mongoose';
import WeeklyBriefFeedback from '../models/weeklyBriefFeedback.js';
import WeeklyBriefSnapshot from '../models/weeklyBriefSnapshot.js';
import { getReportTrendSeries } from '../services/reportTrendService.js';

const router = express.Router();
const DASHBOARD_ROLES = ['master_admin', 'admin', 'hr_admin', 'executive'];
const SNAPSHOT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function requireOrgContext(req, res, next) {
  if (!req.user?.orgId) {
    return res.status(403).json({ message: 'Organization context required' });
  }
  next();
}

async function loadOrGenerateLatest(orgId) {
  let snapshot = await getLatestWeeklyBriefSnapshot(orgId);
  const generatedAt = snapshot?.generatedAt || snapshot?.updatedAt || snapshot?.createdAt;
  const stale = !generatedAt || Date.now() - new Date(generatedAt).getTime() > SNAPSHOT_MAX_AGE_MS;
  if (!snapshot || stale) {
    try {
      await generateWeeklyBrief(orgId);
      snapshot = await getLatestWeeklyBriefSnapshot(orgId);
    } catch (err) {
      if (!snapshot) throw err;
      console.warn(
        '[WeeklyBrief] Saved report refresh failed; explicitly marking the prior period as stale:',
        err.message
      );
      snapshot = { ...snapshot, refreshFailed: true };
    }
  }
  return snapshot;
}

async function addSnapshotFreshness(orgId, snapshot) {
  if (!snapshot) return snapshot;
  const currentTotalUsers = await User.countDocuments({
    orgId,
    accountStatus: { $ne: 'inactive' },
  });
  const snapshotTotalUsers = Number(snapshot.coverage?.totalUsers || 0);
  const directoryDelta = currentTotalUsers - snapshotTotalUsers;
  return {
    ...snapshot,
    freshness: {
      currentTotalUsers,
      snapshotTotalUsers,
      directoryDelta,
      userCountChanged: snapshotTotalUsers > 0 && directoryDelta !== 0,
      refreshFailed: snapshot.refreshFailed === true,
      stale: Boolean(snapshot.refreshFailed) || new Date(snapshot.generatedAt).getTime() < Date.now() - SNAPSHOT_MAX_AGE_MS,
      generatedAt: snapshot.generatedAt,
    },
  };
}

// GET /api/weekly-brief/latest - exact structured snapshot behind the emailed brief
router.get('/latest', requireRoles(DASHBOARD_ROLES), requireOrgContext, async (req, res) => {
  try {
    const snapshot = await loadOrGenerateLatest(req.user.orgId);
    if (!snapshot) return res.status(404).json({ message: 'No weekly brief is available yet' });
    res.json(await addSnapshotFreshness(req.user.orgId, snapshot));
  } catch (err) {
    console.error('[WeeklyBrief] Failed to load latest dashboard snapshot:', err.message);
    res.status(500).json({ message: 'Unable to load the latest weekly brief' });
  }
});

// GET /api/weekly-brief/history - tenant-scoped report history
router.get('/history', requireRoles(DASHBOARD_ROLES), requireOrgContext, async (req, res) => {
  try {
    const snapshots = await getWeeklyBriefSnapshotHistory(req.user.orgId, req.query.limit);
    res.json({ count: snapshots.length, snapshots });
  } catch (err) {
    console.error('[WeeklyBrief] Failed to load snapshot history:', err.message);
    res.status(500).json({ message: 'Unable to load weekly brief history' });
  }
});

// GET /api/weekly-brief/trends — tenant-scoped historical rolling snapshots.
router.get('/trends', requireRoles(DASHBOARD_ROLES), requireOrgContext, async (req, res) => {
  try {
    const snapshot = await getLatestWeeklyBriefSnapshot(req.user.orgId);
    const trends = await getReportTrendSeries(req.user.orgId, new Date(), {
      includeTeams: true,
      minimumGroupSize: Math.max(8, Number(snapshot?.coverage?.minimumTeamSize) || 8),
    });
    const availability = Object.fromEntries((snapshot?.metrics || []).map(m => [
      m.key, {
        available: m.available === true,
        represented: m.readiness?.mappedUsers ?? null,
        population: m.readiness?.totalUsers ?? null,
        reason: m.readiness?.reason ?? null,
      },
    ]));
    res.json({ ...trends, availability });
  } catch (err) {
    console.error('[WeeklyBrief] Failed to load report trends:', err.message);
    res.status(500).json({ message: 'Unable to load measured time series' });
  }
});

// POST /api/weekly-brief/refresh - regenerate from current measured data
router.post('/refresh', requireHROrAdmin, requireOrgContext, async (req, res) => {
  try {
    await generateWeeklyBrief(req.user.orgId);
    const snapshot = await getLatestWeeklyBriefSnapshot(req.user.orgId);
    res.json(await addSnapshotFreshness(req.user.orgId, snapshot));
  } catch (err) {
    console.error('[WeeklyBrief] Failed to refresh dashboard snapshot:', err.message);
    res.status(500).json({ message: 'Unable to refresh the weekly brief' });
  }
});

// POST /api/weekly-brief/ask - report-grounded AI follow-up
router.post('/ask', requireRoles(DASHBOARD_ROLES), requireOrgContext, async (req, res) => {
  try {
    const question = String(req.body?.question || '').trim();
    if (question.length < 4 || question.length > 500) {
      return res.status(400).json({ message: 'Question must be between 4 and 500 characters' });
    }

    const snapshot = await loadOrGenerateLatest(req.user.orgId);
    if (!snapshot) return res.status(404).json({ message: 'No weekly brief is available yet' });
    const contextTags = await WeekContext.find({
      orgId: req.user.orgId,
      weekStart: { $lte: new Date(snapshot.periodEnd) },
      weekEnd: { $gte: new Date(snapshot.periodStart) },
    })
      .select('tag description confidenceReduction')
      .lean();
    const answer = await askWeeklyBrief({ snapshot, question, contextTags });
    res.json(answer);
  } catch (err) {
    console.error('[WeeklyBrief] Follow-up analysis failed:', err.message);
    res.status(500).json({ message: 'Unable to answer from the latest weekly brief' });
  }
});


// HR feedback is tied to a real saved snapshot. It is not treated as source
// telemetry and cannot overwrite factual measurements.
router.get('/feedback/latest', requireHROrAdmin, requireOrgContext, async (req, res) => {
  try {
    const snapshot = await getLatestWeeklyBriefSnapshot(req.user.orgId);
    if (!snapshot) return res.status(404).json({ message: 'No saved report available' });
    const entry = await WeeklyBriefFeedback.findOne({
      orgId: req.user.orgId, userId: req.user.userId, snapshotId: snapshot.id,
    }).select('useful novel action note updatedAt').lean();
    return res.json({ feedback: entry || null });
  } catch (error) {
    console.error('[WeeklyFeedback] Read failed:', error.message);
    return res.status(500).json({ message: 'Could not load report feedback' });
  }
});

router.post('/feedback', requireHROrAdmin, requireOrgContext, async (req, res) => {
  try {
    const snapshotId = req.body?.snapshotId;
    const useful = req.body?.useful;
    const novel = req.body?.novel;
    const action = req.body?.action;
    const note = String(req.body?.note || '').trim();
    if (!mongoose.isValidObjectId(snapshotId) ||
      !['yes', 'no', 'unclear'].includes(useful) ||
      typeof novel !== 'boolean' ||
      !['investigate', 'record', 'none'].includes(action) || note.length > 500) {
      return res.status(400).json({ message: 'Select usefulness, novelty, action and an optional short note' });
    }
    const saved = await WeeklyBriefSnapshot.findOne({ _id: snapshotId, orgId: req.user.orgId })
      .select('_id').lean();
    if (!saved) return res.status(404).json({ message: 'Report does not belong to your organisation' });
    const entry = await WeeklyBriefFeedback.findOneAndUpdate({
      orgId: req.user.orgId, userId: req.user.userId, snapshotId: saved._id,
    }, { $set: { useful, novel, action, note } }, { upsert: true, new: true, runValidators: true });
    return res.json({ status: 'recorded', updatedAt: entry.updatedAt });
  } catch (error) {
    console.error('[WeeklyFeedback] Save failed:', error.message);
    return res.status(500).json({ message: 'Could not save report feedback' });
  }
});

// POST /api/weekly-brief/:orgId/send — trigger manual send
router.post('/:orgId/send', requireHROrAdmin, requireOrganizationAccess(), async (req, res) => {
  try {
    await sendWeeklyBrief(req.params.orgId);
    res.json({ message: 'Weekly HR brief sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/weekly-brief/:orgId/preview — preview the email content
router.get('/:orgId/preview', requireHROrAdmin, requireOrganizationAccess(), async (req, res) => {
  try {
    const html = await generateClientWeeklyEmail(req.params.orgId);
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
