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
  sendITAdminUrgentReminder,
  sendUserWeek2Reminder,
  sendUserWeek3Reminder,
  sendITAdminWeek2Reminder,
  sendITAdminWeek3Reminder
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
 * Should be called daily by a cron job
 */
router.post('/check-followups', verifyCronSecret, async (req, res) => {
  try {
    const results = {
      usersChecked: 0,
      followupsSent24h: 0,
      followupsSent48h: 0,
      userWeek2Sent: 0,
      userWeek3Sent: 0,
      itAdminFollowups: 0,
      itAdminWeek2Sent: 0,
      itAdminWeek3Sent: 0,
      errors: []
    };

    // Time thresholds
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

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
        // Calculate days since registration
        const daysSinceRegistration = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const hoursSinceRegistration = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60));
        
        // Determine which reminder to send based on age
        let reminderType;
        let sendFunction;
        let subject;

        if (daysSinceRegistration >= 14) {
          // Week 3 - Final reminder
          reminderType = 'user-week3';
          sendFunction = sendUserWeek3Reminder;
          subject = 'Your early-warning system is still inactive';
        } else if (daysSinceRegistration >= 7) {
          // Week 2
          reminderType = 'user-week2';
          sendFunction = sendUserWeek2Reminder;
          subject = 'Still no signals detected';
        } else if (hoursSinceRegistration >= 48) {
          // 48h follow-up
          reminderType = 'new-user-followup-48h';
          sendFunction = (u) => sendUserFollowUpReminder(u, 48);
          subject = '48 hours in — your SignalTrue dashboard is still empty';
        } else if (hoursSinceRegistration >= 24) {
          // 24h follow-up
          reminderType = 'new-user-followup-24h';
          sendFunction = (u) => sendUserFollowUpReminder(u, 24);
          subject = '24 hours in — your SignalTrue dashboard is still empty';
        } else {
          continue; // Too early
        }

        // Check if already sent
        const alreadySent = await ReminderEmail.wasAlreadySent(user.email, reminderType);
        if (alreadySent) continue;

        // Send the appropriate reminder
        const result = await sendFunction(user);
        
        if (result.success) {
          await ReminderEmail.recordSent({
            recipientEmail: user.email,
            userId: user._id,
            orgId: user.orgId,
            reminderType,
            subject,
            emailId: result.emailId
          });

          // Track which type was sent
          if (reminderType === 'new-user-followup-24h') results.followupsSent24h++;
          else if (reminderType === 'new-user-followup-48h') results.followupsSent48h++;
          else if (reminderType === 'user-week2') results.userWeek2Sent++;
          else if (reminderType === 'user-week3') results.userWeek3Sent++;
        }
      } catch (err) {
        results.errors.push({ user: user.email, error: err.message });
      }
    }

    // ========================================
    // IT ADMIN REMINDERS
    // ========================================
    const pendingITInvites = await Invite.find({
      role: 'it_admin',
      status: 'pending',
      createdAt: { $lt: fortyEightHoursAgo }
    });

    for (const invite of pendingITInvites) {
      try {
        const daysSinceInvite = Math.floor((Date.now() - new Date(invite.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        
        let reminderType;
        let sendFunction;
        let subject;
        const setupUrl = `https://www.signaltrue.ai/onboarding?token=${invite.token}`;
        const itAdminName = invite.email.split('@')[0];

        if (daysSinceInvite >= 14) {
          // Week 3 - Final escalation
          reminderType = 'it-admin-week3';
          sendFunction = () => sendITAdminWeek3Reminder(invite.email, itAdminName, invite.inviterName, setupUrl);
          subject = 'SignalTrue is not active in your organization';
        } else if (daysSinceInvite >= 7) {
          // Week 2
          reminderType = 'it-admin-week2';
          sendFunction = () => sendITAdminWeek2Reminder(invite.email, itAdminName, invite.inviterName, setupUrl);
          subject = 'Integration setup still pending';
        } else if (daysSinceInvite >= 2) {
          // 48h urgent
          reminderType = 'it-admin-followup-48h';
          sendFunction = () => sendITAdminUrgentReminder(invite.email, itAdminName, invite.inviterName, setupUrl);
          subject = 'Urgent: Teams waiting for SignalTrue data — complete setup';
        } else {
          continue;
        }

        // Check if already sent
        const alreadySent = await ReminderEmail.wasAlreadySent(invite.email, reminderType);
        if (alreadySent) continue;

        const result = await sendFunction();

        if (result.success) {
          await ReminderEmail.recordSent({
            recipientEmail: invite.email,
            reminderType,
            subject,
            emailId: result.emailId,
            invitedBy: { name: invite.inviterName }
          });

          if (reminderType === 'it-admin-followup-48h') results.itAdminFollowups++;
          else if (reminderType === 'it-admin-week2') results.itAdminWeek2Sent++;
          else if (reminderType === 'it-admin-week3') results.itAdminWeek3Sent++;
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
      case 'user-week2':
        result = await sendUserWeek2Reminder(testUser);
        break;
      case 'user-week3':
        result = await sendUserWeek3Reminder(testUser);
        break;
      case 'it-admin':
        const { sendITAdminReminder } = await import('../services/reminderEmailService.js');
        result = await sendITAdminReminder(email, 'Test Admin', 'HR Manager', 'https://www.signaltrue.ai/integrations');
        break;
      case 'it-admin-urgent':
        result = await sendITAdminUrgentReminder(email, 'Test Admin', 'HR Manager', 'https://www.signaltrue.ai/integrations');
        break;
      case 'it-admin-week2':
        result = await sendITAdminWeek2Reminder(email, 'Test Admin', 'HR Manager', 'https://www.signaltrue.ai/integrations');
        break;
      case 'it-admin-week3':
        result = await sendITAdminWeek3Reminder(email, 'Test Admin', 'HR Manager', 'https://www.signaltrue.ai/integrations');
        break;
      default:
        return res.status(400).json({ 
          message: 'Invalid type. Use: new-user, followup, user-week2, user-week3, it-admin, it-admin-urgent, it-admin-week2, it-admin-week3' 
        });
    }

    res.json({ success: result.success, result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
