import express from 'express';
import { sendWeeklyBrief, generateWeeklyBrief } from '../services/weeklyBriefService.js';
import { requireHROrAdmin, requireOrganizationAccess, requireRoles } from '../middleware/auth.js';
import {
  getLatestWeeklyBriefSnapshot,
  getWeeklyBriefSnapshotHistory,
} from '../services/weeklyBriefSnapshotService.js';
import { askWeeklyBrief } from '../services/weeklyBriefAssistantService.js';
import WeekContext from '../models/weekContext.js';

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
    await generateWeeklyBrief(orgId);
    snapshot = await getLatestWeeklyBriefSnapshot(orgId);
  }
  return snapshot;
}

// GET /api/weekly-brief/latest - exact structured snapshot behind the emailed brief
router.get('/latest', requireRoles(DASHBOARD_ROLES), requireOrgContext, async (req, res) => {
  try {
    const snapshot = await loadOrGenerateLatest(req.user.orgId);
    if (!snapshot) return res.status(404).json({ message: 'No weekly brief is available yet' });
    res.json(snapshot);
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

// POST /api/weekly-brief/refresh - regenerate from current measured data
router.post('/refresh', requireHROrAdmin, requireOrgContext, async (req, res) => {
  try {
    await generateWeeklyBrief(req.user.orgId);
    const snapshot = await getLatestWeeklyBriefSnapshot(req.user.orgId);
    res.json(snapshot);
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
    const html = await generateWeeklyBrief(req.params.orgId);
    res.send(html);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
