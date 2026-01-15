import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { generateChatResponse, captureLeadFromChat } from '../services/chatService.js';
import { indexAllDocuments } from '../services/embeddingService.js';
import ChatLog from '../models/chatLog.js';
import ChatLead from '../models/chatLead.js';

const router = express.Router();

/**
 * POST /api/chat/message
 * Send a message to the AI chat assistant
 * 
 * Body: { question: string, sessionId?: string, assessmentContext?: object, trialContext?: object }
 * Response: { response: string, sources: array, leadTrigger?: string, sessionId: string }
 */
router.post('/message', async (req, res) => {
  try {
    const { question, sessionId: providedSessionId, assessmentContext, trialContext } = req.body;
    
    // Validate input
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        message: 'Question is required and must be a string' 
      });
    }
    
    // Limit question length
    if (question.length > 1000) {
      return res.status(400).json({ 
        message: 'Question too long. Maximum 1000 characters.' 
      });
    }
    
    // Generate or use provided session ID
    const sessionId = providedSessionId || uuidv4();
    
    // Generate response using RAG (pass assessment and trial context if available)
    const result = await generateChatResponse(
      question, 
      sessionId, 
      assessmentContext || null,
      trialContext || null
    );
    
    res.json({
      response: result.response,
      sources: result.sources,
      leadTrigger: result.leadTrigger,
      sessionId,
      confidenceScore: result.confidenceScore,
      trialRestricted: result.trialRestricted || false
    });
    
  } catch (error) {
    console.error('Error in chat message endpoint:', error);
    res.status(500).json({ 
      message: 'Sorry, a technical error occurred. Please try again later.' 
    });
  }
});

/**
 * POST /api/chat/lead
 * Capture a lead from chat interaction
 * 
 * Body: { email: string, question: string, triggerType: string, sessionId: string }
 * Response: { success: boolean, message: string }
 */
router.post('/lead', async (req, res) => {
  try {
    const { email, question, triggerType, sessionId } = req.body;
    
    // Validate input
    if (!email || !question || !sessionId) {
      return res.status(400).json({ 
        message: 'Email, question, and sessionId are required' 
      });
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }
    
    // Capture lead
    const result = await captureLeadFromChat(
      email, 
      question, 
      triggerType || 'contact', 
      sessionId
    );
    
    res.json({
      success: true,
      message: 'Thank you! We will contact you soon.'
    });
    
  } catch (error) {
    console.error('Error capturing lead:', error);
    res.status(500).json({ 
      message: 'Sorry, something went wrong. Please try again later.' 
    });
  }
});

/**
 * POST /api/chat/index
 * Re-index all documentation (admin only)
 * 
 * Note: In production, this should be protected with authentication
 */
router.post('/index', async (req, res) => {
  try {
    // In production, add authentication check here
    // For now, check for a simple API key
    const apiKey = req.headers['x-admin-key'];
    
    if (process.env.NODE_ENV === 'production' && apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    console.log('📚 Starting document indexing...');
    
    const result = await indexAllDocuments();
    
    res.json({
      success: true,
      message: 'Indexing complete',
      totalChunks: result.totalChunks
    });
    
  } catch (error) {
    console.error('Error indexing documents:', error);
    res.status(500).json({ 
      message: 'Error indexing documents',
      error: error.message
    });
  }
});

/**
 * GET /api/chat/stats
 * Get chat statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    // In production, add authentication check here
    const apiKey = req.headers['x-admin-key'];
    
    if (process.env.NODE_ENV === 'production' && apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get stats
    const [
      totalQuestions,
      questions24h,
      questions7d,
      answeredCount,
      refusedCount,
      totalLeads,
      leads7d
    ] = await Promise.all([
      ChatLog.countDocuments(),
      ChatLog.countDocuments({ createdAt: { $gte: last24h } }),
      ChatLog.countDocuments({ createdAt: { $gte: last7d } }),
      ChatLog.countDocuments({ responseType: 'answered' }),
      ChatLog.countDocuments({ responseType: 'refused' }),
      ChatLead.countDocuments(),
      ChatLead.countDocuments({ createdAt: { $gte: last7d } })
    ]);
    
    // Get top sources
    const topSources = await ChatLog.aggregate([
      { $unwind: '$retrievedSources' },
      { $group: { _id: '$retrievedSources.source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    res.json({
      totalQuestions,
      questions24h,
      questions7d,
      answeredCount,
      refusedCount,
      answerRate: totalQuestions > 0 ? (answeredCount / totalQuestions * 100).toFixed(1) : 0,
      totalLeads,
      leads7d,
      topSources: topSources.map(s => ({ source: s._id, count: s.count }))
    });
    
  } catch (error) {
    console.error('Error getting chat stats:', error);
    res.status(500).json({ message: 'Error getting stats' });
  }
});

/**
 * GET /api/chat/suggested-prompts
 * Get suggested quick prompts for the chat UI
 */
router.get('/suggested-prompts', (req, res) => {
  res.json({
    prompts: [
      {
        text: "What data does SignalTrue analyze?"
      },
      {
        text: "How is employee privacy protected?"
      },
      {
        text: "What does the pilot require from IT?"
      },
      {
        text: "Is SignalTrue GDPR compliant?"
      }
    ]
  });
});

/**
 * GET /api/chat/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'signaltrue-chat',
    timestamp: new Date().toISOString()
  });
});

export default router;
