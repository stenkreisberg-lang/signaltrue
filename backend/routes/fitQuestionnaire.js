import express from 'express';
import { Resend } from 'resend';

const router = express.Router();

// Resend client for fit questionnaire emails
const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

// Question data for email summary
const questions = [
  { id: 1, text: "How many employees does your company have?" },
  { id: 2, text: "How are your teams structured?" },
  { id: 3, text: "How do most people work?" },
  { id: 4, text: "Where does daily collaboration mainly happen?" },
  { id: 5, text: "How would you describe your current meeting culture?" },
  { id: 6, text: "How early can you detect burnout risk today?" },
  { id: 7, text: "How often are you surprised by attrition?" },
  { id: 8, text: "How confident are you that workload is fairly distributed?" },
  { id: 9, text: "Is your HR work more reactive or preventive?" },
  { id: 10, text: "How involved is leadership in people health early?" },
];

// Tier configurations
const tierConfig = {
  'strong-fit': {
    label: 'Strong Fit',
    color: '#22c55e',
    bgColor: '#dcfce7',
    summary: 'SignalTrue is designed exactly for organizations like yours.',
    recommendations: [
      'Your team structure and collaboration patterns are ideal for SignalTrue\'s team-level analytics.',
      'You\'ll benefit most from our early-warning signals for burnout and attrition risk.',
      'Consider starting with a focused pilot on 2-3 teams to see immediate value.',
    ],
  },
  'good-fit': {
    label: 'Good Fit',
    color: '#6366f1',
    bgColor: '#e0e7ff',
    summary: 'SignalTrue can help you catch team health risks before they turn costly.',
    recommendations: [
      'Your organization has the right conditions to benefit from proactive people analytics.',
      'Focus on teams showing early signs of meeting overload or after-hours work.',
      'Use our benchmarks to prioritize which teams need support first.',
    ],
  },
  'not-yet-fit': {
    label: 'Not Yet a Fit',
    color: '#f59e0b',
    bgColor: '#fef3c7',
    summary: 'Based on your current setup, SignalTrue may not be the right solution yet.',
    recommendations: [
      'As your organization grows, team-level visibility becomes more critical.',
      'Consider SignalTrue once you have multiple teams using Slack or Google Chat.',
      'We\'d love to stay in touch and help when the timing is right.',
    ],
  },
};

