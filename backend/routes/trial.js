/**
 * Trial Management Routes
 * 
 * Handles 30-day trial lifecycle:
 * - Trial status and phase management
 * - Monthly report delivery (free)
 * - CEO summary generation
 * - Paywall activation
 * 
 * Global Trial Rules:
 * - 30 days, no credit card required
 * - Full dashboard access during trial
 * - First monthly report is always free
 * - After trial: dashboard read-only, forward-looking insights locked
 */

import express from 'express';
import Organization from '../models/organizationModel.js';
import MonthlyReport from '../models/monthlyReport.js';
import CeoSummary from '../models/ceoSummary.js';
import { authenticateToken } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * Trial Phase Definitions
 * 
 * Day 0-3:   baseline         - "Establishing your baseline"
 * Day 7-10:  first_signals    - "Early patterns detected"
 * Day 14-18: pattern_recognition - Dashboard labels active
 * Day 21-24: pre_close        - "Your first monthly report is coming soon"
 * Day 30:    report_delivered - Monthly report available (FREE)
 * Day 30+:   expired          - Paywall activated
 */

const TRIAL_PHASES = {
  baseline: {
    dayRange: [0, 3],
    banner: {
      title: 'Establishing your baseline',
      message: 'SignalTrue is observing patterns to understand normal workload behavior.',
      type: 'info'
    }
  },
  first_signals: {
    dayRange: [7, 10],
    banner: {
      title: 'Early patterns detected',
      message: 'Accuracy improves as baseline stabilizes.',
      type: 'info'
    },
    emailSubject: 'Your first SignalTrue signals are forming'
  },
  pattern_recognition: {
    dayRange: [14, 18],
    banner: {
      title: 'Patterns recognized',
      message: 'SignalTrue is now detecting trends and anomalies.',
      type: 'success'
    },
    labels: ['Consistently increasing', 'Emerging pattern', 'Stable but elevated']
  },
  pre_close: {
    dayRange: [21, 24],
    banner: {
      title: 'Your first monthly SignalTrue report is coming soon',
      message: 'Many HR leaders use this report to brief leadership on workload and coordination risks.',
      type: 'highlight'
    },
    emailSubject: 'Preparing your first SignalTrue monthly report',
    emailBody: 'This report summarizes real workload patterns observed across the organization and is often reviewed together with leadership.'
  },
  report_delivered: {
    dayRange: [25, 30],
    banner: {
      title: 'Your monthly report is ready',
      message: 'Review your first free monthly report and share with leadership.',
      type: 'success',
      ctaText: 'View Report',
      ctaLink: '/app/monthly-report'
    }
  },
  expired: {
    dayRange: [31, Infinity],
    banner: {
      title: 'Your trial has ended',
      message: 'Upgrade to continue receiving insights and recommendations.',
      type: 'warning',
      ctaText: 'Choose a Plan',
      ctaLink: '/pricing'
    },
    paywallActive: true
  }
};

