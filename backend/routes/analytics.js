import express from "express";
import Analytics from "../models/analytics.js";

import Project from "../models/project.js";

const router = express.Router();

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

