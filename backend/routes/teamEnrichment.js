import express from 'express';
import rateLimit from 'express-rate-limit';
import Organization from '../models/organizationModel.js';
import TeamMappingSuggestion from '../models/teamMappingSuggestion.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import {
  analyzeAndApplyPublicTeamStructure,
  applyTeamMappingSuggestions,
  suggestPublicWebsiteUrl,
} from '../services/publicTeamEnrichmentService.js';

const router = express.Router();
const adminOnly = requireRoles(['hr_admin', 'admin', 'master_admin']);
const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Team enrichment can be run up to five times per hour.' },
});

router.use(authenticateToken, adminOnly);

router.get('/', async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const catchAllTeams = await Team.find({
      orgId,
      name: { $regex: /^(unassigned|general|other|unknown|default|everyone|all)$/i },
    })
      .select('_id')
      .lean();
    const [org, suggestions, unassignedCount, representativeUser] = await Promise.all([
      Organization.findById(orgId)
        .select(
          'domain websiteUrl linkedinUrl teamEnrichment settings.timezone settings.timezoneConfirmedAt settings.workdayStart settings.workdayEnd settings.loadedHourlyCost settings.currency'
        )
        .lean(),
      TeamMappingSuggestion.find({ orgId, status: 'pending' })
        .populate('userId', 'name email profile.title profile.department')
        .sort({ confidence: -1, createdAt: -1 })
        .lean(),
      User.countDocuments({
        orgId,
        accountStatus: { $ne: 'inactive' },
        $or: [
          { teamId: null },
          { teamId: { $exists: false } },
          { teamId: { $in: catchAllTeams.map((team) => team._id) } },
        ],
      }),
      User.findOne({ orgId, accountStatus: { $ne: 'inactive' } })
        .sort({ role: 1, createdAt: 1 })
        .select('email')
        .lean(),
    ]);
    const resolvedWebsiteUrl = suggestPublicWebsiteUrl({
      websiteUrl: org?.websiteUrl,
      domain: org?.domain,
      email: representativeUser?.email,
    });
    res.json({
      websiteUrl: resolvedWebsiteUrl,
      linkedinUrl: org?.linkedinUrl || '',
      enrichment: org?.teamEnrichment || { status: 'not_started' },
      reportSettings: {
        timezone: org?.settings?.timezone || 'UTC',
        timezoneConfirmed: !!org?.settings?.timezoneConfirmedAt,
        workdayStart: org?.settings?.workdayStart || '09:00',
        workdayEnd: org?.settings?.workdayEnd || '17:00',
        loadedHourlyCost: org?.settings?.loadedHourlyCost ?? null,
        currency: org?.settings?.currency || 'EUR',
      },
      unassignedCount,
      suggestions,
    });
  } catch (error) {
    console.error('[TeamEnrichment] Status error:', error);
    res.status(500).json({ message: 'Failed to load team mapping suggestions.' });
  }
});

router.put('/report-settings', async (req, res) => {
  try {
    const timezone = String(req.body.timezone || 'UTC').trim();
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    } catch {
      return res
        .status(400)
        .json({ message: 'Enter a valid IANA timezone, such as Europe/Tallinn.' });
    }
    const clockPattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    const workdayStart = String(req.body.workdayStart || '09:00');
    const workdayEnd = String(req.body.workdayEnd || '17:00');
    if (!clockPattern.test(workdayStart) || !clockPattern.test(workdayEnd)) {
      return res.status(400).json({ message: 'Working hours must use 24-hour HH:MM format.' });
    }
    const clockMinutes = (value) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };
    if (clockMinutes(workdayEnd) <= clockMinutes(workdayStart)) {
      return res.status(400).json({ message: 'Workday end must be later than workday start.' });
    }
    const loadedHourlyCost =
      req.body.loadedHourlyCost === '' || req.body.loadedHourlyCost == null
        ? null
        : Number(req.body.loadedHourlyCost);
    if (
      loadedHourlyCost != null &&
      (!Number.isFinite(loadedHourlyCost) || loadedHourlyCost < 0 || loadedHourlyCost > 10000)
    ) {
      return res.status(400).json({ message: 'Loaded hourly cost must be between 0 and 10,000.' });
    }
    const currency = String(req.body.currency || 'EUR')
      .trim()
      .toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      return res.status(400).json({ message: 'Currency must be a three-letter ISO code.' });
    }
    const org = await Organization.findOneAndUpdate(
      { _id: req.user.orgId },
      {
        $set: {
          'settings.timezone': timezone,
          'settings.timezoneConfirmedAt': new Date(),
          'settings.workdayStart': workdayStart,
          'settings.workdayEnd': workdayEnd,
          'settings.loadedHourlyCost': loadedHourlyCost,
          'settings.currency': currency,
        },
      },
      { returnDocument: 'after' }
    );
    await Team.updateMany(
      { orgId: req.user.orgId },
      {
        $set: {
          timezone,
          'workConfig.workdayStart': workdayStart,
          'workConfig.workdayEnd': workdayEnd,
        },
      }
    );
    res.json({ message: 'Report assumptions updated.', reportSettings: org.settings });
  } catch (error) {
    console.error('[TeamEnrichment] Report settings error:', error);
    res.status(500).json({ message: 'Failed to update report assumptions.' });
  }
});

