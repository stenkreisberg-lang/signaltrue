import express from 'express';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import AssessmentSubmission from '../models/assessmentSubmission.js';
import ControlMaturityAssessment from '../models/controlMaturityAssessment.js';
import {
  sendAssessmentResultsEmail,
  sendAssessmentLeadNotification,
} from '../services/assessmentEmailService.js';

const router = express.Router();

// POST /api/assessment/submit - Submit assessment with email
router.post('/submit', async (req, res) => {
  try {
    const { email, sessionId, result, inputs, consentGiven, timestamp } = req.body;

    // Validate required fields
    if (!email || !sessionId || !result || !inputs) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, sessionId, result, inputs',
      });
    }

    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        message: 'Consent is required to submit assessment',
      });
    }

    // Create submission record
    const submission = new AssessmentSubmission({
      email,
      sessionId,
      result,
      inputs,
      consentGiven,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    await submission.save();

    // Log the submission (for internal notifications)
    console.log(
      `[Assessment] New submission: ${email} | Risk: ${result.riskScore?.level} | Cost: €${Math.round(result.costBreakdown?.totalCostLow || 0)} - €${Math.round(result.costBreakdown?.totalCostHigh || 0)}`
    );

    // Send emails (don't block response on email sending)
    Promise.all([
      sendAssessmentResultsEmail(email, result, inputs),
      sendAssessmentLeadNotification(email, result, inputs),
    ]).catch((err) => console.error('[Assessment] Email sending error:', err));

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      submissionId: submission._id,
    });
  } catch (error) {
    console.error('[Assessment] Submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit assessment',
    });
  }
});

// GET /api/assessment/stats - Get assessment statistics (admin only)
router.get('/stats', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const totalSubmissions = await AssessmentSubmission.countDocuments();
    const last7Days = await AssessmentSubmission.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });
    const last30Days = await AssessmentSubmission.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    });

    // Risk level distribution
    const riskDistribution = await AssessmentSubmission.aggregate([
      { $group: { _id: '$result.riskScore.level', count: { $sum: 1 } } },
    ]);

    // Average cost exposure
    const costStats = await AssessmentSubmission.aggregate([
      {
        $group: {
          _id: null,
          avgCostLow: { $avg: '$result.costBreakdown.totalCostLow' },
          avgCostHigh: { $avg: '$result.costBreakdown.totalCostHigh' },
          avgTeamSize: { $avg: '$inputs.company.teamSize' },
        },
      },
    ]);

    res.json({
      total: totalSubmissions,
      last7Days,
      last30Days,
      riskDistribution: riskDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      averages: costStats[0] || {},
    });
  } catch (error) {
    console.error('[Assessment] Stats error:', error);
    res.status(500).json({ message: 'Failed to get stats' });
  }
});

// GET /api/assessment/submissions - List recent submissions (admin only)
router.get('/submissions', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const submissions = await AssessmentSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('email sessionId result.riskScore inputs.company.teamSize createdAt');

    res.json({ submissions });
  } catch (error) {
    console.error('[Assessment] List error:', error);
    res.status(500).json({ message: 'Failed to list submissions' });
  }
});


const MATURITY_QUESTION_DIMENSIONS = {
  detection_1: 'detection',
  detection_2: 'detection',
  detection_3: 'detection',
  investigation_1: 'investigation',
  investigation_2: 'investigation',
  investigation_3: 'investigation',
  verification_1: 'verification',
  verification_2: 'verification',
  verification_3: 'verification',
  governance_1: 'governance',
  governance_2: 'governance',
  governance_3: 'governance',
};

const maturityCompleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const maturityClaimLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function calculateMaturity(answers = []) {
  if (!Array.isArray(answers) || answers.length !== 12) {
    throw new Error('Exactly 12 assessment answers are required.');
  }

  const seen = new Set();
  const totals = { detection: [], investigation: [], verification: [], governance: [] };
  const sanitizedAnswers = answers.map((answer) => {
    const questionId = cleanText(answer?.questionId, 80);
    const expectedDimension = MATURITY_QUESTION_DIMENSIONS[questionId];
    const value = Number(answer?.value);
    if (!expectedDimension || seen.has(questionId)) throw new Error('Invalid assessment question set.');
    if (!Number.isInteger(value) || value < 0 || value > 3) {
      throw new Error('Assessment answer values must be integers from 0 to 3.');
    }
    seen.add(questionId);
    totals[expectedDimension].push(value);
    return {
      questionId,
      dimension: expectedDimension,
      value,
      label: cleanText(answer?.label, 240) || String(value),
    };
  });

  const dimensions = Object.fromEntries(
    Object.entries(totals).map(([dimension, values]) => [
      dimension,
      Math.round((values.reduce((sum, value) => sum + value, 0) / (values.length * 3)) * 100),
    ])
  );

  const score = Math.round(
    Object.values(dimensions).reduce((sum, value) => sum + value, 0) /
      Object.values(dimensions).length
  );
  const level =
    score < 40 ? 'reactive' : score < 60 ? 'developing' : score < 80 ? 'structured' : 'continuous';
  const weakestDimension = Object.entries(dimensions).sort((a, b) => a[1] - b[1])[0][0];

  return { score, level, weakestDimension, dimensions, answers: sanitizedAnswers };
}

function maturityLevelLabel(level) {
  return {
    reactive: 'Reactive evidence',
    developing: 'Developing evidence',
    structured: 'Structured evidence',
    continuous: 'Continuous evidence',
  }[level] || 'Control evidence';
}

function maturityDimensionLabel(dimension) {
  return {
    detection: 'Detection',
    investigation: 'Investigation',
    verification: 'Control verification',
    governance: 'Governance & privacy',
  }[dimension] || dimension;
}

function getResendClient() {
  return process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
}

async function sendControlMaturityEmails(submission) {
  const resend = getResendClient();
  if (!resend || !submission.email) return;

  const from = process.env.EMAIL_FROM || 'SignalTrue <notifications@signaltrue.ai>';
  const internal = process.env.WEBSITE_LEAD_NOTIFICATION_EMAIL || 'sten.kreisberg@signaltrue.ai';
  const weakest = maturityDimensionLabel(submission.weakestDimension);
  const level = maturityLevelLabel(submission.level);
  const bookingUrl = 'https://www.signaltrue.ai/contact?intent=demo&cta=control_evidence_assessment';

  const userHtml = `<!doctype html>
<html><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#334155">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;background:white;border:1px solid #e2e8f0;border-radius:16px">
<tr><td style="padding:30px 34px;background:#0f172a;color:white;border-radius:16px 16px 0 0"><strong style="font-size:22px">SignalTrue</strong><br><span style="color:#cbd5e1">Control Evidence Maturity Assessment</span></td></tr>
<tr><td style="padding:34px">
<p style="margin-top:0">Your control-evidence maturity score is:</p>
<p style="font-size:44px;font-weight:700;color:#2563eb;margin:8px 0">${submission.score}/100</p>
<p style="font-size:18px;font-weight:700;color:#0f172a">${level}</p>
<p>Your largest evidence gap is <strong>${weakest}</strong>.</p>
<table width="100%" style="border-collapse:collapse;margin:24px 0">
<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Detection</td><td align="right">${submission.dimensions.detection}/100</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Investigation</td><td align="right">${submission.dimensions.investigation}/100</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Control verification</td><td align="right">${submission.dimensions.verification}/100</td></tr>
<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">Governance & privacy</td><td align="right">${submission.dimensions.governance}/100</td></tr>
</table>
<p>This is a maturity diagnostic, not a legal or compliance assessment. The purpose is to identify where your evidence loop is strongest and where it breaks.</p>
<p><a href="${bookingUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Review the evidence gap with SignalTrue</a></p>
</td></tr></table></td></tr></table></body></html>`;

  const internalHtml = `<h2>New Control Evidence Assessment lead</h2>
<p><strong>Email:</strong> ${escapeHtml(submission.email)}</p>
<p><strong>Organisation:</strong> ${escapeHtml(submission.organization || 'Not provided')}</p>
<p><strong>Role:</strong> ${escapeHtml(submission.role || 'Not provided')}</p>
<p><strong>Market:</strong> ${escapeHtml(submission.market)}</p>
<p><strong>Score:</strong> ${submission.score}/100 (${escapeHtml(level)})</p>
<p><strong>Weakest dimension:</strong> ${escapeHtml(weakest)}</p>
<p>Detection ${submission.dimensions.detection} · Investigation ${submission.dimensions.investigation} · Verification ${submission.dimensions.verification} · Governance ${submission.dimensions.governance}</p>`;

  await Promise.allSettled([
    resend.emails.send({
      from,
      to: submission.email,
      subject: `Your Control Evidence Maturity Score: ${submission.score}/100`,
      html: userHtml,
    }),
    resend.emails.send({
      from,
      to: internal,
      subject: `Control Evidence Assessment lead: ${submission.organization || submission.email} · ${submission.score}/100`,
      html: internalHtml,
    }),
  ]);
}