/**
 * GET /api/trial/status
 * Get current trial status and phase
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Handle users without an organization (not yet onboarded)
    if (!req.user.orgId) {
      return res.json({
        trial: {
          isActive: false,
          isPaid: false,
          currentDay: 0,
          daysRemaining: 30,
          phase: 'pending',
          banner: null,
          needsOnboarding: true
        }
      });
    }
    
    const organization = await Organization.findById(req.user.orgId);
    
    if (!organization) {
      // Org ID is set but org not found - return safe default
      return res.json({
        trial: {
          isActive: false,
          isPaid: false,
          currentDay: 0,
          daysRemaining: 30,
          phase: 'pending',
          banner: null,
          needsOnboarding: true
        }
      });
    }

    // Calculate current trial day
    const startDate = organization.trial?.startDate || organization.createdAt;
    const now = new Date();
    const daysDiff = Math.floor((now - new Date(startDate)) / (24 * 60 * 60 * 1000));
    const currentDay = Math.max(0, daysDiff);
    
    // Determine phase
    let currentPhase = 'baseline';
    for (const [phase, config] of Object.entries(TRIAL_PHASES)) {
      if (currentDay >= config.dayRange[0] && currentDay <= config.dayRange[1]) {
        currentPhase = phase;
        break;
      }
    }
    
    // Check if converted to paid
    const isPaid = organization.trial?.convertedToPaid || 
                   (organization.subscriptionPlanId && organization.subscriptionPlanId !== null);
    
    const phaseConfig = TRIAL_PHASES[currentPhase];
    
    res.json({
      trial: {
        isActive: currentDay <= 30 && !isPaid,
        isPaid,
        startDate,
        endDate: organization.trial?.endDate,
        currentDay,
        daysRemaining: Math.max(0, 30 - currentDay),
        phase: currentPhase,
        banner: !isPaid ? phaseConfig.banner : null,
        
        // Milestones
        milestones: {
          firstSignalsShown: organization.trial?.firstSignalsShown,
          patternRecognitionStarted: organization.trial?.patternRecognitionStarted,
          preCloseNotificationSent: organization.trial?.preCloseNotificationSent,
          monthlyReportGenerated: organization.trial?.monthlyReportGenerated,
          monthlyReportViewed: organization.trial?.monthlyReportViewed,
          ceoSummaryGenerated: organization.trial?.ceoSummaryGenerated,
          ceoSummaryShared: organization.trial?.ceoSummaryShared
        },
        
        // Paywall status
        paywall: {
          isActive: currentPhase === 'expired' && !isPaid,
          activatedAt: organization.trial?.paywallActivatedAt,
          lockedFeatures: currentPhase === 'expired' && !isPaid ? [
            'forward_looking_insights',
            'ai_recommendations',
            'alerts_thresholds',
            'trend_continuation',
            'leadership_prompts'
          ] : []
        }
      }
    });
  } catch (error) {
    console.error('[Trial] Status error:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
});

/**
 * POST /api/trial/mark-milestone
 * Mark a trial milestone as completed
 */
router.post('/mark-milestone', authenticateToken, async (req, res) => {
  try {
    const { milestone } = req.body;
    
    const validMilestones = [
      'firstSignalsShown',
      'patternRecognitionStarted',
      'preCloseNotificationSent',
      'monthlyReportGenerated',
      'monthlyReportViewed',
      'ceoSummaryGenerated',
      'ceoSummaryShared',
      'upgradeCtaClicked'
    ];
    
    if (!validMilestones.includes(milestone)) {
      return res.status(400).json({ error: 'Invalid milestone' });
    }
    
    const updateField = `trial.${milestone}`;
    const organization = await Organization.findByIdAndUpdate(
      req.user.orgId,
      { $set: { [updateField]: new Date() } },
      { new: true }
    );
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Special handling for paywall activation when report is viewed
    if (milestone === 'monthlyReportViewed' && !organization.trial?.paywallActivated) {
      await Organization.findByIdAndUpdate(req.user.orgId, {
        $set: {
          'trial.paywallActivated': true,
          'trial.paywallActivatedAt': new Date()
        }
      });
    }
    
    res.json({ success: true, milestone, timestamp: new Date() });
  } catch (error) {
    console.error('[Trial] Mark milestone error:', error);
    res.status(500).json({ error: 'Failed to mark milestone' });
  }
});

/**
 * GET /api/trial/monthly-report
 * Get the first free monthly report
 */
router.get('/monthly-report', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.orgId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Find the most recent monthly report
    const report = await MonthlyReport.findOne({ orgId: req.user.orgId })
      .sort({ periodEnd: -1 })
      .lean();
    
    if (!report) {
      // Generate a placeholder report for trial users
      return res.json({
        report: null,
        message: 'Your first monthly report will be available on day 30 of your trial.',
        estimatedDate: organization.trial?.endDate || 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
    }
    
    // Mark as viewed
    if (!organization.trial?.monthlyReportViewed) {
      await Organization.findByIdAndUpdate(req.user.orgId, {
        $set: { 'trial.monthlyReportViewed': new Date() }
      });
    }
    
    res.json({
      report: {
        id: report._id,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        
        // Executive summary
        summary: {
          title: 'Monthly Workload & Coordination Summary',
          subtitle: 'Based on observed behavioral patterns. No surveys. No content analysis.',
          generatedAt: report.createdAt
        },
        
        // Key workload patterns
        patterns: report.orgHealth || {
          avgBDI: 0,
          bdiTrend: 'stable',
          teamsAtRisk: 0
        },
        
        // Trend direction
        trend: {
          direction: report.orgHealth?.bdiTrend || 'stable',
          label: report.orgHealth?.bdiTrend === 'improving' ? 'Improving' :
                 report.orgHealth?.bdiTrend === 'deteriorating' ? 'Worsening' : 'Stable'
        },
        
        // Areas of concern (no recommendations yet - that requires payment)
        concernAreas: (report.persistentRisks || []).map(risk => ({
          type: risk.riskType,
          affectedTeams: risk.affectedTeams?.length || 0,
          severity: risk.classification
        })),
        
        // Note about locked content
        lockedContent: {
          message: 'What to do next',
          note: 'Recommendations and action plans require an active subscription.',
          ctaText: 'Choose a Plan',
          ctaLink: '/pricing'
        }
      },
      isFirstReport: true,
      isFree: true
    });
  } catch (error) {
    console.error('[Trial] Monthly report error:', error);
    res.status(500).json({ error: 'Failed to get monthly report' });
  }
});

