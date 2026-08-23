import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import Invitation from '../models/invitation.js';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import { getOrganizationReadiness } from '../services/onboardingReadinessService.js';
import { deliverInvitation, invitationUrl } from '../services/invitationDeliveryService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// GET /api/onboarding/status
router.get('/onboarding/status', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    const role = req.user?.role;
    let org = null;
    if (orgId) org = await Organization.findById(orgId);

    const setup = org ? await getOrganizationReadiness(org) : null;
    const source = (type) => setup?.sources.find((item) => item.type === type);
    const connected = (type) => source(type)?.status !== 'disconnected';
    const checklist = {
      slackConnected: connected('slack'),
      googleChatConnected: connected('google-chat'),
      teamsConnected: connected('microsoft-teams'),
      chatConnected: connected('slack') || connected('google-chat') || connected('microsoft-teams'),
      calendarConnected: connected('google-calendar') || connected('microsoft-outlook'),
      integrationsComplete: setup?.readiness.setupComplete || false,
      connectionsAuthorized: setup?.readiness.permissionsReady || false,
    };

    // Check if user is the first user (HR admin typically)
    const usersInOrg = await User.countDocuments({ orgId });
    const isFirstUser = usersInOrg === 1;

    // Role-specific onboarding requirements
    const roleRequirements = {
      hr_admin: {
        canInviteITAdmin: true,
        canViewData: checklist.integrationsComplete, // Can only see data after integrations
        mustInviteITAdmin: setup?.readiness.connectedSources === 0 && isFirstUser,
        nextStep: checklist.integrationsComplete
          ? 'view_dashboard'
          : setup?.readiness.nextStep || 'invite_it_admin_or_connect_integrations',
      },
      it_admin: {
        canConfigureIntegrations: true,
        canViewData: false, // IT admin focuses on setup, not data viewing
        mustCompleteIntegrations: !checklist.connectionsAuthorized,
        nextStep: checklist.connectionsAuthorized
          ? 'authorization_complete'
          : setup?.readiness.nextStep || 'connect_integrations',
      },
      admin: {
        canInviteUsers: true,
        canConfigureIntegrations: true,
        canViewData: true,
        nextStep: checklist.integrationsComplete
          ? 'view_dashboard'
          : setup?.readiness.nextStep || 'connect_integrations',
      },
      master_admin: {
        canDoEverything: true,
        canViewData: true,
        nextStep: 'manage_organizations',
      },
    };

    return res.json({
      role,
      orgId: orgId || null,
      orgSlug: org?.slug || null,
      orgName: org?.name || null,
      isFirstUser,
      requirements: roleRequirements[role] || {},
      setup,
      ...checklist,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// GET /api/onboarding/invitations (HR/Admin only)
router.get(
  '/onboarding/invitations',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    try {
      const orgId = req.user?.orgId;
      const now = new Date();
      const invites = await Invitation.find({
        orgId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { $gt: now },
      })
        .sort({ createdAt: -1 })
        .select('_id email name role createdAt expiresAt delivery');
      res.json(invites);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

// POST /api/onboarding/invitations { email, role, teamId? }
router.post(
  '/onboarding/invitations',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    try {
      const { email, name, role, teamId, ttlHours } = req.body || {};
      if (!email || !role) return res.status(400).json({ message: 'email and role are required' });
      if (!['hr_admin', 'it_admin', 'team_member'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role for invitation' });
      }
      if (!req.user?.orgId) return res.status(400).json({ message: 'Missing orgId' });

      // Get organization details for email
      const org = await Organization.findById(req.user.orgId);
      const inviterUser = await User.findById(req.user.userId);

      const inv = await Invitation.createWithToken({
        email: String(email).toLowerCase(),
        name: String(name || '').trim() || undefined,
        role,
        orgId: req.user.orgId,
        teamId: teamId || undefined,
        invitedBy: req.user.userId,
        ttlHours: typeof ttlHours === 'number' ? ttlHours : 24 * 7,
      });

      const delivery = await deliverInvitation(inv, { organization: org, inviter: inviterUser });

      res.json({
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        ...delivery,
      });
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  }
);

router.post(
  '/onboarding/invitations/:id/resend',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    const inv = await Invitation.findOne({
      _id: req.params.id,
      orgId: req.user.orgId,
      acceptedAt: null,
      revokedAt: null,
    });
    if (!inv) return res.status(404).json({ message: 'Pending invitation not found' });
    inv.rotateToken();
    await inv.save();
    const [organization, inviter] = await Promise.all([
      Organization.findById(inv.orgId),
      User.findById(req.user.userId),
    ]);
    const delivery = await deliverInvitation(inv, { organization, inviter });
    return res.json({ _id: inv._id, expiresAt: inv.expiresAt, ...delivery });
  }
);

router.get(
  '/onboarding/invitations/:id/link',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    const inv = await Invitation.findOne({
      _id: req.params.id,
      orgId: req.user.orgId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    if (!inv) return res.status(404).json({ message: 'Pending invitation not found' });
    return res.json({ inviteUrl: invitationUrl(inv.token) });
  }
);

router.delete(
  '/onboarding/invitations/:id',
  authenticateToken,
  requireRoles(['admin', 'hr_admin', 'master_admin']),
  async (req, res) => {
    const inv = await Invitation.findOneAndUpdate(
      { _id: req.params.id, orgId: req.user.orgId, acceptedAt: null, revokedAt: null },
      { $set: { revokedAt: new Date(), revokedBy: req.user.userId } },
      { returnDocument: 'after' }
    );
    if (!inv) return res.status(404).json({ message: 'Pending invitation not found' });
    return res.status(204).end();
  }
);

// GET /api/onboarding/invitations/:token
// Public, token-scoped invitation preview used before an invited admin creates an account.
router.get('/onboarding/invitations/:token', async (req, res) => {
  try {
    const inv = await Invitation.findOne({
      token: req.params.token,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    })
      .populate('orgId', 'name')
      .select('email name role orgId expiresAt')
      .lean();

    if (!inv) return res.status(404).json({ message: 'Invitation is invalid or expired' });
    return res.json({
      email: inv.email,
      name: inv.name || '',
      role: inv.role,
      organizationName: inv.orgId?.name || 'your organization',
      expiresAt: inv.expiresAt,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
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
    const inv = await Invitation.findOne({
      token,
      expiresAt: { $gt: now },
      acceptedAt: null,
      revokedAt: null,
    });
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
        isMasterAdmin: false,
      });
    } else {
      // Update existing user with org/role if missing
      user.name = user.name || name;
      user.password = password; // will be hashed by pre-save
      if (!user.orgId) user.orgId = inv.orgId;
      if (resolvedTeamId && !user.teamId) user.teamId = resolvedTeamId;
      user.role = inv.role === 'team_member' ? user.role || 'viewer' : inv.role;
      user.isMasterAdmin = false;
    }
    await user.save();

    inv.acceptedAt = new Date();
    await inv.save();

    const jwtToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        orgId: user.orgId,
        isMasterAdmin: user.isMasterAdmin,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
        isMasterAdmin: user.isMasterAdmin,
      },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
