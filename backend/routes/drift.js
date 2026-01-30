import express from 'express';
import crypto from 'crypto';
import DriftSession from '../models/driftSession.js';
import { sendDriftReportEmail, sendDriftLeadNotification } from '../services/driftEmailService.js';

const router = express.Router();

/**
 * Hash IP address for privacy-preserving abuse protection
 */
function hashIP(ip) {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT || 'signaltrue-drift-salt';
  return crypto.createHash('sha256').update(ip + salt).digest('hex').substring(0, 32);
}

/**
 * POST /api/drift/submit
 * Saves diagnostic answers and computed scores, returns sessionId
 */
router.post('/submit', async (req, res) => {
  try {
    const { answers, score, utm } = req.body;
    
    // Validate required fields
    if (!answers || !score) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: answers, score'
      });
    }
    
    // Validate score structure
    if (typeof score.totalScore !== 'number' || !score.category) {
      return res.status(400).json({
        success: false,
        message: 'Invalid score structure: requires totalScore and category'
      });
    }
    
    // Hash IP for abuse protection
    const ipHash = hashIP(req.ip || req.connection?.remoteAddress);
    
    // Create session
    const session = new DriftSession({
      answers,
      score,
      utm: utm || {},
      ipHash,
      userAgent: req.headers['user-agent']
    });
    
    await session.save();
    
    console.log(`[Drift Diagnostic] New session: ${session.sessionId} | Score: ${score.totalScore} | Category: ${score.category}`);
    
    res.status(201).json({
      success: true,
      sessionId: session.sessionId
    });
    
  } catch (error) {
    console.error('[Drift Diagnostic] Submit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit diagnostic'
    });
  }
});

/**
 * POST /api/drift/unlock
 * Links work email to session and returns report URL
 */
router.post('/unlock', async (req, res) => {
  try {
    const { sessionId, email, consent_marketing } = req.body;
    
    // Validate required fields
    if (!sessionId || !email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, email'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }
    
    // Check for free email domains (optional, encourage work emails)
    const freeEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'mail.com'];
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const isPersonalEmail = freeEmailDomains.includes(emailDomain);
    
    // Find session
    const session = await DriftSession.findBySessionId(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check if already unlocked
    if (session.unlockedAt) {
      return res.json({
        success: true,
        reportUrl: `/drift-report/${sessionId}`,
        alreadyUnlocked: true
      });
    }
    
    // Unlock session
    await session.unlock(email, consent_marketing !== false);
    
    console.log(`[Drift Diagnostic] Session unlocked: ${sessionId} | Email: ${email} | Personal: ${isPersonalEmail}`);
    
    // Send email with report (don't block response)
    if (consent_marketing !== false) {
      sendDriftReportEmail(email, session).catch(err => {
        console.error('[Drift Diagnostic] Email sending error:', err);
      });
      
      // Send internal notification about new lead
      sendDriftLeadNotification(session).catch(err => {
        console.error('[Drift Diagnostic] Internal notification error:', err);
      });
    }
    
    res.json({
      success: true,
      reportUrl: `/drift-report/${sessionId}`,
      isPersonalEmail
    });
    
  } catch (error) {
    console.error('[Drift Diagnostic] Unlock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unlock report'
    });
  }
});

/**
 * GET /api/drift/report/:sessionId
 * Returns report data for a session (must be unlocked)
 */
router.get('/report/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await DriftSession.findBySessionId(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    // Check if unlocked
    if (!session.isUnlocked) {
      return res.status(403).json({
        success: false,
        message: 'Report not unlocked. Please provide your email first.',
        requiresUnlock: true
      });
    }
    
    // Return report data
    res.json({
      success: true,
      report: {
        sessionId: session.sessionId,
        score: session.score,
        answers: session.answers,
        createdAt: session.createdAt,
        unlockedAt: session.unlockedAt
      }
    });
    
  } catch (error) {
    console.error('[Drift Diagnostic] Report fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report'
    });
  }
});

/**
 * GET /api/drift/stats
 * Admin endpoint for drift diagnostic statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const totalSessions = await DriftSession.countDocuments();
    const unlockedSessions = await DriftSession.countDocuments({ unlockedAt: { $ne: null } });
    const last7Days = await DriftSession.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    const last30Days = await DriftSession.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Category distribution
    const categoryDistribution = await DriftSession.aggregate([
      { $group: { _id: '$score.category', count: { $sum: 1 } } }
    ]);
    
    // Average score
    const avgScore = await DriftSession.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$score.totalScore' } } }
    ]);
    
    // Conversion rate (unlocked / total)
    const conversionRate = totalSessions > 0 ? (unlockedSessions / totalSessions * 100).toFixed(1) : 0;
    
    res.json({
      totalSessions,
      unlockedSessions,
      conversionRate: `${conversionRate}%`,
      last7Days,
      last30Days,
      categoryDistribution: categoryDistribution.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {}),
      averageScore: avgScore[0]?.avgScore?.toFixed(1) || 0
    });
    
  } catch (error) {
    console.error('[Drift Diagnostic] Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

export default router;
