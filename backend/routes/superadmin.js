/**
 * Superadmin Routes
 * 
 * These routes are only accessible to users with role 'master_admin' and no orgId.
 * Provides system-wide management capabilities:
 * - View all organizations
 * - View all users
 * - Switch context to any organization
 * - Create/delete organizations
 * - System-wide analytics
 */

import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken } from '../middleware/auth.js';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';

const router = express.Router();

/**
 * Middleware: Require master_admin role
 */
function requireSuperadmin(req, res, next) {
  if (req.user?.role !== 'master_admin') {
    return res.status(403).json({ 
      message: 'Forbidden: Superadmin access required',
      hint: 'This endpoint requires master_admin role'
    });
  }
  next();
}

/**
 * GET /api/superadmin/organizations
 * List all organizations in the system
 */
router.get('/organizations', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const organizations = await Organization.find({})
      .select('name domain industry subscription trial pilot integrations createdAt slug')
      .sort({ createdAt: -1 })
      .lean();

    // Get user counts per org
    const userCounts = await User.aggregate([
      { $group: { _id: '$orgId', count: { $sum: 1 } } }
    ]);
    const userCountMap = {};
    userCounts.forEach(uc => {
      if (uc._id) userCountMap[uc._id.toString()] = uc.count;
    });

    // Get team counts per org
    const teamCounts = await Team.aggregate([
      { $group: { _id: '$orgId', count: { $sum: 1 } } }
    ]);
    const teamCountMap = {};
    teamCounts.forEach(tc => {
      if (tc._id) teamCountMap[tc._id.toString()] = tc.count;
    });

    const enrichedOrgs = organizations.map(org => {
      // Build integrations object with connection status for all supported integrations
      const integrations = {
        slack: !!(org.integrations?.slack?.accessToken || org.integrations?.slack?.teamName),
        slackTeam: org.integrations?.slack?.teamName || null,
        google: !!(org.integrations?.google?.accessToken),
        googleChat: !!(org.integrations?.googleChat?.accessToken),
        microsoft: !!(org.integrations?.microsoft?.accessToken),
        microsoftScope: org.integrations?.microsoft?.scope || null, // 'teams' or 'outlook'
        jira: !!(org.integrations?.jira?.accessToken),
        asana: !!(org.integrations?.asana?.accessToken),
        hubspot: !!(org.integrations?.hubspot?.accessToken),
        pipedrive: !!(org.integrations?.pipedrive?.accessToken),
        gmail: !!(org.integrations?.gmail?.accessToken),
        notion: !!(org.integrations?.notion?.accessToken),
      };
      
      // Count total connected integrations
      const connectedCount = Object.entries(integrations)
        .filter(([key, val]) => val === true && key !== 'slackTeam' && key !== 'microsoftScope')
        .length;
      
      return {
        id: org._id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        industry: org.industry,
        subscription: org.subscription,
        trial: {
          isActive: org.trial?.isActive,
          phase: org.trial?.phase,
          daysRemaining: org.trial?.daysRemaining
        },
        pilot: org.pilot ? {
          isActive: org.pilot.isActive,
          endDate: org.pilot.endDate,
          months: org.pilot.months
        } : null,
        integrations,
        integrationsConnected: connectedCount,
        userCount: userCountMap[org._id.toString()] || 0,
        teamCount: teamCountMap[org._id.toString()] || 0,
        createdAt: org.createdAt
      };
    });

    res.json({
      total: enrichedOrgs.length,
      organizations: enrichedOrgs
    });
  } catch (error) {
    console.error('Superadmin organizations error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/superadmin/organizations/:id
 * Get detailed info about a specific organization
 */
router.get('/organizations/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id).lean();
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const users = await User.find({ orgId: org._id })
      .select('name email role createdAt lastLogin')
      .lean();

    const teams = await Team.find({ orgId: org._id })
      .select('name description createdAt')
      .lean();

    res.json({
      organization: org,
      users,
      teams
    });
  } catch (error) {
    console.error('Superadmin org detail error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/superadmin/organizations
 * Create a new organization
 */
router.post('/organizations', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { name, domain, industry } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const org = new Organization({
      name,
      domain,
      industry: industry || 'Other',
      subscription: { plan: 'trial', status: 'active' },
      trial: {
        isActive: true,
        startDate: new Date(),
        phase: 'baseline',
        daysRemaining: 30
      }
    });

    await org.save();

    // Create a default team
    const team = new Team({
      name: 'General',
      orgId: org._id,
      description: 'Default team'
    });
    await team.save();

    res.status(201).json({
      message: 'Organization created',
      organization: org,
      defaultTeam: team
    });
  } catch (error) {
    console.error('Superadmin create org error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PATCH /api/superadmin/organizations/:id
 * Update organization fields (name, domain, industry, etc.)
 */
router.patch('/organizations/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { name, domain, industry } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (domain !== undefined) update.domain = domain.replace(/^@/, '');
    if (industry !== undefined) update.industry = industry;

    const org = await Organization.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({ message: 'Organization updated', organization: org });
  } catch (error) {
    console.error('Superadmin update org error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/superadmin/organizations/:id
 * Delete an organization and all its data
 */
router.delete('/organizations/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const orgId = req.params.id;

    // Safety check: don't delete orgs with users
    const userCount = await User.countDocuments({ orgId });
    if (userCount > 0 && !req.query.force) {
      return res.status(400).json({ 
        message: `Organization has ${userCount} users. Add ?force=true to delete anyway.`
      });
    }

    // Delete teams
    await Team.deleteMany({ orgId });

    // Optionally unlink users (don't delete them)
    await User.updateMany({ orgId }, { $unset: { orgId: 1, teamId: 1 } });

    // Delete organization
    await Organization.findByIdAndDelete(orgId);

    res.json({ message: 'Organization deleted', usersUnlinked: userCount });
  } catch (error) {
    console.error('Superadmin delete org error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/superadmin/users
 * List all users in the system
 */
router.get('/users', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { orgId, role, search } = req.query;

    const query = {};
    if (orgId) query.orgId = orgId;
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('name email role orgId teamId createdAt lastLogin')
      .populate('orgId', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const total = await User.countDocuments(query);

    res.json({
      total,
      users: users.map(u => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        orgId: u.orgId?._id || u.orgId,
        orgName: u.orgId?.name,
        teamId: u.teamId,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin
      }))
    });
  } catch (error) {
    console.error('Superadmin users error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/superadmin/users/:id
 * Update a user (role, org assignment, etc.)
 */
router.put('/users/:id', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { role, orgId, teamId, name } = req.body;

    const update = {};
    if (role) update.role = role;
    if (orgId) update.orgId = orgId;
    if (teamId) update.teamId = teamId;
    if (name) update.name = name;
    if (orgId === null) update.$unset = { orgId: 1, teamId: 1 };

    const user = await User.findByIdAndUpdate(
      req.params.id,
      orgId === null ? { $unset: { orgId: 1, teamId: 1 }, ...update } : { $set: update },
      { new: true }
    ).select('name email role orgId teamId');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated', user });
  } catch (error) {
    console.error('Superadmin update user error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/superadmin/users/:id/reset-password
 * Reset a user's password
 */
router.post('/users/:id/reset-password', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({ message: 'Password reset successfully', email: user.email });
  } catch (error) {
    console.error('Superadmin reset password error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/superadmin/stats
 * System-wide statistics
 */
router.get('/stats', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const [orgCount, userCount, teamCount] = await Promise.all([
      Organization.countDocuments({}),
      User.countDocuments({}),
      Team.countDocuments({})
    ]);

    // Users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Orgs by trial status
    const trialStats = await Organization.aggregate([
      { $group: { _id: '$trial.phase', count: { $sum: 1 } } }
    ]);

    // Orgs with integrations
    const withSlack = await Organization.countDocuments({ 'integrations.slack.accessToken': { $exists: true, $ne: null } });
    const withGoogle = await Organization.countDocuments({ 'integrations.google.accessToken': { $exists: true, $ne: null } });

    // Recent signups (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({ createdAt: { $gte: weekAgo } });
    const recentOrgs = await Organization.countDocuments({ createdAt: { $gte: weekAgo } });

    res.json({
      totals: {
        organizations: orgCount,
        users: userCount,
        teams: teamCount
      },
      usersByRole: Object.fromEntries(usersByRole.map(r => [r._id || 'unknown', r.count])),
      trialPhases: Object.fromEntries(trialStats.map(t => [t._id || 'unknown', t.count])),
      integrations: {
        withSlack,
        withGoogle
      },
      recentActivity: {
        usersLast7Days: recentUsers,
        orgsLast7Days: recentOrgs
      }
    });
  } catch (error) {
    console.error('Superadmin stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/superadmin/impersonate/:userId
 * Get a token to impersonate a user (for debugging)
 */
router.post('/impersonate/:userId', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a temporary token for this user
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        teamId: user.teamId,
        impersonatedBy: req.user.userId,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      },
      process.env.JWT_SECRET
    );

    res.json({
      message: 'Impersonation token created',
      user: { name: user.name, email: user.email, role: user.role },
      token,
      expiresIn: '1 hour',
      warning: 'This token allows full access as this user. Use responsibly.'
    });
  } catch (error) {
    console.error('Superadmin impersonate error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/superadmin/organizations/:id/grant-pilot
 * Grant 6-month free pilot to an organization
 */
router.post('/organizations/:id/grant-pilot', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { months = 6 } = req.body;
    
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    const now = new Date();
    const pilotEndDate = new Date(now);
    pilotEndDate.setMonth(pilotEndDate.getMonth() + months);

    // Update organization with pilot status
    org.pilot = {
      isActive: true,
      startDate: now,
      endDate: pilotEndDate,
      grantedBy: req.user.userId,
      grantedAt: now,
      months: months
    };
    
    // Also extend trial to match pilot period
    org.trial = {
      ...org.trial,
      startDate: org.trial?.startDate || now,
      endDate: pilotEndDate,
      isPilot: true
    };

    // Set subscription to pilot plan
    org.subscription = {
      plan: 'pilot',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: pilotEndDate
    };

    await org.save();

    console.log(`[Superadmin] Granted ${months}-month pilot to org ${org.name} (${org._id}) by ${req.user.email}`);

    res.json({
      success: true,
      message: `Granted ${months}-month free pilot to ${org.name}`,
      pilot: org.pilot,
      expiresAt: pilotEndDate.toISOString()
    });
  } catch (error) {
    console.error('Grant pilot error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/superadmin/organizations/:id/revoke-pilot
 * Revoke pilot status from an organization
 */
router.post('/organizations/:id/revoke-pilot', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    org.pilot = {
      isActive: false,
      revokedBy: req.user.userId,
      revokedAt: new Date()
    };

    // Reset subscription
    org.subscription = {
      plan: 'trial',
      status: 'expired'
    };

    await org.save();

    console.log(`[Superadmin] Revoked pilot from org ${org.name} (${org._id}) by ${req.user.email}`);

    res.json({
      success: true,
      message: `Revoked pilot from ${org.name}`
    });
  } catch (error) {
    console.error('Revoke pilot error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/superadmin/organizations/:id/cleanup-domain
 * Remove all users whose email doesn't match the org's domain.
 * Optionally pass { "domain": "example.com" } to set the domain first.
 */
router.post('/organizations/:id/cleanup-domain', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    // Optionally update domain first
    if (req.body.domain) {
      org.domain = req.body.domain.toLowerCase().replace(/^@/, '');
      await org.save();
    }

    const cleanDomain = org.domain;
    if (!cleanDomain) {
      return res.status(400).json({ message: 'Organization has no domain set. Pass { "domain": "example.com" } in body.' });
    }

    // Find non-matching users (any source)
    const domainRegex = new RegExp(`@${cleanDomain.replace(/\./g, '\\.')}$`, 'i');
    const nonDomainUsers = await User.find({
      orgId: org._id,
      email: { $exists: true, $ne: null, $not: domainRegex }
    });

    const count = nonDomainUsers.length;
    const removedEmails = nonDomainUsers.map(u => u.email);

    if (count > 0) {
      await User.deleteMany({ _id: { $in: nonDomainUsers.map(u => u._id) } });
    }

    const remaining = await User.countDocuments({ orgId: org._id });

    console.log(`[Superadmin] Cleanup @${cleanDomain} on ${org.name}: removed ${count}, remaining ${remaining}. By ${req.user.email}`);

    res.json({
      success: true,
      orgName: org.name,
      domain: cleanDomain,
      removed: count,
      removedEmails,
      remaining,
      message: `Removed ${count} users not matching @${cleanDomain}. ${remaining} employees remain.`
    });
  } catch (error) {
    console.error('Superadmin cleanup-domain error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
