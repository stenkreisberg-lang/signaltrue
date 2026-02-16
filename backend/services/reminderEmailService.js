/**
 * Reminder Email Service
 * Sends reminder emails to users and IT admins to complete setup
 */

import { Resend } from 'resend';

// Initialize Resend client
function getResendClient() {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
}

// Email styling constants (matching SignalTrue brand)
const BRAND_COLORS = {
  background: '#0a0a0f',
  cardBg: 'rgba(30, 30, 40, 0.95)',
  primary: '#6366f1',
  primaryGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
  text: '#e5e5e5',
  mutedText: '#9ca3af',
  border: 'rgba(99, 102, 241, 0.2)',
  warning: '#f59e0b',
};

/**
 * Generate base email template with SignalTrue branding
 */
function generateEmailTemplate(content, preheader = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SignalTrue</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Preheader text (hidden but shows in email preview) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <!-- Email Container -->
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND_COLORS.background};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Content Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background: ${BRAND_COLORS.cardBg}; border-radius: 16px; border: 1px solid ${BRAND_COLORS.border};">
          
          <!-- Logo Header -->
          <tr>
            <td style="padding: 32px 40px 24px 40px; border-bottom: 1px solid ${BRAND_COLORS.border};">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Signal<span style="color: ${BRAND_COLORS.primary};">True</span></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid ${BRAND_COLORS.border}; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.mutedText};">
                © ${new Date().getFullYear()} SignalTrue. Run healthier teams.
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: ${BRAND_COLORS.mutedText};">
                <a href="https://www.signaltrue.ai/privacy" style="color: ${BRAND_COLORS.mutedText}; text-decoration: underline;">Privacy</a> · 
                <a href="https://www.signaltrue.ai/trust" style="color: ${BRAND_COLORS.mutedText}; text-decoration: underline;">Security</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Generate CTA button HTML
 */
function generateButton(text, url) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 8px; background: ${BRAND_COLORS.primaryGradient};">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * REMINDER 1: New User - Connect Your Tools
 * Sent immediately after registration
 */
export function generateNewUserReminderEmail(firstName, connectUrl) {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hey ${firstName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      You created your SignalTrue account — good move. Now the tool can start showing you early warning signs about burnout, overload, and execution drift across your teams.
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND_COLORS.warning}; line-height: 1.7; font-weight: 500;">
      ⚠️ Right now the platform isn't connected to any data sources. That means there are no signals to show you insight.
    </p>
    
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Click below to finish setup:
    </p>
    
    ${generateButton('👉 Connect Your Calendar & Slack', connectUrl)}
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      Once your calendar and Slack are connected, SignalTrue will begin analyzing collaboration patterns and delivering the insights you signed up for.
    </p>
    
    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.warning}; font-weight: 600;">
        No connections = no signal.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        Get them linked and start seeing where organizational risk actually lives.
      </p>
    </div>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Seeing real insights starts here,<br>
      <strong style="color: ${BRAND_COLORS.text};">The SignalTrue Team</strong>
    </p>
  `;

  return generateEmailTemplate(content, "You're almost there — finish connecting tools to see real signals");
}

/**
 * REMINDER 2: IT Admin - Complete Integration Setup
 * Sent when HR admin invites an IT admin
 */
export function generateITAdminReminderEmail(itAdminName, hrAdminName, setupUrl) {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hey ${itAdminName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      You were invited by <strong>${hrAdminName || 'your HR administrator'}</strong> to enable SignalTrue for your organization. That's step one done.
    </p>
    
    <p style="margin: 0 0 20px 0; font-size: 16px; color: ${BRAND_COLORS.warning}; line-height: 1.7; font-weight: 500;">
      ⚠️ SignalTrue can't start providing meaningful signals about burnout and execution drift until integrations are live. Right now, nothing is connected.
    </p>
    
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Click below to activate the core integrations (Slack, calendar, etc.):
    </p>
    
    ${generateButton('👉 Enable Integrations', setupUrl)}
    
    <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.primary}; font-weight: 600;">
        This is a one-click step.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        Without it, users will sign in and see a dead platform — no data, no risk flags, no alerts.
      </p>
    </div>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Finish this now so the tool works.<br><br>
      Thanks,<br>
      <strong style="color: ${BRAND_COLORS.text};">The SignalTrue Team</strong>
    </p>
  `;

  return generateEmailTemplate(content, "IT action needed — complete the integration setup");
}

