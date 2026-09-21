import { Resend } from 'resend';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';
import { claimNotification, completeNotificationClaim } from './notificationClaimService.js';
import { classifyUserDirectoryRecord } from '../utils/employeeIdentity.js';
import { normalizeWorkEmailDomain } from '../utils/organizationIdentity.js';

export function isValidatedEmployeeRecord(user, orgDomain = null) {
  if (!user || user.isMasterAdmin === true || user.accountStatus === 'inactive') return false;
  const classification = classifyUserDirectoryRecord(user);
  if (!classification.ok) return false;
  if (orgDomain && normalizeWorkEmailDomain(user.email) !== orgDomain) return false;
  return true;
}

export async function countValidatedEmployees(org) {
  const orgDomain = String(org?.domain || '').toLowerCase().replace(/^@/, '').trim() || null;
  const users = await User.find({
    orgId: org._id,
    accountStatus: { $ne: 'inactive' },
    isMasterAdmin: { $ne: true },
  })
    .select('email name firstName lastName source profile role accountStatus isMasterAdmin')
    .lean();

  return users.filter((user) => isValidatedEmployeeRecord(user, orgDomain)).length;
}

/**
 * Notify HR admins when integrations are complete
 * Called after IT admin connects both Slack/Google Chat AND Calendar
 */
export async function notifyHRIntegrationsComplete(orgId) {
  let claimedDelivery = null;
  try {
    console.log('[IntegrationNotify] Checking if integrations complete for org:', orgId);

    const org = await Organization.findById(orgId);
    if (!org) {
      console.log('[IntegrationNotify] Org not found');
      return;
    }

    const microsoftConnections = await IntegrationConnection.find({
      orgId,
      integrationType: { $in: ['microsoft-outlook', 'microsoft-teams'] },
    })
      .select('integrationType status')
      .lean();

    // Microsoft is complete only after application-role verification and Graph
    // probes have put the canonical source records into `connected` state.
    const slackConnected = !!org?.integrations?.slack?.accessToken;
    const googleChatConnected = !!org?.integrations?.googleChat?.accessToken;
    const teamsConnected = microsoftConnections.some(
      (connection) =>
        connection.integrationType === 'microsoft-teams' && connection.status === 'connected'
    );
    const chatConnected = slackConnected || googleChatConnected || teamsConnected;

    const googleCal =
      org?.integrations?.google?.scope === 'calendar' && !!org?.integrations?.google?.accessToken;
    const msOutlook = microsoftConnections.some(
      (connection) =>
        connection.integrationType === 'microsoft-outlook' && connection.status === 'connected'
    );
    const calendarConnected = googleCal || msOutlook;

    const integrationsComplete = chatConnected && calendarConnected;

    if (!integrationsComplete) {
      console.log('[IntegrationNotify] Integrations not yet complete', {
        chatConnected,
        calendarConnected,
      });
      return;
    }

    // Find HR admins in this organization
    const hrAdmins = await User.find({
      orgId,
      role: { $in: ['hr_admin', 'admin', 'master_admin'] },
    });
    if (hrAdmins.length === 0) {
      console.log('[IntegrationNotify] No HR admins found');
      return;
    }

    claimedDelivery = await claimNotification(
      orgId,
      'integrations_complete',
      'verified-sources-v2'
    );
    if (!claimedDelivery.claimed) {
      console.log('[IntegrationNotify] Duplicate completion notification skipped');
      return { success: true, notified: 0, skipped: true };
    }

    console.log('[IntegrationNotify] Sending notification to', hrAdmins.length, 'HR admins');

    // Count validated employees only. Raw directory/user records can include
    // shared mailboxes, resource accounts, service identities and external IT admins.
    const employeeCount = await countValidatedEmployees(org);

    // Send email via Resend
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
    const frontendUrl = process.env.FRONTEND_URL || 'https://www.signaltrue.ai';

    let notified = 0;
    for (const hrAdmin of hrAdmins) {
      if (resend) {
        try {
          const result = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'SignalTrue <onboarding@resend.dev>',
            to: hrAdmin.email,
            subject: `🎉 ${org.name} is now connected to SignalTrue!`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center;">
                  <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Integrations Complete!</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                  <p style="font-size: 18px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                    Hi ${hrAdmin.name || 'there'},
                  </p>
                  
                  <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">
                    Great news! Your IT administrator has successfully connected <strong>${org.name}</strong> to SignalTrue.
                  </p>
                  
                  <!-- Stats Box -->
                  <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <h3 style="margin: 0 0 16px 0; color: #166534;">✅ What's Ready:</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #374151;">
                      <li style="margin-bottom: 8px;"><strong>${slackConnected ? 'Slack' : teamsConnected ? 'Microsoft Teams' : 'Google Chat'}</strong> - Team communication connected</li>
                      <li style="margin-bottom: 8px;"><strong>${msOutlook ? 'Outlook Calendar' : 'Google Calendar'}</strong> - Meeting patterns connected</li>
                      <li style="margin-bottom: 8px;"><strong>${employeeCount} validated employees</strong> synced and ready to assign</li>
                    </ul>
                  </div>
                  
                  <p style="font-size: 16px; line-height: 1.6; color: #374151; margin: 24px 0;">
                    <strong>Next Step:</strong> Organize your team members into teams so SignalTrue can start analyzing team health patterns.
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${frontendUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                      Go to Dashboard
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">
                    Calibration will begin automatically and you'll see insights within 24-48 hours.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background: #f9fafb; padding: 24px 30px; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 12px; color: #9ca3af; margin: 0; text-align: center;">
                    SignalTrue - Proactive Team Health Intelligence
                  </p>
                </div>
              </div>
            `,
          });
          if (result?.error)
            throw new Error(result.error.message || 'Email provider rejected send');
          notified++;
          console.log('[IntegrationNotify] Email sent to:', hrAdmin.email);
        } catch (emailErr) {
          console.error('[IntegrationNotify] Email failed:', emailErr.message);
        }
      }
    }

    const deliveryStatus = notified > 0 ? 'sent' : resend ? 'failed' : 'skipped';
    await completeNotificationClaim(orgId, claimedDelivery.key, deliveryStatus);

    // Keep the legacy flag for existing reporting, now explicitly declared in
    // the schema. Idempotency is enforced by the atomic claim above.
    await Organization.findByIdAndUpdate(orgId, {
      $set: { 'settings.integrationsNotificationSent': notified > 0 },
    });

    // Start calibration
    const chatSource = slackConnected
      ? 'slack'
      : teamsConnected
        ? 'microsoft_teams'
        : 'google_chat';
    const calendarSource = msOutlook ? 'outlook' : 'google_calendar';
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'calibration.isInCalibration': true,
        'calibration.calibrationDay': 0,
        'calibration.calibrationProgress': 0,
        'calibration.calibrationConfidence': 'Low',
        'calibration.featuresUnlocked': false,
        'calibration.dataSourcesConnected': [
          { source: chatSource, connectedAt: new Date() },
          { source: calendarSource, connectedAt: new Date() },
        ],
      },
    });
    console.log('[IntegrationNotify] Calibration started for org:', orgId);

    return { success: true, notified, skipped: deliveryStatus === 'skipped' };
  } catch (error) {
    if (claimedDelivery?.key) {
      await completeNotificationClaim(orgId, claimedDelivery.key, 'failed', error.message).catch(
        () => {}
      );
    }
    console.error('[IntegrationNotify] Error:', error.message);
    return { success: false, error: error.message };
  }
}
