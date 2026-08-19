/**
 * H&S dashboard, weekly digest and Trust Deployment Pack routes
 * (spec §7, §21, §30).
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { withHsRole, requireHsRole } from '../middleware/hsAccess.js';
import dashboardService from '../services/controlReview/hsDashboardService.js';
import trustService from '../services/controlReview/trustDeploymentService.js';
import { listAuditEvents } from '../services/controlReview/auditService.js';
import { REQUIRED_DISCLAIMER } from '../models/controlReview/constants.js';

const router = express.Router();
router.use(authenticateToken, withHsRole);

function handle(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      const status = error.code === 'TRUST_PACK_INCOMPLETE' || error.code === 'LEGAL_REVIEW_REQUIRED' ? 409 : 400;
      res.status(status).json({ error: true, message: error.message, code: error.code });
    }
  };
}

router.get(
  '/dashboard',
  handle(async (req, res) => {
    const dashboard = await dashboardService.buildDashboard({
      tenantId: req.user.orgId,
      hsRole: req.hsRole,
      userId: req.user.userId,
      permittedTeamIds: req.user.permittedTeamIds || [],
    });
    res.json({ ...dashboard, disclaimer: REQUIRED_DISCLAIMER, hsRole: req.hsRole });
  })
);

router.get(
  '/weekly-digest',
  handle(async (req, res) => {
    res.json(await dashboardService.buildWeeklyDigest({ tenantId: req.user.orgId }));
  })
);

// ── Trust Deployment Pack ────────────────────────────────────────────────────

router.get(
  '/trust-pack',
  handle(async (req, res) => {
    res.json(await trustService.getTrustPack({ tenantId: req.user.orgId, actor: req.user }));
  })
);

router.patch(
  '/trust-pack/checklist/:key',
  requireHsRole('HS_ADMIN', 'SYSTEM_ADMIN'),
  handle(async (req, res) => {
    res.json(
      await trustService.updateChecklistItem({
        tenantId: req.user.orgId,
        actor: req.user,
        key: req.params.key,
        completed: req.body.completed !== false,
        notes: req.body.notes || '',
        req,
      })
    );
  })
);

router.patch(
  '/trust-pack/configuration',
  requireHsRole('HS_ADMIN', 'SYSTEM_ADMIN'),
  handle(async (req, res) => {
    res.json(
      await trustService.updateConfiguration({
        tenantId: req.user.orgId,
        actor: req.user,
        updates: req.body,
        req,
      })
    );
  })
);

router.post(
  '/trust-pack/activate',
  requireHsRole('SYSTEM_ADMIN', 'HS_ADMIN'),
  handle(async (req, res) => {
    res.json(
      await trustService.acknowledgeAndActivate({
        tenantId: req.user.orgId,
        actor: req.user,
        legalReviewConfirmed: req.body.legalReviewConfirmed === true,
        req,
      })
    );
  })
);

router.get(
  '/audit-events',
  requireHsRole('HS_ADMIN', 'SYSTEM_ADMIN', 'AUDITOR_READONLY'),
  handle(async (req, res) => {
    res.json({
      events: await listAuditEvents({
        tenantId: req.user.orgId,
        objectType: req.query.objectType,
        objectId: req.query.objectId,
        limit: Math.min(Number(req.query.limit) || 200, 500),
      }),
    });
  })
);

export default router;
