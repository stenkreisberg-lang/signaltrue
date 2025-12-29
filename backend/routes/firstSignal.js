/**
 * First Signal Routes
 * API endpoints for "Moment of Unease" onboarding
 * Fetches and acknowledges the first signal shown to a user
 */

import express from 'express';
import { computeFirstSignal } from '../services/firstSignalService.js';
import User from '../models/user.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/first-signal
 * Fetch the first signal for the authenticated user's team
 * Returns null if no drift detected or if already shown
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If already shown, return the stored data
    if (user.firstSignalShown && user.firstSignalData) {
      return res.json({
        alreadyShown: true,
        signal: user.firstSignalData
      });
    }

    // Check if user has team context
    if (!user.teamId || !user.orgId) {
      return res.json({ signal: null, reason: 'No team context' });
    }

    // Compute first signal
    const signal = await computeFirstSignal(user.teamId, user.orgId);
    
    if (!signal) {
      return res.json({ signal: null, reason: 'No drift detected' });
    }

    // Store the signal data (but don't mark as shown yet)
    user.firstSignalData = signal;
    await user.save();

    res.json({ signal, alreadyShown: false });
  } catch (error) {
    console.error('[FirstSignal API] Error:', error);
    res.status(500).json({ message: 'Failed to compute first signal', error: error.message });
  }
});

/**
 * POST /api/first-signal/acknowledge
 * Mark the first signal as shown and acknowledged
 * Body: { action: 'see-why' | 'continue-to-dashboard' }
 */
router.post('/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { action } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark as shown
    user.firstSignalShown = true;
    
    // Log the user's choice for analytics
    if (user.firstSignalData) {
      user.firstSignalData.userAction = action;
      user.firstSignalData.acknowledgedAt = new Date();
    }

    await user.save();

    res.json({ 
      message: 'First signal acknowledged',
      action,
      redirectTo: action === 'see-why' ? '/app/signals' : '/dashboard'
    });
  } catch (error) {
    console.error('[FirstSignal Acknowledge] Error:', error);
    res.status(500).json({ message: 'Failed to acknowledge signal', error: error.message });
  }
});

/**
 * POST /api/first-signal/reset (dev/testing only)
 * Reset the first signal flag for testing
 */
router.post('/reset', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.firstSignalShown = false;
    user.firstSignalData = null;
    await user.save();

    res.json({ message: 'First signal reset for testing' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset', error: error.message });
  }
});

export default router;
