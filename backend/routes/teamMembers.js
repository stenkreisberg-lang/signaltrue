import express from 'express';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import Organization from '../models/organizationModel.js';
import { authenticateToken, requireAdmin, requireRoles } from '../middleware/auth.js';
import { refreshTeamSizes } from '../services/employeeSyncService.js';
import { classifyEmployeeCandidate } from '../utils/employeeIdentity.js';

const router = express.Router();
const ORG_ADMIN_ROLES = ['hr_admin', 'admin', 'org_admin', 'super_admin', 'master_admin'];

// Get team members — HR/admin roles see all org employees, others see own team only
router.get('/', authenticateToken, async (req, res) => {
  try {
    const isOrgAdmin = ['hr_admin', 'admin', 'master_admin'].includes(req.user.role);
    const orgId = req.user.orgId;
    const teamId = req.user.teamId;

    let query;
    if (isOrgAdmin && orgId) {
      // HR admins see all employees in their organization (including unassigned)
      query = { orgId };
    } else {
      // Regular users see only their own team
      query = { teamId };
    }

    const members = await User.find(query).select('-password').sort({ role: -1, name: 1 }); // Admins first, then alphabetically

    res.json(members);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add new team member (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const teamId = req.user.teamId;
    const orgId = req.user.orgId;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const identity = classifyEmployeeCandidate({ email, name, displayName: name });
    if (!identity.ok) {
      return res.status(400).json({
        message:
          identity.reason === 'missing_first_name_or_surname'
            ? 'Employee must have both first name and surname.'
            : 'Only real employee accounts can be added. Bots, rooms, resources, and shared mailboxes are blocked.',
        reason: identity.reason,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user with the admin's team
    const user = new User({
      email: identity.email,
      password,
      name: identity.name,
      firstName: identity.firstName,
      lastName: identity.lastName,
      role: role || 'viewer',
      orgId,
      teamId,
    });

    await user.save();

    res.status(201).json({
      message: 'Team member added successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update team member role (admin only)
router.put('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, name } = req.body;
    const teamId = req.user.teamId;

    // Find user and verify they're in the same team
    const user = await User.findOne({ _id: userId, teamId });
    if (!user) {
      return res.status(404).json({ message: 'User not found or not in your team' });
    }

    // Prevent admin from demoting themselves if they're the only admin
    if (userId === req.user.userId && role === 'viewer') {
      const adminCount = await User.countDocuments({ teamId, role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({
          message: 'Cannot demote the last admin. Promote another user to admin first.',
        });
      }
    }

    // Update user
    if (role) user.role = role;
    if (name) {
      const identity = classifyEmployeeCandidate({ email: user.email, name, displayName: name });
      if (!identity.ok) {
        return res.status(400).json({
          message:
            identity.reason === 'missing_first_name_or_surname'
              ? 'Employee must have both first name and surname.'
              : 'Only real employee accounts can be added. Bots, rooms, resources, and shared mailboxes are blocked.',
          reason: identity.reason,
        });
      }
      user.name = identity.name;
      user.firstName = identity.firstName;
      user.lastName = identity.lastName;
    }

    await user.save();

    res.json({
      message: 'Team member updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete employee profile from the organization (HR/admin roles only)
router.delete(
  '/:userId',
  authenticateToken,
  requireRoles(['hr_admin', 'admin', 'master_admin']),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const requesterId = req.user.userId || req.user._id;
      const requesterOrgId = req.user.orgId;

      if (String(userId) === String(requesterId)) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (!requesterOrgId || String(user.orgId) !== String(requesterOrgId)) {
        return res.status(403).json({ message: 'User not in your organization' });
      }

      if (ORG_ADMIN_ROLES.includes(user.role)) {
        const adminCount = await User.countDocuments({
          orgId: user.orgId,
          role: { $in: ORG_ADMIN_ROLES },
          accountStatus: { $ne: 'inactive' },
        });
        if (adminCount <= 1) {
          return res.status(400).json({
            message: 'Cannot delete the last admin in the organization.',
          });
        }
      }

      await Promise.all([
        WorkEvent.updateMany(
          { orgId: user.orgId, actorUserId: user._id },
          { $set: { actorUserId: null, teamId: null } }
        ),
        WorkEvent.updateMany(
          { orgId: user.orgId, targetUserId: user._id },
          { $set: { targetUserId: null } }
        ),
        WorkEvent.updateMany(
          { orgId: user.orgId, 'metadata.assigneeUserId': user._id },
          { $set: { 'metadata.assigneeUserId': null } }
        ),
        WorkEvent.updateMany(
          { orgId: user.orgId, 'metadata.reporterUserId': user._id },
          { $set: { 'metadata.reporterUserId': null } }
        ),
      ]);

      await User.findByIdAndDelete(user._id);

      const org = await Organization.findById(user.orgId).select('settings.minTeamSize').lean();
      const minTeamSize = Math.max(5, Number(org?.settings?.minTeamSize) || 5);
      await refreshTeamSizes(user.orgId, minTeamSize);

      res.json({
        message: 'Employee profile deleted successfully',
        deletedUser: {
          id: user._id,
          name: user.name,
          email: user.email,
          teamId: user.teamId,
        },
      });
    } catch (error) {
      console.error('Delete employee profile error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

export default router;
