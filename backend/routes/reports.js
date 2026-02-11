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

/**
 * POST /api/reports/send-weekly-email
 * Generate and send weekly reports via email using Resend
 * Access: Master Admin only
 */
router.post('/send-weekly-email', authenticateToken, checkRole(['master_admin']), async (req, res) => {
  try {
    const { orgId } = req.user;
    const { recipientEmail } = req.body;
    
    // Check Resend configuration
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ 
        message: 'Email not configured. Set RESEND_API_KEY in environment.' 
      });
    }
    
    // Import Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Get org and team data
    const mongoose = await import('mongoose');
    const Organization = mongoose.default.model('Organization');
    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    const Team = mongoose.default.model('Team');
    const teams = await Team.find({ orgId });
    
    const TeamState = mongoose.default.model('TeamState');
    
    const email = recipientEmail || org.settings?.reportEmail || req.user.email;
    const results = [];
    
    for (const team of teams) {
      const teamStates = await TeamState.find({ teamId: team._id })
        .sort({ weekEnd: 1 })
        .limit(10);
      
      if (teamStates.length === 0) continue;
      
      for (let i = 0; i < teamStates.length; i++) {
        const state = teamStates[i];
        const prevState = i > 0 ? teamStates[i - 1] : null;
        const weekNum = i + 1;
        const weekEndDate = new Date(state.weekEnd).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        });
        
        const bdiChange = prevState ? state.bdi - prevState.bdi : 0;
        const bdiChangeText = bdiChange > 0 ? `+${bdiChange}` : bdiChange.toString();
        const bdiTrend = bdiChange >= 0 ? '↑' : '↓';
        const zoneColor = state.zone === 'Stable' ? '#22c55e' : 
                          state.zone === 'Watch' ? '#f59e0b' : '#ef4444';
        
        const html = generateReportHTML(team, state, prevState, weekNum, weekEndDate, bdiChange, bdiChangeText, bdiTrend, zoneColor);
        
        // Send via Resend
        await resend.emails.send({
          from: 'SignalTrue <reports@signaltrue.ai>',
          to: email,
          subject: `📊 SignalTrue Weekly Report - Week ${weekNum} (${team.name} Team)`,
          html
        });
        
        results.push({ team: team.name, week: weekNum, sent: true });
      }
    }
    
    res.json({ 
      message: 'Reports sent successfully',
      recipientEmail: email,
      reports: results
    });
    
  } catch (error) {
    console.error('Error sending weekly reports:', error);
    res.status(500).json({ 
      message: 'Error sending reports', 
      error: error.message 
    });
  }
});

/**
 * POST /api/reports/trigger-weekly-email
 * Trigger weekly report emails with a secret key (for production use)
 * No auth required - uses secret key instead
 */
router.post('/trigger-weekly-email', async (req, res) => {
  try {
    const { secret, email, orgId } = req.body;
    
    // Verify secret key
    const expectedSecret = process.env.REPORT_TRIGGER_SECRET || 'signaltrue-reports-2026';
    if (secret !== expectedSecret) {
      return res.status(401).json({ message: 'Invalid secret key' });
    }
    
    if (!email) {
      return res.status(400).json({ message: 'Email address required' });
    }
    
    // Check Resend configuration
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ 
        message: 'Email not configured. Set RESEND_API_KEY in environment.' 
      });
    }
    
    // Import dependencies
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const mongoose = await import('mongoose');
    
    // Get organization
    const Organization = mongoose.default.model('Organization');
    const targetOrgId = orgId || '693bff1d7182d336060c8629';
    const org = await Organization.findById(targetOrgId);
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    const Team = mongoose.default.model('Team');
    const teams = await Team.find({ orgId: targetOrgId });
    
    // Use native MongoDB collection to bypass schema restrictions
    const db = mongoose.default.connection.db;
    const teamStatesCollection = db.collection('teamstates');
    const results = [];
    
    for (const team of teams) {
      const teamStates = await teamStatesCollection
        .find({ teamId: team._id.toString() })
        .sort({ weekEnd: 1 })
        .limit(10)
        .toArray();
      
      if (teamStates.length === 0) continue;
      
      for (let i = 0; i < teamStates.length; i++) {
        const state = teamStates[i];
        const prevState = i > 0 ? teamStates[i - 1] : null;
        const weekNum = i + 1;
        const weekEndDate = state.weekEnd ? new Date(state.weekEnd).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'long', day: 'numeric' 
        }) : 'Unknown Date';
        
        const bdiValue = state.bdi || 0;
        const prevBdiValue = prevState?.bdi || bdiValue;
        const bdiChange = bdiValue - prevBdiValue;
        const bdiChangeText = bdiChange > 0 ? `+${bdiChange}` : bdiChange.toString();
        const bdiTrend = bdiChange >= 0 ? '↑' : '↓';
        const zoneValue = state.zone || 'Unknown';
        const zoneColor = zoneValue === 'Stable' ? '#22c55e' : 
                          zoneValue === 'Watch' ? '#f59e0b' : '#ef4444';
        
        const html = generateReportHTMLv2(team, state, prevState, weekNum, weekEndDate, bdiValue, bdiChange, bdiChangeText, bdiTrend, zoneValue, zoneColor);
        
        // Send via Resend
        const sendResult = await resend.emails.send({
          from: 'SignalTrue <reports@signaltrue.ai>',
          to: email,
          subject: `📊 SignalTrue Weekly Report - Week ${weekNum} (${team.name} Team)`,
          html
        });
        
        console.log(`Email sent for Week ${weekNum}:`, sendResult);
        results.push({ team: team.name, week: weekNum, bdi: bdiValue, zone: zoneValue, emailId: sendResult.data?.id, sent: true });
      }
    }
    
    res.json({ 
      message: `Successfully sent ${results.length} weekly reports`,
      recipientEmail: email,
      reports: results
    });
    
  } catch (error) {
    console.error('Error sending weekly reports:', error);
    res.status(500).json({ 
      message: 'Error sending reports', 
      error: error.message 
    });
  }
});

