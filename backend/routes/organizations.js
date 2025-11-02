import express from 'express';
import Organization from '../models/organization.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
// Get the authenticated user's organization (includes integrations)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.orgId) {
      return res.status(404).json({ message: 'No organization associated with user' });
    }
    const org = await Organization.findById(req.user.orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    return res.json(org);
  } catch (error) {
    console.error('Get my organization error:', error);
    res.status(500).json({ message: error.message });
  }
});


// Middleware to check master admin
function requireMasterAdmin(req, res, next) {
  if (!req.user.isMasterAdmin) {
    return res.status(403).json({ 
      message: 'Forbidden: Master admin access required' 
    });
  }
  next();
}

// Get all organizations (master admin only)
router.get('/', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ createdAt: -1 });
    
    // Get counts for each org
    const orgsWithCounts = await Promise.all(orgs.map(async (org) => {
      const teamCount = await Team.countDocuments({ orgId: org._id });
      const userCount = await User.countDocuments({ orgId: org._id });
      
      return {
        ...org.toObject(),
        stats: {
          teams: teamCount,
          users: userCount
        }
      };
    }));
    
    res.json(orgsWithCounts);
  } catch (error) {
    console.error('Get organizations error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get single organization (master admin only)
router.get('/:orgId', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Get detailed stats
    const teams = await Team.find({ orgId: org._id });
    const users = await User.find({ orgId: org._id }).select('-password');
    
    res.json({
      ...org.toObject(),
      teams,
      users
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create new organization (master admin only)
router.post('/', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const { name, industry, size, subscription } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }
    if (!industry || typeof industry !== 'string' || !industry.trim()) {
      return res.status(400).json({ message: 'Industry is required for organization' });
    }

    const org = new Organization({
      name,
      industry: industry.trim(),
      size,
      subscription: subscription || { plan: 'trial', status: 'active' }
    });

    await org.save();

    res.status(201).json(org);
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update organization (master admin only)
router.put('/:orgId', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const { name, industry, size, subscription, settings } = req.body;
    
    const org = await Organization.findById(req.params.orgId);
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    if (name) org.name = name;
    if (industry !== undefined) org.industry = industry;
    if (size !== undefined) org.size = size;
    if (subscription) org.subscription = { ...org.subscription, ...subscription };
    if (settings) org.settings = { ...org.settings, ...settings };
    
    await org.save();
    
    res.json(org);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete organization (master admin only)
router.delete('/:orgId', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId);
    
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Delete all associated teams
    await Team.deleteMany({ orgId: org._id });
    
    // Delete all associated users
    await User.deleteMany({ orgId: org._id });
    
    // Delete the organization
    await Organization.findByIdAndDelete(org._id);
    
    res.json({ message: 'Organization and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all teams for an organization (master admin only)
router.get('/:orgId/teams', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const teams = await Team.find({ orgId: req.params.orgId }).sort({ updatedAt: -1 });
    res.json(teams);
  } catch (error) {
    console.error('Get org teams error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all users for an organization (master admin only)
router.get('/:orgId/users', authenticateToken, requireMasterAdmin, async (req, res) => {
  try {
    const users = await User.find({ orgId: req.params.orgId })
      .select('-password')
      .populate('teamId', 'name')
      .sort({ role: -1, name: 1 });
    res.json(users);
  } catch (error) {
    console.error('Get org users error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