/**
 * FOLLOW-UP REMINDER: User still hasn't connected (24h later)
 */
export function generateFollowUpReminderEmail(firstName, connectUrl, hoursElapsed = 24) {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hey ${firstName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      It's been ${hoursElapsed} hours since you created your SignalTrue account, but we noticed you haven't connected any data sources yet.
    </p>
    
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; color: #ef4444; font-weight: 600;">
        📊 Your dashboard is empty
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        Without integrations, SignalTrue can't detect burnout signals, workload imbalances, or execution drift.
      </p>
    </div>
    
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Takes less than 2 minutes:
    </p>
    
    ${generateButton('Connect Now', connectUrl)}
    
    <p style="margin: 24px 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      Here's what you'll unlock once connected:
    </p>
    
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td style="padding: 8px 0;">
          <span style="color: #22c55e; font-size: 16px;">✓</span>
          <span style="margin-left: 12px; color: ${BRAND_COLORS.text}; font-size: 14px;">Real-time team health scores</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">
          <span style="color: #22c55e; font-size: 16px;">✓</span>
          <span style="margin-left: 12px; color: ${BRAND_COLORS.text}; font-size: 14px;">Early warning signals for burnout</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">
          <span style="color: #22c55e; font-size: 16px;">✓</span>
          <span style="margin-left: 12px; color: ${BRAND_COLORS.text}; font-size: 14px;">Workload and collaboration insights</span>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0;">
          <span style="color: #22c55e; font-size: 16px;">✓</span>
          <span style="margin-left: 12px; color: ${BRAND_COLORS.text}; font-size: 14px;">Weekly automated reports</span>
        </td>
      </tr>
    </table>
    
    <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Questions? Reply to this email.<br><br>
      <strong style="color: ${BRAND_COLORS.text};">The SignalTrue Team</strong>
    </p>
  `;

  return generateEmailTemplate(content, `${hoursElapsed} hours in — your SignalTrue dashboard is still empty`);
}

/**
 * FOLLOW-UP: IT Admin (48h urgency)
 */
export function generateITAdminUrgentReminderEmail(itAdminName, hrAdminName, setupUrl) {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hey ${itAdminName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      Quick follow-up: SignalTrue integrations still aren't connected for your organization.
    </p>
    
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; color: #ef4444; font-weight: 600;">
        ⏰ Teams are waiting for live data
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        ${hrAdminName || 'Your HR team'} invited you to set up integrations. Without this step, users see empty dashboards and the tool can't deliver value.
      </p>
    </div>
    
    ${generateButton('Complete Setup Now', setupUrl)}
    
    <p style="margin: 16px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.mutedText};">
      This is a one-click OAuth flow. No configuration required.
    </p>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Thanks,<br>
      <strong style="color: ${BRAND_COLORS.text};">The SignalTrue Team</strong>
    </p>
  `;

  return generateEmailTemplate(content, "Urgent: Teams waiting for SignalTrue data — complete setup");
}

/**
 * Send reminder email
 */
export async function sendReminderEmail({ to, subject, html, tags = [] }) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log(`[Reminder Email] Resend not configured. Would send to: ${to}`);
    console.log(`[Reminder Email] Subject: ${subject}`);
    return { success: false, reason: 'Resend not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: 'SignalTrue <noreply@signaltrue.ai>',
      to,
      subject,
      html,
      tags: [{ name: 'category', value: 'reminder' }, ...tags],
    });

    console.log(`[Reminder Email] Sent to ${to}: ${subject}`);
    return { success: true, emailId: result.id };
  } catch (error) {
    console.error(`[Reminder Email] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Helper to get properly formatted first name from user object
 */
function getFirstName(user) {
  // Prefer firstName field if available
  if (user.firstName) {
    return user.firstName.charAt(0).toUpperCase() + user.firstName.slice(1).toLowerCase();
  }
  // Fall back to parsing from name field
  if (user.name) {
    const firstName = user.name.split(' ')[0] || '';
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }
  return '';
}

/**
 * Send new user reminder (Trigger 1)
 */
export async function sendNewUserReminder(user) {
  const firstName = getFirstName(user);
  const connectUrl = `https://www.signaltrue.ai/integrations?token=${user._id}`;
  
  const html = generateNewUserReminderEmail(firstName, connectUrl);
  
  return sendReminderEmail({
    to: user.email,
    subject: "You're almost there — finish connecting tools to see real signals",
    html,
    tags: [{ name: 'type', value: 'new-user-reminder' }],
  });
}

/**
 * Send IT admin invitation reminder (Trigger 2)
 */
export async function sendITAdminReminder(itAdminEmail, itAdminName, hrAdminName, setupUrl) {
  // Format IT admin name properly
  const formattedName = itAdminName 
    ? itAdminName.charAt(0).toUpperCase() + itAdminName.slice(1).toLowerCase()
    : '';
  const formattedHRName = hrAdminName
    ? hrAdminName.charAt(0).toUpperCase() + hrAdminName.slice(1).toLowerCase()
    : '';
    
  const html = generateITAdminReminderEmail(formattedName, formattedHRName, setupUrl);
  
  return sendReminderEmail({
    to: itAdminEmail,
    subject: 'IT action needed — complete the integration setup',
    html,
    tags: [{ name: 'type', value: 'it-admin-reminder' }],
  });
}

/**
 * Send follow-up reminder for user who hasn't connected (24h)
 */
export async function sendUserFollowUpReminder(user, hoursElapsed = 24) {
  const firstName = getFirstName(user);
  const connectUrl = `https://www.signaltrue.ai/integrations?token=${user._id}`;
  
  const html = generateFollowUpReminderEmail(firstName, connectUrl, hoursElapsed);
  
  return sendReminderEmail({
    to: user.email,
    subject: `${hoursElapsed} hours in — your SignalTrue dashboard is still empty`,
    html,
    tags: [{ name: 'type', value: 'user-followup-reminder' }],
  });
}

/**
 * Send urgent IT admin follow-up (48h)
 */
export async function sendITAdminUrgentReminder(itAdminEmail, itAdminName, hrAdminName, setupUrl) {
  const html = generateITAdminUrgentReminderEmail(itAdminName, hrAdminName, setupUrl);
  
  return sendReminderEmail({
    to: itAdminEmail,
    subject: 'Urgent: Teams waiting for SignalTrue data — complete setup',
    html,
    tags: [{ name: 'type', value: 'it-admin-urgent-reminder' }],
  });
}

// ============================================================
// WEEK 2 & WEEK 3 REMINDERS (More direct tone)
// ============================================================

/**
 * USER REMINDER - WEEK 2 (7 days after signup, no integrations)
 */
export function generateUserWeek2ReminderEmail(firstName, connectUrl) {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hi ${firstName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      You created your SignalTrue account 7 days ago.
    </p>
    
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; color: #ef4444; font-weight: 600;">
        Right now, no integrations are connected.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        That means SignalTrue cannot detect overload, burnout risk, or execution drift in your organization.
      </p>
    </div>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.warning}; font-weight: 600;">
      No data in = no insight out.
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      If your goal was to gain early visibility into team strain, this is the moment to activate it.
    </p>
    
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      Connect your tools below and let the system begin analyzing collaboration patterns.
    </p>
    
    ${generateButton('👉 Connect Calendar & Slack Now', connectUrl)}
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      The earlier the signal starts, the earlier risk becomes preventable.
    </p>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      – SignalTrue Team
    </p>
  `;

  return generateEmailTemplate(content, "Still no signals detected — 7 days since signup");
}

/**
 * USER REMINDER - WEEK 3 (14 days after signup, final reminder)
 */
export function generateUserWeek3ReminderEmail(firstName, connectUrl) {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hi ${firstName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      Two weeks ago you signed up for SignalTrue.
    </p>
    
    <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; color: #ef4444; font-weight: 600;">
        The platform is still not connected to any work systems.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        That means there is zero behavioral signal being tracked.
      </p>
    </div>
    
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      Burnout doesn't start with complaints.
    </p>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.mutedText}; line-height: 1.7;">
      It starts with subtle shifts in meetings, focus time, and collaboration load.
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      <strong>SignalTrue exists to detect those shifts early.</strong>
    </p>
    
    <p style="margin: 0 0 8px 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      If this initiative matters to you, activate integrations below.
    </p>
    
    ${generateButton('👉 Start Behavioral Monitoring', connectUrl)}
    
    <p style="margin: 24px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.mutedText}; line-height: 1.7;">
      If not, your account will remain idle and no insights will be generated.
    </p>
    
    <div style="border-left: 3px solid ${BRAND_COLORS.primary}; padding-left: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.text}; font-style: italic;">
        The decision is simple: observe early, or react late.
      </p>
    </div>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      – SignalTrue Team
    </p>
  `;

  return generateEmailTemplate(content, "Your early-warning system is still inactive — final reminder");
}

/**
 * IT ADMIN REMINDER - WEEK 2 (7 days after invite)
 */
export function generateITAdminWeek2ReminderEmail(itAdminName, hrAdminName, setupUrl) {
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hi ${itAdminName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      You were invited by <strong>${hrAdminName || 'your HR administrator'}</strong> to enable SignalTrue integrations.
    </p>
    
    <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.warning}; font-weight: 600;">
        The integrations have not yet been completed.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        Until Slack and calendar access are activated, SignalTrue cannot generate behavioral insights for your organization.
      </p>
    </div>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.mutedText}; line-height: 1.7;">
      This is a one-click OAuth connection. No content access. Metadata only.
    </p>
    
    ${generateButton('👉 Complete Integration Setup', setupUrl)}
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      Teams are waiting for visibility. The system cannot operate without this step.
    </p>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      – SignalTrue Team
    </p>
  `;

  return generateEmailTemplate(content, "Integration setup still pending — 7 days");
}

/**
 * IT ADMIN REMINDER - WEEK 3 (14 days, final escalation)
 */
export function generateITAdminWeek3ReminderEmail(itAdminName, hrAdminName, setupUrl) {
  const securityUrl = 'https://www.signaltrue.ai/trust';
  
  const content = `
    <p style="margin: 0 0 20px 0; font-size: 18px; color: ${BRAND_COLORS.text}; line-height: 1.6;">
      Hi ${itAdminName || 'there'},
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: #ef4444; font-weight: 600;">
      This is a final reminder.
    </p>
    
    <p style="margin: 0 0 16px 0; font-size: 16px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      SignalTrue has not been connected to your organization's work systems. As a result, <strong>no behavioral risk monitoring is active.</strong>
    </p>
    
    <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.text};">
        <strong>${hrAdminName || 'HR'}</strong> initiated this to gain early detection of overload and burnout patterns.
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.mutedText};">
        Without integration approval, the initiative stalls here.
      </p>
    </div>
    
    <p style="margin: 0 0 16px 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      If security or privacy concerns are blocking this, documentation is available below:
    </p>
    
    ${generateButton('👉 Review Security & Complete Setup', setupUrl)}
    
    <p style="margin: 16px 0 0 0; font-size: 14px; color: ${BRAND_COLORS.mutedText};">
      <a href="${securityUrl}" style="color: ${BRAND_COLORS.primary}; text-decoration: underline;">View Security Overview →</a>
    </p>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.text}; line-height: 1.7;">
      Otherwise, please confirm whether this initiative should be paused.
    </p>
    
    <p style="margin: 24px 0 0 0; font-size: 15px; color: ${BRAND_COLORS.mutedText};">
      – SignalTrue Team
    </p>
  `;

  return generateEmailTemplate(content, "SignalTrue is not active in your organization — final reminder");
}

// ============================================================
// SEND FUNCTIONS FOR WEEK 2 & WEEK 3
// ============================================================

/**
 * Send Week 2 reminder to user (7 days)
 */
export async function sendUserWeek2Reminder(user) {
  const firstName = getFirstName(user);
  const connectUrl = `https://www.signaltrue.ai/integrations?token=${user._id}`;
  
  const html = generateUserWeek2ReminderEmail(firstName, connectUrl);
  
  return sendReminderEmail({
    to: user.email,
    subject: 'Still no signals detected',
    html,
    tags: [{ name: 'type', value: 'user-week2-reminder' }],
  });
}