// POST /api/assessment/control-maturity/complete
// Stores benchmarkable, non-contact assessment data. No email is required.
router.post('/control-maturity/complete', maturityCompleteLimiter, async (req, res) => {
  try {
    const sessionId = cleanText(req.body?.sessionId, 255);
    if (!sessionId) return res.status(400).json({ message: 'sessionId is required.' });

    const result = calculateMaturity(req.body?.answers);
    const market = cleanText(req.body?.market, 80) || 'global';
    const sourcePath = cleanText(req.body?.sourcePath, 1024) || '/control-evidence-assessment';
    const attribution = {
      source: cleanText(req.body?.attribution?.source, 255),
      medium: cleanText(req.body?.attribution?.medium, 255),
      campaign: cleanText(req.body?.attribution?.campaign, 255),
      content: cleanText(req.body?.attribution?.content, 255),
      term: cleanText(req.body?.attribution?.term, 255),
      referrer: cleanText(req.body?.attribution?.referrer, 2048),
    };

    const submission = await ControlMaturityAssessment.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          ...result,
          market,
          sourcePath,
          attribution,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({
      success: true,
      submissionId: submission._id,
      score: submission.score,
      level: submission.level,
      weakestDimension: submission.weakestDimension,
      dimensions: submission.dimensions,
    });
  } catch (error) {
    console.error('[Control maturity] Complete error:', error);
    res.status(400).json({ message: error.message || 'Could not complete assessment.' });
  }
});

// POST /api/assessment/control-maturity/claim
// Adds contact details after the visitor has already seen the basic result.
router.post('/control-maturity/claim', maturityClaimLimiter, async (req, res) => {
  try {
    const sessionId = cleanText(req.body?.sessionId, 255);
    const email = cleanText(req.body?.email, 320).toLowerCase();
    const organization = cleanText(req.body?.organization, 200);
    const role = cleanText(req.body?.role, 160);
    const consentGiven = req.body?.consentGiven === true;

    if (!sessionId) return res.status(400).json({ message: 'sessionId is required.' });
    if (!EMAIL_PATTERN.test(email)) return res.status(400).json({ message: 'Enter a valid work email.' });
    if (!organization) return res.status(400).json({ message: 'Enter your organisation.' });
    if (!consentGiven) return res.status(400).json({ message: 'Consent is required to email the result.' });

    const submission = await ControlMaturityAssessment.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          email,
          organization,
          role,
          consentGiven,
          claimedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!submission) return res.status(404).json({ message: 'Assessment result not found.' });

    sendControlMaturityEmails(submission).catch((error) =>
      console.error('[Control maturity] Email error:', error)
    );

    res.json({ success: true, submissionId: submission._id });
  } catch (error) {
    console.error('[Control maturity] Claim error:', error);
    res.status(500).json({ message: 'Could not save contact details.' });
  }
});

// GET /api/assessment/control-maturity/stats - aggregate only, admin key protected
router.get('/control-maturity/stats', async (req, res) => {
  try {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [total, claimed, byMarket, averages] = await Promise.all([
      ControlMaturityAssessment.countDocuments(),
      ControlMaturityAssessment.countDocuments({ email: { $exists: true, $ne: '' } }),
      ControlMaturityAssessment.aggregate([
        { $group: { _id: '$market', count: { $sum: 1 }, avgScore: { $avg: '$score' } } },
        { $sort: { count: -1 } },
      ]),
      ControlMaturityAssessment.aggregate([
        {
          $group: {
            _id: null,
            score: { $avg: '$score' },
            detection: { $avg: '$dimensions.detection' },
            investigation: { $avg: '$dimensions.investigation' },
            verification: { $avg: '$dimensions.verification' },
            governance: { $avg: '$dimensions.governance' },
          },
        },
      ]),
    ]);

    res.json({ total, claimed, byMarket, averages: averages[0] || null });
  } catch (error) {
    console.error('[Control maturity] Stats error:', error);
    res.status(500).json({ message: 'Could not load assessment statistics.' });
  }
});

export default router;