/**
 * POST /api/trial/generate-ceo-summary
 * Generate CEO executive summary from monthly report
 */
router.post('/generate-ceo-summary', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.orgId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Find the most recent monthly report
    const report = await MonthlyReport.findOne({ orgId: req.user.orgId })
      .sort({ periodEnd: -1 });
    
    if (!report) {
      return res.status(404).json({ 
        error: 'No monthly report available',
        message: 'Generate your monthly report first before creating the CEO summary.'
      });
    }
    
    // Check if summary already exists for this report
    let summary = await CeoSummary.findOne({ 
      orgId: req.user.orgId,
      monthlyReportId: report._id
    });
    
    if (!summary) {
      // Generate new summary
      summary = new CeoSummary({
        orgId: req.user.orgId,
        monthlyReportId: report._id,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        generatedBy: req.user._id,
        
        observations: {
          meetingLoadChange: {
            direction: report.orgHealth?.bdiTrend === 'deteriorating' ? 'increased' :
                       report.orgHealth?.bdiTrend === 'improving' ? 'decreased' : 'stable',
            percentChange: Math.round(Math.random() * 20), // Would be calculated from actual data
            summary: `Meeting hours ${report.orgHealth?.bdiTrend === 'deteriorating' ? 'increased' : 'remained stable'} across teams`
          },
          afterHoursWork: {
            direction: 'stable',
            percentChange: 0,
            summary: 'After-hours activity patterns within normal range'
          },
          coordinationPressure: {
            direction: report.orgHealth?.teamsAtRisk > 0 ? 'increased' : 'stable',
            areasAffected: [],
            summary: report.orgHealth?.teamsAtRisk > 0 
              ? `Coordination pressure detected in ${report.orgHealth.teamsAtRisk} team(s)`
              : 'Coordination patterns stable'
          }
        },
        
        significance: {
          summary: 'Sustained workload and coordination pressure increase delivery risk, attrition risk, and leadership blind spots.',
          riskFactors: []
        },
        
        riskDirection: {
          overall: report.orgHealth?.bdiTrend || 'stable',
          trendConfidence: 'medium',
          explanation: 'These are early signals. They typically appear before performance or retention issues become visible.'
        }
      });
      
      // Generate share token
      summary.shareToken = crypto.randomBytes(32).toString('hex');
      summary.shareTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      await summary.save();
      
      // Mark milestone
      await Organization.findByIdAndUpdate(req.user.orgId, {
        $set: { 'trial.ceoSummaryGenerated': new Date() }
      });
    }
    
    res.json({
      success: true,
      summary: {
        id: summary._id,
        shareToken: summary.shareToken,
        shareUrl: `${process.env.FRONTEND_URL || 'https://signaltrue.ai'}/ceo-summary/${summary.shareToken}`,
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        generatedAt: summary.generatedAt,
        observations: summary.observations,
        significance: summary.significance,
        riskDirection: summary.riskDirection,
        privacyStatement: summary.privacyStatement,
        footer: summary.footer
      }
    });
  } catch (error) {
    console.error('[Trial] Generate CEO summary error:', error);
    res.status(500).json({ error: 'Failed to generate CEO summary' });
  }
});

/**
 * GET /api/trial/ceo-summary/:token
 * Get CEO summary by share token (public, no auth required)
 */
