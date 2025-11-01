import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Organization from '../models/organization.js';
import Team from '../models/team.js';
import { authenticateToken, requireApiKey } from '../middleware/auth.js';

const router = express.Router();

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Create a MASTER ADMIN (secured by API key in production; open if no API_KEY set)
// POST /api/auth/register-master
// Body: { email, password, name }
router.post('/register-master', requireApiKey, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = new User({
      email,
      password,
      name,
      role: 'master_admin',
      isMasterAdmin: true
    });
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        orgId: user.orgId,
        isMasterAdmin: user.isMasterAdmin
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Master admin created successfully',
      token,
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
  } catch (error) {
    console.error('Register master admin error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, teamId, orgId, companyName } = req.body;

    // Validate required fields (teamId and orgId not required for master admin)
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    let resolvedOrgId = orgId;
    let resolvedTeamId = teamId;

    // If no org/team provided, auto-provision an Organization and a default Team
    if (!resolvedOrgId || !resolvedTeamId) {
      try {
        // Determine organization name: prefer companyName, else derive from email domain
        const domain = (email.split('@')[1] || '').split('.')[0];
        const inferredCompany = companyName && companyName.trim() !== '' ? companyName.trim() : (domain ? domain.charAt(0).toUpperCase() + domain.slice(1) : 'Your Company');

        // Find or create organization
        let org = await Organization.findOne({ name: inferredCompany });
        if (!org) {
          org = new Organization({
            name: inferredCompany,
            // basic defaults so schema validations pass
            industry: 'General',
            subscription: { plan: 'trial', status: 'active' },
            settings: { allowRegistration: true }
          });
          await org.save();
        }

        resolvedOrgId = org._id;

        // Find or create a default team within the org
        let team = await Team.findOne({ orgId: org._id, name: 'General' });
        if (!team) {
          team = new Team({ name: 'General', orgId: org._id });
          await team.save();
        }

        resolvedTeamId = team._id;
      } catch (provisionErr) {
        console.error('Auto-provision org/team failed:', provisionErr);
        return res.status(500).json({ message: 'Could not set up your organization. Please try again later.' });
      }
    }

    // Create new user (default to admin when we had to auto-provision org/team)
    const user = new User({
      email,
      password,
      name,
      role: role || (!orgId && !teamId ? 'admin' : 'viewer'),
      teamId: resolvedTeamId,
      orgId: resolvedOrgId
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role, 
        teamId: user.teamId,
        orgId: user.orgId,
        isMasterAdmin: user.isMasterAdmin 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role, 
        teamId: user.teamId,
        orgId: user.orgId,
        isMasterAdmin: user.isMasterAdmin
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('teamId');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
