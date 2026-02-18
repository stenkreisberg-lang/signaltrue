import express from 'express';
import { Resend } from 'resend';
import Lead from '../models/lead.js';

const router = express.Router();

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
const CALENDAR_LINK = process.env.CALENDAR_LINK || 'https://calendly.com/sten-kreisberg-signaltrue/30min';

/**
 * Extract first name from full name
 */
function extractFirstName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

/**
 * Generate Estonian thank-you email with insights about meeting overload
 */
function generateClientEmailHTML(lead) {
  const firstName = extractFirstName(lead.name);
  const greeting = firstName ? `Tere, ${firstName}!` : 'Tere!';
  
  return `
<!DOCTYPE html>
<html lang="et">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Täname registreerimise eest</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 3px solid #3b82f6;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">SignalTrue</h1>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">Käitumuslik varajane hoiatussüsteem</p>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #1e293b; font-size: 18px; line-height: 1.6; margin: 0 0 24px; font-weight: 600;">
                ${greeting}
              </p>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                Täname, et registreerusid EHRS Summit 2026 kaudu strateegilisele ülevaatele! Võtame sinuga peagi ühendust, et leppida kokku 15-minutiline kohtumine.
              </p>
              
              <!-- Insight Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0; background-color: #f1f5f9; border-radius: 12px; border-left: 4px solid #3b82f6;">
                <tr>
                  <td style="padding: 24px;">
                    <p style="color: #1e293b; font-size: 15px; font-weight: 700; margin: 0 0 12px;">
                      💡 Kas teadsid?
                    </p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.7; margin: 0 0 16px;">
                      <strong>Koosolekute ülekoormus</strong> on üks peamisi põhjuseid, miks töötajad tunnevad end kurnatuna, isegi kui nad ise seda ei teadvusta.
                    </p>
                    <ul style="color: #475569; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li style="margin-bottom: 8px;">Keskmine teadmustöötaja veedab <strong>23 tundi nädalas</strong> koosolekutel</li>
                      <li style="margin-bottom: 8px;"><strong>71%</strong> juhtidest peab koosolekuid ebaproduktiivseks</li>
                      <li style="margin-bottom: 8px;">Iga katkestus vajab keskmiselt <strong>23 minutit</strong> taastumiseks</li>
                      <li>Back-to-back koosolekud vähendavad otsustusvõimet kuni <strong>40%</strong></li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 24px;">
                SignalTrue aitab sul näha neid mustreid <strong>enne</strong>, kui need muutuvad probleemideks – ilma küsitlusi täitmata ja ilma töötajate privaatsust rikkumata.
              </p>
              
              <!-- What We'll Discuss -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                <tr>
                  <td style="padding: 24px; background-color: #fefce8; border-radius: 12px; border: 1px solid #fef08a;">
                    <p style="color: #854d0e; font-size: 15px; font-weight: 700; margin: 0 0 12px;">
                      🎯 Mida ülevaates arutame:
                    </p>
                    <ul style="color: #713f12; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li style="margin-bottom: 6px;">Kuidas SignalTrue töötab sinu organisatsiooni kontekstis</li>
                      <li style="margin-bottom: 6px;">Millised käitumuslikud mustrid võivad olla riskitegurid</li>
                      <li>Kuidas alustada ilma IT-projektita</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="color: #475569; font-size: 16px; line-height: 1.7; margin: 0 0 32px;">
                Kui soovid juba varem aja broneerida, saad seda teha siin:
              </p>
              
              <p style="margin: 0 0 32px;">
                <a href="${CALENDAR_LINK}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">Broneeri aeg →</a>
              </p>
              
              <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 32px 0 0; padding-top: 24px; border-top: 1px solid #e2e8f0;">
                Parimate soovidega,<br>
                <strong style="color: #1e293b;">SignalTrue meeskond</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0; text-align: center;">
                © 2026 SignalTrue OÜ. Kõik õigused kaitstud.<br>
                <a href="${FRONTEND_URL}/app/privacy" style="color: #64748b; text-decoration: underline;">Privaatsuspoliitika</a>
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
}

/**
 * Generate internal notification email for the sales team
 */
function generateInternalNotificationHTML(lead) {
  const challengeSection = lead.challenge 
    ? `<p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 16px 0 0;"><strong>Peamine väljakutse:</strong><br>${lead.challenge}</p>` 
    : '';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead: ${lead.source}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px; background-color: #10b981; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">🎯 New Lead from ${lead.source}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="color: #1e293b; font-size: 14px; line-height: 1.8; margin: 0;">
                      <strong>Nimi:</strong> ${lead.name}<br>
                      <strong>Ametinimetus:</strong> ${lead.title || 'Pole määratud'}<br>
                      <strong>Organisatsioon:</strong> ${lead.organization || 'Pole määratud'}<br>
                      <strong>E-post:</strong> <a href="mailto:${lead.email}" style="color: #3b82f6;">${lead.email}</a><br>
                      <strong>Allikas:</strong> ${lead.source}<br>
                      <strong>Kuupäev:</strong> ${new Date().toLocaleString('et-EE', { timeZone: 'Europe/Tallinn' })}
                    </p>
                    ${challengeSection}
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; text-align: center;">
                <a href="mailto:${lead.email}?subject=SignalTrue%20-%20Strateegiline%20%C3%BClevaade&body=Tere%20${encodeURIComponent(extractFirstName(lead.name))}%2C%0A%0AT%C3%A4name%2C%20et%20huvi%20tundsid!%20..." style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">Reply to Lead →</a>
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
}

