import express from 'express';
import Invite from '../models/invite.js';
import Invitation from '../models/invitation.js';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import { deliverInvitation } from '../services/invitationDeliveryService.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

// POST /api/invites/send
router.post(
  '/send',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    try {
      const { email, role, inviterName } = req.body;
      if (!email || !role) return res.status(400).json({ message: 'Email and role required' });
      if (
        !['viewer', 'team_member', 'it_admin', 'hr_admin', 'manager', 'executive'].includes(role)
      ) {
        return res.status(400).json({ message: 'Invalid invitation role' });
      }
      const orgId = req.user.orgId;
      const normalizedRole = role === 'hr_admin' ? 'hr_admin' : role === 'it_admin' ? 'it_admin' : 'team_member';
      const [organization, inviter] = await Promise.all([
        Organization.findById(orgId),
        User.findById(req.user.userId),
      ]);
      if (!organization) return res.status(404).json({ message: 'Organization not found' });

      const invitation = await Invitation.createWithToken({
        email,
        name: String(inviterName || '').trim() || undefined,
        role: normalizedRole,
        orgId,
        invitedBy: req.user.userId,
        ttlHours: 48,
      });
      const delivery = await deliverInvitation(invitation, { organization, inviter });

      res.json({
        email: invitation.email,
        role,
        token: invitation.token,
        expiry: invitation.expiresAt,
        emailSent: delivery.emailSent,
        warning: delivery.warning || null,
        inviteUrl: delivery.inviteUrl,
      });
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
