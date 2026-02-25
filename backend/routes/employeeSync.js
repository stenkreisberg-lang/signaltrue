import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { 
  syncEmployeesFromSlack, 
  syncEmployeesFromGoogle,
  syncEmployeesFromMicrosoft,
  getSyncStatus 
} from '../services/employeeSyncService.js';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';

const router = express.Router();

/**
 * GET /api/employee-sync/status
 * Get sync status for the organization
 * Available to: hr_admin, admin, master_admin
 */
router.get('/status', 
  authenticateToken, 
  requireRoles(['hr_admin', 'admin', 'master_admin']),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: 'User not associated with an organization' });
      }

      const status = await getSyncStatus(orgId);
      res.json(status);
    } catch (error) {
      console.error('Get sync status error:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * POST /api/employee-sync/slack
 * Manually trigger Slack employee sync
 * Available to: hr_admin, it_admin, admin, master_admin
 */
router.post('/slack', 
  authenticateToken, 
  requireRoles(['hr_admin', 'it_admin', 'admin', 'master_admin']),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: 'User not associated with an organization' });
      }

      const result = await syncEmployeesFromSlack(orgId);
      res.json(result);
    } catch (error) {
      console.error('Slack sync error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  }
);

/**
 * POST /api/employee-sync/google
 * Manually trigger Google Workspace employee sync
 * Available to: hr_admin, it_admin, admin, master_admin
 */
router.post('/google', 
  authenticateToken, 
  requireRoles(['hr_admin', 'it_admin', 'admin', 'master_admin']),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: 'User not associated with an organization' });
      }

      const result = await syncEmployeesFromGoogle(orgId);
      res.json(result);
    } catch (error) {
      console.error('Google sync error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  }
);

/**
 * POST /api/employee-sync/microsoft
 * Manually trigger Microsoft 365 / Entra ID employee sync
 * Available to: hr_admin, it_admin, admin, master_admin
 */
router.post('/microsoft', 
  authenticateToken, 
  requireRoles(['hr_admin', 'it_admin', 'admin', 'master_admin']),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      
      if (!orgId) {
        return res.status(400).json({ message: 'User not associated with an organization' });
      }

      const result = await syncEmployeesFromMicrosoft(orgId);
      res.json(result);
    } catch (error) {
      console.error('Microsoft sync error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message 
      });
    }
  }
);

/**
 * POST /api/employee-sync/cleanup-domain
 * Remove synced employees whose email doesn't match the org's domain.
 * Uses org.domain to determine which users belong.
 * Available to: hr_admin, admin, master_admin
 */
router.post('/cleanup-domain',
  authenticateToken,
  requireRoles(['hr_admin', 'admin', 'master_admin']),
  async (req, res) => {
    try {
      const orgId = req.user.orgId;
      if (!orgId) {
        return res.status(400).json({ message: 'User not associated with an organization' });
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const orgDomain = (org.domain || '').toLowerCase().replace(/^@/, '');
      if (!orgDomain) {
        return res.status(400).json({
          message: 'Organization domain not set. Please set the org domain first.'
        });
      }

      // Find all synced users (source: microsoft) in this org whose email doesn't match the domain
      // Also protect: never delete the requesting user themselves
      const nonDomainUsers = await User.find({
        orgId,
        source: 'microsoft',
        email: { $not: new RegExp(`@${orgDomain.replace('.', '\\.')}$`, 'i') },
        _id: { $ne: req.user._id }
      });

      const count = nonDomainUsers.length;
      if (count === 0) {
        return res.json({ success: true, removed: 0, message: 'No non-domain employees found.' });
      }

      // Delete them
      const ids = nonDomainUsers.map(u => u._id);
      await User.deleteMany({ _id: { $in: ids } });

      console.log(`[EmployeeSync] Cleanup: removed ${count} non-@${orgDomain} users from org ${orgId}`);

      res.json({
        success: true,
        removed: count,
        domain: orgDomain,
        message: `Removed ${count} employees not matching @${orgDomain}`
      });
    } catch (error) {
      console.error('Domain cleanup error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