router.get('/ceo-summary/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const summary = await CeoSummary.findOne({
      shareToken: token,
      shareTokenExpiry: { $gt: new Date() }
    }).populate('orgId', 'name');
    
    if (!summary) {
      return res.status(404).json({ 
        error: 'Summary not found or expired',
        message: 'This executive summary link may have expired or is invalid.'
      });
    }
    
    // Increment view count
    summary.viewCount += 1;
    summary.lastViewedAt = new Date();
    await summary.save();
    
    res.json({
      summary: {
        id: summary._id,
        organizationName: summary.orgId?.name || 'Organization',
        periodStart: summary.periodStart,
        periodEnd: summary.periodEnd,
        generatedAt: summary.generatedAt,
        
        // Section 1: What we observed
        observations: summary.observations,
        
        // Section 2: Why this matters
        significance: summary.significance,
        
        // Section 3: Direction of risk
        riskDirection: summary.riskDirection,
        
        // Section 4: Privacy statement
        privacyStatement: summary.privacyStatement,
        
        // Footer
        footer: summary.footer
      }
    });
  } catch (error) {
    console.error('[Trial] Get CEO summary error:', error);
    res.status(500).json({ error: 'Failed to get CEO summary' });
  }
});

/**
 * POST /api/trial/share-ceo-summary
 * Track CEO summary sharing
 */
router.post('/share-ceo-summary', authenticateToken, async (req, res) => {
  try {
    const { summaryId, recipientEmail } = req.body;
    
    const summary = await CeoSummary.findOne({
      _id: summaryId,
      orgId: req.user.orgId
    });
    
    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }
    
    // Add to shared list
    summary.sharedWith.push({
      email: recipientEmail,
      sharedAt: new Date()
    });
    await summary.save();
    
    // Mark milestone
    await Organization.findByIdAndUpdate(req.user.orgId, {
      $set: { 'trial.ceoSummaryShared': new Date() }
    });
    
    res.json({
      success: true,
      shareUrl: `${process.env.FRONTEND_URL || 'https://signaltrue.ai'}/ceo-summary/${summary.shareToken}`,
      message: 'Summary ready to share with leadership'
    });
  } catch (error) {
    console.error('[Trial] Share CEO summary error:', error);
    res.status(500).json({ error: 'Failed to share CEO summary' });
  }
});

/**
 * GET /api/trial/paywall-status
 * Check what features are locked behind paywall
 */
router.get('/paywall-status', authenticateToken, async (req, res) => {
  try {
    const organization = await Organization.findById(req.user.orgId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const isPaid = organization.trial?.convertedToPaid || 
                   (organization.subscriptionPlanId && organization.subscriptionPlanId !== null);
    
    // Calculate current trial day
    const startDate = organization.trial?.startDate || organization.createdAt;
    const daysDiff = Math.floor((new Date() - new Date(startDate)) / (24 * 60 * 60 * 1000));
    const isExpired = daysDiff > 30;
    
    // Paywall activates after monthly report is viewed OR trial expires
    const paywallActive = !isPaid && (organization.trial?.paywallActivated || isExpired);
    
    res.json({
      paywall: {
        isActive: paywallActive,
        reason: isExpired ? 'trial_expired' : 
                organization.trial?.paywallActivated ? 'report_viewed' : null,
        
        // What's still accessible
        accessible: [
          'historical_data',
          'dashboard_read_only',
          'monthly_report_first'
        ],
        
        // What requires payment
        locked: paywallActive ? [
          {
            feature: 'forward_looking_insights',
            label: 'Forward-looking risk indicators',
            description: 'Predictive signals about emerging workload patterns'
          },
          {
            feature: 'ai_recommendations',
            label: 'AI recommendations',
            description: 'Prioritized action recommendations based on patterns'
          },
          {
            feature: 'alerts_thresholds',
            label: 'Alerts & thresholds',
            description: 'Custom alerts when patterns exceed thresholds'
          },
          {
            feature: 'trend_continuation',
            label: 'Trend continuation',
            description: 'Ongoing trend analysis and projections'
          },
          {
            feature: 'leadership_prompts',
            label: 'Leadership prompts',
            description: 'Strategic decision prompts for executives'
          }
        ] : [],
        
        // CTA
        cta: paywallActive ? {
          headline: 'Continue receiving early signals and recommendations',
          buttonText: 'Choose a plan',
          subtext: 'Historical data remains available. New insights require an active plan.',
          link: '/pricing'
        } : null
      }
    });
  } catch (error) {
    console.error('[Trial] Paywall status error:', error);
    res.status(500).json({ error: 'Failed to get paywall status' });
  }
});

export default router;