function generateReportHTML(team, state, prevState, weekNum, weekEndDate, bdiChange, bdiChangeText, bdiTrend, zoneColor) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .bdi-card { background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .bdi-score { font-size: 48px; font-weight: 700; color: #1e293b; }
    .bdi-label { color: #64748b; font-size: 14px; margin-top: 4px; }
    .zone-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-top: 12px; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
    .metric { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .insights { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .insights h3 { margin: 0 0 12px; color: #92400e; }
    .insights ul { margin: 0; padding-left: 20px; color: #78350f; }
    .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px; }
    .change { font-size: 14px; margin-top: 8px; }
    .change.positive { color: #22c55e; }
    .change.negative { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 SignalTrue Weekly Report</h1>
      <p>Week ${weekNum} • ${team.name} Team • ${weekEndDate}</p>
    </div>
    <div class="content">
      <div class="bdi-card">
        <div class="bdi-score">${state.bdi}</div>
        <div class="bdi-label">Behavioral Drift Index (BDI)</div>
        <div class="zone-badge" style="background: ${zoneColor}20; color: ${zoneColor};">
          ${state.zone} Zone
        </div>
        ${prevState ? `<div class="change ${bdiChange >= 0 ? 'positive' : 'negative'}">${bdiTrend} ${bdiChangeText} from last week</div>` : ''}
      </div>
      <h3 style="color: #1e293b;">📈 Signal Breakdown</h3>
      <div class="metrics">
        <div class="metric"><div class="metric-value">${state.signals?.communication?.score || '-'}</div><div class="metric-label">Communication</div></div>
        <div class="metric"><div class="metric-value">${state.signals?.engagement?.score || '-'}</div><div class="metric-label">Engagement</div></div>
        <div class="metric"><div class="metric-value">${state.signals?.workload?.score || '-'}</div><div class="metric-label">Workload</div></div>
        <div class="metric"><div class="metric-value">${state.signals?.collaboration?.score || '-'}</div><div class="metric-label">Collaboration</div></div>
      </div>
      ${state.insights?.length ? `
      <div class="insights">
        <h3>💡 Key Insights</h3>
        <ul>${state.insights.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
    <div class="footer">
      <p>Generated by SignalTrue • Behavioral Intelligence for HR</p>
    </div>
  </div>
</body>
</html>
  `;
}

// New version with explicit parameters to avoid undefined issues
function generateReportHTMLv2(team, state, prevState, weekNum, weekEndDate, bdiValue, bdiChange, bdiChangeText, bdiTrend, zoneValue, zoneColor) {
  const commScore = state.signals?.communication?.score ?? '-';
  const engScore = state.signals?.engagement?.score ?? '-';
  const workScore = state.signals?.workload?.score ?? '-';
  const collabScore = state.signals?.collaboration?.score ?? '-';
  const insights = state.insights || [];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .bdi-card { background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
    .bdi-score { font-size: 48px; font-weight: 700; color: #1e293b; }
    .bdi-label { color: #64748b; font-size: 14px; margin-top: 4px; }
    .zone-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: 600; font-size: 14px; margin-top: 12px; }
    .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin: 24px 0; }
    .metric { background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: 700; color: #1e293b; }
    .metric-label { font-size: 12px; color: #64748b; text-transform: uppercase; margin-top: 4px; }
    .insights { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .insights h3 { margin: 0 0 12px; color: #92400e; }
    .insights ul { margin: 0; padding-left: 20px; color: #78350f; }
    .footer { background: #f8fafc; padding: 20px 30px; text-align: center; color: #64748b; font-size: 12px; }
    .change { font-size: 14px; margin-top: 8px; }
    .change.positive { color: #22c55e; }
    .change.negative { color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 SignalTrue Weekly Report</h1>
      <p>Week ${weekNum} • ${team.name} Team • ${weekEndDate}</p>
    </div>
    <div class="content">
      <div class="bdi-card">
        <div class="bdi-score">${bdiValue}</div>
        <div class="bdi-label">Behavioral Drift Index (BDI)</div>
        <div class="zone-badge" style="background: ${zoneColor}20; color: ${zoneColor};">
          ${zoneValue} Zone
        </div>
        ${prevState ? `<div class="change ${bdiChange >= 0 ? 'positive' : 'negative'}">${bdiTrend} ${bdiChangeText} from last week</div>` : ''}
      </div>
      <h3 style="color: #1e293b;">📈 Signal Breakdown</h3>
      <div class="metrics">
        <div class="metric"><div class="metric-value">${commScore}</div><div class="metric-label">Communication</div></div>
        <div class="metric"><div class="metric-value">${engScore}</div><div class="metric-label">Engagement</div></div>
        <div class="metric"><div class="metric-value">${workScore}</div><div class="metric-label">Workload</div></div>
        <div class="metric"><div class="metric-value">${collabScore}</div><div class="metric-label">Collaboration</div></div>
      </div>
      ${insights.length ? `
      <div class="insights">
        <h3>💡 Key Insights</h3>
        <ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
    <div class="footer">
      <p>Generated by SignalTrue • Behavioral Intelligence for HR</p>
    </div>
  </div>
</body>
</html>
  `;
}

export default router;
