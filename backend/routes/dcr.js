import express from 'express';
import { calculateDCR, getLatestDCR, getDCRHistory } from '../services/dcrService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   GET /api/dcr/latest
 * @desc    Get latest Decision Closure Rate for organization or team
 * @access  Protected
 */
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const { orgId, teamId } = req.query;

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }

    const dcr = await getLatestDCR(orgId, teamId || null);

    if (!dcr) {
      return res.status(404).json({ message: 'No DCR data found' });
    }

    res.json(dcr);
  } catch (error) {
    console.error('Error fetching latest DCR:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/dcr/history
 * @desc    Get DCR history for trending
 * @access  Protected
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { orgId, teamId, days = 30 } = req.query;

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }

    const history = await getDCRHistory(orgId, teamId || null, parseInt(days));

    res.json(history);
  } catch (error) {
    console.error('Error fetching DCR history:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/dcr/calculate
 * @desc    Calculate DCR for a specific period
 * @access  Protected (admin only)
 */
router.post('/calculate', authenticateToken, async (req, res) => {
  try {
    const { orgId, teamId, startDate, endDate } = req.body;

    if (!orgId || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Organization ID, start date, and end date required' 
      });
    }

    const dcr = await calculateDCR(
      orgId, 
      teamId || null, 
      new Date(startDate), 
      new Date(endDate)
    );

    res.status(201).json(dcr);
  } catch (error) {
    console.error('Error calculating DCR:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/dcr/team/:teamId
 * @desc    Get DCR for specific team with trend analysis
 * @access  Protected
 */
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { orgId } = req.query;

    if (!orgId) {
      return res.status(400).json({ message: 'Organization ID required' });
    }

    const [latest, history] = await Promise.all([
      getLatestDCR(orgId, teamId),
      getDCRHistory(orgId, teamId, 30)
    ]);

    res.json({
      latest,
      history,
      trend: latest?.trend || null
    });
  } catch (error) {
    console.error('Error fetching team DCR:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
