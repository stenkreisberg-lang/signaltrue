import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://signaltrue:123signaltrue@cluster0.4olk5ma.mongodb.net/signaltrue?retryWrites=true&w=majority';

// Configure email - try multiple providers
let transporter = null;

if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  // Production SMTP
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  console.log('Using SMTP:', process.env.EMAIL_HOST);
} else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  // Gmail fallback
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });
  console.log('Using Gmail');
}

async function generateAndSendReports() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const orgId = new mongoose.Types.ObjectId('693bff1d7182d336060c8629');
    const teamId = new mongoose.Types.ObjectId('693bff1d7182d336060c862b');

    // Get team states
    const teamStates = await mongoose.connection.db.collection('teamstates')
      .find({ teamId })
      .sort({ weekEnd: 1 })
      .toArray();

    if (teamStates.length === 0) {
      console.log('No TeamState data found');
      return;
    }

    // Get org info
    const org = await mongoose.connection.db.collection('organizations').findOne({ _id: orgId });
    const team = await mongoose.connection.db.collection('teams').findOne({ _id: teamId });
    const recipientEmail = org.settings?.reportEmail || 'sten.kreisberg@signaltrue.ai';

    console.log(`Generating reports for ${teamStates.length} weeks...`);
    console.log(`Recipient: ${recipientEmail}`);

    // Generate report for each week
    for (let i = 0; i < teamStates.length; i++) {
      const state = teamStates[i];
      const prevState = i > 0 ? teamStates[i - 1] : null;
      const weekNum = i + 1;
      const weekEndDate = new Date(state.weekEnd).toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      });

      // Calculate changes
      const bdiChange = prevState ? state.bdi - prevState.bdi : 0;
      const bdiChangeText = bdiChange > 0 ? `+${bdiChange}` : bdiChange.toString();
      const bdiTrend = bdiChange >= 0 ? '↑' : '↓';
      const zoneColor = state.zone === 'Stable' ? '#22c55e' : 
                        state.zone === 'Watch' ? '#f59e0b' : '#ef4444';

      // Build HTML email
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
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
    .insights li { margin-bottom: 8px; }
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
      <p>Week ${weekNum} • ${team?.name || 'General'} Team • ${weekEndDate}</p>
    </div>
    
    <div class="content">
      <div class="bdi-card">
        <div class="bdi-score">${state.bdi}</div>
        <div class="bdi-label">Behavioral Drift Index (BDI)</div>
        <div class="zone-badge" style="background: ${zoneColor}20; color: ${zoneColor};">
          ${state.zone} Zone
        </div>
        ${prevState ? `
        <div class="change ${bdiChange >= 0 ? 'positive' : 'negative'}">
          ${bdiTrend} ${bdiChangeText} from last week
        </div>
        ` : ''}
      </div>

      <h3 style="color: #1e293b; margin-bottom: 16px;">📈 Signal Breakdown</h3>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${state.signals?.communication?.score || '-'}</div>
          <div class="metric-label">Communication</div>
        </div>
        <div class="metric">
          <div class="metric-value">${state.signals?.engagement?.score || '-'}</div>
          <div class="metric-label">Engagement</div>
        </div>
        <div class="metric">
          <div class="metric-value">${state.signals?.workload?.score || '-'}</div>
          <div class="metric-label">Workload</div>
        </div>
        <div class="metric">
          <div class="metric-value">${state.signals?.collaboration?.score || '-'}</div>
          <div class="metric-label">Collaboration</div>
        </div>
      </div>

      <h3 style="color: #1e293b; margin-bottom: 16px;">📊 Activity Metrics</h3>
      <div class="metrics">
        <div class="metric">
          <div class="metric-value">${state.metrics?.messageCount || 0}</div>
          <div class="metric-label">Messages</div>
        </div>
        <div class="metric">
          <div class="metric-value">${state.metrics?.meetingHours?.toFixed(1) || 0}h</div>
          <div class="metric-label">Meeting Hours</div>
        </div>
        <div class="metric">
          <div class="metric-value">${state.metrics?.afterHoursActivity || 0}%</div>
          <div class="metric-label">After Hours</div>
        </div>
        <div class="metric">
          <div class="metric-value">${state.metrics?.responseTime || 0}m</div>
          <div class="metric-label">Avg Response</div>
        </div>
      </div>

      ${state.insights && state.insights.length > 0 ? `
      <div class="insights">
        <h3>💡 Key Insights</h3>
        <ul>
          ${state.insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>This report was generated by SignalTrue</p>
      <p>© 2026 SignalTrue • Behavioral Intelligence for HR</p>
    </div>
  </div>
</body>
</html>
      `;

      // Save report to database
      const report = {
        orgId,
        teamId,
        type: 'weekly',
        weekNumber: weekNum,
        periodEnd: state.weekEnd,
        bdi: state.bdi,
        zone: state.zone,
        data: state,
        generatedAt: new Date(),
        sentTo: recipientEmail
      };
      
      await mongoose.connection.db.collection('reports').insertOne(report);
      console.log(`✓ Week ${weekNum} report saved to database`);

      // Send email
      if (transporter) {
        const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@signaltrue.ai';
        await transporter.sendMail({
          from: `"SignalTrue" <${fromEmail}>`,
          to: recipientEmail,
          subject: `📊 SignalTrue Weekly Report - Week ${weekNum} (${team?.name || 'General'} Team)`,
          html
        });
        console.log(`✓ Week ${weekNum} report sent to ${recipientEmail}`);
      } else {
        console.log(`⚠ Email not configured - report saved but not sent`);
        console.log(`  Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env`);
        console.log(`  Or set GMAIL_USER, GMAIL_APP_PASSWORD for Gmail`);
      }
    }

    console.log('\n✅ All reports generated successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

generateAndSendReports();
