export function weeklyQACopyConfig(superadminEmail = process.env.SUPERADMIN_EMAIL) {
  const weeklyMailbox = String(process.env.WEEKLY_HR_QA_COPY_EMAIL || '').trim();
  const address = (weeklyMailbox || String(superadminEmail || '')).trim().toLowerCase();
  const enabled = Boolean(weeklyMailbox) || process.env.CLIENT_REPORT_QA_COPIES_ENABLED === 'true';
  const valid = /^[a-z0-9_+-]+(?:\.[a-z0-9_+-]+)*@signaltrue\.ai$/.test(address);
  return { address, enabled, valid };
}

/**
 * Keep the platform owner's weekly quality-assurance copy in the SAME email
 * transaction as the customer report. BCC receives the exact subject, HTML,
 * charts and links without generating a different admin version.
 *
 * Customer recipients must already have passed the HR/admin approval filter.
 */
export function buildWeeklyBriefEnvelope({
  recipients,
  subject,
  html,
  superadminEmail = process.env.SUPERADMIN_EMAIL,
}) {
  const to = [...new Set((recipients || [])
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean))];

  const { address: admin, enabled: qaEnabled, valid } = weeklyQACopyConfig(superadminEmail);
  if (qaEnabled && !valid) {
    throw new Error('An explicitly configured @signaltrue.ai QA mailbox is required for client report copies');
  }

  // Provider acceptance only verifies the address was included in the send;
  // inbox delivery must be checked separately in provider delivery events.
  const qaCopyStatus = !qaEnabled
    ? 'disabled'
    : to.includes(admin) ? 'already_recipient' : 'included';

  return {
    to,
    bcc: qaCopyStatus === 'included' ? [admin] : [],
    qaCopyStatus,
    subject,
    html,
  };
}
