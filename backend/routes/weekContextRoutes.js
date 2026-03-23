import express from 'express';
import WeekContext from '../models/weekContext.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/week-context
 * Tag a week with context (planning week, launch, offsite, etc.)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { teamId, weekStart, weekEnd, tag, description, confidenceReduction } = req.body;
    const orgId = req.user.orgId;
    
    if (!weekStart || !tag) {
      return res.status(400).json({ message: 'weekStart and tag are required' });
    }
    
    const context = new WeekContext({
      orgId,
      teamId: teamId || null,
      weekStart: new Date(weekStart),
      weekEnd: weekEnd ? new Date(weekEnd) : new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000),
      tag,
      description,
      confidenceReduction: confidenceReduction || 'moderate',
      taggedBy: req.user._id
    });
    
    await context.save();
    res.status(201).json(context);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/week-context?weekStart=...&teamId=...
 * Get context tags for a specific week
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const query = { orgId };
    
    if (req.query.teamId) {
      query.$or = [{ teamId: req.query.teamId }, { teamId: null }];
    }
    if (req.query.weekStart) {
      const ws = new Date(req.query.weekStart);
      const we = new Date(ws.getTime() + 7 * 24 * 60 * 60 * 1000);
      query.weekStart = { $lte: we };
      query.weekEnd = { $gte: ws };
    }
    
    const contexts = await WeekContext.find(query)
      .sort({ weekStart: -1 })
      .limit(50)
      .populate('taggedBy', 'name email');
    
    res.json(contexts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/week-context/:id
 * Remove a context tag
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const context = await WeekContext.findOneAndDelete({
      _id: req.params.id,
      orgId: req.user.orgId
    });
    if (!context) return res.status(404).json({ message: 'Context tag not found' });
    res.json({ message: 'Context tag removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
