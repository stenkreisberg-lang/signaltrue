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

  const admin = String(superadminEmail || '').trim().toLowerCase();
  const qaEnabled = process.env.CLIENT_REPORT_QA_COPIES_ENABLED === 'true';
  if (qaEnabled && (!admin || !admin.endsWith('@signaltrue.ai'))) {
    throw new Error('An explicitly configured @signaltrue.ai QA mailbox is required for client report copies');
  }

  return {
    to,
    bcc: qaEnabled && !to.includes(admin) ? [admin] : [],
    subject,
    html,
  };
}
