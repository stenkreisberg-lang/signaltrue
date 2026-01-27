/**
 * Card Expiry Reminder Service
 * 
 * Checks for payment methods expiring within 1 month and sends reminders.
 * Should be run daily via cron job or scheduler.
 */

import nodemailer from 'nodemailer';
import Organization from '../models/organizationModel.js';
import User from '../models/userModel.js';

// Initialize email transporter (same pattern as other services)
const emailTransporter = process.env.EMAIL_HOST && process.env.EMAIL_USER
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })
  : null;

/**
 * Check for expiring cards and send reminders
 * Cards expiring within the next 30 days will trigger a reminder
 * Only sends one reminder per card (tracked via expiryReminderSent flag)
 */
export const checkExpiringCards = async () => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();
    
    // Calculate next month
    let targetMonth = currentMonth + 1;
    let targetYear = currentYear;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear = currentYear + 1;
    }

    console.log(`[CardExpiryReminder] Checking for cards expiring in ${targetMonth}/${targetYear}...`);

    // Find organizations with cards expiring next month that haven't been reminded
    const expiringOrgs = await Organization.find({
      'paymentMethod.expiryMonth': targetMonth,
      'paymentMethod.expiryYear': targetYear,
      'paymentMethod.expiryReminderSent': { $ne: true }
    }).lean();

    console.log(`[CardExpiryReminder] Found ${expiringOrgs.length} organizations with expiring cards`);

    for (const org of expiringOrgs) {
      try {
        // Find the org admin to send the reminder
        const admins = await User.find({
          orgId: org._id,
          role: { $in: ['admin', 'owner'] }
        }).select('email name').lean();

        if (admins.length === 0) {
          console.log(`[CardExpiryReminder] No admin found for org ${org.name}, skipping`);
          continue;
        }

        const card = org.paymentMethod;
        const adminEmails = admins.map(a => a.email);
        
        // Send reminder email
        if (!emailTransporter) {
          console.log(`[CardExpiryReminder] Email not configured, skipping email for ${org.name}`);
          continue;
        }
        
        const emailContent = {
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: adminEmails,
          subject: `[Action Required] Your payment method expires soon - SignalTrue`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a1a2e;">Payment Method Expiring Soon</h2>
              <p>Hi ${admins[0].name || 'there'},</p>
              <p>Your payment method for <strong>${org.name}</strong> on SignalTrue is expiring soon:</p>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Card:</strong> ${card.brand || 'Card'} ending in ${card.last4}</p>
                <p style="margin: 8px 0 0 0;"><strong>Expires:</strong> ${card.expiryMonth}/${card.expiryYear}</p>
              </div>
              <p>To avoid any interruption to your service, please update your payment method before the expiration date.</p>
              <a href="${process.env.FRONTEND_URL || 'https://signaltrue.io'}/settings/billing" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Update Payment Method
              </a>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                Questions? Reply to this email or contact support@signaltrue.io
              </p>
            </div>
          `
        };

        await emailTransporter.sendMail(emailContent);

        // Mark reminder as sent
        await Organization.updateOne(
          { _id: org._id },
          { $set: { 'paymentMethod.expiryReminderSent': true } }
        );

        console.log(`[CardExpiryReminder] Sent reminder to ${org.name} (${adminEmails.join(', ')})`);
      } catch (emailError) {
        console.error(`[CardExpiryReminder] Failed to send reminder for org ${org.name}:`, emailError);
      }
    }

    return {
      checked: expiringOrgs.length,
      reminded: expiringOrgs.length
    };
  } catch (error) {
    console.error('[CardExpiryReminder] Error checking expiring cards:', error);
    throw error;
  }
};

/**
 * Reset reminder flags for cards that have been updated
 * Call this when a payment method is updated
 */
export const resetExpiryReminder = async (orgId) => {
  try {
    await Organization.updateOne(
      { _id: orgId },
      { $set: { 'paymentMethod.expiryReminderSent': false } }
    );
  } catch (error) {
    console.error('[CardExpiryReminder] Error resetting reminder flag:', error);
  }
};

export default { checkExpiringCards, resetExpiryReminder };
