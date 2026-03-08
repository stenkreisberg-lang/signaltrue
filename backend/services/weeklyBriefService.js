import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import DriftEvent from '../models/driftEvent.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import Team from '../models/team.js';
import DriftPlaybook from '../models/driftPlaybook.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';

// Configure nodemailer (update with real SMTP in production)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'user@example.com',
    pass: process.env.SMTP_PASS || 'password',
  },
});

export async function generateWeeklyBrief(orgId) {
  // Fetch org, HR admins, and recent drift events
  const org = await Organization.findById(orgId);
  const hrUsers = await User.find({ orgId, role: { $in: ['hr_admin', 'admin', 'master_admin'] } });
  const driftEvents = await DriftEvent.find({ orgId, date: { $gte: new Date(Date.now() - 7*24*60*60*1000) } }).sort({ date: -1 });
  
  // NEW: Fetch all teams for this org with latest BDI
  const teams = await Team.find({ orgId });
  const teamBDIData = [];
  
  for (const team of teams) {
    const latestBDI = await BehavioralDriftIndex.findOne({ team: team._id })
      .sort({ calculatedAt: -1 })
      .populate('recommendedPlaybooks')
      .limit(1);
    
    if (latestBDI) {
      teamBDIData.push({
        teamName: team.name,
        bdi: latestBDI
      });
    }
  }
  
  // Filter teams in drift
  const driftingTeams = teamBDIData.filter(t => 
    t.bdi.driftState === 'Early Drift' || 
    t.bdi.driftState === 'Developing Drift' || 
    t.bdi.driftState === 'Critical Drift'
  );

  // Compose summary with new BDI section
  let html = `<h2>Weekly HR Brief for ${org.name}</h2>`;
  
  // BDI Summary Section
  html += '<h3 style="color: #6366f1; margin-top: 24px;">🎯 Behavioral Drift Status</h3>';
  
  if (driftingTeams.length > 0) {
    html += `<p><b>${driftingTeams.length}</b> team(s) entered drift this week:</p>`;
    html += '<ul style="list-style-type: none; padding-left: 0;">';
    
    driftingTeams.forEach(({ teamName, bdi }) => {
      const stateColor = bdi.driftState === 'Critical Drift' ? '#ef4444' :
                         bdi.driftState === 'Developing Drift' ? '#f97316' : '#eab308';
      
      html += `<li style="margin-bottom: 16px; padding: 12px; background: #f9fafb; border-left: 4px solid ${stateColor};">`;
      html += `<b style="color: ${stateColor};">${teamName}</b> — ${bdi.driftState}<br/>`;
      html += `<b>Drift Score:</b> ${bdi.driftScore}/100 | <b>Confidence:</b> ${bdi.confidence} (${bdi.confirmingSignals?.length || 0} confirming signals)<br/>`;
      
      // Top drivers
      if (bdi.drivers && bdi.drivers.length > 0) {
        html += `<b>Top Drivers:</b> ${bdi.drivers.slice(0, 2).map(d => `${d.signal} (${d.contribution}% impact)`).join(', ')}<br/>`;
      }
      
      // Recommended playbook
      if (bdi.recommendedPlaybooks && bdi.recommendedPlaybooks.length > 0) {
        const playbook = bdi.recommendedPlaybooks[0];
        html += `<b>Recommended Action:</b> ${playbook.title} — ${playbook.actions[0]?.action || 'See dashboard for details'}`;
      }
      
      html += '</li>';
    });
    
    html += '</ul>';
  } else {
    html += '<p style="color: #10b981;">✓ All teams stable. No drift detected this week.</p>';
  }
  
  // ─── Communication Activity Section ───
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // Get WorkEvent counts for this week and last week
  const [twEvents, lwEvents] = await Promise.all([
    WorkEvent.aggregate([
      { $match: { orgId: org._id, timestamp: { $gte: thisWeekStart, $lte: now } } },
      { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } }
    ]),
    WorkEvent.aggregate([
      { $match: { orgId: org._id, timestamp: { $gte: lastWeekStart, $lt: thisWeekStart } } },
      { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } }
    ])
  ]);

  const getCount = (arr, source, eventType) => {
    const match = arr.find(e => e._id.source === source && e._id.eventType === eventType);
    return match?.count || 0;
  };
  const getCountByType = (arr, eventType) => {
    return arr.filter(e => e._id.eventType === eventType).reduce((sum, e) => sum + e.count, 0);
  };
  const getCountBySource = (arr, ...sources) => {
    return arr.filter(e => sources.includes(e._id.source)).reduce((sum, e) => sum + e.count, 0);
  };

  // Meeting counts (all calendar sources)
  const twMeetings = getCountByType(twEvents, 'meeting');
  const lwMeetings = getCountByType(lwEvents, 'meeting');
  
  // Messaging counts (all messaging sources)
  const twMessages = getCountByType(twEvents, 'message');
  const lwMessages = getCountByType(lwEvents, 'message');

  // Total activity
  const twTotal = twEvents.reduce((sum, e) => sum + e.count, 0);
  const lwTotal = lwEvents.reduce((sum, e) => sum + e.count, 0);

  // Get latest IntegrationMetricsDaily for rich metrics
  const latestMetrics = await IntegrationMetricsDaily.findOne({
    orgId: org._id,
    teamId: null
  }).sort({ date: -1 }).lean();

  const pctChange = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? '↑ new' : '—';
    const d = Math.round(((curr - prev) / prev) * 100);
    return d > 0 ? `↑ ${d}%` : d < 0 ? `↓ ${Math.abs(d)}%` : '→ same';
  };
  const trendIcon = (curr, prev, higherIsBad = true) => {
    if (curr === prev) return '➡️';
    if (higherIsBad) return curr > prev ? '🔴' : '🟢';
    return curr > prev ? '🟢' : '🔴';
  };

  html += '<h3 style="color: #6366f1; margin-top: 28px;">📬 Communication Activity This Week</h3>';
  html += '<table style="border-collapse: collapse; width: 100%; max-width: 500px; font-family: sans-serif; font-size: 14px;">';
  html += '<thead><tr style="border-bottom: 2px solid #e5e7eb;">';
  html += '<th style="text-align:left; padding:8px;">Metric</th>';
  html += '<th style="text-align:right; padding:8px;">Last Week</th>';
  html += '<th style="text-align:right; padding:8px;">This Week</th>';
  html += '<th style="text-align:right; padding:8px;">Trend</th>';
  html += '</tr></thead><tbody>';

  const addRow = (label, lw, tw, higherIsBad = true) => {
    const icon = trendIcon(tw, lw, higherIsBad);
    html += `<tr style="border-bottom:1px solid #f3f4f6;">`;
    html += `<td style="padding:6px 8px;">${label}</td>`;
    html += `<td style="text-align:right; padding:6px 8px;">${lw}</td>`;
    html += `<td style="text-align:right; padding:6px 8px; font-weight:600;">${tw}</td>`;
    html += `<td style="text-align:right; padding:6px 8px;">${icon} ${pctChange(tw, lw)}</td>`;
    html += '</tr>';
  };

  addRow('📅 Meetings', lwMeetings, twMeetings, true);
  addRow('💬 Team Messages', lwMessages, twMessages, false);
  addRow('📊 Total Events', lwTotal, twTotal, false);

  // Per-source breakdown if multiple sources
  const twOutlook = getCount(twEvents, 'microsoft-outlook', 'meeting');
  const lwOutlook = getCount(lwEvents, 'microsoft-outlook', 'meeting');
  const twGcal = getCount(twEvents, 'google-calendar', 'meeting');
  const lwGcal = getCount(lwEvents, 'google-calendar', 'meeting');
  const twTeams = getCount(twEvents, 'microsoft-teams', 'message');
  const lwTeams = getCount(lwEvents, 'microsoft-teams', 'message');
  const twSlack = getCount(twEvents, 'slack', 'message');
  const lwSlack = getCount(lwEvents, 'slack', 'message');
  const twGchat = getCount(twEvents, 'google-chat', 'message');
  const lwGchat = getCount(lwEvents, 'google-chat', 'message');

  // Only show source rows that have data
  if (twOutlook > 0 || lwOutlook > 0) addRow('&nbsp;&nbsp;↳ Outlook Meetings', lwOutlook, twOutlook, true);
  if (twGcal > 0 || lwGcal > 0) addRow('&nbsp;&nbsp;↳ Google Calendar', lwGcal, twGcal, true);
  if (twTeams > 0 || lwTeams > 0) addRow('&nbsp;&nbsp;↳ Teams Messages', lwTeams, twTeams, false);
  if (twSlack > 0 || lwSlack > 0) addRow('&nbsp;&nbsp;↳ Slack Messages', lwSlack, twSlack, false);
  if (twGchat > 0 || lwGchat > 0) addRow('&nbsp;&nbsp;↳ Google Chat', lwGchat, twGchat, false);

  // Add rich metrics from IntegrationMetricsDaily if available
  if (latestMetrics) {
    if (latestMetrics.meetingCount7d > 0) {
      html += '<tr style="border-top:2px solid #e5e7eb;"><td colspan="4" style="padding:8px; font-weight:600; color:#6366f1;">Detailed Metrics (rolling 7 days)</td></tr>';
      if (latestMetrics.meetingDurationTotalHours7d > 0) {
        addRow('⏱️ Total Meeting Hours', '—', latestMetrics.meetingDurationTotalHours7d.toFixed(1), true);
      }
      if (latestMetrics.backToBackMeetingBlocks > 0) {
        addRow('⚡ Back-to-Back Blocks', '—', latestMetrics.backToBackMeetingBlocks, true);
      }
    }
    if (latestMetrics.messageCount7d > 0) {
      addRow('💬 Messages/Day', '—', latestMetrics.messagesPerDay?.toFixed(1) || '0', false);
    }
    if (latestMetrics.afterHoursMessageCount > 0) {
      addRow('🌙 After-Hours Messages', '—', latestMetrics.afterHoursMessageCount, true);
      addRow('🌙 After-Hours Ratio', '—', `${(latestMetrics.afterHoursMessageRatio * 100).toFixed(0)}%`, true);
    }
    if (latestMetrics.uniqueChannels7d > 0) {
      addRow('📂 Active Channels', '—', latestMetrics.uniqueChannels7d, false);
    }
  }

  html += '</tbody></table>';

  // Connected integrations summary
  const integrations = org.integrations || {};
  const connectedSources = [];
  if (integrations.microsoft?.accessToken) connectedSources.push('Microsoft (Outlook + Teams)');
  if (integrations.slack?.accessToken) connectedSources.push('Slack');
  if (integrations.google?.accessToken) connectedSources.push('Google Calendar');
  if (integrations.googleChat?.accessToken) connectedSources.push('Google Chat');
  
  html += `<p style="font-size:12px; color:#9ca3af; margin-top:12px;">Data sources: ${connectedSources.length > 0 ? connectedSources.join(', ') : 'None connected'}</p>`;

  // Legacy Engagement Change Alerts
  html += '<h3 style="margin-top: 24px;">📊 Legacy Engagement Changes</h3>';
  html += `<p>Total Engagement Change Alerts: <b>${driftEvents.length}</b></p>`;
  if (driftEvents.length) {
    html += '<ul>';
    driftEvents.forEach(ev => {
      html += `<li><b>${ev.metric}</b> ${ev.direction === 'positive' ? '↑' : '↓'} ${ev.magnitude}% on ${new Date(ev.date).toLocaleDateString()}<br/>Top Drivers: ${ev.drivers?.map(d => d.metric + ' (' + (d.delta > 0 ? '+' : '') + d.delta + ')').join(', ')}</li>`;
    });
    html += '</ul>';
  } else {
    html += '<p>No major engagement changes this week.</p>';
  }
  
  return html;
}

export async function sendWeeklyBrief(orgId) {
  const org = await Organization.findById(orgId);
  const hrUsers = await User.find({ orgId, role: { $in: ['hr_admin', 'admin', 'master_admin'] } });
  if (!hrUsers.length) return;
  const html = await generateWeeklyBrief(orgId);
  const recipients = hrUsers.map(u => u.email);

  // Prefer Resend if configured, else fall back to nodemailer SMTP
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'SignalTrue <brief@signaltrue.ai>',
      to: recipients,
      subject: `Weekly HR Brief: ${org.name}`,
      html,
    });
  } else {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@signaltrue.ai',
      to: recipients.join(','),
      subject: `Weekly HR Brief: ${org.name}`,
      html,
    });
  }
}

export default { sendWeeklyBrief, generateWeeklyBrief };