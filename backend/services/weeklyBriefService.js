export default { sendWeeklyBrief, generateWeeklyBrief };
import nodemailer from 'nodemailer';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import DriftEvent from '../models/driftEvent.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import Team from '../models/team.js';
import DriftPlaybook from '../models/driftPlaybook.js';

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
  const teams = await Team.find({ organizationId: orgId });
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
  const recipients = hrUsers.map(u => u.email).join(',');
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@signaltrue.ai',
    to: recipients,
    subject: `Weekly HR Brief: ${org.name}`,
    html,
  });
}
