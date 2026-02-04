import express from 'express';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import Invitation from '../models/invitation.js';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Resend client for invitation emails
const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

function integrationsChecklist(org) {
  const slackConnected = !!org?.integrations?.slack?.accessToken;
  const googleChatConnected = !!org?.integrations?.googleChat?.accessToken;
  const teamsConnected = org?.integrations?.microsoft?.scope === 'teams' && !!org?.integrations?.microsoft?.accessToken;
  const chatConnected = !!(slackConnected || googleChatConnected || teamsConnected);
  
  const googleCal = org?.integrations?.google?.scope === 'calendar' && !!org?.integrations?.google?.accessToken;
  const msOutlook = org?.integrations?.microsoft?.scope === 'outlook' && !!org?.integrations?.microsoft?.accessToken;
  const calendarConnected = !!(googleCal || msOutlook);
  
  return {
    slackConnected,
    googleChatConnected,
    teamsConnected,
    chatConnected,
    calendarConnected,
    integrationsComplete: chatConnected && calendarConnected
  };
}

// GET /api/onboarding/status
router.get('/onboarding/status', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    const role = req.user?.role;
    const userId = req.user?.userId;
    
    let org = null;
    if (orgId) org = await Organization.findById(orgId);
    
    const checklist = integrationsChecklist(org);
    
    // Check if user is the first user (HR admin typically)
    const usersInOrg = await User.countDocuments({ orgId });
    const isFirstUser = usersInOrg === 1;
    
    // Role-specific onboarding requirements
    const roleRequirements = {
      hr_admin: {
        canInviteITAdmin: true,
        canViewData: checklist.integrationsComplete, // Can only see data after integrations
        mustInviteITAdmin: !checklist.integrationsComplete && isFirstUser,
        nextStep: checklist.integrationsComplete 
          ? 'view_dashboard' 
          : 'invite_it_admin_or_connect_integrations'
      },
      it_admin: {
        canConfigureIntegrations: true,
        canViewData: false, // IT admin focuses on setup, not data viewing
        mustCompleteIntegrations: !checklist.integrationsComplete,
        nextStep: checklist.integrationsComplete 
          ? 'setup_complete' 
          : 'connect_integrations'
      },
      admin: {
        canInviteUsers: true,
        canConfigureIntegrations: true,
        canViewData: true,
        nextStep: checklist.integrationsComplete 
          ? 'view_dashboard' 
          : 'connect_integrations'
      },
      master_admin: {
        canDoEverything: true,
        canViewData: true,
        nextStep: 'manage_organizations'
      }
    };
    
    return res.json({
      role,
      orgId: orgId || null,
      orgSlug: org?.slug || null,
      orgName: org?.name || null,
      isFirstUser,
      requirements: roleRequirements[role] || {},
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

    // Get organization details for email
    const org = await Organization.findById(req.user.orgId);
    const inviterUser = await User.findById(req.user.userId);
    
    const inv = await Invitation.createWithToken({
      email: String(email).toLowerCase(),
      role,
      orgId: req.user.orgId,
      teamId: teamId || undefined,
      invitedBy: req.user.userId,
      ttlHours: typeof ttlHours === 'number' ? ttlHours : 24 * 7
    });

    // Send invitation email via Resend
    const resend = getResendClient();
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.signaltrue.ai';
    const inviteUrl = `${frontendUrl}/onboarding?token=${inv.token}`;
    
    if (resend) {
      try {
        const roleNames = {
          'hr_admin': 'HR Administrator',
          'it_admin': 'IT Administrator',
          'team_member': 'Team Member'
        };
        
        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SignalTrue <onboarding@resend.dev>',
          to: email,
          subject: `You've been invited to ${org?.name || 'SignalTrue'}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 20px; text-align: center;">
                <div style="background: white; width: 60px; height: 60px; border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                  <div style="font-size: 32px;">📊</div>
                </div>
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">You're Invited!</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 40px 30px;">
                <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">
                  <strong>${inviterUser?.name || 'Someone'}</strong> has invited you to join <strong>${org?.name || 'their organization'}</strong> on SignalTrue as a <strong>${roleNames[role] || role}</strong>.
                </p>
                
                <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                  ${role === 'it_admin' 
                    ? 'As an IT Administrator, you\'ll help set up integrations with your team\'s collaboration tools (Slack, Google Workspace, etc.) to enable powerful team health insights.' 
                    : role === 'hr_admin'
                    ? 'As an HR Administrator, you\'ll have access to team health metrics, engagement signals, and actionable insights to support your people.'
                    : 'As a Team Member, you\'ll be able to view team metrics and collaborate with your organization on SignalTrue.'
                  }
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                    Accept Invitation
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">
                  This invitation expires in ${Math.floor(inv.expiresAt - Date.now()) / (1000 * 60 * 60)} hours
                </p>
                
                <!-- Alternative link -->
                <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 12px; color: #9ca3af; margin: 0 0 8px 0;">
                    Or copy and paste this link into your browser:
                  </p>
                  <p style="font-size: 12px; color: #6366f1; word-break: break-all; margin: 0;">
                    ${inviteUrl}
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div style="background: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
                  SignalTrue - Team Health Intelligence
                </p>
                <p style="font-size: 11px; color: #9ca3af; margin: 0;">
                  If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </div>
          `
        });
        console.log('Invitation email sent to:', email, 'Result:', JSON.stringify(result));
      } catch (emailError) {
        console.error('Resend invitation email error:', emailError);
        // Don't fail the request - invitation is still created
      }
    } else {
      console.log('⚠️  Resend not configured. Invitation URL:', inviteUrl);
    }

    res.json({ 
      email: inv.email, 
      role: inv.role, 
      token: inv.token, 
      expiresAt: inv.expiresAt,
      inviteUrl: inviteUrl // Include URL in response for testing
    });
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
