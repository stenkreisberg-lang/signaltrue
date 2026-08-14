import { Resend } from 'resend';

const roleNames = {
  hr_admin: 'HR Administrator',
  it_admin: 'IT Administrator',
  team_member: 'Team Member',
};

export const invitationUrl = (token) =>
  `${process.env.FRONTEND_URL || 'https://www.signaltrue.ai'}/onboarding?token=${token}`;

export async function deliverInvitation(invitation, { organization, inviter } = {}) {
  const url = invitationUrl(invitation.token);
  invitation.delivery = invitation.delivery || {};
  invitation.delivery.attemptCount = (invitation.delivery.attemptCount || 0) + 1;
  invitation.delivery.lastAttemptAt = new Date();

  if (!process.env.RESEND_API_KEY) {
    invitation.delivery.status = 'unconfigured';
    invitation.delivery.error = 'Email delivery is not configured.';
    await invitation.save();
    return { emailSent: false, warning: invitation.delivery.error, inviteUrl: url };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'SignalTrue <onboarding@signaltrue.ai>',
      to: invitation.email,
      subject: `You've been invited to ${organization?.name || 'SignalTrue'}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px">
        <h1>You're invited to SignalTrue</h1>
        <p><strong>${inviter?.name || 'An administrator'}</strong> invited you to join <strong>${organization?.name || 'their organization'}</strong> as a <strong>${roleNames[invitation.role] || invitation.role}</strong>.</p>
        <p>${invitation.role === 'it_admin' ? 'Please authorize the organization-wide data sources and verify that employee and activity syncs are working.' : 'Use the button below to create your account.'}</p>
        <p style="margin:32px 0"><a href="${url}" style="background:#0f766e;color:white;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:600">Accept invitation</a></p>
        <p style="color:#64748b;font-size:13px">This link expires on ${invitation.expiresAt.toISOString()}.</p>
        <p style="color:#64748b;font-size:12px;word-break:break-all">${url}</p>
      </div>`,
    });
    invitation.delivery.status = 'sent';
    invitation.delivery.sentAt = new Date();
    invitation.delivery.messageId = result?.data?.id || result?.id || undefined;
    invitation.delivery.error = undefined;
    await invitation.save();
    return { emailSent: true, warning: null, inviteUrl: url };
  } catch (error) {
    invitation.delivery.status = 'failed';
    invitation.delivery.error = String(error?.message || 'Email delivery failed').slice(0, 500);
    await invitation.save();
    return {
      emailSent: false,
      warning: 'The invitation was created, but the email could not be delivered.',
      inviteUrl: url,
    };
  }
}