// Generate branded HTML email for user
const generateUserEmail = (submission) => {
  const config = tierConfig[submission.tier] || tierConfig['good-fit'];
  
  const answersHtml = submission.answers.map((answer) => {
    const question = questions.find(q => q.id === answer.questionId);
    return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #374151;">
          ${question?.text || `Question ${answer.questionId}`}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #6366f1; font-weight: 600;">
          ${answer.value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </td>
      </tr>
    `;
  }).join('');

  const recommendationsHtml = config.recommendations.map(rec => 
    `<li style="margin-bottom: 8px; color: #374151;">${rec}</li>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your SignalTrue Fit Assessment Results</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1, #a855f7); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                📊 Your Fit Assessment Results
              </h1>
              <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                SignalTrue Organization Fit Analysis
              </p>
            </td>
          </tr>

          <!-- Score Badge -->
          <tr>
            <td style="padding: 40px 32px 24px; text-align: center;">
              <div style="display: inline-block; background-color: ${config.bgColor}; border: 2px solid ${config.color}; border-radius: 12px; padding: 24px 48px;">
                <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                  Your Score
                </p>
                <p style="margin: 0 0 8px; color: ${config.color}; font-size: 48px; font-weight: 700;">
                  ${submission.score}
                </p>
                <p style="margin: 0; color: ${config.color}; font-size: 20px; font-weight: 600;">
                  ${config.label}
                </p>
              </div>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <p style="margin: 0; color: #374151; font-size: 18px; text-align: center; line-height: 1.7;">
                ${config.summary}
              </p>
            </td>
          </tr>

          <!-- Recommendations -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                Our Recommendations
              </h2>
              <ul style="margin: 0; padding-left: 24px; list-style-type: disc;">
                ${recommendationsHtml}
              </ul>
            </td>
          </tr>

          <!-- Answer Breakdown -->
          <tr>
            <td style="padding: 0 32px 32px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 20px; font-weight: 600;">
                Your Responses
              </h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px;">Question</th>
                    <th style="padding: 12px 16px; text-align: left; color: #6b7280; font-weight: 600; font-size: 14px;">Your Answer</th>
                  </tr>
                </thead>
                <tbody>
                  ${answersHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 40px; text-align: center;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://www.signaltrue.ai/register" style="height:50px;v-text-anchor:middle;width:280px;" arcsize="16%" strokecolor="#6366f1" fillcolor="#6366f1">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Request a Personalized Demo</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="https://www.signaltrue.ai/register" target="_blank" style="display: inline-block; background-color: #6366f1; background-image: linear-gradient(135deg, #6366f1, #a855f7); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; mso-hide: all;">
                Request a Personalized Demo
              </a>
              <!--<![endif]-->
              <p style="margin: 16px 0 0; color: #6b7280; font-size: 14px;">
                See how SignalTrue can work for your organization
              </p>
              <p style="margin: 12px 0 0; color: #9ca3af; font-size: 12px;">
                Or copy this link: <a href="https://www.signaltrue.ai/register" style="color: #6366f1;">https://www.signaltrue.ai/register</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                © ${new Date().getFullYear()} SignalTrue. All rights reserved.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You received this email because you completed a fit assessment on signaltrue.ai.<br>
                <a href="https://signaltrue.ai/unsubscribe" style="color: #6366f1;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Generate internal notification email
const generateInternalEmail = (submission) => {
  const config = tierConfig[submission.tier] || tierConfig['good-fit'];
  
  const answersText = submission.answers.map((answer) => {
    const question = questions.find(q => q.id === answer.questionId);
    return `  - Q${answer.questionId}: ${question?.text || ''}\n    Answer: ${answer.value}`;
  }).join('\n');

  return `
New SignalTrue Fit Assessment Submission

Email: ${submission.email}
Score: ${submission.score}/30
Tier: ${config.label}
Consent Given: ${submission.consentGiven ? 'Yes' : 'No'}
Submitted: ${new Date().toISOString()}

Answers:
${answersText}

---
This is an automated notification from the SignalTrue Fit Assessment system.
  `.trim();
};

/**
 * POST /api/fit-questionnaire/submit
 * Submit questionnaire results and send emails
 */
router.post('/submit', async (req, res) => {
  try {
    const { email, score, tier, answers, consentGiven } = req.body;

    // Validate required fields
    if (!email || !score || !tier || !answers) {
      return res.status(400).json({ 
        message: 'Missing required fields: email, score, tier, answers' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate tier
    if (!['strong-fit', 'good-fit', 'not-yet-fit'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid tier value' });
    }

    // Validate score range
    if (score < 10 || score > 30) {
      return res.status(400).json({ message: 'Score must be between 10 and 30' });
    }

    const submission = { email, score, tier, answers, consentGiven };

    // Get Resend client
    const resend = getResendClient();

    if (resend) {
      // Send branded email to user
      // Use signaltrue.ai domain (verified in Resend)
      const fromEmail = 'SignalTrue <notifications@signaltrue.ai>';
      
      try {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: `📊 Your SignalTrue Fit Assessment: ${tierConfig[tier]?.label || 'Results'}`,
          html: generateUserEmail(submission),
        });
        console.log(`✓ Fit assessment email sent to ${email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send user email:`, emailError.message);
        // Continue - don't fail the request
      }

      // Send internal notification
      try {
        await resend.emails.send({
          from: fromEmail,
          to: 'sten.kreisberg@signaltrue.ai',
          subject: `New SignalTrue Fit Assessment Submission`,
          html: `<pre>${generateInternalEmail(submission)}</pre>`,
        });
        console.log(`✓ Internal notification sent for ${email}`);
      } catch (notifyError) {
        console.error(`❌ Failed to send internal notification:`, notifyError.message);
        // Continue - don't fail the request
      }
    } else {
      console.warn('⚠️  Resend not configured (RESEND_API_KEY missing), skipping email delivery');
      console.log('Fit Assessment Submission:', JSON.stringify(submission, null, 2));
    }

    res.status(200).json({ 
      success: true,
      message: 'Assessment submitted successfully' 
    });

  } catch (error) {
    console.error('❌ Fit questionnaire submission error:', error.message);
    res.status(500).json({ message: 'Failed to submit assessment' });
  }
});

export default router;