/**
 * Send Week 3 reminder to user (14 days, final)
 */
export async function sendUserWeek3Reminder(user) {
  const firstName = getFirstName(user);
  const connectUrl = `https://www.signaltrue.ai/integrations?token=${user._id}`;
  
  const html = generateUserWeek3ReminderEmail(firstName, connectUrl);
  
  return sendReminderEmail({
    to: user.email,
    subject: 'Your early-warning system is still inactive',
    html,
    tags: [{ name: 'type', value: 'user-week3-reminder' }],
  });
}

/**
 * Helper to format name properly
 */
function formatNameProperly(name) {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/**
 * Send Week 2 reminder to IT admin (7 days)
 */
export async function sendITAdminWeek2Reminder(itAdminEmail, itAdminName, hrAdminName, setupUrl) {
  const formattedITName = formatNameProperly(itAdminName);
  const formattedHRName = formatNameProperly(hrAdminName);
  
  const html = generateITAdminWeek2ReminderEmail(formattedITName, formattedHRName, setupUrl);
  
  return sendReminderEmail({
    to: itAdminEmail,
    subject: 'Integration setup still pending',
    html,
    tags: [{ name: 'type', value: 'it-admin-week2-reminder' }],
  });
}

/**
 * Send Week 3 reminder to IT admin (14 days, final escalation)
 */
export async function sendITAdminWeek3Reminder(itAdminEmail, itAdminName, hrAdminName, setupUrl) {
  const formattedITName = formatNameProperly(itAdminName);
  const formattedHRName = formatNameProperly(hrAdminName);
  
  const html = generateITAdminWeek3ReminderEmail(formattedITName, formattedHRName, setupUrl);
  
  return sendReminderEmail({
    to: itAdminEmail,
    subject: 'SignalTrue is not active in your organization',
    html,
    tags: [{ name: 'type', value: 'it-admin-week3-reminder' }],
  });
}

export default {
  sendNewUserReminder,
  sendITAdminReminder,
  sendUserFollowUpReminder,
  sendITAdminUrgentReminder,
  sendUserWeek2Reminder,
  sendUserWeek3Reminder,
  sendITAdminWeek2Reminder,
  sendITAdminWeek3Reminder,
  generateNewUserReminderEmail,
  generateITAdminReminderEmail,
  generateFollowUpReminderEmail,
  generateITAdminUrgentReminderEmail,
  generateUserWeek2ReminderEmail,
  generateUserWeek3ReminderEmail,
  generateITAdminWeek2ReminderEmail,
  generateITAdminWeek3ReminderEmail,
};
