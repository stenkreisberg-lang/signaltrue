import express from 'express';
import Team from '../models/team.js';
import User from '../models/user.js';
import { authenticateToken, requireRoles } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/teams/organization
 * Get all teams for the authenticated user's organization
 */
router.get('/organization', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user.orgId;
    
    if (!orgId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    const teams = await Team.find({ orgId }).sort({ name: 1 });
    
    // Get member counts for each team
    const teamsWithCounts = await Promise.all(
      teams.map(async (team) => {
        const memberCount = await User.countDocuments({ teamId: team._id });
        return {
          ...team.toObject(),
          memberCount
        };
      })
    );

    res.json(teamsWithCounts);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /api/teams/:teamId
 * Get specific team details with members
 */
router.get('/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify user has access to this team's organization
    if (team.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get team members
    const members = await User.find({ teamId })
      .select('-password')
      .sort({ name: 1 });

    res.json({
      ...team.toObject(),
      members
    });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/teams
 * Create a new team (HR Admin, Admin, or Master Admin only)
 */
router.post('/', authenticateToken, requireRoles(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { name, function: teamFunction, sizeBand } = req.body;
    const orgId = req.user.orgId;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    if (!orgId) {
      return res.status(400).json({ message: 'User not associated with an organization' });
    }

    // Check if team with this name already exists in the organization
    const existingTeam = await Team.findOne({ orgId, name: name.trim() });
    if (existingTeam) {
      return res.status(400).json({ message: 'A team with this name already exists' });
    }

    // Create new team
    const team = new Team({
      name: name.trim(),
      orgId,
      metadata: {
        function: teamFunction || 'Other',
        sizeBand: sizeBand || '1-5'
      }
    });

    await team.save();

    res.status(201).json({
      message: 'Team created successfully',
      team: {
        ...team.toObject(),
        memberCount: 0
      }
    });
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/teams/:teamId
 * Update team details (HR Admin, Admin, or Master Admin only)
 */
router.put('/:teamId', authenticateToken, requireRoles(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, function: teamFunction, sizeBand } = req.body;

    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify user has access to this team's organization
    if (team.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update team details
    if (name && name.trim()) {
      // Check if new name conflicts with existing team
      const existingTeam = await Team.findOne({ 
        orgId: team.orgId, 
        name: name.trim(),
        _id: { $ne: teamId }
      });
      
      if (existingTeam) {
        return res.status(400).json({ message: 'A team with this name already exists' });
      }
      
      team.name = name.trim();
    }

    if (teamFunction) {
      team.metadata.function = teamFunction;
    }

    if (sizeBand) {
      team.metadata.sizeBand = sizeBand;
    }

    await team.save();

    res.json({
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/teams/:teamId
 * Delete a team (HR Admin, Admin, or Master Admin only)
 * Note: Cannot delete team if it has members
 */
router.delete('/:teamId', authenticateToken, requireRoles(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify user has access to this team's organization
    if (team.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if team has members
    const memberCount = await User.countDocuments({ teamId });
    if (memberCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete team with ${memberCount} member(s). Please reassign or remove members first.` 
      });
    }

    // Don't allow deleting the last team in an organization
    const teamCount = await Team.countDocuments({ orgId: team.orgId });
    if (teamCount <= 1) {
      return res.status(400).json({ 
        message: 'Cannot delete the last team in the organization. At least one team must exist.' 
      });
    }

    await Team.findByIdAndDelete(teamId);

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /api/teams/:teamId/members/:userId
 * Move a user to this team (HR Admin, Admin, or Master Admin only)
 */
router.put('/:teamId/members/:userId', authenticateToken, requireRoles(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Verify team belongs to user's organization
    if (team.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify user belongs to same organization
    if (user.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ message: 'User not in your organization' });
    }

    // Prevent moving yourself if you're the last admin in your current team
    if (userId === req.user.userId && ['hr_admin', 'admin'].includes(user.role)) {
      const currentTeamAdminCount = await User.countDocuments({ 
        teamId: user.teamId,
        role: { $in: ['hr_admin', 'admin'] }
      });
      
      if (currentTeamAdminCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot move the last admin from a team. Promote another user first.' 
        });
      }
    }

    const oldTeamId = user.teamId;
    user.teamId = teamId;
    await user.save();

    res.json({
      message: 'User moved to new team successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        oldTeamId
      }
    });
  } catch (error) {
    console.error('Move user to team error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /api/teams/:teamId/members/:userId
 * Remove a user from the organization entirely (HR Admin, Admin, or Master Admin only)
 */
router.delete('/:teamId/members/:userId', authenticateToken, requireRoles(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { teamId, userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify user belongs to same organization
    if (user.orgId.toString() !== req.user.orgId.toString()) {
      return res.status(403).json({ message: 'User not in your organization' });
    }

    // Verify user is in the specified team
    if (user.teamId.toString() !== teamId) {
      return res.status(400).json({ message: 'User not in specified team' });
    }

    // Prevent deleting yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    // Prevent deleting the last admin in the organization
    if (['hr_admin', 'admin'].includes(user.role)) {
      const adminCount = await User.countDocuments({ 
        orgId: user.orgId,
        role: { $in: ['hr_admin', 'admin'] }
      });
      
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot delete the last admin in the organization' 
        });
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({ 
      message: 'User removed from organization successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
