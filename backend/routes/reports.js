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
    const { ObjectId } = mongoose.default.Types;
    
    // Get organization
    const Organization = mongoose.default.model('Organization');
    const targetOrgIdStr = orgId || '693bff1d7182d336060c8629';
    const targetOrgId = new ObjectId(targetOrgIdStr);
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
    
    console.log(`Found ${teams.length} teams for org ${targetOrgId}`);
    
    for (const team of teams) {
      console.log(`Looking for teamId: ${team._id} (type: ${typeof team._id})`);
      
      // Query directly with ObjectId
      const teamStates = await teamStatesCollection
        .find({ teamId: team._id })
        .sort({ weekEnd: 1 })
        .limit(10)
        .toArray();
      
      console.log(`Team ${team.name}: Found ${teamStates.length} states`);
      
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

// New version with modern SignalTrue design
function generateReportHTMLv2(team, state, prevState, weekNum, weekEndDate, bdiValue, bdiChange, bdiChangeText, bdiTrend, zoneValue, zoneColor) {
  const commScore = state.signals?.communication?.score ?? 0;
  const engScore = state.signals?.engagement?.score ?? 0;
  const workScore = state.signals?.workload?.score ?? 0;
  const collabScore = state.signals?.collaboration?.score ?? 0;
  const insights = state.insights || [];
  
  // Get metrics data
  const metrics = state.metrics || {};
  const messageCount = metrics.messageCount ?? '-';
  const meetingHours = metrics.meetingHours ?? '-';
  const afterHours = metrics.afterHoursActivity ?? '-';
  const responseTime = metrics.responseTime ?? '-';
  
  // Previous week metrics for comparison
  const prevMetrics = prevState?.metrics || {};
  const msgChange = prevMetrics.messageCount ? Math.round(((messageCount - prevMetrics.messageCount) / prevMetrics.messageCount) * 100) : null;
  const mtgChange = prevMetrics.meetingHours ? Math.round(((meetingHours - prevMetrics.meetingHours) / prevMetrics.meetingHours) * 100) : null;
  const ahChange = prevMetrics.afterHoursActivity ? Math.round(((afterHours - prevMetrics.afterHoursActivity) / prevMetrics.afterHoursActivity) * 100) : null;
  const rtChange = prevMetrics.responseTime ? Math.round(((responseTime - prevMetrics.responseTime) / prevMetrics.responseTime) * 100) : null;
  
  // Calculate trend signals for each
  const prevComm = prevState?.signals?.communication?.score;
  const prevEng = prevState?.signals?.engagement?.score;
  const prevWork = prevState?.signals?.workload?.score;
  const prevCollab = prevState?.signals?.collaboration?.score;
  
  const commChange = prevComm ? commScore - prevComm : 0;
  const engChange = prevEng ? engScore - prevEng : 0;
  const workChange = prevWork ? workScore - prevWork : 0;
  const collabChange = prevCollab ? collabScore - prevCollab : 0;
  
  // Helper function to get trend text
  const getTrendText = (change) => {
    if (change === 0 || change === null) return 'stable';
    return change > 0 ? `+${change}` : `${change}`;
  };
  
  // Zone status
  const getZoneStatus = (zone) => {
    if (zone === 'Stable') return { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', label: 'Stable' };
    if (zone === 'Watch') return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', label: 'Drifting' };
    return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', label: 'Critical' };
  };
  
  const zoneStatus = getZoneStatus(zoneValue);
  
  // Meeting hours status
  const meetingStatus = typeof meetingHours === 'number' && meetingHours > 16 ? 'Critical' : 
                        typeof meetingHours === 'number' && meetingHours > 12 ? 'Elevated' : 'Normal';
  const meetingStatusColor = meetingStatus === 'Critical' ? '#ef4444' : meetingStatus === 'Elevated' ? '#f59e0b' : '#22c55e';
  
  // After hours status
  const ahStatus = typeof afterHours === 'number' && afterHours > 10 ? 'Critical' : 
                   typeof afterHours === 'number' && afterHours > 5 ? 'Elevated' : 'Normal';
  const ahStatusColor = ahStatus === 'Critical' ? '#ef4444' : ahStatus === 'Elevated' ? '#f59e0b' : '#22c55e';
  
  // Needle rotation for gauge (0-100 maps to -90 to +90 degrees)
  const needleRotation = (bdiValue / 100) * 180 - 90;
  
  // Generate recommendations
  const recommendations = [];
  if (ahStatus === 'Critical') recommendations.push('After-hours activity exceeding sustainable levels. Review workload distribution.');
  if (meetingStatus === 'Critical') recommendations.push('Meeting density is critical. Consider async alternatives and meeting audits.');
  if (bdiChange < -5) recommendations.push('Significant drift detected. Schedule team check-in to identify root causes.');
  if (commChange < -5) recommendations.push('Communication patterns declining. Consider team sync to restore connection.');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    
    <!-- Header Card -->
    <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${zoneStatus.color}; animation: pulse 2s infinite;"></div>
        <span style="font-size: 12px; font-weight: 600; color: ${zoneStatus.color}; text-transform: uppercase; letter-spacing: 0.5px;">Weekly Signal Report</span>
      </div>
      <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #ffffff;">
        ${team.name} Team
      </h1>
      <p style="margin: 0; font-size: 14px; color: rgba(255, 255, 255, 0.6);">
        Week ${weekNum} • ${weekEndDate}
      </p>
    </div>
    
    ${ahStatus === 'Critical' || meetingStatus === 'Critical' || bdiChange < -5 ? `
    <!-- Alert Banner -->
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
      <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(239, 68, 68, 0.2); display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 20px;">⚠️</span>
      </div>
      <div>
        <div style="font-size: 14px; font-weight: 600; color: #fca5a5; margin-bottom: 2px;">Attention Required</div>
        <div style="font-size: 13px; color: rgba(252, 165, 165, 0.8);">
          ${ahStatus === 'Critical' ? 'Recovery erosion detected. ' : ''}${meetingStatus === 'Critical' ? 'Meeting overload detected. ' : ''}${bdiChange < -5 ? `BDI dropped ${Math.abs(bdiChange)} points.` : ''}
        </div>
      </div>
    </div>
    ` : ''}
    
    <!-- BDI Gauge Card -->
    <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 32px; margin-bottom: 20px; text-align: center;">
      
      <!-- SVG Gauge -->
      <div style="width: 220px; margin: 0 auto 24px;">
        <svg viewBox="0 0 220 130" style="width: 100%; height: auto;">
          <!-- Background arc -->
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style="stop-color:#ef4444"/>
              <stop offset="40%" style="stop-color:#f59e0b"/>
              <stop offset="70%" style="stop-color:#22c55e"/>
              <stop offset="100%" style="stop-color:#22c55e"/>
            </linearGradient>
          </defs>
          
          <!-- Outer glow -->
          <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="rgba(59, 130, 246, 0.2)" stroke-width="24" stroke-linecap="round"/>
          
          <!-- Main arc -->
          <path d="M 30 110 A 80 80 0 0 1 190 110" fill="none" stroke="url(#arcGrad)" stroke-width="16" stroke-linecap="round"/>
          
          <!-- Tick marks -->
          <line x1="30" y1="110" x2="30" y2="100" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <line x1="110" y1="30" x2="110" y2="40" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          <line x1="190" y1="110" x2="190" y2="100" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
          
          <!-- Labels -->
          <text x="25" y="125" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="middle">0</text>
          <text x="110" y="20" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="middle">50</text>
          <text x="195" y="125" font-size="10" fill="rgba(255,255,255,0.4)" text-anchor="middle">100</text>
          
          <!-- Needle -->
          <g transform="rotate(${needleRotation}, 110, 110)">
            <path d="M 110 45 L 105 110 L 115 110 Z" fill="#ffffff"/>
            <circle cx="110" cy="110" r="10" fill="#1e293b" stroke="#ffffff" stroke-width="2"/>
          </g>
          
        </svg>
      </div>
      
      <!-- Score Display -->
      <div style="font-size: 56px; font-weight: 700; color: #ffffff; margin-bottom: 4px;">${bdiValue}</div>
      <div style="font-size: 13px; color: rgba(255, 255, 255, 0.5); margin-bottom: 16px;">Behavioral Drift Index</div>
      
      <!-- Zone Badge -->
      <div style="display: inline-block; padding: 8px 20px; border-radius: 20px; background: ${zoneStatus.bg}; border: 1px solid ${zoneStatus.color}40;">
        <span style="font-size: 13px; font-weight: 600; color: ${zoneStatus.color};">${zoneStatus.label}</span>
      </div>
      
      ${prevState ? `
      <!-- Change indicator -->
      <div style="margin-top: 12px; font-size: 13px; color: ${bdiChange >= 0 ? '#22c55e' : '#ef4444'};">
        ${bdiChange >= 0 ? '↑' : '↓'} ${bdiChangeText} from last week
      </div>
      ` : ''}
    </div>
    
    <!-- Signal Metrics Card -->
    <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 16px;">📊 Signal Breakdown</div>
      
      <!-- Communication -->
      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 20px;">💬</span>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 500; color: #ffffff;">Communication</div>
          <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Team interaction patterns</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: #ffffff;">${commScore}</div>
          <div style="font-size: 11px; color: ${commChange >= 0 ? '#22c55e' : '#ef4444'};">${getTrendText(commChange)}</div>
        </div>
      </div>
      
      <!-- Engagement -->
      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(139, 92, 246, 0.15); display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 20px;">⚡</span>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 500; color: #ffffff;">Engagement</div>
          <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Active participation signals</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: #ffffff;">${engScore}</div>
          <div style="font-size: 11px; color: ${engChange >= 0 ? '#22c55e' : '#ef4444'};">${getTrendText(engChange)}</div>
        </div>
      </div>
      
      <!-- Workload -->
      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 20px;">📈</span>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 500; color: #ffffff;">Workload Balance</div>
          <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Capacity distribution patterns</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: #ffffff;">${workScore}</div>
          <div style="font-size: 11px; color: ${workChange >= 0 ? '#22c55e' : '#ef4444'};">${getTrendText(workChange)}</div>
        </div>
      </div>
      
      <!-- Collaboration -->
      <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; display: flex; align-items: center; gap: 16px;">
        <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 20px;">🤝</span>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 14px; font-weight: 500; color: #ffffff;">Collaboration</div>
          <div style="font-size: 12px; color: rgba(255, 255, 255, 0.5);">Cross-functional connectivity</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 20px; font-weight: 700; color: #ffffff;">${collabScore}</div>
          <div style="font-size: 11px; color: ${collabChange >= 0 ? '#22c55e' : '#ef4444'};">${getTrendText(collabChange)}</div>
        </div>
      </div>
    </div>
    
    <!-- Activity Metrics Card -->
    <div style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 16px;">📋 Activity Signals</div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
        <!-- Messages -->
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${messageCount}</div>
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 4px;">Messages</div>
          ${msgChange !== null ? `<div style="font-size: 11px; color: ${msgChange >= 0 ? '#22c55e' : '#ef4444'}; margin-top: 4px;">${msgChange >= 0 ? '+' : ''}${msgChange}%</div>` : ''}
        </div>
        
        <!-- Meeting Hours -->
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; text-align: center; ${meetingStatus !== 'Normal' ? `border: 1px solid ${meetingStatusColor}40;` : ''}">
          <div style="font-size: 24px; font-weight: 700; color: ${meetingStatusColor};">${meetingHours}h</div>
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 4px;">Meeting Hours</div>
          ${meetingStatus !== 'Normal' ? `<div style="font-size: 10px; color: ${meetingStatusColor}; margin-top: 4px;">${meetingStatus}</div>` : ''}
        </div>
        
        <!-- After Hours -->
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; text-align: center; ${ahStatus !== 'Normal' ? `border: 1px solid ${ahStatusColor}40;` : ''}">
          <div style="font-size: 24px; font-weight: 700; color: ${ahStatusColor};">${afterHours}</div>
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 4px;">After-Hours Events</div>
          ${ahStatus !== 'Normal' ? `<div style="font-size: 10px; color: ${ahStatusColor}; margin-top: 4px;">${ahStatus}</div>` : ''}
        </div>
        
        <!-- Response Time -->
        <div style="background: rgba(255, 255, 255, 0.03); border-radius: 12px; padding: 16px; text-align: center;">
          <div style="font-size: 24px; font-weight: 700; color: #ffffff;">${responseTime}m</div>
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.5); margin-top: 4px;">Avg Response</div>
        </div>
      </div>
    </div>
    
    ${insights.length > 0 ? `
    <!-- Insights Card -->
    <div style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 16px; padding: 24px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #fbbf24; margin-bottom: 12px;">💡 Signal Interpretation</div>
      ${insights.map(i => `<div style="font-size: 13px; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; padding-left: 16px; border-left: 2px solid rgba(245, 158, 11, 0.4);">${i}</div>`).join('')}
    </div>
    ` : ''}
    
    ${recommendations.length > 0 ? `
    <!-- Recommendations Card -->
    <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 16px; padding: 24px; margin-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #60a5fa; margin-bottom: 12px;">🎯 Recommended Actions</div>
      ${recommendations.map(r => `<div style="font-size: 13px; color: rgba(255, 255, 255, 0.8); margin-bottom: 8px; padding-left: 16px; border-left: 2px solid rgba(59, 130, 246, 0.4);">${r}</div>`).join('')}
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid rgba(255, 255, 255, 0.1);">
      <div style="font-size: 12px; color: rgba(255, 255, 255, 0.4); margin-bottom: 8px;">
        Generated by <a href="https://signaltrue.ai" style="color: #60a5fa; text-decoration: none;">SignalTrue</a> • Behavioral Drift Intelligence
      </div>
      <a href="https://signaltrue.ai/dashboard" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 8px; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600;">
        View Full Dashboard →
      </a>
    </div>
    
  </div>
</body>
</html>
  `;
}

export default router;
