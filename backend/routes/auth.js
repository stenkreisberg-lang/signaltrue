import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import { authenticateToken, requireApiKey } from '../middleware/auth.js';
import { encryptString } from '../utils/crypto.js';

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

    // Optional: block consumer email domains
    const consumerDomains = new Set(['gmail.com','yahoo.com','hotmail.com','outlook.com','aol.com','icloud.com','protonmail.com','mail.com','yandex.com','zoho.com']);
    const emailDomain = (email.split('@')[1] || '').toLowerCase();
    if (consumerDomains.has(emailDomain)) {
      return res.status(400).json({ message: 'Please use your professional work email (consumer domains are not accepted).' });
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
        const orgName = companyName || domain.charAt(0).toUpperCase() + domain.slice(1);
        
        const newOrg = new Organization({ name: orgName, domain });
        await newOrg.save();
        resolvedOrgId = newOrg._id;

        // **THIS IS THE FIX: Use 'orgId' instead of 'organizationId'**
        const defaultTeam = new Team({
          name: 'General',
          orgId: resolvedOrgId, 
        });
        await defaultTeam.save();
        resolvedTeamId = defaultTeam._id;

      } catch (provisionError) {
        console.error('Error during org/team auto-provisioning:', provisionError);
        return res.status(500).json({ message: 'Failed to provision new organization/team.' });
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role: role || 'viewer', // Default to 'viewer' to match schema
      teamId: resolvedTeamId,
      orgId: resolvedOrgId,
      isMasterAdmin: false, // Explicitly set for new users
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        teamId: user.teamId,
        orgId: user.orgId,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        orgId: user.orgId,
      },
    });
  } catch (error) {
    console.error('Error in /register endpoint:', error);
    res.status(500).json({ message: 'An internal server error occurred during registration.' });
  }
});

// Login
// POST /api/auth/login
// Body: { email, password }
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+password').populate('teamId').populate('orgId');

    if (!user) {
      // Note: Specific error messages can be a security risk (user enumeration), but are used here for better UX as requested.
      return res.status(404).json({ message: 'No account found with that email address.' });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email, // Note: this is the encrypted email
        role: user.role,
        teamId: user.teamId,
        orgId: user.orgId,
        isMasterAdmin: user.isMasterAdmin,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email, // Send back encrypted email
        name: user.name,
        role: user.role,
        teamId: user.teamId,
        orgId: user.orgId,
        isMasterAdmin: user.isMasterAdmin,
      },
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

    // Enrich with organization slug and name for frontend routing/state
    let orgSlug = null;
    let orgName = null;
    if (user.orgId) {
      const org = await Organization.findById(user.orgId).select({ slug: 1, name: 1 }).catch(() => null);
      orgSlug = org?.slug || null;
      orgName = org?.name || null;
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
      orgId: user.orgId,
      orgSlug,
      orgName
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
