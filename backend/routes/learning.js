/**
 * Learning API Routes
 * Endpoints for viewing AI learning data and statistics
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import ActionLearning from '../models/actionLearning.js';
import { getLearningStats } from '../services/learningLoopService.js';

const router = express.Router();

/**
 * GET /api/learning/stats/:teamId
 * Get learning statistics for a specific team
 */
router.get('/stats/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const stats = await getLearningStats(teamId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching learning stats:', error);
    res.status(500).json({ message: 'Error fetching learning statistics' });
  }
});

/**
 * GET /api/learning/patterns
 * Get all learning patterns (for admin/analysis)
 */
router.get('/patterns', authenticateToken, async (req, res) => {
  try {
    const { 
      industry, 
      function: teamFunction, 
      riskType, 
      outcome,
      limit = 50 
    } = req.query;
    
    const query = {};
    if (industry) query['teamProfile.industry'] = industry;
    if (teamFunction) query['teamProfile.function'] = teamFunction;
    if (riskType) query.riskType = riskType;
    if (outcome) query.outcome = outcome;
    
    const patterns = await ActionLearning.find(query)
      .sort({ recordedAt: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      total: patterns.length,
      patterns
    });
  } catch (error) {
    console.error('Error fetching patterns:', error);
    res.status(500).json({ message: 'Error fetching patterns' });
  }
});

/**
 * GET /api/learning/summary
 * Get overall learning summary across all teams
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await ActionLearning.aggregate([
      {
        $group: {
          _id: null,
          totalLearnings: { $sum: 1 },
          byOutcome: {
            $push: '$outcome'
          },
          byRisk: {
            $push: '$riskType'
          },
          byIndustry: {
            $push: '$teamProfile.industry'
          },
          aiGenerated: {
            $sum: { $cond: [{ $eq: ['$action.generatedBy', 'ai'] }, 1, 0] }
          },
          templateGenerated: {
            $sum: { $cond: [{ $eq: ['$action.generatedBy', 'template'] }, 1, 0] }
          }
        }
      }
    ]);
    
    if (summary.length === 0) {
      return res.json({
        totalLearnings: 0,
        outcomes: { positive: 0, neutral: 0, negative: 0 },
        risks: {},
        industries: {},
        aiGenerated: 0,
        templateGenerated: 0
      });
    }
    
    const data = summary[0];
    
    // Count outcomes
    const outcomes = data.byOutcome.reduce((acc, outcome) => {
      acc[outcome] = (acc[outcome] || 0) + 1;
      return acc;
    }, {});
    
    // Count risks
    const risks = data.byRisk.reduce((acc, risk) => {
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {});
    
    // Count industries
    const industries = data.byIndustry.reduce((acc, industry) => {
      acc[industry] = (acc[industry] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      totalLearnings: data.totalLearnings,
      outcomes,
      risks,
      industries,
      aiGenerated: data.aiGenerated,
      templateGenerated: data.templateGenerated,
      aiSuccessRate: data.aiGenerated > 0 
        ? ((outcomes.positive || 0) / data.aiGenerated * 100).toFixed(1)
        : 0
    });
  } catch (error) {
    console.error('Error fetching learning summary:', error);
    res.status(500).json({ message: 'Error fetching summary' });
  }
});

/**
 * GET /api/learning/top-actions
 * Get most successful actions by industry/function
 */
router.get('/top-actions', authenticateToken, async (req, res) => {
  try {
    const { industry, function: teamFunction, riskType } = req.query;
    
    const matchQuery = {
      outcome: 'positive',
      confidence: { $in: ['medium', 'high'] }
    };
    
    if (industry) matchQuery['teamProfile.industry'] = industry;
    if (teamFunction) matchQuery['teamProfile.function'] = teamFunction;
    if (riskType) matchQuery.riskType = riskType;
    
    const topActions = await ActionLearning.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$action.title',
          count: { $sum: 1 },
          avgImpact: { 
            $avg: { 
              $arrayElemAt: ['$metricImpact.percentChange', 0] 
            } 
          },
          industries: { $addToSet: '$teamProfile.industry' },
          functions: { $addToSet: '$teamProfile.function' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      topActions: topActions.map(action => ({
        title: action._id,
        successCount: action.count,
        avgImpact: action.avgImpact ? action.avgImpact.toFixed(1) : 'N/A',
        industries: action.industries,
        functions: action.functions
      }))
    });
  } catch (error) {
    console.error('Error fetching top actions:', error);
    res.status(500).json({ message: 'Error fetching top actions' });
  }
});

export default router;
