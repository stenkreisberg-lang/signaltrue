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
import Signal from '../models/Signal.js';
import Intervention from '../models/intervention.js';
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
      type: 'info',
    },
  },
  first_signals: {
    dayRange: [7, 10],
    banner: {
      title: 'Early patterns detected',
      message: 'Accuracy improves as baseline stabilizes.',
      type: 'info',
    },
    emailSubject: 'Your first SignalTrue signals are forming',
  },
  pattern_recognition: {
    dayRange: [14, 18],
    banner: {
      title: 'Patterns recognized',
      message: 'SignalTrue is now detecting trends and anomalies.',
      type: 'success',
    },
    labels: ['Consistently increasing', 'Emerging pattern', 'Stable but elevated'],
  },
  pre_close: {
    dayRange: [21, 24],
    banner: {
      title: 'Your first monthly SignalTrue report is coming soon',
      message:
        'Many HR leaders use this report to brief leadership on workload and coordination risks.',
      type: 'highlight',
    },
    emailSubject: 'Preparing your first SignalTrue monthly report',
    emailBody:
      'This report summarizes real workload patterns observed across the organization and is often reviewed together with leadership.',
  },
  report_delivered: {
    dayRange: [25, 30],
    banner: {
      title: 'Your monthly report is ready',
      message: 'Review your first free monthly report and share with leadership.',
      type: 'success',
      ctaText: 'View Report',
      ctaLink: '/app/monthly-report',
    },
  },
  expired: {
    dayRange: [31, Infinity],
    banner: {
      title: 'Your trial has ended',
      message: 'Upgrade to continue receiving insights and recommendations.',
      type: 'warning',
      ctaText: 'Choose a Plan',
      ctaLink: '/pricing',
    },
    paywallActive: true,
  },
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
          needsOnboarding: true,
        },
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
          needsOnboarding: true,
        },
      });
    }

    // Calculate current trial day
    const startDate = organization.trial?.startDate || organization.createdAt;
    const now = new Date();
    const daysDiff = Math.floor((now - new Date(startDate)) / (24 * 60 * 60 * 1000));
    const currentDay = Math.max(0, daysDiff);

    // Determine phase
    const currentPhase =
      currentDay > 30
        ? 'expired'
        : currentDay >= 25
          ? 'report_delivered'
          : currentDay >= 21
            ? 'pre_close'
            : currentDay >= 14
              ? 'pattern_recognition'
              : currentDay >= 7
                ? 'first_signals'
                : 'baseline';

    // Check if converted to paid or on active pilot
    const isPilot =
      organization.pilot?.isActive &&
      (!organization.pilot?.endDate || new Date(organization.pilot.endDate) > new Date());
    const isPaid =
      isPilot ||
      organization.trial?.convertedToPaid ||
      (organization.subscriptionPlanId && organization.subscriptionPlanId !== null);

    // Pilot users always get full access — override expired phase
    const effectivePhase = isPilot && currentPhase === 'expired' ? 'baseline' : currentPhase;

    const phaseConfig = TRIAL_PHASES[effectivePhase] || TRIAL_PHASES['baseline'];

    res.json({
      trial: {
        isActive: (currentDay <= 30 && !isPaid) || isPilot,
        isPaid,
        isPilot,
        startDate,
        endDate: organization.trial?.endDate,
        currentDay,
        daysRemaining: isPilot
          ? Math.max(
              0,
              Math.ceil((new Date(organization.pilot.endDate) - new Date()) / (1000 * 60 * 60 * 24))
            )
          : Math.max(0, 30 - currentDay),
        phase: effectivePhase,
        banner: !isPaid && !isPilot ? phaseConfig.banner : null,

        // Milestones
        milestones: {
          firstSignalsShown: organization.trial?.firstSignalsShown,
          patternRecognitionStarted: organization.trial?.patternRecognitionStarted,
          preCloseNotificationSent: organization.trial?.preCloseNotificationSent,
          monthlyReportGenerated: organization.trial?.monthlyReportGenerated,
          monthlyReportViewed: organization.trial?.monthlyReportViewed,
          ceoSummaryGenerated: organization.trial?.ceoSummaryGenerated,
          ceoSummaryShared: organization.trial?.ceoSummaryShared,
        },

        // Paywall status
        paywall: {
          isActive: currentPhase === 'expired' && !isPaid && !isPilot,
          activatedAt: organization.trial?.paywallActivatedAt,
          lockedFeatures:
            currentPhase === 'expired' && !isPaid && !isPilot
              ? [
                  'forward_looking_insights',
                  'ai_recommendations',
                  'alerts_thresholds',
                  'trend_continuation',
                  'leadership_prompts',
                ]
              : [],
        },
      },
    });
  } catch (error) {
    console.error('[Trial] Status error:', error);
    res.status(500).json({ error: 'Failed to get trial status' });
  }
});

