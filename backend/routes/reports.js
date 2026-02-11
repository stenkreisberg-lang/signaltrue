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

// New version with explicit parameters to avoid undefined issues
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
  
  // Helper function to get trend arrow and color
  const getTrend = (change, inverse = false) => {
    if (change === 0 || change === null) return { arrow: '→', color: '#64748b', text: 'stable' };
    const isGood = inverse ? change < 0 : change > 0;
    return {
      arrow: change > 0 ? '↑' : '↓',
      color: isGood ? '#22c55e' : '#ef4444',
      text: `${change > 0 ? '+' : ''}${change}`
    };
  };
  
  // Helper for metric change badges
  const getChangeBadge = (change, inverse = false) => {
    if (change === null) return '';
    const isGood = inverse ? change < 0 : change > 0;
    const isNeutral = Math.abs(change) < 5;
    const color = isNeutral ? '#64748b' : (isGood ? '#22c55e' : '#ef4444');
    const bg = isNeutral ? '#f1f5f9' : (isGood ? '#dcfce7' : '#fee2e2');
    return `<span style="font-size: 11px; padding: 2px 6px; border-radius: 8px; background: ${bg}; color: ${color}; margin-left: 6px;">${change > 0 ? '+' : ''}${change}%</span>`;
  };
  
  // Build sparkline for BDI (last 4 weeks indicator)
  const getZoneIndicator = (score) => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };
  
  // Meeting hours health indicator
  const meetingHealthy = typeof meetingHours === 'number' && meetingHours <= 12;
  const meetingWarning = typeof meetingHours === 'number' && meetingHours > 12 && meetingHours <= 16;
  const meetingCritical = typeof meetingHours === 'number' && meetingHours > 16;
  const meetingColor = meetingHealthy ? '#22c55e' : (meetingWarning ? '#f59e0b' : '#ef4444');
  const meetingPercent = typeof meetingHours === 'number' ? Math.min((meetingHours / 20) * 100, 100) : 0;
  
  // After hours indicator
  const afterHoursHealthy = typeof afterHours === 'number' && afterHours <= 5;
  const afterHoursWarning = typeof afterHours === 'number' && afterHours > 5 && afterHours <= 10;
  const afterHoursCritical = typeof afterHours === 'number' && afterHours > 10;
  const afterHoursColor = afterHoursHealthy ? '#22c55e' : (afterHoursWarning ? '#f59e0b' : '#ef4444');
  
  // Response time indicator
  const rtHealthy = typeof responseTime === 'number' && responseTime <= 30;
  const rtWarning = typeof responseTime === 'number' && responseTime > 30 && responseTime <= 60;
  const rtColor = rtHealthy ? '#22c55e' : (rtWarning ? '#f59e0b' : '#ef4444');
  
  // Generate actionable recommendations based on data
  const recommendations = [];
  if (afterHoursCritical) {
    recommendations.push('⚠️ After-hours activity is high. Consider addressing potential burnout risks.');
  }
  if (meetingCritical) {
    recommendations.push('📅 Meeting load exceeds healthy thresholds. Review recurring meetings for consolidation.');
  }
  if (commChange < -5) {
    recommendations.push('💬 Communication has dropped. Consider scheduling a team sync.');
  }
  if (engChange < -5) {
    recommendations.push('📊 Engagement declining. Check in with team members individually.');
  }
  if (typeof responseTime === 'number' && responseTime > 60) {
    recommendations.push('⏱️ Response times are elevated. Teams may be overloaded or context-switching.');
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; }
    .container { max-width: 640px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .header p { margin: 10px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 28px; }
    
    /* BDI Gauge Section */
    .bdi-section { text-align: center; margin-bottom: 28px; }
    .bdi-gauge { position: relative; width: 180px; height: 100px; margin: 0 auto 16px; overflow: hidden; }
    .gauge-bg { position: absolute; width: 180px; height: 90px; border-radius: 90px 90px 0 0; background: linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #22c55e 70%, #22c55e 100%); }
    .gauge-mask { position: absolute; top: 20px; left: 20px; width: 140px; height: 70px; border-radius: 70px 70px 0 0; background: white; }
    .gauge-value { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); font-size: 36px; font-weight: 700; color: #1e293b; }
    .bdi-label { color: #64748b; font-size: 13px; margin-bottom: 12px; }
    .zone-badge { display: inline-block; padding: 6px 18px; border-radius: 20px; font-weight: 600; font-size: 13px; }
    .trend-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-top: 8px; }
    
    /* Signal Cards */
    .signals-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 24px 0; }
    .signal-card { background: #f8fafc; border-radius: 12px; padding: 16px; position: relative; }
    .signal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .signal-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
    .signal-trend { font-size: 11px; font-weight: 600; }
    .signal-score { font-size: 28px; font-weight: 700; color: #1e293b; }
    .signal-bar { height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 10px; overflow: hidden; }
    .signal-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
    
    /* Metrics Row */
    .metrics-section { background: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .metrics-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 16px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .metric-item { text-align: center; }
    .metric-value { font-size: 20px; font-weight: 700; color: #1e293b; }
    .metric-label { font-size: 11px; color: #64748b; margin-top: 2px; }
    .metric-bar { height: 4px; background: #e2e8f0; border-radius: 2px; margin-top: 8px; }
    .metric-fill { height: 100%; border-radius: 2px; }
    
    /* Insights & Recommendations */
    .section { margin: 24px 0; }
    .section-title { font-size: 14px; font-weight: 600; color: #1e293b; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .insights-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 0 10px 10px 0; }
    .insights-box ul { margin: 0; padding-left: 18px; }
    .insights-box li { color: #78350f; font-size: 13px; margin-bottom: 6px; line-height: 1.5; }
    .recs-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 0 10px 10px 0; }
    .recs-box li { color: #1e40af; font-size: 13px; margin-bottom: 6px; line-height: 1.5; }
    
    /* Alert Banner */
    .alert-banner { background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
    .alert-icon { font-size: 20px; }
    .alert-text { font-size: 13px; color: #991b1b; font-weight: 500; }
    
    .footer { background: #f8fafc; padding: 20px 28px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 SignalTrue Weekly Report</h1>
      <p>Week ${weekNum} • ${team.name} Team • ${weekEndDate}</p>
    </div>
    
    <div class="content">
      ${afterHoursCritical || meetingCritical ? `
      <div class="alert-banner">
        <span class="alert-icon">⚠️</span>
        <span class="alert-text">
          ${afterHoursCritical ? `After-hours activity up ${ahChange}%` : ''}
          ${afterHoursCritical && meetingCritical ? ' • ' : ''}
          ${meetingCritical ? `Meeting load at ${meetingHours}h (high)` : ''}
        </span>
      </div>
      ` : ''}
      
      <!-- BDI Gauge with SVG Speedometer -->
      <div class="bdi-section">
        <div style="width: 200px; margin: 0 auto 16px;">
          <svg viewBox="0 0 200 120" style="width: 100%; height: auto;">
            <!-- Gauge arc background -->
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#ef4444"/>
                <stop offset="35%" style="stop-color:#f59e0b"/>
                <stop offset="65%" style="stop-color:#22c55e"/>
                <stop offset="100%" style="stop-color:#22c55e"/>
              </linearGradient>
            </defs>
            <!-- Outer arc -->
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" stroke-width="18" stroke-linecap="round"/>
            <!-- Tick marks -->
            <text x="15" y="105" font-size="10" fill="#94a3b8">0</text>
            <text x="55" y="45" font-size="10" fill="#94a3b8">25</text>
            <text x="93" y="25" font-size="10" fill="#94a3b8">50</text>
            <text x="135" y="45" font-size="10" fill="#94a3b8">75</text>
            <text x="175" y="105" font-size="10" fill="#94a3b8">100</text>
            <!-- Needle - rotates based on value (0=left, 100=right) -->
            <!-- Rotation: -90deg at 0, +90deg at 100. Formula: (value/100)*180 - 90 -->
            <g transform="rotate(${(bdiValue / 100) * 180 - 90}, 100, 100)">
              <polygon points="100,30 95,100 105,100" fill="#1e293b"/>
              <circle cx="100" cy="100" r="8" fill="#1e293b"/>
              <circle cx="100" cy="100" r="4" fill="#fff"/>
            </g>
            <!-- Value display -->
            <text x="100" y="95" text-anchor="middle" font-size="28" font-weight="bold" fill="#1e293b">${bdiValue}</text>
          </svg>
        </div>
        <div class="bdi-label">Behavioral Drift Index (BDI)</div>
        <div class="zone-badge" style="background: ${zoneColor}15; color: ${zoneColor};">
          ${getZoneIndicator(bdiValue)} ${zoneValue} Zone
        </div>
        ${prevState ? `
        <div class="trend-badge" style="background: ${bdiChange >= 0 ? '#dcfce7' : '#fee2e2'}; color: ${bdiChange >= 0 ? '#166534' : '#991b1b'};">
          ${bdiTrend} ${bdiChangeText} from last week
        </div>
        ` : ''}
      </div>
      
      <!-- Signal Breakdown -->
      <div class="section-title">📈 Signal Breakdown</div>
      <div class="signals-grid">
        <div class="signal-card">
          <div class="signal-header">
            <span class="signal-label">Communication</span>
            <span class="signal-trend" style="color: ${getTrend(commChange).color};">${getTrend(commChange).arrow} ${getTrend(commChange).text}</span>
          </div>
          <div class="signal-score">${commScore}</div>
          <div class="signal-bar"><div class="signal-fill" style="width: ${commScore}%; background: ${commScore >= 70 ? '#22c55e' : commScore >= 50 ? '#f59e0b' : '#ef4444'};"></div></div>
        </div>
        <div class="signal-card">
          <div class="signal-header">
            <span class="signal-label">Engagement</span>
            <span class="signal-trend" style="color: ${getTrend(engChange).color};">${getTrend(engChange).arrow} ${getTrend(engChange).text}</span>
          </div>
          <div class="signal-score">${engScore}</div>
          <div class="signal-bar"><div class="signal-fill" style="width: ${engScore}%; background: ${engScore >= 70 ? '#22c55e' : engScore >= 50 ? '#f59e0b' : '#ef4444'};"></div></div>
        </div>
        <div class="signal-card">
          <div class="signal-header">
            <span class="signal-label">Workload</span>
            <span class="signal-trend" style="color: ${getTrend(workChange).color};">${getTrend(workChange).arrow} ${getTrend(workChange).text}</span>
          </div>
          <div class="signal-score">${workScore}</div>
          <div class="signal-bar"><div class="signal-fill" style="width: ${workScore}%; background: ${workScore >= 70 ? '#22c55e' : workScore >= 50 ? '#f59e0b' : '#ef4444'};"></div></div>
        </div>
        <div class="signal-card">
          <div class="signal-header">
            <span class="signal-label">Collaboration</span>
            <span class="signal-trend" style="color: ${getTrend(collabChange).color};">${getTrend(collabChange).arrow} ${getTrend(collabChange).text}</span>
          </div>
          <div class="signal-score">${collabScore}</div>
          <div class="signal-bar"><div class="signal-fill" style="width: ${collabScore}%; background: ${collabScore >= 70 ? '#22c55e' : collabScore >= 50 ? '#f59e0b' : '#ef4444'};"></div></div>
        </div>
      </div>
      
      <!-- Activity Metrics -->
      <div class="metrics-section">
        <div class="metrics-title">📋 Activity Metrics</div>
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-value">${messageCount}${getChangeBadge(msgChange)}</div>
            <div class="metric-label">Messages</div>
          </div>
          <div class="metric-item">
            <div class="metric-value" style="color: ${meetingColor};">${meetingHours}h${getChangeBadge(mtgChange, true)}</div>
            <div class="metric-label">Meeting Hours</div>
            <div class="metric-bar"><div class="metric-fill" style="width: ${meetingPercent}%; background: ${meetingColor};"></div></div>
          </div>
          <div class="metric-item">
            <div class="metric-value" style="color: ${afterHoursColor};">${afterHours}${getChangeBadge(ahChange, true)}</div>
            <div class="metric-label">After-Hours Events</div>
          </div>
          <div class="metric-item">
            <div class="metric-value" style="color: ${rtColor};">${responseTime}m${getChangeBadge(rtChange, true)}</div>
            <div class="metric-label">Avg Response Time</div>
          </div>
        </div>
      </div>
      
      ${insights.length ? `
      <div class="section">
        <div class="section-title">💡 Key Insights</div>
        <div class="insights-box">
          <ul>${insights.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
      </div>
      ` : ''}
      
      ${recommendations.length ? `
      <div class="section">
        <div class="section-title">🎯 Recommended Actions</div>
        <div class="recs-box">
          <ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
        </div>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Generated by <a href="https://signaltrue.ai">SignalTrue</a> • Behavioral Intelligence for HR</p>
      <p style="margin-top: 8px;">View your full dashboard at <a href="https://signaltrue.ai/dashboard">signaltrue.ai/dashboard</a></p>
    </div>
  </div>
</body>
</html>
  `;
}

export default router;
