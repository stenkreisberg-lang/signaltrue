/**
 * Reminder Cron Routes
 * Endpoints to trigger follow-up reminder emails
 * Can be called by external cron services (Render, GitHub Actions, cron-job.org)
 */

import express from 'express';
import mongoose from 'mongoose';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import Invite from '../models/invite.js';
import ReminderEmail from '../models/reminderEmail.js';
import {
  sendUserFollowUpReminder,
  sendITAdminUrgentReminder
} from '../services/reminderEmailService.js';

const router = express.Router();

// Secret key for cron authentication
const CRON_SECRET = process.env.CRON_SECRET || 'signaltrue-cron-2026';

/**
 * Middleware to verify cron secret
 */
function verifyCronSecret(req, res, next) {
  const secret = req.body.secret || req.query.secret || req.headers['x-cron-secret'];
  if (secret !== CRON_SECRET) {
    return res.status(401).json({ message: 'Invalid cron secret' });
  }
  next();
}

/**
 * POST /api/reminders/check-followups
 * Check for users who need follow-up reminders
 * Should be called every hour by a cron job
 */
router.post('/check-followups', verifyCronSecret, async (req, res) => {
  try {
    const results = {
      usersChecked: 0,
      followupsSent24h: 0,
      followupsSent48h: 0,
      itAdminFollowups: 0,
      errors: []
    };

    // 1. Find users registered 24+ hours ago who haven't connected integrations
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Get all orgs to check integration status
    const orgsWithIntegrations = await Organization.find({
      $or: [
        { 'integrations.slack.installed': true },
        { 'integrations.google.refreshToken': { $exists: true, $ne: null } },
        { 'integrations.googleChat.refreshToken': { $exists: true, $ne: null } },
        { 'integrations.microsoft.refreshToken': { $exists: true, $ne: null } }
      ]
    }).select('_id');
    
    const connectedOrgIds = orgsWithIntegrations.map(o => o._id);

    // Find users in orgs WITHOUT integrations who registered 24+ hours ago
    const usersNeedingReminder = await User.find({
      createdAt: { $lt: twentyFourHoursAgo },
      orgId: { $nin: connectedOrgIds }
    }).populate('orgId');

    results.usersChecked = usersNeedingReminder.length;

    for (const user of usersNeedingReminder) {
      try {
        // Calculate hours since registration
        const hoursSinceRegistration = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60));
        
        // Determine which follow-up to send (24h or 48h)
        let reminderType;
        if (hoursSinceRegistration >= 48) {
          reminderType = 'new-user-followup-48h';
        } else if (hoursSinceRegistration >= 24) {
          reminderType = 'new-user-followup-24h';
        } else {
          continue; // Too early
        }

        // Check if already sent
        const alreadySent = await ReminderEmail.wasAlreadySent(user.email, reminderType);
        if (alreadySent) continue;

        // Send follow-up
        const result = await sendUserFollowUpReminder(user, hoursSinceRegistration);
        
        if (result.success) {
          await ReminderEmail.recordSent({
            recipientEmail: user.email,
            userId: user._id,
            orgId: user.orgId,
            reminderType,
            subject: `${hoursSinceRegistration} hours in — your SignalTrue dashboard is still empty`,
            emailId: result.emailId
          });

          if (reminderType === 'new-user-followup-24h') {
            results.followupsSent24h++;
          } else {
            results.followupsSent48h++;
          }
        }
      } catch (err) {
        results.errors.push({ user: user.email, error: err.message });
      }
    }

    // 2. Check for IT admin invites that are 48+ hours old without completion
    const pendingITInvites = await Invite.find({
      role: 'it_admin',
      status: 'pending',
      createdAt: { $lt: fortyEightHoursAgo }
    });

    for (const invite of pendingITInvites) {
      try {
        // Check if urgent reminder already sent
        const alreadySent = await ReminderEmail.wasAlreadySent(invite.email, 'it-admin-followup-48h');
        if (alreadySent) continue;

        const setupUrl = `https://www.signaltrue.ai/onboarding?token=${invite.token}`;
        const itAdminName = invite.email.split('@')[0];
        
        const result = await sendITAdminUrgentReminder(
          invite.email,
          itAdminName,
          invite.inviterName,
          setupUrl
        );

        if (result.success) {
          await ReminderEmail.recordSent({
            recipientEmail: invite.email,
            reminderType: 'it-admin-followup-48h',
            subject: 'Urgent: Teams waiting for SignalTrue data — complete setup',
            emailId: result.emailId,
            invitedBy: { name: invite.inviterName }
          });

          results.itAdminFollowups++;
        }
      } catch (err) {
        results.errors.push({ invite: invite.email, error: err.message });
      }
    }

    console.log('[Reminder Cron] Results:', results);
    res.json({
      success: true,
      message: 'Follow-up check complete',
      results
    });

  } catch (error) {
    console.error('[Reminder Cron] Error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/reminders/stats
 * Get reminder email statistics
 */
router.get('/stats', verifyCronSecret, async (req, res) => {
  try {
    const stats = await ReminderEmail.aggregate([
      {
        $group: {
          _id: '$reminderType',
          count: { $sum: 1 },
          lastSent: { $max: '$sentAt' }
        }
      }
    ]);

    const totalSent = await ReminderEmail.countDocuments({ status: 'sent' });
    const last24h = await ReminderEmail.countDocuments({
      sentAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    res.json({
      totalSent,
      last24Hours: last24h,
      byType: stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/reminders/send-test
 * Send a test reminder email (for debugging)
 */
router.post('/send-test', verifyCronSecret, async (req, res) => {
  try {
    const { email, type } = req.body;
    
    if (!email || !type) {
      return res.status(400).json({ message: 'Email and type required' });
    }

    let result;
    const testUser = { 
      _id: 'test123', 
      email, 
      name: email.split('@')[0] 
    };

    switch (type) {
      case 'new-user':
        const { sendNewUserReminder } = await import('../services/reminderEmailService.js');
        result = await sendNewUserReminder(testUser);
        break;
      case 'followup':
        result = await sendUserFollowUpReminder(testUser, 24);
        break;
      case 'it-admin':
        const { sendITAdminReminder } = await import('../services/reminderEmailService.js');
        result = await sendITAdminReminder(email, 'Test Admin', 'HR Manager', 'https://www.signaltrue.ai/integrations');
        break;
      case 'it-admin-urgent':
        result = await sendITAdminUrgentReminder(email, 'Test Admin', 'HR Manager', 'https://www.signaltrue.ai/integrations');
        break;
      default:
        return res.status(400).json({ message: 'Invalid type. Use: new-user, followup, it-admin, it-admin-urgent' });
    }

    res.json({ success: result.success, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