router.post('/analyze', analyzeLimiter, async (req, res) => {
  const orgId = req.user.orgId;
  try {
    const result = await analyzeAndApplyPublicTeamStructure({
      orgId,
      websiteUrl: req.body.websiteUrl,
      linkedinUrl: req.body.linkedinUrl,
      decidedBy: req.user.userId,
    });
    const { summary } = result;
    res.json({
      message: `Scanned ${summary.pagesScanned} public page(s) and found ${summary.peopleFound} named profile(s). Automatically assigned ${summary.autoApplied} employee(s); ${summary.pendingReview} suggestion(s) need review; ${summary.unmatched} remain unmatched.`,
      suggestions: result.suggestions,
      summary,
    });
  } catch (error) {
    await Organization.updateOne(
      { _id: orgId },
      {
        $set: {
          'teamEnrichment.status': 'failed',
          'teamEnrichment.lastError': error.message,
          'teamEnrichment.lastAnalyzedAt': new Date(),
        },
      }
    ).catch(() => {});
    console.error('[TeamEnrichment] Analyze error:', error);
    res.status(400).json({ message: error.message || 'Website analysis failed.' });
  }
});

router.post('/apply', async (req, res) => {
  try {
    const suggestionIds = Array.isArray(req.body.suggestionIds) ? req.body.suggestionIds : [];
    if (suggestionIds.length === 0 || suggestionIds.length > 200) {
      return res.status(400).json({ message: 'Select between 1 and 200 suggestions.' });
    }
    const result = await applyTeamMappingSuggestions({
      orgId: req.user.orgId,
      suggestionIds,
      decidedBy: req.user.userId,
    });
    res.json({ message: `Applied ${result.applied} team assignment(s).`, ...result });
  } catch (error) {
    console.error('[TeamEnrichment] Apply error:', error);
    res.status(500).json({ message: 'Failed to apply team assignments.' });
  }
});

router.post('/reject', async (req, res) => {
  try {
    const suggestionIds = Array.isArray(req.body.suggestionIds) ? req.body.suggestionIds : [];
    if (suggestionIds.length === 0 || suggestionIds.length > 200) {
      return res.status(400).json({ message: 'Select between 1 and 200 suggestions.' });
    }
    const result = await TeamMappingSuggestion.updateMany(
      { _id: { $in: suggestionIds }, orgId: req.user.orgId, status: 'pending' },
      {
        $set: {
          status: 'rejected',
          decidedBy: req.user.userId,
          decidedAt: new Date(),
        },
      }
    );
    const pending = await TeamMappingSuggestion.countDocuments({
      orgId: req.user.orgId,
      status: 'pending',
    });
    await Organization.updateOne(
      { _id: req.user.orgId },
      { $set: { 'teamEnrichment.status': pending > 0 ? 'pending_review' : 'completed' } }
    );
    res.json({ message: `Rejected ${result.modifiedCount} suggestion(s).` });
  } catch (error) {
    console.error('[TeamEnrichment] Reject error:', error);
    res.status(500).json({ message: 'Failed to reject team mapping suggestions.' });
  }
});

export default router;
