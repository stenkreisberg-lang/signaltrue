import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import Invitation from '../models/invitation.js';
import Organization from '../models/organization.js';
import User from '../models/user.js';
import Team from '../models/team.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function integrationsChecklist(org) {
  const slackConnected = !!org?.integrations?.slack?.accessToken;
  const googleCal = org?.integrations?.google?.scope === 'calendar' && !!org?.integrations?.google?.accessToken;
  const msOutlook = org?.integrations?.microsoft?.scope === 'outlook' && !!org?.integrations?.microsoft?.accessToken;
  const calendarConnected = !!(googleCal || msOutlook);
  return {
    slackConnected,
    calendarConnected,
    integrationsComplete: slackConnected && calendarConnected
  };
}

// GET /api/onboarding/status
router.get('/onboarding/status', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    const role = req.user?.role;
    let org = null;
    if (orgId) org = await Organization.findById(orgId);
    const checklist = integrationsChecklist(org);
    return res.json({
      role,
      orgId: orgId || null,
      orgSlug: org?.slug || null,
      ...checklist
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/onboarding/invitations (HR/Admin only)
router.get('/onboarding/invitations', authenticateToken, requireRoles(['admin','hr_admin','master_admin']), async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    const now = new Date();
    const invites = await Invitation.find({ orgId, acceptedAt: null, expiresAt: { $gt: now } })
      .sort({ createdAt: -1 })
      .select('-_id email role token createdAt expiresAt');
    res.json(invites);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/onboarding/invitations { email, role, teamId? }
router.post('/onboarding/invitations', authenticateToken, requireRoles(['admin','hr_admin','master_admin']), async (req, res) => {
  try {
    const { email, role, teamId, ttlHours } = req.body || {};
    if (!email || !role) return res.status(400).json({ message: 'email and role are required' });
    if (!['hr_admin','it_admin','team_member'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role for invitation' });
    }
    if (!req.user?.orgId) return res.status(400).json({ message: 'Missing orgId' });

    const inv = await Invitation.createWithToken({
      email: String(email).toLowerCase(),
      role,
      orgId: req.user.orgId,
      teamId: teamId || undefined,
      invitedBy: req.user.userId,
      ttlHours: typeof ttlHours === 'number' ? ttlHours : 24 * 7
    });
    res.json({ email: inv.email, role: inv.role, token: inv.token, expiresAt: inv.expiresAt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/onboarding/accept { token, name, password }
router.post('/onboarding/accept', async (req, res) => {
  try {
    const { token, name, password } = req.body || {};
    if (!token || !name || !password) {
      return res.status(400).json({ message: 'token, name and password are required' });
    }

    const now = new Date();
    const inv = await Invitation.findOne({ token, expiresAt: { $gt: now }, acceptedAt: null });
    if (!inv) return res.status(400).json({ message: 'Invitation token is invalid or expired' });

    // Ensure teamId: if invitation lacks one, find or create "General" team for the org
    let resolvedTeamId = inv.teamId;
    if (!resolvedTeamId && inv.orgId) {
      let defaultTeam = await Team.findOne({ orgId: inv.orgId, name: 'General' });
      if (!defaultTeam) {
        defaultTeam = new Team({ name: 'General', orgId: inv.orgId });
        await defaultTeam.save();
      }
      resolvedTeamId = defaultTeam._id;
    }

    let user = await User.findOne({ email: inv.email });
    if (!user) {
      user = new User({
        email: inv.email,
        password,
        name,
        role: inv.role === 'team_member' ? 'viewer' : inv.role, // map team_member to viewer for legacy UI
        orgId: inv.orgId,
        teamId: resolvedTeamId,
        isMasterAdmin: false
      });
    } else {
      // Update existing user with org/role if missing
      user.name = user.name || name;
      user.password = password; // will be hashed by pre-save
      if (!user.orgId) user.orgId = inv.orgId;
      if (resolvedTeamId && !user.teamId) user.teamId = resolvedTeamId;
      user.role = inv.role === 'team_member' ? (user.role || 'viewer') : inv.role;
      user.isMasterAdmin = false;
    }
    await user.save();

    inv.acceptedAt = new Date();
    await inv.save();

    const jwtToken = jwt.sign({
      userId: user._id,
      email: user.email,
      role: user.role,
      teamId: user.teamId,
      orgId: user.orgId,
      isMasterAdmin: user.isMasterAdmin
    }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Invitation accepted',
      token: jwtToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        orgId: user.orgId,
        isMasterAdmin: user.isMasterAdmin
      }
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
