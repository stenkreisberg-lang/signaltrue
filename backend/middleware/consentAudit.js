import ConsentAudit from '../models/consentAudit.js';

/**
 * Middleware to log user consent and access to endpoints.
 * Usage: app.use(auditConsent)
 */
export default async function auditConsent(req, res, next) {
  try {
    const user = req.user || {};
    if (!user.orgId || !user._id) {
      // Skip logging if required fields are missing
      return next();
    }
    await ConsentAudit.create({
      org_id: user.orgId,
      user_id: user._id,
      action: req.method === 'POST' && req.path.includes('consent') ? 'consent_given' : 'data_accessed',
      endpoint: req.originalUrl,
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      details: {}
    });
  } catch (err) {
    // Don't block request on audit failure
    console.error('[ConsentAudit] Failed to log:', err);
  }
  next();
}
