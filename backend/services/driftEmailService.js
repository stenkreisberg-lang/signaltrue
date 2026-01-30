import { Resend } from 'resend';

// Initialize Resend client
const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

const FROM_EMAIL = process.env.EMAIL_FROM || 'SignalTrue <notifications@signaltrue.ai>';
const INTERNAL_NOTIFICATION_EMAIL = 'sten.kreisberg@signaltrue.ai';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://signaltrue.ai';
const CALENDAR_LINK = process.env.CALENDAR_LINK || 'https://calendly.com/signaltrue/drift-review';

/**
 * Get first name from email (best effort)
 */
function extractFirstName(email) {
  if (!email) return '';
  const localPart = email.split('@')[0];
  // Try to extract first name from common patterns
  const parts = localPart.split(/[._-]/);
  if (parts.length > 0) {
    const name = parts[0];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
  return '';
}

/**
 * Get category color for styling
 */
function getCategoryColor(category) {
  switch (category) {
    case 'Critical Drift': return '#ff6b6b';
    case 'Active Drift': return '#ffa726';
    case 'Early Drift': return '#ffca28';
    case 'Stable': return '#66bb6a';
    default: return '#9e9e9e';
  }
}

/**
 * Generate HTML email template for drift report
 */
function generateReportEmailHTML(session) {
  const firstName = extractFirstName(session.email);
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const { score } = session;
  const reportLink = `${FRONTEND_URL}/drift-report/${session.sessionId}`;
  const categoryColor = getCategoryColor(score.category);
  
  const findingsHTML = score.findings.slice(0, 5).map(f => 
    `<li style="margin-bottom: 8px; color: #555;">${f}</li>`
  ).join('');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Behavioral Drift Report</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f1620; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <h1 style="margin: 0; color: #eaf0f7; font-size: 24px; font-weight: 700;">SignalTrue</h1>
              <p style="margin: 8px 0 0; color: #a9b6c6; font-size: 14px;">Behavioral Drift Diagnostic</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #eaf0f7; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                ${greeting}
              </p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                Here's your Behavioral Drift Report:
              </p>
              
              <p style="margin: 0 0 32px;">
                <a href="${reportLink}" style="display: inline-block; background-color: #ffffff; color: #0b0f14; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 16px;">View Full Report →</a>
              </p>
              
              <!-- Score Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                <tr>
                  <td width="48%" style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 36px; font-weight: 800; color: #eaf0f7; margin-bottom: 4px;">${score.totalScore}</div>
                    <div style="font-size: 12px; color: #a9b6c6;">Drift Score (0-100)</div>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="font-size: 24px; font-weight: 800; color: ${categoryColor}; margin-bottom: 4px;">${score.category}</div>
                    <div style="font-size: 12px; color: #a9b6c6;">Category</div>
                  </td>
                </tr>
              </table>
              
              <!-- Key Findings -->
              <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                <h3 style="margin: 0 0 16px; color: #eaf0f7; font-size: 16px; font-weight: 600;">Key Findings</h3>
                <ul style="margin: 0; padding-left: 20px; color: #a9b6c6; font-size: 14px; line-height: 1.6;">
                  ${findingsHTML}
                </ul>
              </div>
              
              <!-- What This Means -->
              <h3 style="margin: 0 0 16px; color: #eaf0f7; font-size: 16px; font-weight: 600;">A quick read on what this score means:</h3>
              <ul style="margin: 0 0 32px; padding-left: 20px; color: #a9b6c6; font-size: 14px; line-height: 1.8;">
                <li>It's a <strong style="color: #eaf0f7;">system-level risk profile</strong>, not a judgment of people.</li>
                <li>It reflects patterns that often show up <strong style="color: #eaf0f7;">before engagement surveys or exit interviews</strong>.</li>
                <li>The goal is prevention. You want to intervene while the system is still recoverable.</li>
              </ul>
              
              <!-- CTA: Baseline Calibration -->
              <div style="background-color: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <p style="color: #eaf0f7; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                  If you want to validate this with real behavioral signals, SignalTrue can run a <strong>30-day baseline calibration</strong> (team-level, metadata only, no surveillance).
                </p>
                <a href="${FRONTEND_URL}/product" style="display: inline-block; background-color: transparent; color: #eaf0f7; text-decoration: none; padding: 12px 20px; border-radius: 10px; font-weight: 600; font-size: 14px; border: 1px solid rgba(255,255,255,0.3);">Start Baseline Calibration →</a>
              </div>
              
              <!-- CTA: Book a Call -->
              <p style="color: #a9b6c6; font-size: 14px; line-height: 1.6; margin: 0;">
                If you prefer a 15-minute walkthrough of your report and what actions usually work at this stage, <a href="${CALENDAR_LINK}" style="color: #eaf0f7;">book here</a>.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.1); background-color: rgba(0,0,0,0.2);">
              <p style="margin: 0 0 8px; color: #666; font-size: 12px;">
                No personal data. No content scanning. System-level patterns only.
              </p>
              <p style="margin: 0; color: #555; font-size: 12px;">
                © ${new Date().getFullYear()} SignalTrue
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send the initial drift report email (Email #1)
 */
export async function sendDriftReportEmail(email, session) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('[Drift Email] Resend client not configured, skipping email');
    return { success: false, reason: 'No email client configured' };
  }
  
  try {
    const html = generateReportEmailHTML(session);
    const firstName = extractFirstName(email);
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Your Behavioral Drift Report (and what it means)',
      html,
      tags: [
        { name: 'category', value: 'drift-diagnostic' },
        { name: 'email_sequence', value: 'email_1' },
        { name: 'drift_category', value: session.score.category.replace(/\s+/g, '-').toLowerCase() }
      ]
    });
    
    console.log(`[Drift Email] Report email sent to ${email}: ${result.id}`);
    
    return { success: true, id: result.id };
    
  } catch (error) {
    console.error('[Drift Email] Failed to send report email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send internal notification about new drift lead
 */
export async function sendDriftLeadNotification(session) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('[Drift Email] Resend client not configured, skipping internal notification');
    return { success: false, reason: 'No email client configured' };
  }
  
  try {
    const { score, email, utm } = session;
    const emailDomain = email.split('@')[1];
    
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
  <h2>🎯 New Drift Diagnostic Lead</h2>
  
  <table style="border-collapse: collapse; margin: 20px 0;">
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">Email:</td>
      <td style="padding: 8px 0;">${email}</td>
    </tr>
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">Company Domain:</td>
      <td style="padding: 8px 0;">${emailDomain}</td>
    </tr>
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">Drift Score:</td>
      <td style="padding: 8px 0;"><strong>${score.totalScore}</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">Category:</td>
      <td style="padding: 8px 0;"><strong style="color: ${getCategoryColor(score.category)};">${score.category}</strong></td>
    </tr>
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">Company Size:</td>
      <td style="padding: 8px 0;">${session.answers.company_size || 'N/A'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">Work Mode:</td>
      <td style="padding: 8px 0;">${session.answers.work_mode || 'N/A'}</td>
    </tr>
    ${utm?.utm_source ? `
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">UTM Source:</td>
      <td style="padding: 8px 0;">${utm.utm_source}</td>
    </tr>` : ''}
    ${utm?.utm_campaign ? `
    <tr>
      <td style="padding: 8px 16px 8px 0; color: #666; font-weight: 600;">UTM Campaign:</td>
      <td style="padding: 8px 0;">${utm.utm_campaign}</td>
    </tr>` : ''}
  </table>
  
  <h3>Key Findings:</h3>
  <ul>
    ${score.findings.map(f => `<li>${f}</li>`).join('')}
  </ul>
  
  <p style="color: #666; font-size: 12px; margin-top: 30px;">
    Session ID: ${session.sessionId}<br>
    Created: ${new Date(session.createdAt).toLocaleString()}
  </p>
</body>
</html>`;
    
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: INTERNAL_NOTIFICATION_EMAIL,
      subject: `[Drift Lead] ${email} - ${score.category} (${score.totalScore})`,
      html
    });
    
    console.log(`[Drift Email] Internal notification sent: ${result.id}`);
    
    return { success: true, id: result.id };
    
  } catch (error) {
    console.error('[Drift Email] Failed to send internal notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Email #2 - Day 2: Why surveys miss drift
 */
export function generateEmail2HTML(session) {
  const firstName = extractFirstName(session.email);
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const reportLink = `${FRONTEND_URL}/drift-report/${session.sessionId}`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0b0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f1620; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td style="padding: 40px;">
              <p style="color: #eaf0f7; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${greeting}</p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
                Surveys ask people to interpret their own condition.<br>
                <strong style="color: #eaf0f7;">That's the problem.</strong>
              </p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                Before people can even name the issue, behavior changes start showing up in the system:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #a9b6c6; font-size: 15px; line-height: 2;">
                <li>Meeting creep replaces focus time</li>
                <li>Response pressure becomes constant interruptions</li>
                <li>Recovery gaps disappear, but effort stays high</li>
              </ul>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
                That's why surveys often look "fine" right before performance and retention drop.
              </p>
              
              <p style="margin: 0 0 16px;">
                <a href="${reportLink}" style="color: #eaf0f7; text-decoration: underline;">Your report again →</a>
              </p>
              
              <p style="color: #a9b6c6; font-size: 14px; line-height: 1.6; margin: 0;">
                If you want to see this as leading indicators, not opinions, baseline calibration is here:<br>
                <a href="${FRONTEND_URL}/product" style="color: #eaf0f7; text-decoration: underline;">${FRONTEND_URL}/product</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #555; font-size: 12px;">© ${new Date().getFullYear()} SignalTrue</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email #3 - Day 5: Coordination breaks first
 */
export function generateEmail3HTML(session) {
  const firstName = extractFirstName(session.email);
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const reportLink = `${FRONTEND_URL}/drift-report/${session.sessionId}`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0b0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f1620; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td style="padding: 40px;">
              <p style="color: #eaf0f7; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${greeting}</p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
                Teams rarely "stop caring" overnight.<br>
                What usually happens first is simpler and uglier:<br>
                <strong style="color: #eaf0f7;">coordination becomes invisible.</strong>
              </p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                When coordination is invisible, leaders compensate with:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #a9b6c6; font-size: 15px; line-height: 2;">
                <li>more meetings</li>
                <li>faster response expectations</li>
                <li>more escalations</li>
              </ul>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
                That creates drift. Then burnout. Then attrition.
              </p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                SignalTrue is built around <strong style="color: #eaf0f7;">baseline-relative signals</strong>. It flags meaningful shifts versus each team's normal.
              </p>
              
              <p style="margin: 0 0 16px;">
                <a href="${reportLink}" style="color: #eaf0f7; text-decoration: underline;">Report link →</a>
              </p>
              
              <p style="color: #a9b6c6; font-size: 14px; line-height: 1.6; margin: 0;">
                If you want to validate patterns with your real data in 30 days:<br>
                <a href="${FRONTEND_URL}/product" style="color: #eaf0f7; text-decoration: underline;">${FRONTEND_URL}/product</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #555; font-size: 12px;">© ${new Date().getFullYear()} SignalTrue</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email #4 - Day 9: Reduce burnout without surveillance
 */
export function generateEmail4HTML(session) {
  const firstName = extractFirstName(session.email);
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const reportLink = `${FRONTEND_URL}/drift-report/${session.sessionId}`;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0b0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f1620; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td style="padding: 40px;">
              <p style="color: #eaf0f7; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${greeting}</p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                The fastest way to lose trust is employee monitoring.<br>
                <strong style="color: #eaf0f7;">SignalTrue is designed to avoid that trap.</strong>
              </p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
                What we do:
              </p>
              
              <ul style="margin: 0 0 24px; padding-left: 20px; color: #a9b6c6; font-size: 15px; line-height: 2;">
                <li>compute signals at team level</li>
                <li>use metadata only</li>
                <li>enforce minimum group sizes</li>
                <li>show patterns, not people</li>
              </ul>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
                So leaders can fix the system:<br>
                meeting design, recovery buffers, response norms, escalation paths.
              </p>
              
              <p style="margin: 0 0 16px;">
                <a href="${reportLink}" style="color: #eaf0f7; text-decoration: underline;">Your report →</a>
              </p>
              
              <p style="color: #a9b6c6; font-size: 14px; line-height: 1.6; margin: 0;">
                Start baseline calibration (first month free on the product flow):<br>
                <a href="${FRONTEND_URL}/product" style="color: #eaf0f7; text-decoration: underline;">${FRONTEND_URL}/product</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #555; font-size: 12px;">© ${new Date().getFullYear()} SignalTrue</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Email #5 - Day 14: Final CTA
 */
export function generateEmail5HTML(session) {
  const firstName = extractFirstName(session.email);
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0b0f14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0f14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #0f1620; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <tr>
            <td style="padding: 40px;">
              <p style="color: #eaf0f7; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${greeting}</p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                If your report showed Early Drift, Active Drift, or Critical Drift, <strong style="color: #eaf0f7;">waiting is expensive.</strong>
              </p>
              
              <p style="color: #a9b6c6; font-size: 16px; line-height: 1.7; margin: 0 0 16px;">
                A 30-day baseline calibration gives you:
              </p>
              
              <ul style="margin: 0 0 32px; padding-left: 20px; color: #a9b6c6; font-size: 15px; line-height: 2;">
                <li>a baseline per team</li>
                <li>drift detection based on change, not generic benchmarks</li>
                <li>clear signal confidence and trend direction</li>
              </ul>
              
              <p style="margin: 0 0 24px;">
                <a href="${FRONTEND_URL}/product" style="display: inline-block; background-color: #ffffff; color: #0b0f14; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 16px;">Start here →</a>
              </p>
              
              <p style="color: #a9b6c6; font-size: 14px; line-height: 1.6; margin: 0;">
                If you want an executive-ready readout, <a href="${CALENDAR_LINK}" style="color: #eaf0f7; text-decoration: underline;">book a short call</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid rgba(255,255,255,0.1);">
              <p style="margin: 0; color: #555; font-size: 12px;">© ${new Date().getFullYear()} SignalTrue</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default {
  sendDriftReportEmail,
  sendDriftLeadNotification,
  generateEmail2HTML,
  generateEmail3HTML,
  generateEmail4HTML,
  generateEmail5HTML
};
