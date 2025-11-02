import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import ApiKey from '../models/apiKey.js';
import Organization from '../models/organization.js';

const router = express.Router();

// GET /api/admin/api-keys - List all API keys for org
router.get('/admin/api-keys', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const keys = await ApiKey.find({ orgId }).sort({ createdAt: -1 });
    res.json(keys.map(k => ({ id: k._id, name: k.name, lastUsed: k.lastUsed, usageCount: k.usageCount, active: k.active, createdAt: k.createdAt, expiresAt: k.expiresAt })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/admin/api-keys - Create new API key
router.post('/admin/api-keys', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const { name, expiresAt } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const { key, hash } = ApiKey.generateKey();
    const apiKey = await ApiKey.create({ orgId, name, keyHash: hash, expiresAt: expiresAt ? new Date(expiresAt) : null });
    res.json({ id: apiKey._id, key, name: apiKey.name, createdAt: apiKey.createdAt });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/admin/api-keys/:id - Revoke API key
router.delete('/admin/api-keys/:id', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const apiKey = await ApiKey.findOne({ _id: req.params.id, orgId });
    if (!apiKey) return res.status(404).json({ message: 'API key not found' });
    apiKey.active = false;
    await apiKey.save();
    res.json({ message: 'API key revoked' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/admin/api-keys/:id/rotate - Rotate API key
router.put('/admin/api-keys/:id/rotate', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const apiKey = await ApiKey.findOne({ _id: req.params.id, orgId });
    if (!apiKey) return res.status(404).json({ message: 'API key not found' });
    const { key, hash } = ApiKey.generateKey();
    apiKey.keyHash = hash;
    apiKey.usageCount = 0;
    apiKey.lastUsed = null;
    await apiKey.save();
    res.json({ id: apiKey._id, key, name: apiKey.name });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

export default router;
