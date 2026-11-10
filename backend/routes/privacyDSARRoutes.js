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
import { authenticateToken, isMasterAdmin, requireOrganizationAccess, requireCurrentUserRoles } from '../middleware/auth.js';
import DSARRequest from '../models/dsarRequest.js';
import User from '../models/user.js';
import { purgeOrgData } from '../services/retentionPurgeService.js';

const router = express.Router();
const DSAR_LEASE_MS = 6 * 60 * 60 * 1000;

// Re-evaluate the current employee account. Old JWT role claims are not authoritative.
router.use(authenticateToken, requireCurrentUserRoles());

async function processApprovedDSAR(request) {
  try {
    let summary = {};
    if (request.requestType === 'delete') {
      summary = await deleteUserData(request.userId);
    } else if (request.requestType === 'export') {
      summary = await exportUserData(request.userId);
    } else if (request.requestType === 'rectify') {
      summary = { note: 'Manual rectification is required; the request remains open.' };
    }
    // A database-only deletion is not proof of full GDPR erasure across
    // processors, backups, derived artifacts and audit retention exceptions.
    // Keep deletion and rectification open for documented human verification.
    const requiresManualVerification =
      request.requestType === 'rectify' || request.requestType === 'delete';
    if (request.requestType === 'delete') {
      summary.verificationRequired =
        'Confirm affected collections, connected providers, backups and contractual retention exceptions.';
    }
    await DSARRequest.updateOne({ _id: request._id, status: 'processing' }, {
      $set: {
        status: requiresManualVerification ? 'awaiting_manual' : 'completed',
        summary,
        completedAt: requiresManualVerification ? null : new Date(),
        processingLeaseUntil: null,
      },
    });
  } catch (error) {
    console.error('[DSAR worker]', error.message);
    await DSARRequest.updateOne({ _id: request._id, status: 'processing' }, {
      $set: { status: 'failed', errorMessage: String(error.message).slice(0, 300),
        processingLeaseUntil: null },
    });
  }
}

/**
 * Recover only approved operations with an expired processing lease.
 * Pending requests still require a human approval; manual rectification
 * is deliberately not auto-completed.
 */
export async function recoverStaleDSARRequests(now = new Date()) {
  const expiryFilter = { $or: [
    { processingLeaseUntil: { $lte: now } },
    { processingLeaseUntil: null, updatedAt: { $lte: new Date(now.getTime() - DSAR_LEASE_MS) } },
  ] };
  const expired = await DSARRequest.find({
    status: 'processing', ...expiryFilter,
  }).select('_id').limit(20).lean();
  let resumed = 0;
  for (const candidate of expired) {
    const request = await DSARRequest.findOneAndUpdate({
      _id: candidate._id, status: 'processing', ...expiryFilter,
    }, { $set: { processingLeaseUntil: new Date(now.getTime() + DSAR_LEASE_MS) },
      $inc: { processingAttempts: 1 } }, { new: true });
    if (!request) continue;
    resumed++;
    await processApprovedDSAR(request);
  }
  return { recovered: resumed };
}


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

// ── GET /api/privacy/dsar/:requestId/export ──────────────────────────────────
// Owner or org admin: download a completed export as a JSON attachment.

router.get('/dsar/:requestId/export', authenticateToken, async (req, res) => {
  try {
    const request = await DSARRequest.findById(req.params.requestId).lean();
    if (!request) {
      return res.status(404).json({ error: true, message: 'Request not found', code: 'NOT_FOUND' });
    }

    const isOwner = request.userId.toString() === String(req.user.userId);
    const isOrgAdmin = isAdmin(req) && request.orgId?.toString() === req.user.orgId?.toString();
    if (!isOwner && !isOrgAdmin) {
      return res.status(403).json({ error: true, message: 'Forbidden', code: 'FORBIDDEN' });
    }
    if (request.requestType !== 'export' || request.status !== 'completed') {
      return res.status(409).json({
        error: true,
        message: 'The export is not ready for download.',
        code: 'EXPORT_NOT_READY',
      });
    }

    const exportPackage = await exportUserData(request.userId, { includeData: true });
    const filename = `signaltrue-data-export-${request._id}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(JSON.stringify(exportPackage, null, 2));
  } catch (err) {
    console.error('[DSAR export download]', err.message);
    return res.status(500).json({ error: true, message: 'Unable to build export.' });
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

    if (!isMasterAdmin(req.user) && request.orgId?.toString() !== req.user.orgId?.toString()) {
      return res.status(403).json({ error: true, message: 'Forbidden', code: 'FORBIDDEN' });
    }
    // Atomic claim prevents concurrent admin submissions from processing twice.
    const approved = await DSARRequest.findOneAndUpdate(
      { _id: request._id, status: 'pending' },
      { $set: { status: 'processing', processedBy: String(req.user.userId),
        processingLeaseUntil: new Date(Date.now() + DSAR_LEASE_MS),
        errorMessage: null }, $inc: { processingAttempts: 1 } },
      { new: true }
    );
    if (!approved) {
      return res.status(409).json({ error: true, code: 'REQUEST_ALREADY_CLAIMED' });
    }
    // Processing is recoverable from MongoDB even if the server exits here.
    setImmediate(() => { void processApprovedDSAR(approved).catch((err) => {
      console.error('[DSAR unexpected worker error]', err.message);
    }); });

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
 * Data is generated on demand for the authenticated download endpoint so no
 * public or long-lived storage URL is required.
 */
async function exportUserData(userId, { includeData = false } = {}) {
  const data = {};

  const user = await User.findById(userId)
    .select('name email role orgId privacyConsentGivenAt privacyConsentVersion createdAt updatedAt')
    .lean();
  data.User = user ? [user] : [];

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

  return {
    generatedAt: new Date().toISOString(),
    format: 'application/json',
    available: true,
    recordCounts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])),
    ...(includeData ? { data } : {}),
  };
}

export default router;
