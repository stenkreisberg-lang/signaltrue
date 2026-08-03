import express from 'express';
import {
  authenticateToken,
  canAccessOrg,
  isMasterAdmin,
  requireMasterAdmin,
  requireRoles,
} from '../middleware/auth.js';
import ValidationEvidence from '../models/validationEvidence.js';
import ValidationStudy from '../models/validationStudy.js';
import {
  getValidationSummary,
  METRIC_REGISTRY,
  VALIDATION_STUDIES,
} from '../services/validationProgramService.js';

const router = express.Router();
const evidenceContributors = requireRoles([
  'master_admin',
  'admin',
  'hr_admin',
  'org_admin',
  'executive',
]);
const studyKeys = new Set(VALIDATION_STUDIES.map((study) => study.key));
const studyStatuses = new Set([
  'planned',
  'protocol_ready',
  'collecting',
  'analyzing',
  'completed',
  'paused',
]);

export function isPublicHttpUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const privateHost =
      host === 'localhost' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    return ['http:', 'https:'].includes(url.protocol) && !privateHost;
  } catch {
    return false;
  }
}

router.use(authenticateToken);

router.get('/summary', async (req, res) => {
  try {
    if (!req.user.orgId) {
      return res.status(400).json({ message: 'Organization context is required.' });
    }
    res.set('Cache-Control', 'private, no-store');
    return res.json(await getValidationSummary(req.user.orgId));
  } catch (error) {
    console.error('[Validation] Summary error:', error);
    return res.status(500).json({ message: 'Failed to build validation summary.' });
  }
});

router.get('/metrics', (_req, res) => res.json({ metrics: METRIC_REGISTRY }));

router.get('/studies', async (_req, res) => {
  try {
    const progress = await ValidationStudy.find({}).lean();
    const byKey = new Map(progress.map((study) => [study.studyKey, study]));
    return res.json({
      studies: VALIDATION_STUDIES.map((study) => ({
        ...study,
        status: byKey.get(study.key)?.status || 'planned',
        protocolVersion: byKey.get(study.key)?.protocolVersion || 'draft',
        publicSummary: byKey.get(study.key)?.publicSummary || null,
      })),
    });
  } catch (error) {
    console.error('[Validation] Studies error:', error);
    return res.status(500).json({ message: 'Failed to load validation studies.' });
  }
});

router.put('/studies/:studyKey', requireMasterAdmin, async (req, res) => {
  try {
    const { studyKey } = req.params;
    if (!studyKeys.has(studyKey)) {
      return res.status(404).json({ message: 'Unknown validation study.' });
    }

    const status = req.body.status;
    if (!studyStatuses.has(status)) {
      return res.status(400).json({ message: 'Invalid validation study status.' });
    }

    const existingStudy = await ValidationStudy.findOne({ studyKey }).lean();
    const publicSummary = String(
      req.body.publicSummary ?? existingStudy?.publicSummary ?? ''
    ).trim();

    if (status === 'completed') {
      const evidenceFilter = {
        studyKey,
        reviewStatus: 'verified',
      };
      if (['external_validation', 'independent_review'].includes(studyKey)) {
        evidenceFilter.evidenceLevel = 'external';
      }
      const verifiedEvidence = await ValidationEvidence.countDocuments({
        ...evidenceFilter,
      });
      if (verifiedEvidence === 0 || !publicSummary) {
        return res.status(409).json({
          message:
            'A study requires qualifying verified evidence and a public summary before it can be completed.',
        });
      }
      const externalReview = req.body.externalReview ?? existingStudy?.externalReview;
      if (
        studyKey === 'independent_review' &&
        (!String(externalReview?.organization || '').trim() ||
          !isPublicHttpUrl(externalReview?.reportUrl) ||
          !externalReview?.completedAt)
      ) {
        return res.status(409).json({
          message:
            'Independent review requires the reviewer organization, public report URL, and completion date.',
        });
      }
    }

    const allowed = [
      'status',
      'protocolVersion',
      'protocolUrl',
      'preregistrationUrl',
      'startedAt',
      'completedAt',
      'publicSummary',
      'limitations',
      'sample',
      'externalReview',
    ];
    const update = Object.fromEntries(
      allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]])
    );
    update.updatedBy = req.user.userId;
    if (status === 'collecting' && !existingStudy?.startedAt && !update.startedAt) {
      update.startedAt = new Date();
    }
    if (status === 'completed' && !update.completedAt) update.completedAt = new Date();
    if (status !== 'completed') update.completedAt = null;

    const study = await ValidationStudy.findOneAndUpdate(
      { studyKey },
      { $set: update },
      { upsert: true, new: true, runValidators: true }
    );
    return res.json({ study });
  } catch (error) {
    console.error('[Validation] Study update error:', error);
    return res.status(400).json({ message: 'Failed to update validation study.' });
  }
});

