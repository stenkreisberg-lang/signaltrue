import express from "express";
import Analytics from "../models/analytics.js";

import Project from "../models/project.js";

const router = express.Router();

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
  'pricing_page_viewed'
];

// POST - Record an analytics event
router.post("/", async (req, res) => {
  try {
    const { eventName, payload, projectId } = req.body;
    if (!eventName || typeof eventName !== "string") {
      return res.status(400).json({ message: "'eventName' is required" });
    }

    const doc = new Analytics({ eventName, payload: payload || {}, projectId });
    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /track - Simplified tracking endpoint for frontend
router.post("/track", async (req, res) => {
  try {
    const { event, data, timestamp } = req.body;
    if (!event || typeof event !== "string") {
      return res.status(400).json({ message: "'event' is required" });
    }

    const doc = new Analytics({ 
      eventName: event, 
      payload: { ...data, timestamp: timestamp || new Date().toISOString() }
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
router.get("/events", async (req, res) => {
  res.json({ events: DEFINED_EVENTS });
});

// GET - Get event counts for conversion funnel
router.get("/funnel", async (req, res) => {
  try {
    const funnelEvents = [
      'assessment_started',
      'assessment_completed',
      'email_submitted',
      'monthly_report_viewed',
      'ceo_summary_generated',
      'upgrade_cta_clicked'
    ];
    
    const counts = await Analytics.aggregate([
      { $match: { eventName: { $in: funnelEvents } } },
      { $group: { _id: "$eventName", count: { $sum: 1 } } }
    ]);
    
    // Format as funnel stages
    const funnel = funnelEvents.map(event => ({
      stage: event,
      count: counts.find(c => c._id === event)?.count || 0
    }));
    
    res.json({ funnel });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET - summary stats for analytics dashboard
router.get("/summary", async (req, res) => {
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
                { $divide: [{ $subtract: ["$createdAt", eightWeeksAgo] }, 1000 * 60 * 60 * 24 * 7] },
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
      { $group: { _id: "$eventName", count: { $sum: 1 } } },
    ]);

    // recent events for quick inspection
    const recentEvents = await Analytics.find().sort({ createdAt: -1 }).limit(10).lean();

    res.json({ totalProjects, favoriteCount, perWeek, events, recentEvents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

