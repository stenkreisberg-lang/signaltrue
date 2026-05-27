import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Invite from '../models/invite.js';
import ReminderEmail from '../models/reminderEmail.js';
import { sendITAdminReminder } from '../services/reminderEmailService.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// POST /api/invites/send
router.post(
  '/send',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    try {
      const { email, role, inviterName, companyName } = req.body;
      if (!email || !role) return res.status(400).json({ message: 'Email and role required' });
      if (
        !['viewer', 'team_member', 'it_admin', 'hr_admin', 'manager', 'executive'].includes(role)
      ) {
        return res.status(400).json({ message: 'Invalid invitation role' });
      }
      const inviterId = req.user.userId;
      const orgId = req.user.orgId;
      const token = uuidv4();
      const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      const invite = await Invite.create({
        email,
        role,
        token,
        expiry,
        inviterName,
        companyName,
        orgId,
      });

      // If this is an IT admin invite, send the reminder email
      if (role === 'it_admin') {
        const setupUrl = `https://www.signaltrue.ai/onboarding?token=${token}`;
        const itAdminName = email.split('@')[0]; // Extract name from email

        (async () => {
          try {
            const result = await sendITAdminReminder(email, itAdminName, inviterName, setupUrl);
            if (result.success) {
              await ReminderEmail.recordSent({
                recipientEmail: email,
                orgId,
                reminderType: 'it-admin-invite',
                subject: 'IT action needed — complete the integration setup',
                emailId: result.emailId,
                invitedBy: {
                  userId: inviterId,
                  name: inviterName,
                  email: null,
                },
              });
              console.log(`[Reminder] Sent IT admin invite reminder to ${email}`);
            }
          } catch (err) {
            console.error('[Reminder] Failed to send IT admin reminder:', err.message);
          }
        })();
      }

      res.json({ email, role, token, expiry, reminderSent: role === 'it_admin' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// GET /api/invites/pending
router.get(
  '/pending',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    const invites = await Invite.find({ status: 'pending', orgId: req.user.orgId }).select(
      '-token'
    );
    res.json(invites);
  }
);

// GET /api/invites/accept/:token
router.get('/accept/:token', async (req, res) => {
  const { token } = req.params;
  const invite = await Invite.findOne({ token });
  if (!invite) return res.status(404).json({ message: 'Invite not found' });
  if (invite.expiry < new Date()) {
    invite.status = 'expired';
    await invite.save();
    return res.status(400).json({ message: 'Invite expired' });
  }
  invite.status = 'accepted';
  await invite.save();
  // Redirect to onboarding with token
  res.redirect(`/onboarding?token=${token}`);
});

export default router;
