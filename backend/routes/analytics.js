import express from 'express';
import Analytics from '../models/analytics.js';
import { FUNNEL_EVENT_NAMES, getGa4Overview } from '../services/ga4Service.js';

import Project from '../models/project.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { analyticsWriteLimiter } from '../middleware/security.js';

const router = express.Router();
const MAX_ANALYTICS_PAYLOAD_BYTES = 8 * 1024;
const EVENT_NAME_PATTERN = /^[A-Za-z0-9_.:-]{1,64}$/;
const COMMERCIAL_HOSTNAME = 'www.signaltrue.ai';
const COMMERCIAL_EVENTS = new Set(['page_view', ...FUNNEL_EVENT_NAMES]);
const PRIVATE_PATH_PATTERN =
  /^\/(?:app|dashboard|login|forgot-password|register|onboarding|admin|superadmin|settings|notifications|integrations|team-analytics|ceo-summary|drift-report)(?:\/|$)/i;
const AUTOMATION_MARKER_PATTERN =
  /^(?:production[_ -]?smoke|qa|quality[_ -]?assurance|automated[_ -]?qa|e2e|playwright|puppeteer|test)$/i;

function validateAnalyticsEvent(eventName, payload) {
  if (!EVENT_NAME_PATTERN.test(eventName)) return 'Invalid analytics event name';
  if (
    payload !== undefined &&
    (payload === null || typeof payload !== 'object' || Array.isArray(payload))
  ) {
    return 'Analytics payload must be an object';
  }
  if (Buffer.byteLength(JSON.stringify(payload || {}), 'utf8') > MAX_ANALYTICS_PAYLOAD_BYTES) {
    return 'Analytics payload is too large';
  }
  return null;
}

export function isGenuinePublicCommercialEvent(req, eventName, data = {}) {
  if (process.env.NODE_ENV !== 'production' || !COMMERCIAL_EVENTS.has(eventName)) return true;

  let origin;
  try {
    origin = new URL(req.get('origin') || req.get('referer') || '');
  } catch {
    return false;
  }
  if (origin.hostname.toLowerCase() !== COMMERCIAL_HOSTNAME) return false;

  const rawPath = String(data.page_path || origin.pathname || '/');
  let url;
  try {
    url = new URL(rawPath, `https://${COMMERCIAL_HOSTNAME}`);
  } catch {
    return false;
  }
  if (PRIVATE_PATH_PATTERN.test(url.pathname)) return false;

  const automated = ['utm_source', 'utm_medium', 'utm_campaign'].some((key) =>
    AUTOMATION_MARKER_PATTERN.test(url.searchParams.get(key) || '')
  );
  const debug = ['1', 'true', 'yes'].includes(
    (url.searchParams.get('debug_mode') || '').toLowerCase()
  );
  const userAgent = req.get('user-agent') || '';
  return (
    !automated &&
    !debug &&
    !/(?:bot|crawler|spider|headlesschrome|lighthouse|playwright|puppeteer)/i.test(userAgent)
  );
}

// Defined events for SignalTrue Trial, Conversion & CEO Escalation Flow
const DEFINED_EVENTS = [
  'assessment_started',
  'assessment_completed',
  'email_submitted',
  'monthly_report_viewed',
  'ceo_summary_generated',
  'ceo_summary_shared',
  'upgrade_cta_clicked',
  // Additional useful events
  'trial_started',
  'trial_phase_changed',
  'paywall_shown',
  'pricing_page_viewed',
  ...FUNNEL_EVENT_NAMES,
];

// POST - Record an analytics event
router.post('/', analyticsWriteLimiter, async (req, res) => {
  try {
    const { eventName, payload, projectId } = req.body;
    if (!eventName || typeof eventName !== 'string') {
      return res.status(400).json({ message: "'eventName' is required" });
    }
    const validationError = validateAnalyticsEvent(eventName, payload);
    if (validationError) return res.status(400).json({ message: validationError });

    const doc = new Analytics({ eventName, payload: payload || {}, projectId });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /track - Simplified tracking endpoint for frontend
router.post('/track', analyticsWriteLimiter, async (req, res) => {
  try {
    const { event, data, timestamp } = req.body;
    if (!event || typeof event !== 'string') {
      return res.status(400).json({ message: "'event' is required" });
    }
    const validationError = validateAnalyticsEvent(event, data);
    if (validationError) return res.status(400).json({ message: validationError });
    if (!isGenuinePublicCommercialEvent(req, event, data)) {
      return res.status(202).json({ success: true, ignored: true });
    }

    const doc = new Analytics({
      eventName: event,
      payload: { ...data, timestamp: timestamp || new Date().toISOString() },
    });
    await doc.save();

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics Track] ${event}`, data);
    }

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - Get defined events list
router.get('/events', authenticateToken, requireAdmin, async (req, res) => {
  res.json({ events: DEFINED_EVENTS });
});

// GET - Get event counts for conversion funnel
router.get('/funnel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const funnelEvents = [
      'page_view',
      'sample_report_click',
      'sample_report_view',
      'trust_overview_download',
      'primary_cta_click',
      'pricing_plan_click',
      'lead_form_start',
      'lead_submit_success',
      'lead_confirmed',
      'diagnostic_started',
      'diagnostic_completed',
      'diagnostic_lead_confirmed',
      'checkout_started',
      'subscription_started',
    ];

    const counts = await Analytics.aggregate([
      { $match: { eventName: { $in: funnelEvents } } },
      { $group: { _id: '$eventName', count: { $sum: 1 } } },
    ]);

    // Format as funnel stages
    const funnel = funnelEvents.map((event) => ({
      stage: event,
      count: counts.find((c) => c._id === event)?.count || 0,
    }));

    res.json({ funnel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - summary stats for analytics dashboard
router.get('/summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalProjects = await Project.countDocuments();
    const favoriteCount = await Project.countDocuments({ favorite: true });

    // projects per week (last 8 weeks)
    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
    const perWeek = await Project.aggregate([
      { $match: { createdAt: { $gte: eightWeeksAgo } } },
      {
        $group: {
          _id: {
            $floor: {
              $divide: [
                {
                  $divide: [{ $subtract: ['$createdAt', eightWeeksAgo] }, 1000 * 60 * 60 * 24 * 7],
                },
                1,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // event counts
    const events = await Analytics.aggregate([
      { $group: { _id: '$eventName', count: { $sum: 1 } } },
    ]);

    // recent events for quick inspection
    const recentEvents = await Analytics.find().sort({ createdAt: -1 }).limit(10).lean();

    res.json({ totalProjects, favoriteCount, perWeek, events, recentEvents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - GA4 reporting overview for site performance dashboard
router.get('/ga4/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const overview = await getGa4Overview();
    res.json(overview);
  } catch (err) {
    const message =
      err?.response?.data?.error?.message || err.message || 'Unable to load GA4 overview.';
    res.status(502).json({
      connected: false,
      propertyId: process.env.GA4_PROPERTY_ID || null,
      message,
    });
  }
});

export default router;
