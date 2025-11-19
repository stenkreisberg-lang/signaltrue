import express from 'express';
import Organization from '../models/organizationModel.js';

const router = express.Router();

// Helper: extract admin token from header or query (supports 'adminToken' and 'token')
function getProvidedToken(req) {
  return (
    req.headers['x-admin-token'] ||
    req.query.adminToken ||
    req.query.token ||
    null
  );
}

// GET /api/admin/cleanup/orphan-orgs (dryRun=1 to preview)
router.get('/admin/cleanup/orphan-orgs', async (req, res) => {
  try {
    // Determine dry-run before auth so we may allow preview when no token configured
    const dry = String(req.query.dryRun || '1') !== '0';

    const provided = getProvidedToken(req);
    const configured = process.env.ADMIN_CLEANUP_TOKEN;
    const tokenOk = configured && provided === configured;

    // Security policy:
    // - If ADMIN_CLEANUP_TOKEN is set: require exact match for ALL operations (dry or not)
    // - If not set: allow DRY RUN only; block destructive runs
    if (configured ? !tokenOk : !dry) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const maybeId = /^[0-9a-fA-F]{24}$/;
    const all = await Organization.find({}, { slug: 1, name: 1 });
    const orphans = all.filter(o => maybeId.test(o.slug) && !['default','signaltrue'].includes(o.slug));

    if (!dry && orphans.length) {
      const ids = orphans.map(o => o._id);
      await Organization.deleteMany({ _id: { $in: ids } });
    }
    res.json({ count: orphans.length, dryRun: dry, slugs: orphans.map(o => o.slug) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
