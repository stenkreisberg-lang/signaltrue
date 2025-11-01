import express from 'express';
import User from '../models/user.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all team members for the current user's team
router.get('/', authenticateToken, async (req, res) => {
  try {
    const teamId = req.user.teamId;
    
    const members = await User.find({ teamId })
      .select('-password')
      .sort({ role: -1, name: 1 }); // Admins first, then alphabetically

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

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create new user with the admin's team
    const user = new User({
      email,
      password,
      name,
      role: role || 'viewer',
      teamId
    });

    await user.save();

    res.status(201).json({
      message: 'Team member added successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId
      }
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
          message: 'Cannot demote the last admin. Promote another user to admin first.' 
        });
      }
    }

    // Update user
    if (role) user.role = role;
    if (name) user.name = name;
    
    await user.save();

    res.json({
      message: 'Team member updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId
      }
    });
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete team member (admin only)
router.delete('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const teamId = req.user.teamId;

    // Prevent admin from deleting themselves if they're the only admin
    if (userId === req.user.userId) {
      const adminCount = await User.countDocuments({ teamId, role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: 'Cannot delete the last admin. Promote another user to admin first.' 
        });
      }
    }

    // Find and delete user
    const user = await User.findOneAndDelete({ _id: userId, teamId });
    if (!user) {
      return res.status(404).json({ message: 'User not found or not in your team' });
    }

    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