/**
 * POST /api/leads
 * Create a new lead and send emails
 */
router.post('/', async (req, res) => {
  try {
    const { name, title, organization, email, challenge, source, tag, timestamp } = req.body;
    
    // Validate required fields
    if (!name || !email || !source) {
      return res.status(400).json({ 
        message: 'Missing required fields: name, email, and source are required' 
      });
    }
    
    // Create lead record
    const lead = new Lead({
      name,
      title,
      organization,
      email,
      challenge,
      source,
      tag,
      submittedAt: timestamp ? new Date(timestamp) : new Date()
    });
    
    await lead.save();
    console.log(`✅ Lead saved: ${email} from ${source}`);
    
    // Send emails
    const resend = getResendClient();
    
    if (resend) {
      // 1. Send thank-you email to client (Estonian)
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: email,
          subject: 'Täname registreerimise eest – SignalTrue',
          html: generateClientEmailHTML(lead)
        });
        lead.clientEmailSent = true;
        console.log(`✅ Client email sent to: ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send client email:', emailError);
      }
      
      // 2. Send internal notification
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: INTERNAL_NOTIFICATION_EMAIL,
          subject: `🎯 New Lead: ${name} (${organization || 'Unknown org'}) – ${source}`,
          html: generateInternalNotificationHTML(lead)
        });
        lead.internalNotificationSent = true;
        console.log(`✅ Internal notification sent to: ${INTERNAL_NOTIFICATION_EMAIL}`);
      } catch (emailError) {
        console.error('❌ Failed to send internal notification:', emailError);
      }
      
      // Update lead with email status
      await lead.save();
    } else {
      console.warn('⚠️ RESEND_API_KEY not configured – emails not sent');
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Lead captured successfully',
      leadId: lead._id
    });
    
  } catch (error) {
    console.error('❌ Lead submission error:', error);
    res.status(500).json({ message: error.message || 'Failed to capture lead' });
  }
});

/**
 * GET /api/leads
 * List all leads (admin only - add auth middleware in production)
 */
router.get('/', async (req, res) => {
  try {
    const { source, limit = 50 } = req.query;
    
    const query = source ? { source } : {};
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(leads);
  } catch (error) {
    console.error('❌ Error fetching leads:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
