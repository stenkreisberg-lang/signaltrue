import nodemailer from 'nodemailer';
import Organization from '../models/organization.js';
import User from '../models/user.js';
import DriftEvent from '../models/driftEvent.js';

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

  // Compose summary (simple version)
  let html = `<h2>Weekly HR Brief for ${org.name}</h2>`;
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
