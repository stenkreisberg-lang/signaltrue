/**
 * Role and access control for the control-verification module (spec §23).
 *
 * Five H&S roles sit on top of the platform roles. The mapping is explicit so
 * a platform "admin" does not silently acquire consultation detail, which can
 * carry identifiable worker context.
 *
 * No role reveals individual psychological or productivity scoring, because no
 * such scoring exists in P0.
 */

import ControlReviewCase from '../models/controlReview/controlReviewCase.js';
import { recordAudit } from '../services/controlReview/auditService.js';

export const HS_PERMISSIONS = {
  SYSTEM_ADMIN: {
    cases: 'none',
    consultationDetail: false,
    evidencePack: false,
    configuration: true,
    audit: true,
  },
  HS_ADMIN: {
    cases: 'all',
    consultationDetail: true,
    evidencePack: true,
    configuration: false,
    audit: true,
  },
  CASE_OWNER: {
    cases: 'assigned',
    consultationDetail: true,
    evidencePack: true,
    configuration: false,
    audit: false,
  },
  FUNCTION_LEADER: {
    cases: 'permitted_teams',
    consultationDetail: false,
    evidencePack: false,
    configuration: false,
    audit: false,
  },
  AUDITOR_READONLY: {
    cases: 'read_only',
    consultationDetail: false,
    evidencePack: true,
    configuration: false,
    audit: true,
  },
};

const PLATFORM_ROLE_MAP = {
  master_admin: 'HS_ADMIN',
  super_admin: 'HS_ADMIN',
  org_admin: 'HS_ADMIN',
  hr_admin: 'HS_ADMIN',
  compliance: 'HS_ADMIN',
  admin: 'HS_ADMIN',
  it_admin: 'SYSTEM_ADMIN',
  executive: 'FUNCTION_LEADER',
  manager: 'FUNCTION_LEADER',
  viewer: 'AUDITOR_READONLY',
  team_member: null,
};

export function resolveHsRole(user) {
  if (!user) return null;
  if (user.hsRole) return user.hsRole;
  return PLATFORM_ROLE_MAP[user.role] ?? null;
}

/** Attach the resolved H&S role and its permissions to the request. */
export function withHsRole(req, res, next) {
  const hsRole = resolveHsRole(req.user);

  if (!hsRole) {
    return res.status(403).json({
      error: true,
      code: 'HS_ROLE_REQUIRED',
      message: 'This account does not have a health and safety role in SignalTrue.',
    });
  }

  req.hsRole = hsRole;
  req.hsPermissions = HS_PERMISSIONS[hsRole];
  req.user.hsRole = hsRole;
  return next();
}

export function requireHsRole(...allowed) {
  return (req, res, next) => {
    const hsRole = req.hsRole || resolveHsRole(req.user);
    if (!hsRole || !allowed.includes(hsRole)) {
      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'Your role does not permit this action.',
        required: allowed,
      });
    }
    return next();
  };
}

export function requireWriteAccess(req, res, next) {
  if (req.hsRole === 'AUDITOR_READONLY' || req.hsRole === 'SYSTEM_ADMIN') {
    return res.status(403).json({
      error: true,
      code: 'READ_ONLY',
      message: 'This role has read-only access to control reviews.',
    });
  }
  return next();
}

/**
 * Case-level access. A denied attempt is itself audited (§37): an access denial
 * is a security-relevant event, not just a failed request.
 */
export async function requireCaseAccess(req, res, next) {
  const caseId = req.params.caseId || req.params.id || req.body?.caseId;
  const tenantId = req.user?.orgId;

  if (!caseId) return next();

  try {
    const caseDoc = await ControlReviewCase.findOne({ _id: caseId, tenantId })
      .select('caseOwner teamIds caseNumber')
      .lean();

    if (!caseDoc) {
      return res.status(404).json({ error: true, code: 'NOT_FOUND', message: 'Case not found' });
    }

    const scope = req.hsPermissions?.cases;
    let allowed = false;

    if (scope === 'all' || scope === 'read_only') {
      allowed = true;
    } else if (scope === 'assigned') {
      allowed = String(caseDoc.caseOwner) === String(req.user.userId);
    } else if (scope === 'permitted_teams') {
      const permitted = (req.user.permittedTeamIds || []).map(String);
      allowed = caseDoc.teamIds.some((teamId) => permitted.includes(String(teamId)));
    }

    if (!allowed) {
      await recordAudit({
        tenantId,
        actor: req.user,
        action: 'CASE_ACCESS_DENIED',
        objectType: 'ControlReviewCase',
        objectId: caseDoc._id,
        metadata: { hsRole: req.hsRole, caseNumber: caseDoc.caseNumber },
        req,
      });

      return res.status(403).json({
        error: true,
        code: 'FORBIDDEN',
        message: 'Your role does not permit access to this case.',
      });
    }

    req.controlReviewCase = caseDoc;
    return next();
  } catch (error) {
    return next(error);
  }
}

/** Read-only roles may see that consultation happened, not what was said. */
export function canSeeConsultationDetail(req) {
  return Boolean(req.hsPermissions?.consultationDetail);
}

export default {
  HS_PERMISSIONS,
  resolveHsRole,
  withHsRole,
  requireHsRole,
  requireWriteAccess,
  requireCaseAccess,
  canSeeConsultationDetail,
};
