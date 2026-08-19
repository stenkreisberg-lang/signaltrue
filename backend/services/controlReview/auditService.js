/**
 * Immutable audit trail (spec §27.3, §23).
 *
 * Every Evidence Pack export, role change, case decision and configuration
 * change is recorded. Writes are best-effort at the call site but failures are
 * logged loudly: a silently missing audit event is worse than a noisy one.
 */

import ControlReviewAuditEvent from '../../models/controlReview/auditEvent.js';

export async function recordAudit({
  tenantId,
  actor = null,
  actorType = 'USER',
  action,
  objectType,
  objectId = null,
  metadata = {},
  req = null,
}) {
  try {
    return await ControlReviewAuditEvent.create({
      tenantId,
      actorId: actor?.userId || actor?._id || null,
      actorEmail: actor?.email || '',
      actorRole: actor?.hsRole || actor?.role || '',
      actorType,
      action,
      objectType,
      objectId,
      metadata,
      timestamp: new Date(),
      ipAddress: req?.ip || '',
      userAgent: req?.headers?.['user-agent'] || '',
    });
  } catch (error) {
    console.error('[controlReview:audit] failed to record audit event', {
      action,
      objectType,
      error: error.message,
    });
    return null;
  }
}

export async function listAuditEvents({ tenantId, objectType, objectId, limit = 200 }) {
  const query = { tenantId };
  if (objectType) query.objectType = objectType;
  if (objectId) query.objectId = objectId;
  return ControlReviewAuditEvent.find(query).sort({ timestamp: -1 }).limit(limit).lean();
}

/** The case timeline in the Evidence Pack is drawn from the audit trail (§20.16). */
export async function caseTimeline({ tenantId, caseId, relatedIds = [] }) {
  const ids = [caseId, ...relatedIds].filter(Boolean);
  return ControlReviewAuditEvent.find({ tenantId, objectId: { $in: ids } })
    .sort({ timestamp: 1 })
    .lean();
}

export default { recordAudit, listAuditEvents, caseTimeline };
