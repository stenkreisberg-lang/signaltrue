/**
 * Superadmin Notification Service
 * 
 * Sends copies of all client reports to the superadmin for verification.
 * This allows the superadmin to review data quality and presentation.
 */

import { Resend } from 'resend';

// Superadmin email for receiving all report copies
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'sten.kreisberg@gmail.com';

// Get Resend client
function getResendClient() {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
}

/**
 * Send a copy of any report email to the superadmin
 * @param {Object} options - Email options
 * @param {string} options.subject - Original email subject
 * @param {string} options.html - HTML content of the email
 * @param {string} options.originalRecipient - Who the email was originally sent to
 * @param {string} options.reportType - Type of report (e.g., 'weekly', 'crisis', 'drift', 'assessment')
 * @param {string} options.orgName - Organization name for context
 */
export async function ccSuperadmin({ subject, html, originalRecipient, reportType, orgName }) {
  const resend = getResendClient();
  if (!resend) {
    console.log('[Superadmin CC] Resend not configured, skipping superadmin copy');
    return null;
  }

  try {
    // Prepend context banner to the email
    const superadminHtml = `
      <div style="background: #f0f9ff; border: 2px solid #0284c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 8px 0; color: #0369a1;">📋 Superadmin Copy</h3>
        <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
          <strong>Report Type:</strong> ${reportType}<br/>
          <strong>Original Recipient:</strong> ${originalRecipient}<br/>
          <strong>Organization:</strong> ${orgName || 'N/A'}<br/>
          <strong>Sent At:</strong> ${new Date().toISOString()}
        </p>
      </div>
      ${html}
    `;

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SignalTrue <reports@signaltrue.ai>',
      to: SUPERADMIN_EMAIL,
      subject: `[SUPERADMIN COPY] ${subject}`,
      html: superadminHtml,
    });

    console.log(`[Superadmin CC] Report copy sent: ${reportType} for ${orgName || originalRecipient}`);
    return result;
  } catch (error) {
    console.error('[Superadmin CC] Failed to send copy:', error.message);
    return null;
  }
}

/**
 * Send a notification to superadmin about a specific event
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message
 * @param {string} options.type - Event type (e.g., 'integration_connected', 'calibration_started')
 * @param {Object} options.data - Additional data to include
 */
export async function notifySuperadmin({ title, message, type, data = {} }) {
  const resend = getResendClient();
  if (!resend) {
    console.log('[Superadmin Notify] Resend not configured, skipping notification');
    return null;
  }

  try {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 24px; text-align: center; color: white; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔔 ${title}</h1>
        </div>
        <div style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">${message}</p>
          
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-top: 16px;">
            <h3 style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px; text-transform: uppercase;">Event Details</h3>
            <table style="width: 100%; font-size: 14px;">
              <tr><td style="padding: 4px 0; color: #6b7280;">Type:</td><td style="padding: 4px 0; color: #111827;">${type}</td></tr>
              <tr><td style="padding: 4px 0; color: #6b7280;">Timestamp:</td><td style="padding: 4px 0; color: #111827;">${new Date().toISOString()}</td></tr>
              ${Object.entries(data).map(([k, v]) => `<tr><td style="padding: 4px 0; color: #6b7280;">${k}:</td><td style="padding: 4px 0; color: #111827;">${v}</td></tr>`).join('')}
            </table>
          </div>
        </div>
        <div style="background: #f9fafb; padding: 16px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin: 0; color: #6b7280; font-size: 12px;">SignalTrue Superadmin Notifications</p>
        </div>
      </div>
    `;

    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SignalTrue <notifications@signaltrue.ai>',
      to: SUPERADMIN_EMAIL,
      subject: `[SignalTrue] ${title}`,
      html,
    });

    console.log(`[Superadmin Notify] Sent: ${type}`);
    return result;
  } catch (error) {
    console.error('[Superadmin Notify] Failed:', error.message);
    return null;
  }
}

/**
 * Notify superadmin when an organization connects an integration
 * @param {Object} org - Organization object
 * @param {string} integration - Integration name (e.g., 'microsoft', 'slack', 'jira')
 * @param {string} scope - Scope if applicable (e.g., 'teams', 'outlook')
 */
export async function notifyIntegrationConnected(org, integration, scope = null) {
  const integrationName = scope ? `${integration} (${scope})` : integration;
  
  await notifySuperadmin({
    title: 'New Integration Connected',
    message: `A client has connected a new integration. Review the dashboard to monitor their data.`,
    type: 'integration_connected',
    data: {
      'Organization': org?.name || org?.slug || 'Unknown',
      'Integration': integrationName,
      'Connected At': new Date().toLocaleString(),
    }
  });
}

export default {
  ccSuperadmin,
  notifySuperadmin,
  notifyIntegrationConnected,
};
