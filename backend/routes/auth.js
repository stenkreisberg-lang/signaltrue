import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
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

        // Create a default "General" team for this new organization
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

    // Determine role: First user in org becomes hr_admin, others default to viewer
    let userRole = role || 'viewer';
    if (!role) {
      const existingUsersCount = await User.countDocuments({ orgId: resolvedOrgId });
      if (existingUsersCount === 0) {
        // This is the first user in the organization - make them HR admin
        userRole = 'hr_admin';
        console.log('First user in organization - assigning hr_admin role');
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      role: userRole,
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
        teamId: user.teamId?._id || user.teamId,
        orgId: user.orgId?._id || user.orgId,
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

// Resend client for password reset emails
const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Save token and expiry (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.signaltrue.ai';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email via Resend
    const resend = getResendClient();
    if (resend) {
      try {
        const result = await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SignalTrue <onboarding@resend.dev>',
          to: email,
          subject: 'SignalTrue - Password Reset Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">Reset Your Password</h2>
              <p>You requested a password reset for your SignalTrue account.</p>
              <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
              <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">Reset Password</a>
              <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
              <p style="color: #666; font-size: 12px;">Or copy this link: ${resetUrl}</p>
            </div>
          `
        });
        console.log('Password reset email sent to:', email, 'Result:', JSON.stringify(result));
      } catch (emailError) {
        console.error('Resend email error:', emailError);
        // Don't fail the request - still return success to prevent email enumeration
      }
    } else {
      console.log('Resend not configured. Reset URL:', resetUrl);
    }

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;
    
    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: 'Email, token, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token. Please request a new password reset.' });
    }

    // Update password and clear reset fields
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Create master admin - PUBLIC endpoint for initial setup
// POST /api/auth/create-master-admin
// Body: { email, password, name, secretKey }
router.post('/create-master-admin', async (req, res) => {
  try {
    const { email, password, name, secretKey } = req.body;
    
    // Simple secret key check (can be changed to env variable)
    const MASTER_ADMIN_SECRET = process.env.MASTER_ADMIN_SECRET || 'signaltrue-master-2026';
    
    if (secretKey !== MASTER_ADMIN_SECRET) {
      return res.status(403).json({ message: 'Invalid secret key' });
    }

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' });
    }

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      // Update existing user to master admin
      existing.role = 'master_admin';
      existing.isMasterAdmin = true;
      existing.password = password; // Will be hashed by pre-save hook
      await existing.save();

      const token = jwt.sign(
        {
          userId: existing._id,
          email: existing.email,
          role: existing.role,
          teamId: existing.teamId,
          orgId: existing.orgId,
          isMasterAdmin: existing.isMasterAdmin
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        message: 'User upgraded to master admin',
        token,
        user: {
          id: existing._id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
          isMasterAdmin: existing.isMasterAdmin
        }
      });
    }

    // Create new master admin
    const user = new User({
      email,
      password,
      name,
      role: 'master_admin',
      isMasterAdmin: true
    });
    await user.save();

    // Create a default organization for the master admin
    const org = new Organization({
      name: 'Master Admin Organization',
      domain: email.split('@')[1],
      ownerId: user._id
    });
    await org.save();

    // Create a default team for the master admin
    const team = new Team({
      name: 'Master Admin Team',
      organizationId: org._id,
      members: [{
        userId: user._id,
        role: 'admin',
        joinedAt: new Date()
      }]
    });
    await team.save();

    // Update user with org and team references
    user.orgId = org._id;
    user.teamId = team._id;
    await user.save();

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
        teamId: team._id,
        orgId: org._id,
        isMasterAdmin: user.isMasterAdmin
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Master admin created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: org._id,
        teamId: team._id,
        isMasterAdmin: user.isMasterAdmin
      }
    });
  } catch (error) {
    console.error('Create master admin error:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
