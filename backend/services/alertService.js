import DriftEvent from '../models/driftEvent.js';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import { WebClient } from '@slack/web-api';
import nodemailer from 'nodemailer';

const slackClient = process.env.SLACK_BOT_TOKEN ? new WebClient(process.env.SLACK_BOT_TOKEN) : null;
const emailTransporter = process.env.EMAIL_HOST && process.env.EMAIL_USER
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    })
  : null;

export async function sendDriftAlerts() {
  const events = await DriftEvent.find({ acknowledged: false, date: { $gte: new Date(Date.now() - 24*3600*1000) } });
  for (const event of events) {
    const team = await Team.findById(event.teamId);
    const org = team ? await Organization.findById(team.orgId) : null;
    if (!team || !org) continue;
    // Check alert frequency setting
    if (org.settings?.alertFrequency === 'off') continue;
    if (org.settings?.alertFrequency === 'weekly' && new Date().getDay() !== 1) continue; // only Mondays
    // Build explainability message
    const contributors = event.topContributors?.length 
      ? event.topContributors.map(c => `${c.metric} ${c.change > 0 ? '↑' : '↓'} ${Math.abs(Math.round(c.change))}%`).join(', ')
      : '';
    const msg = `SignalTrue alert – Team ${team.name}'s ${event.metric} ${event.direction === 'negative' ? '↓' : '↑'} ${Math.round(event.magnitude)}% this week.\n\nTop contributors: ${contributors}\n\n💡 Recommendation: ${event.recommendation}\n\n[Acknowledge alert]`;
    // Slack DM
    if (slackClient && org.integrations?.slack?.botUserId) {
      try {
        await slackClient.chat.postMessage({ 
          channel: org.integrations.slack.botUserId, 
          text: msg,
          blocks: [
            { type: 'section', text: { type: 'mrkdwn', text: msg } },
            { type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: 'Acknowledge' }, action_id: `ack_${event._id}` }] }
          ]
        });
      } catch (e) {
        console.error('Slack alert send error:', e.message);
      }
    }
    // Email
    if (emailTransporter && org.email) {
      try {
        await emailTransporter.sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to: org.email, subject: 'SignalTrue Drift Alert', text: msg, html: `<p>${msg.replace(/\n/g,'<br>')}</p>` });
      } catch (e) {
        console.error('Email alert send error:', e.message);
      }
    }
    event.acknowledged = true;
    await event.save();
  }
}

export default { sendDriftAlerts };
