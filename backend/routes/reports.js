import express from 'express';
import { 
  generateWeeklyReportForTeam, 
  generateWeeklyReportsForOrg, 
  getLatestWeeklyReport,
  getWeeklyReportHistory 
} from '../services/weeklyReportService.js';
import { 
  generateMonthlyReportForOrg,
  getLatestMonthlyReport,
  getMonthlyReportHistory,
  getLeadershipView 
} from '../services/monthlyReportService.js';
import { authenticateToken } from '../middleware/auth.js';
import { checkRole } from '../middleware/checkRole.js';

const router = express.Router();

/**
 * WEEKLY REPORTS
 * Tactical early warning briefs for HR/Admin and Managers
 */

/**
 * GET /api/reports/weekly/team/:teamId/latest
 * Get latest weekly report for a team
 * Access: HR/Admin, Manager (if their team)
 */
router.get('/weekly/team/:teamId/latest', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    
    // TODO: Add authorization check - ensure user has access to this team
    
    const report = await getLatestWeeklyReport(teamId);
    
    if (!report) {
      return res.status(404).json({ 
        message: 'No weekly report found for this team' 
      });
    }
    
    res.json(report);
    
  } catch (error) {
    console.error('Error fetching latest weekly report:', error);
    res.status(500).json({ 
      message: 'Error fetching weekly report', 
      error: error.message 
    });
  }
});

/**
 * GET /api/reports/weekly/team/:teamId/history
 * Get weekly report history for a team
 * Access: HR/Admin, Manager (if their team)
 */
router.get('/weekly/team/:teamId/history', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const limit = parseInt(req.query.limit) || 12;
    
    // TODO: Add authorization check
    
    const reports = await getWeeklyReportHistory(teamId, limit);
    
    res.json({
      teamId,
      count: reports.length,
      reports
    });
    
  } catch (error) {
    console.error('Error fetching weekly report history:', error);
    res.status(500).json({ 
      message: 'Error fetching weekly report history', 
      error: error.message 
    });
  }
});

/**
 * POST /api/reports/weekly/team/:teamId/generate
 * Manually trigger weekly report generation for a team
 * Access: HR/Admin only
 */
router.post('/weekly/team/:teamId/generate', authenticateToken, checkRole(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { teamId } = req.params;
    
    const report = await generateWeeklyReportForTeam(teamId);
    
    if (!report) {
      return res.status(404).json({ 
        message: 'Could not generate weekly report - no TeamState data available' 
      });
    }
    
    res.json({
      message: 'Weekly report generated successfully',
      report
    });
    
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ 
      message: 'Error generating weekly report', 
      error: error.message 
    });
  }
});

/**
 * POST /api/reports/weekly/org/:orgId/generate-all
 * Generate weekly reports for all teams in organization
 * Access: HR/Admin only
 */
router.post('/weekly/org/:orgId/generate-all', authenticateToken, checkRole(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const results = await generateWeeklyReportsForOrg(orgId);
    
    res.json({
      message: 'Weekly reports generated for all teams',
      summary: {
        actionRequired: results.success,
        noActionNeeded: results.noAction,
        failed: results.failed,
        total: results.success + results.noAction + results.failed
      },
      reports: results.reports
    });
    
  } catch (error) {
    console.error('Error generating weekly reports:', error);
    res.status(500).json({ 
      message: 'Error generating weekly reports', 
      error: error.message 
    });
  }
});

/**
 * MONTHLY REPORTS
 * Strategic organizational health reviews for HR/Admin and Leadership
 */

/**
 * GET /api/reports/monthly/org/:orgId/latest
 * Get latest monthly report (full version)
 * Access: HR/Admin only
 */
router.get('/monthly/org/:orgId/latest', authenticateToken, checkRole(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const report = await getLatestMonthlyReport(orgId);
    
    if (!report) {
      return res.status(404).json({ 
        message: 'No monthly report found for this organization' 
      });
    }
    
    res.json(report);
    
  } catch (error) {
    console.error('Error fetching latest monthly report:', error);
    res.status(500).json({ 
      message: 'Error fetching monthly report', 
      error: error.message 
    });
  }
});

/**
 * GET /api/reports/monthly/org/:orgId/history
 * Get monthly report history
 * Access: HR/Admin only
 */
router.get('/monthly/org/:orgId/history', authenticateToken, checkRole(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    const limit = parseInt(req.query.limit) || 12;
    
    const reports = await getMonthlyReportHistory(orgId, limit);
    
    res.json({
      orgId,
      count: reports.length,
      reports
    });
    
  } catch (error) {
    console.error('Error fetching monthly report history:', error);
    res.status(500).json({ 
      message: 'Error fetching monthly report history', 
      error: error.message 
    });
  }
});

/**
 * GET /api/reports/monthly/org/:orgId/leadership
 * Get leadership view of monthly report (filtered)
 * Access: CEO/Leadership roles only
 * 
 * Filters out:
 * - Individual names
 * - Coaching language
 * - Tactical action lists
 */
router.get('/monthly/org/:orgId/leadership', authenticateToken, checkRole(['ceo', 'leadership', 'master_admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const leadershipView = await getLeadershipView(orgId);
    
    if (!leadershipView) {
      return res.status(404).json({ 
        message: 'No monthly report found for this organization' 
      });
    }
    
    res.json({
      reportType: 'leadership_view',
      disclaimer: 'This view excludes individual-level details and tactical recommendations',
      data: leadershipView
    });
    
  } catch (error) {
    console.error('Error fetching leadership view:', error);
    res.status(500).json({ 
      message: 'Error fetching leadership view', 
      error: error.message 
    });
  }
});

/**
 * POST /api/reports/monthly/org/:orgId/generate
 * Manually trigger monthly report generation
 * Access: HR/Admin only
 */
router.post('/monthly/org/:orgId/generate', authenticateToken, checkRole(['hr_admin', 'admin', 'master_admin']), async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const report = await generateMonthlyReportForOrg(orgId);
    
    if (!report) {
      return res.status(404).json({ 
        message: 'Could not generate monthly report - insufficient data' 
      });
    }
    
    res.json({
      message: 'Monthly report generated successfully',
      summary: {
        avgBDI: report.orgHealth.avgBDI,
        trend: report.orgHealth.bdiTrend,
        teamsAtRisk: report.orgHealth.teamsAtRisk,
        persistentRisks: report.persistentRisks.length,
        criticalAttritionRisk: report.retentionExposure.criticalIndividualsCount,
        trajectory: report.aiSummary.organizationalTrajectory
      },
      report
    });
    
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ 
      message: 'Error generating monthly report', 
      error: error.message 
    });
  }
});

export default router;
