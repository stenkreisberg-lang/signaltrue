import express from 'express';
import AssessmentSubmission from '../models/assessmentSubmission.js';
import { sendAssessmentResultsEmail, sendAssessmentLeadNotification } from '../services/assessmentEmailService.js';

const router = express.Router();

// POST /api/assessment/submit - Submit assessment with email
router.post('/submit', async (req, res) => {
  try {
    const { email, sessionId, result, inputs, consentGiven, timestamp } = req.body;

    // Validate required fields
    if (!email || !sessionId || !result || !inputs) {
      return res.status(400).json({ 
        success: false,
        message: 'Missing required fields: email, sessionId, result, inputs' 
      });
    }

    if (!consentGiven) {
      return res.status(400).json({ 
        success: false,
        message: 'Consent is required to submit assessment' 
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
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    await submission.save();

    // Log the submission (for internal notifications)
    console.log(`[Assessment] New submission: ${email} | Risk: ${result.riskScore?.level} | Cost: €${Math.round(result.costBreakdown?.totalCostLow || 0)} - €${Math.round(result.costBreakdown?.totalCostHigh || 0)}`);

    // Send emails (don't block response on email sending)
    Promise.all([
      sendAssessmentResultsEmail(email, result, inputs),
      sendAssessmentLeadNotification(email, result, inputs)
    ]).catch(err => console.error('[Assessment] Email sending error:', err));

    res.status(201).json({
      success: true,
      message: 'Assessment submitted successfully',
      submissionId: submission._id
    });

  } catch (error) {
    console.error('[Assessment] Submit error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to submit assessment' 
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
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const last30Days = await AssessmentSubmission.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    // Risk level distribution
    const riskDistribution = await AssessmentSubmission.aggregate([
      { $group: { _id: '$result.riskScore.level', count: { $sum: 1 } } }
    ]);

    // Average cost exposure
    const costStats = await AssessmentSubmission.aggregate([
      {
        $group: {
          _id: null,
          avgCostLow: { $avg: '$result.costBreakdown.totalCostLow' },
          avgCostHigh: { $avg: '$result.costBreakdown.totalCostHigh' },
          avgTeamSize: { $avg: '$inputs.company.teamSize' }
        }
      }
    ]);

    res.json({
      total: totalSubmissions,
      last7Days,
      last30Days,
      riskDistribution: riskDistribution.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      averages: costStats[0] || {}
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

export default router;
