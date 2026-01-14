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

/**
 * Format currency for email
 */
function formatCurrency(value) {
  if (value >= 1000000) {
    return `€${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `€${Math.round(value / 1000)}K`;
  }
  return `€${Math.round(value).toLocaleString()}`;
}

/**
 * Send assessment results email to the user
 */
export async function sendAssessmentResultsEmail(email, result, inputs) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('⚠️ Resend not configured. Skipping user results email.');
    return { success: false, reason: 'resend_not_configured' };
  }

  const riskLevel = result.riskScore?.level || 'unknown';
  const riskScore = result.riskScore?.total || 0;
  const costLow = formatCurrency(result.costBreakdown?.totalCostLow || 0);
  const costHigh = formatCurrency(result.costBreakdown?.totalCostHigh || 0);
  const teamSize = inputs.company?.teamSize || 0;

  const riskColors = {
    low: '#22c55e',
    emerging: '#f59e0b', 
    high: '#ef4444'
  };

  const riskLabels = {
    low: 'Low Risk',
    emerging: 'Emerging Risk',
    high: 'High Risk'
  };

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your SignalTrue Workload Assessment Results - ${riskLabels[riskLevel] || 'Assessment Complete'}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 0; background-color: #f5f5f7;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; margin: 0; font-size: 24px;">SignalTrue</h1>
      <p style="color: #64748b; margin-top: 8px;">Workload Assessment Results</p>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      
      <!-- Risk Score -->
      <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; margin-bottom: 24px;">
        <div style="display: inline-block; padding: 8px 16px; background: ${riskColors[riskLevel] || '#6366f1'}20; border-radius: 20px; margin-bottom: 12px;">
          <span style="color: ${riskColors[riskLevel] || '#6366f1'}; font-weight: 600;">${riskLabels[riskLevel] || 'Assessment Complete'}</span>
        </div>
        <div style="font-size: 48px; font-weight: 700; color: #1a1a2e;">${riskScore}<span style="font-size: 24px; color: #64748b;">/100</span></div>
        <p style="color: #64748b; margin: 8px 0 0 0;">Workload Risk Index</p>
      </div>

      <!-- Cost Estimate -->
      <div style="text-align: center; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
        <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px;">Estimated Annual Cost Exposure</p>
        <p style="font-size: 28px; font-weight: 700; color: #1a1a2e; margin: 0;">${costLow} – ${costHigh}</p>
        <p style="color: #64748b; margin: 8px 0 0 0; font-size: 12px;">Based on ${teamSize} team members</p>
      </div>

      <!-- Key Insights -->
      ${result.insights && result.insights.length > 0 ? `
      <div style="margin-bottom: 24px;">
        <h3 style="color: #1a1a2e; margin: 0 0 12px 0; font-size: 16px;">Key Insights</h3>
        <ul style="margin: 0; padding-left: 20px; color: #475569;">
          ${result.insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('')}
        </ul>
      </div>
      ` : ''}

      <!-- Assumptions -->
      <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #64748b; margin: 0 0 8px 0; font-size: 12px; font-weight: 600;">ASSUMPTIONS USED</p>
        <div style="font-size: 13px; color: #475569;">
          <p style="margin: 4px 0;">Salary: €${(inputs.company?.averageSalary || 0).toLocaleString()} • Overhead: ${inputs.company?.overheadMultiplier || 1.3}x</p>
          <p style="margin: 4px 0;">Meeting Waste: ${((result.assumptions?.meetingWastePercent || 0.25) * 100).toFixed(0)}% • Attrition: ${inputs.retention?.attritionPercent || 10}%</p>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center;">
        <p style="color: #475569; margin-bottom: 16px;">Want to replace these estimates with real data?</p>
        <a href="https://signaltrue.ai/register" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">Get a Demo</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #94a3b8; font-size: 12px;">
      <p>SignalTrue measures metadata only. No message content is ever read.</p>
      <p>All insights are team-level (minimum 5 people).</p>
      <p style="margin-top: 16px;">
        <a href="https://signaltrue.ai" style="color: #6366f1; text-decoration: none;">signaltrue.ai</a>
      </p>
    </div>
  </div>
</body>
</html>
      `
    });

    console.log(`[Assessment Email] Results sent to: ${email}`);
    return { success: true };

  } catch (error) {
    console.error('[Assessment Email] Failed to send results:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send internal notification about new assessment lead
 */
export async function sendAssessmentLeadNotification(email, result, inputs) {
  const resend = getResendClient();
  
  if (!resend) {
    console.log('⚠️ Resend not configured. Skipping internal notification.');
    return { success: false, reason: 'resend_not_configured' };
  }

  const riskLevel = result.riskScore?.level || 'unknown';
  const riskScore = result.riskScore?.total || 0;
  const costLow = formatCurrency(result.costBreakdown?.totalCostLow || 0);
  const costHigh = formatCurrency(result.costBreakdown?.totalCostHigh || 0);
  const teamSize = inputs.company?.teamSize || 0;
  const meetingHours = inputs.workload?.meetingHoursPerWeek || 0;
  const afterHours = inputs.workload?.afterHoursPerWeek || 0;

  const riskLabels = {
    low: '🟢 Low Risk',
    emerging: '🟡 Emerging Risk',
    high: '🔴 High Risk'
  };

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: INTERNAL_NOTIFICATION_EMAIL,
      subject: `🎯 New Assessment Lead: ${email} (${riskLabels[riskLevel] || riskLevel})`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; margin: 0; padding: 20px;">
  <h2 style="color: #6366f1; margin-top: 0;">New Assessment Lead</h2>
  
  <table style="border-collapse: collapse; width: 100%; max-width: 500px;">
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Email</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><a href="mailto:${email}">${email}</a></td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Risk Level</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${riskLabels[riskLevel] || riskLevel} (${riskScore}/100)</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Cost Exposure</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${costLow} – ${costHigh} / year</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Team Size</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${teamSize} people</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Meeting Hours</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${meetingHours}h / week per person</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">After-Hours Work</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${afterHours}h / week per person</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Back-to-Back</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${inputs.workload?.backToBackFrequency || 'N/A'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 0; font-weight: 600;">Attrition Rate</td>
      <td style="padding: 8px 0;">${inputs.retention?.attritionPercent || 10}%</td>
    </tr>
  </table>

  ${result.insights && result.insights.length > 0 ? `
  <h3 style="margin-top: 24px;">Key Insights</h3>
  <ul>
    ${result.insights.map(insight => `<li>${insight}</li>`).join('')}
  </ul>
  ` : ''}

  <p style="margin-top: 24px; color: #64748b; font-size: 12px;">
    Submitted at: ${new Date().toISOString()}
  </p>
</body>
</html>
      `
    });

    console.log(`[Assessment Email] Lead notification sent for: ${email}`);
    return { success: true };

  } catch (error) {
    console.error('[Assessment Email] Failed to send lead notification:', error);
    return { success: false, error: error.message };
  }
}