/**
 * GET /api/trial/executive-summary/:orgId
 * Get executive summary data for CEO view
 * Returns current status, top risks, and recommended actions
 */
router.get('/executive-summary/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;

    // Verify user has access to this org
    if (req.user.orgId?.toString() !== orgId && req.user.role !== 'master_admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const [signals, interventions] = await Promise.all([
      Signal.find({ orgId, status: { $in: ['Open', 'Acknowledged', 'In Progress'] } })
        .populate('teamId', 'name')
        .sort({ severity: -1, lastUpdated: -1 })
        .limit(100)
        .lean(),
      Intervention.find({ orgId })
        .populate('teamId', 'name')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),
    ]);

    const severityRank = { Critical: 3, Risk: 2, Informational: 1 };
    signals.sort(
      (a, b) =>
        (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0) ||
        new Date(b.lastUpdated || b.createdAt) - new Date(a.lastUpdated || a.createdAt)
    );

    const criticalSignals = signals.filter((signal) => signal.severity === 'Critical');
    const reviewSignals = signals.filter((signal) => signal.severity === 'Risk');
    const currentStatus =
      criticalSignals.length > 0
        ? 'Action required'
        : reviewSignals.length > 0
          ? 'Review'
          : 'No qualified priority';

    const topRisks = signals.slice(0, 5).map((signal) => ({
      id: signal._id,
      title: signal.title,
      teamName: signal.teamId?.name || 'Team',
      severity: signal.severity,
      confidence: signal.confidence,
      currentValue: signal.deviation?.currentValue,
      baselineValue: signal.deviation?.baselineValue,
      deltaPercent: signal.deviation?.deltaPercent,
      sustainedDays: signal.deviation?.sustainedDays,
      evidenceStatement:
        signal.consequence?.statement ||
        'A qualified team-level pattern requires consultation before a cause is assigned.',
    }));

    const activeControls = interventions.filter((item) =>
      ['planned', 'active', 'pending-recheck'].includes(item.status)
    );
    const completedControls = interventions.filter((item) => item.status === 'completed');
    const now = new Date();
    const overdueControls = activeControls.filter(
      (item) => item.recheckDate && new Date(item.recheckDate) <= now
    );
    const improvedControls = completedControls.filter(
      (item) => item.outcomeDelta?.improved === true
    );
    const consultedControls = interventions.filter(
      (item) => item.consultation?.status === 'completed'
    );

    const recentSignalCount = signals.filter((s) => {
      const age = Date.now() - new Date(s.createdAt).getTime();
      return age < 7 * 24 * 60 * 60 * 1000;
    }).length;
    const olderSignalCount = signals.filter((s) => {
      const age = Date.now() - new Date(s.createdAt).getTime();
      return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000;
    }).length;
    const trendDirection =
      recentSignalCount > olderSignalCount
        ? 'worsening'
        : recentSignalCount < olderSignalCount
          ? 'improving'
          : 'stable';

    const decisionPrompts = [];
    if (overdueControls.length > 0) {
      decisionPrompts.push({
        title: 'Complete overdue control reviews',
        decision: `${overdueControls.length} control review${overdueControls.length === 1 ? ' is' : 's are'} due. Confirm evidence, worker feedback and the next decision.`,
      });
    }
    if (criticalSignals.length > 0) {
      decisionPrompts.push({
        title: 'Remove barriers for priority teams',
        decision: `${criticalSignals.length} critical team-level pattern${criticalSignals.length === 1 ? ' requires' : 's require'} a named operational owner and worker consultation.`,
      });
    }
    if (signals.length > 0 && activeControls.length === 0) {
      decisionPrompts.push({
        title: 'Require a documented control decision',
        decision:
          'Qualified evidence is visible, but no active control is recorded. Ask Health & Safety to verify context and record the decision.',
      });
    }

    res.json({
      currentStatus,
      topRisks,
      trendDirection,
      decisionPrompts,
      evidenceSummary: {
        openQualifiedSignals: signals.length,
        criticalSignals: criticalSignals.length,
        teamsRequiringReview: new Set(
          signals.map((signal) => String(signal.teamId?._id || signal.teamId))
        ).size,
        highConfidenceSignals: signals.filter((signal) => signal.confidence === 'High').length,
      },
      controlSummary: {
        active: activeControls.length,
        due: overdueControls.length,
        completed: completedControls.length,
        improved: improvedControls.length,
        consulted: consultedControls.length,
      },
      limitations: [
        'Team-level metadata does not diagnose health or establish cause.',
        'Executives should use this brief to remove barriers and review control effectiveness—not assess individual performance.',
      ],
      generatedAt: new Date().toISOString(),
      orgName: organization.name,
    });
  } catch (error) {
    console.error('[Trial] Executive summary error:', error);
    res.status(500).json({ error: 'Failed to generate executive summary' });
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
      'upgradeCtaClicked',
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
          'trial.paywallActivatedAt': new Date(),
        },
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
        estimatedDate:
          organization.trial?.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }

    // Mark as viewed
    if (!organization.trial?.monthlyReportViewed) {
      await Organization.findByIdAndUpdate(req.user.orgId, {
        $set: { 'trial.monthlyReportViewed': new Date() },
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
          generatedAt: report.createdAt,
        },

        // Key workload patterns
        patterns: report.orgHealth || {
          avgBDI: 0,
          bdiTrend: 'stable',
          teamsAtRisk: 0,
        },

        // Trend direction
        trend: {
          direction: report.orgHealth?.bdiTrend || 'stable',
          label:
            report.orgHealth?.bdiTrend === 'improving'
              ? 'Improving'
              : report.orgHealth?.bdiTrend === 'deteriorating'
                ? 'Worsening'
                : 'Stable',
        },

        // Areas of concern (no recommendations yet - that requires payment)
        concernAreas: (report.persistentRisks || []).map((risk) => ({
          type: risk.riskType,
          affectedTeams: risk.affectedTeams?.length || 0,
          severity: risk.classification,
        })),

        // Note about locked content
        lockedContent: {
          message: 'What to do next',
          note: 'Recommendations and action plans require an active subscription.',
          ctaText: 'Choose a Plan',
          ctaLink: '/pricing',
        },
      },
      isFirstReport: true,
      isFree: true,
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
    const report = await MonthlyReport.findOne({ orgId: req.user.orgId }).sort({ periodEnd: -1 });

    if (!report) {
      return res.status(404).json({
        error: 'No monthly report available',
        message: 'Generate your monthly report first before creating the CEO summary.',
      });
    }

    // Check if summary already exists for this report
    let summary = await CeoSummary.findOne({
      orgId: req.user.orgId,
      monthlyReportId: report._id,
    });

    if (!summary) {
      const sourceSignals = await Signal.find({
        orgId: req.user.orgId,
        status: { $in: ['Open', 'Acknowledged', 'In Progress'] },
      })
        .sort({ lastUpdated: -1 })
        .limit(100)
        .lean();
      const meetingSignal = sourceSignals.find((item) =>
        ['meeting-load-spike', 'context-switching'].includes(item.signalType)
      );
      const recoverySignal = sourceSignals.find((item) =>
        ['after-hours-creep', 'recovery-deficit'].includes(item.signalType)
      );
      const affectedTeams = new Set(sourceSignals.map((item) => String(item.teamId))).size;
      const directionFor = (signal, inverse = false) => {
        const delta = Number(signal?.deviation?.deltaPercent || 0);
        if (Math.abs(delta) < 5) return 'stable';
        const increased = inverse ? delta < 0 : delta > 0;
        return increased ? 'increased' : 'decreased';
      };
      const meetingDirection = directionFor(meetingSignal);
      const recoveryDirection = directionFor(recoverySignal);
      const highConfidenceCount = sourceSignals.filter((item) => item.confidence === 'High').length;

      // Generate new summary
      summary = new CeoSummary({
        orgId: req.user.orgId,
        monthlyReportId: report._id,
        periodStart: report.periodStart,
        periodEnd: report.periodEnd,
        generatedBy: req.user._id,

        observations: {
          meetingLoadChange: {
            direction: meetingDirection,
            percentChange: Math.abs(Number(meetingSignal?.deviation?.deltaPercent || 0)),
            summary: meetingSignal
              ? `Qualified team-level meeting demand is ${meetingDirection} against its recorded baseline.`
              : 'No qualified meeting-demand signal is available for this period.',
          },
          afterHoursWork: {
            direction: recoveryDirection,
            percentChange: Math.abs(Number(recoverySignal?.deviation?.deltaPercent || 0)),
            summary: recoverySignal
              ? `Qualified after-hours or recovery activity is ${recoveryDirection} against its recorded baseline.`
              : 'No qualified after-hours or recovery signal is available for this period.',
          },
          coordinationPressure: {
            direction: affectedTeams > 0 ? 'increased' : 'stable',
            areasAffected: [],
            summary:
              affectedTeams > 0
                ? `${affectedTeams} team${affectedTeams === 1 ? '' : 's'} currently require evidence review.`
                : 'No qualified coordination pattern is currently visible. This does not establish absence of risk.',
          },
        },

        significance: {
          summary:
            'These team-level patterns identify where worker consultation and work-design review should be prioritised. They do not establish worker health or cause.',
          riskFactors: [],
        },

        riskDirection: {
          overall: report.orgHealth?.bdiTrend || 'stable',
          trendConfidence:
            highConfidenceCount >= 2 ? 'high' : sourceSignals.length > 0 ? 'medium' : 'low',
          explanation:
            'Direction reflects qualified team-level changes against recorded baselines. Leadership should verify context and review control effectiveness.',
        },
      });

      // Generate share token
      summary.shareToken = crypto.randomBytes(32).toString('hex');
      summary.shareTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await summary.save();

      // Mark milestone
      await Organization.findByIdAndUpdate(req.user.orgId, {
        $set: { 'trial.ceoSummaryGenerated': new Date() },
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
        footer: summary.footer,
      },
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
      shareTokenExpiry: { $gt: new Date() },
    }).populate('orgId', 'name');

    if (!summary) {
      return res.status(404).json({
        error: 'Summary not found or expired',
        message: 'This executive summary link may have expired or is invalid.',
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
        footer: summary.footer,
      },
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
      orgId: req.user.orgId,
    });

    if (!summary) {
      return res.status(404).json({ error: 'Summary not found' });
    }

    // Add to shared list
    summary.sharedWith.push({
      email: recipientEmail,
      sharedAt: new Date(),
    });
    await summary.save();

    // Mark milestone
    await Organization.findByIdAndUpdate(req.user.orgId, {
      $set: { 'trial.ceoSummaryShared': new Date() },
    });

    res.json({
      success: true,
      shareUrl: `${process.env.FRONTEND_URL || 'https://signaltrue.ai'}/ceo-summary/${summary.shareToken}`,
      message: 'Summary ready to share with leadership',
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

    const isPilot =
      organization.pilot?.isActive &&
      (!organization.pilot?.endDate || new Date(organization.pilot.endDate) > new Date());
    const isPaid =
      isPilot ||
      organization.trial?.convertedToPaid ||
      (organization.subscriptionPlanId && organization.subscriptionPlanId !== null);

    // Calculate current trial day
    const startDate = organization.trial?.startDate || organization.createdAt;
    const daysDiff = Math.floor((new Date() - new Date(startDate)) / (24 * 60 * 60 * 1000));
    const isExpired = daysDiff > 30;

    // Paywall activates after monthly report is viewed OR trial expires (pilots are never paywalled)
    const paywallActive =
      !isPaid && !isPilot && (organization.trial?.paywallActivated || isExpired);

    res.json({
      paywall: {
        isActive: paywallActive,
        isPilot,
        reason: isPilot
          ? 'pilot_active'
          : isExpired
            ? 'trial_expired'
            : organization.trial?.paywallActivated
              ? 'report_viewed'
              : null,

        // What's still accessible
        accessible: ['historical_data', 'dashboard_read_only', 'monthly_report_first'],

        // What requires payment
        locked: paywallActive
          ? [
              {
                feature: 'forward_looking_insights',
                label: 'Forward-looking risk indicators',
                description: 'Predictive signals about emerging workload patterns',
              },
              {
                feature: 'ai_recommendations',
                label: 'AI recommendations',
                description: 'Prioritized action recommendations based on patterns',
              },
              {
                feature: 'alerts_thresholds',
                label: 'Alerts & thresholds',
                description: 'Custom alerts when patterns exceed thresholds',
              },
              {
                feature: 'trend_continuation',
                label: 'Trend continuation',
                description: 'Ongoing trend analysis and projections',
              },
              {
                feature: 'leadership_prompts',
                label: 'Leadership prompts',
                description: 'Strategic decision prompts for executives',
              },
            ]
          : [],

        // CTA
        cta:
          paywallActive && !isPilot
            ? {
                headline: 'Continue receiving early signals and recommendations',
                buttonText: 'Choose a plan',
                subtext: 'Historical data remains available. New insights require an active plan.',
                link: '/pricing',
              }
            : null,
      },
    });
  } catch (error) {
    console.error('[Trial] Paywall status error:', error);
    res.status(500).json({ error: 'Failed to get paywall status' });
  }
});

export default router;
