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
  superadminEmail = process.env.SUPERADMIN_EMAIL || 'sten.kreisberg@gmail.com',
}) {
  const to = [...new Set((recipients || [])
    .map((email) => String(email || '').trim().toLowerCase())
    .filter(Boolean))];

  const admin = String(superadminEmail || '').trim().toLowerCase();
  if (!admin) throw new Error('SUPERADMIN_EMAIL must be set for weekly report oversight');

  return {
    to,
    bcc: to.includes(admin) ? [] : [admin],
    subject,
    html,
  };
}
