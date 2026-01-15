/**
 * Password Reset Routes
 * 
 * Provides forgot password functionality:
 * 1. POST /api/auth/forgot-password - Send reset link to email
 * 2. POST /api/auth/reset-password - Reset password with token
 */

import express from 'express';
import crypto from 'crypto';
import User from '../models/user.js';

const router = express.Router();

// In-memory store for reset tokens (in production, use Redis or DB)
const resetTokens = new Map();

// Token expiry: 1 hour
const TOKEN_EXPIRY = 60 * 60 * 1000;

/**
 * POST /api/auth/forgot-password
 * Send password reset link to user's email
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.json({ 
        message: 'If an account exists with this email, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = Date.now() + TOKEN_EXPIRY;

    // Store token
    resetTokens.set(token, {
      userId: user._id.toString(),
      email: user.email,
      expiry
    });

    // Clean up expired tokens periodically
    for (const [t, data] of resetTokens.entries()) {
      if (data.expiry < Date.now()) {
        resetTokens.delete(t);
      }
    }

    // Build reset URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://signaltrue.ai';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    // Send email (using available email service or log for now)
    console.log(`[Password Reset] Email: ${user.email}`);
    console.log(`[Password Reset] Reset URL: ${resetUrl}`);

    // Try to send email if email service is configured
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'SignalTrue <noreply@signaltrue.ai>',
          to: user.email,
          subject: 'Reset your SignalTrue password',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6366f1;">Reset Your Password</h2>
              <p>Hi ${user.name || 'there'},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #6366f1; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reset Password
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                SignalTrue - Team Health Analytics
              </p>
            </div>
          `
        });
        console.log(`[Password Reset] Email sent successfully to ${user.email}`);
      } catch (emailErr) {
        console.error('[Password Reset] Email send failed:', emailErr.message);
        // Continue - still return success since token was generated
      }
    } else {
      console.log('[Password Reset] No email service configured. Token generated but email not sent.');
      console.log(`[Password Reset] Manual reset URL: ${resetUrl}`);
    }

    res.json({ 
      message: 'If an account exists with this email, a password reset link has been sent.',
      // In development, include the URL for testing
      ...(process.env.NODE_ENV !== 'production' && { resetUrl })
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Validate token
    const tokenData = resetTokens.get(token);
    
    if (!tokenData) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (tokenData.expiry < Date.now()) {
      resetTokens.delete(token);
      return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
    }

    // Find user and update password
    const user = await User.findById(tokenData.userId);
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Remove used token
    resetTokens.delete(token);

    console.log(`[Password Reset] Password successfully reset for ${user.email}`);

    res.json({ 
      message: 'Password reset successfully. You can now log in with your new password.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

/**
 * GET /api/auth/verify-reset-token
 * Verify if a reset token is valid (for frontend to check before showing form)
 */
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token is required' });
    }

    const tokenData = resetTokens.get(token);

    if (!tokenData) {
      return res.json({ valid: false, message: 'Invalid or expired token' });
    }

    if (tokenData.expiry < Date.now()) {
      resetTokens.delete(token);
      return res.json({ valid: false, message: 'Token has expired' });
    }

    res.json({ 
      valid: true, 
      email: tokenData.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Mask email
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ valid: false, message: 'An error occurred' });
  }
});

export default router;
