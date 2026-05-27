/**
 * Privacy & DSAR Routes
 *
 * POST   /api/privacy/dsar              – Submit a DSAR request
 * GET    /api/privacy/dsar              – List all DSAR requests (admin)
 * GET    /api/privacy/dsar/:requestId   – Get status of a single DSAR request
 * POST   /api/privacy/dsar/:requestId/process – Admin: process a pending DSAR
 * GET    /api/privacy/consent/:userId   – Get user consent record (admin)
 * POST   /api/privacy/purge/:orgId      – Admin: trigger retention purge for org
 */

import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken, isMasterAdmin, requireOrganizationAccess } from '../middleware/auth.js';
import DSARRequest from '../models/dsarRequest.js';
import User from '../models/user.js';
import { purgeOrgData } from '../services/retentionPurgeService.js';

const router = express.Router();

// ── Helper ────────────────────────────────────────────────────────────────────

function isAdmin(req) {
  return ['admin', 'master_admin', 'superadmin'].includes(req.user?.role);
}

// ── POST /api/privacy/dsar ────────────────────────────────────────────────────
// Authenticated user submits a DSAR (export / delete / rectify)

router.post('/dsar', authenticateToken, async (req, res) => {
  try {
    const { requestType, notes } = req.body;

    if (!['export', 'delete', 'rectify'].includes(requestType)) {
      return res.status(400).json({
        error: true,
        message: 'requestType must be one of: export, delete, rectify',
        code: 'INVALID_REQUEST_TYPE',
      });
    }

    // Prevent duplicate pending/processing requests
    const existing = await DSARRequest.findOne({
      userId: req.user.userId,
      requestType,
      status: { $in: ['pending', 'processing'] },
    });

    if (existing) {
      return res.status(409).json({
        error: true,
        message: 'A pending request of this type already exists.',
        code: 'DUPLICATE_DSAR',
        data: { requestId: existing._id, status: existing.status },
      });
    }

    const request = await DSARRequest.create({
      userId: req.user.userId,
      orgId: req.user.orgId,
      requestType,
      notes: notes?.slice(0, 2000),
      requestedAt: new Date(),
    });

    // Estimated completion: 30 days per GDPR Art. 12
    const estimatedCompletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return res.status(201).json({
      data: {
        requestId: request._id,
        status: 'pending',
        requestType,
        estimatedCompletionAt,
      },
    });
  } catch (err) {
    console.error('[DSAR POST]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /api/privacy/dsar ─────────────────────────────────────────────────────
// Admin: list all DSAR requests for the caller's org

router.get('/dsar', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res
      .status(403)
      .json({ error: true, message: 'Admin access required', code: 'FORBIDDEN' });
  }

  try {
    const { status, requestType, limit = 50, offset = 0 } = req.query;
    const filter = { orgId: req.user.orgId };
    if (status) filter.status = status;
    if (requestType) filter.requestType = requestType;

    const [requests, total] = await Promise.all([
      DSARRequest.find(filter)
        .sort({ requestedAt: -1 })
        .skip(Number(offset))
        .limit(Number(limit))
        .populate('userId', 'email name')
        .lean(),
      DSARRequest.countDocuments(filter),
    ]);

    return res.json({
      data: requests,
      meta: { total, limit: Number(limit), offset: Number(offset) },
    });
  } catch (err) {
    console.error('[DSAR GET list]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /api/privacy/dsar/:requestId ─────────────────────────────────────────
// User or admin: get status of a single request

router.get('/dsar/:requestId', authenticateToken, async (req, res) => {
  try {
    const request = await DSARRequest.findById(req.params.requestId).lean();
    if (!request) {
      return res.status(404).json({ error: true, message: 'Request not found', code: 'NOT_FOUND' });
    }

    // Users can only see their own requests; admins can see all within org
    const isOwner = request.userId.toString() === String(req.user.userId);
    const isOrgAdmin = isAdmin(req) && request.orgId?.toString() === req.user.orgId?.toString();

    if (!isOwner && !isOrgAdmin) {
      return res.status(403).json({ error: true, message: 'Forbidden', code: 'FORBIDDEN' });
    }

    return res.json({ data: request });
  } catch (err) {
    console.error('[DSAR GET single]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/privacy/dsar/:requestId/process ─────────────────────────────────
// Admin: process a pending DSAR request

router.post('/dsar/:requestId/process', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res
      .status(403)
      .json({ error: true, message: 'Admin access required', code: 'FORBIDDEN' });
  }

  try {
    const request = await DSARRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ error: true, message: 'Request not found', code: 'NOT_FOUND' });
    }

    if (!['pending'].includes(request.status)) {
      return res.status(409).json({
        error: true,
        message: `Cannot process a request with status '${request.status}'.`,
        code: 'INVALID_STATUS',
      });
    }

    request.status = 'processing';
    if (!isMasterAdmin(req.user) && request.orgId?.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ error: true, message: 'Forbidden', code: 'FORBIDDEN' });
    }
    request.processedBy = req.user.userId;
    await request.save();

    // Execute asynchronously — respond immediately
    setImmediate(async () => {
      try {
        let summary = {};

        if (request.requestType === 'delete') {
          summary = await deleteUserData(request.userId);
        } else if (request.requestType === 'export') {
          summary = await exportUserData(request.userId);
          request.exportUrl = summary.exportUrl || null;
          request.exportUrlExpiresAt = summary.exportUrlExpiresAt || null;
        } else if (request.requestType === 'rectify') {
          // Rectification is manual — mark complete and flag for admin follow-up
          summary = { note: 'Manual rectification required — please contact the user.' };
        }

        request.status = 'completed';
        request.completedAt = new Date();
        request.summary = summary;
        await request.save();
      } catch (procErr) {
        console.error('[DSAR process] Failed:', procErr.message);
        request.status = 'failed';
        request.errorMessage = procErr.message;
        await request.save();
      }
    });

    return res.json({
      data: { requestId: request._id, status: 'processing', message: 'Processing started.' },
    });
  } catch (err) {
    console.error('[DSAR process]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── GET /api/privacy/consent/:userId ─────────────────────────────────────────
// Admin: get a user's consent record

router.get('/consent/:userId', authenticateToken, async (req, res) => {
  if (!isAdmin(req)) {
    return res
      .status(403)
      .json({ error: true, message: 'Admin access required', code: 'FORBIDDEN' });
  }

  try {
    const filter = { _id: req.params.userId };
    if (!isMasterAdmin(req.user)) filter.orgId = req.user.orgId;
    const user = await User.findOne(filter)
      .select('email name privacyConsentGivenAt privacyConsentVersion createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: true, message: 'User not found', code: 'NOT_FOUND' });
    }

    return res.json({
      data: {
        userId: user._id,
        email: user.email,
        consentGiven: !!user.privacyConsentGivenAt,
        consentGivenAt: user.privacyConsentGivenAt,
        consentVersion: user.privacyConsentVersion,
        registeredAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('[consent GET]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/privacy/purge/:orgId ────────────────────────────────────────────
// Admin: manually trigger retention purge for an org

router.post('/purge/:orgId', authenticateToken, requireOrganizationAccess(), async (req, res) => {
  if (!isAdmin(req)) {
    return res
      .status(403)
      .json({ error: true, message: 'Admin access required', code: 'FORBIDDEN' });
  }

  try {
    const { orgId } = req.params;

    // Fire-and-forget; respond immediately
    setImmediate(async () => {
      try {
        await purgeOrgData(orgId);
        console.log(`[Privacy Purge] Completed for org ${orgId}`);
      } catch (err) {
        console.error(`[Privacy Purge] Failed for org ${orgId}:`, err.message);
      }
    });

    return res.json({
      data: { message: `Retention purge triggered for org ${orgId}. Processing in background.` },
    });
  } catch (err) {
    console.error('[purge POST]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── POST /api/privacy/consent ─────────────────────────────────────────────────
// Authenticated user records GDPR consent

router.post('/consent', authenticateToken, async (req, res) => {
  try {
    const { version } = req.body;
    if (!version) {
      return res
        .status(400)
        .json({ error: true, message: 'Consent version is required', code: 'MISSING_VERSION' });
    }

    await User.findByIdAndUpdate(req.user.userId, {
      privacyConsentGivenAt: new Date(),
      privacyConsentVersion: version,
    });

    return res.json({ data: { consentRecorded: true, version, givenAt: new Date() } });
  } catch (err) {
    console.error('[consent POST]', err.message);
    return res.status(500).json({ error: true, message: err.message });
  }
});

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Delete all personal data for a user across relevant collections.
 * Returns a summary of what was deleted.
 */
async function deleteUserData(userId) {
  const summary = {};
  const collections = [
    { model: 'WorkEvent', field: 'userId' },
    { model: 'MetricsDaily', field: 'userId' },
    { model: 'ChatLog', field: 'userId' },
    { model: 'ConsentAudit', field: 'userId' },
  ];

  for (const { model, field } of collections) {
    try {
      const m = mongoose.models[model];
      if (!m) continue;
      const result = await m.deleteMany({ [field]: userId });
      summary[model] = result.deletedCount;
    } catch {
      summary[model] = 'error';
    }
  }

  // Soft-delete the user record
  try {
    await User.findByIdAndUpdate(userId, {
      deletedAt: new Date(),
      email: `deleted_${userId}@redacted.invalid`,
      name: '[Deleted User]',
    });
    summary.User = 'soft_deleted';
  } catch {
    summary.User = 'error';
  }

  return summary;
}

/**
 * Build an export package for a user.
 * In production this should upload to S3/GCS and return a signed URL.
 * Currently returns an inline JSON summary.
 */
async function exportUserData(userId) {
  const data = {};

  const collectionsToExport = [
    { model: 'WorkEvent', field: 'userId' },
    { model: 'MetricsDaily', field: 'userId' },
  ];

  for (const { model, field } of collectionsToExport) {
    try {
      const m = mongoose.models[model];
      if (!m) continue;
      data[model] = await m.find({ [field]: userId }).lean();
    } catch {
      data[model] = [];
    }
  }

  // TODO: Upload to S3/GCS and return signed URL
  // For now, return a note that the export is available on request
  return {
    note: 'Export data prepared. Contact your admin for the download link.',
    recordCounts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
  };
}

export default router;