router.post('/evidence', evidenceContributors, async (req, res) => {
  try {
    const requestedOrgId = Object.prototype.hasOwnProperty.call(req.body, 'orgId')
      ? req.body.orgId
      : req.user.orgId || null;
    if (!requestedOrgId && !isMasterAdmin(req.user)) {
      return res.status(403).json({ message: 'Organization context is required.' });
    }
    if (requestedOrgId && !canAccessOrg(req.user, requestedOrgId)) {
      return res.status(403).json({ message: 'Organization access denied.' });
    }
    if (!studyKeys.has(req.body.studyKey)) {
      return res.status(400).json({ message: 'Unknown validation study.' });
    }
    const evidenceLevel = req.body.evidenceLevel || 'internal';
    if (evidenceLevel === 'external') {
      if (!isMasterAdmin(req.user)) {
        return res
          .status(403)
          .json({ message: 'Only master admins can register external evidence.' });
      }
      if (
        !String(req.body.externalReference?.organization || '').trim() ||
        !isPublicHttpUrl(req.body.externalReference?.reportUrl)
      ) {
        return res.status(400).json({
          message: 'External evidence requires an organization and a public report URL.',
        });
      }
    }

    const requiredText = ['metricKey', 'dataDefinition', 'supportsClaim', 'doesNotSupport'];
    if (requiredText.some((field) => !String(req.body[field] || '').trim())) {
      return res.status(400).json({
        message: 'metricKey, dataDefinition, supportsClaim, and doesNotSupport are required.',
      });
    }

    const evidence = await ValidationEvidence.create({
      studyKey: req.body.studyKey,
      orgId: requestedOrgId,
      evidenceType: req.body.evidenceType,
      metricKey: req.body.metricKey,
      dataDefinition: req.body.dataDefinition,
      supportsClaim: req.body.supportsClaim,
      doesNotSupport: req.body.doesNotSupport,
      sourceSystems: req.body.sourceSystems || [],
      period: req.body.period || {},
      sample: req.body.sample || {},
      result: req.body.result || {},
      modelVersion: req.body.modelVersion,
      evidenceLevel,
      externalReference: req.body.externalReference || {},
      reviewStatus: 'pending',
      recordedBy: req.user.userId,
    });

    return res.status(201).json({
      message: 'Aggregate evidence recorded and awaiting verification.',
      evidence,
    });
  } catch (error) {
    console.error('[Validation] Evidence error:', error);
    return res.status(400).json({ message: 'Failed to record validation evidence.' });
  }
});

router.post('/evidence/:evidenceId/verify', requireMasterAdmin, async (req, res) => {
  try {
    const evidence = await ValidationEvidence.findById(req.params.evidenceId);
    if (!evidence) return res.status(404).json({ message: 'Evidence record not found.' });

    evidence.reviewStatus = req.body.accept === false ? 'rejected' : 'verified';
    evidence.verifiedBy = req.user.userId;
    evidence.verifiedAt = new Date();
    await evidence.save();

    return res.json({ evidence });
  } catch (error) {
    console.error('[Validation] Evidence verification error:', error);
    return res.status(400).json({ message: 'Failed to verify validation evidence.' });
  }
});

export default router;
