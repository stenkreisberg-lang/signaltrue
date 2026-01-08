import express from 'express';
import { authenticateToken, requireRoles } from '../middleware/auth.js';
import { 
  syncEmployeesFromSlack, 
  syncEmployeesFromGoogle,
  getSyncStatus 
} from '../services/employeeSyncService.js';

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

export default router;
