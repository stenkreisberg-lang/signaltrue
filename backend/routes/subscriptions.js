/**
 * Subscription Management Routes
 * 
 * Handles plan changes, upgrades, downgrades, and feature unlocking.
 */

import express from 'express';
import Organization from '../models/organizationModel.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import accessControlService from '../services/accessControlService.js';
import { PLAN_DEFINITIONS } from '../utils/subscriptionConstants.js';

const router = express.Router();

/**
 * GET /api/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true });
    
    if (plans.length === 0) {
      // If plans don't exist in DB, return definitions
      return res.json({
        plans: Object.values(PLAN_DEFINITIONS),
        source: 'defaults'
      });
    }

    res.json({
      plans,
      source: 'database'
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subscription plans',
      message: error.message 
    });
  }
});

/**
 * GET /api/subscriptions/current
 * Get current organization's subscription details
 */
router.get('/current', async (req, res) => {
  try {
    const organization = req.organization;

    if (!organization) {
      return res.status(400).json({ 
        error: 'Organization context required' 
      });
    }

    const currentPlanId = organization.subscriptionPlanId;
    const plan = currentPlanId ? PLAN_DEFINITIONS[currentPlanId] : null;

    // Get accessible features for current user
    const accessibleFeatures = await accessControlService.getAccessibleFeatures(
      req.user,
      organization
    );

    res.json({
      current: {
        planId: currentPlanId,
        plan,
        customFeatures: organization.customFeatures,
        subscriptionHistory: organization.subscriptionHistory || []
      },
      access: {
        features: accessibleFeatures,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({ 
      error: 'Failed to fetch subscription details',
      message: error.message 
    });
  }
});

/**
 * PUT /api/subscriptions/upgrade
 * Upgrade organization to a higher plan
 */
router.put('/upgrade', async (req, res) => {
  try {
    const organization = req.organization;
    const { targetPlanId, backfillMonths = 3 } = req.body;

    if (!organization) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    // Check if user has permission to change subscription (admin only)
    if (req.user.role !== 'HR_ADMIN' && req.user.role !== 'CEO') {
      return res.status(403).json({ 
        error: 'Only HR admins and CEOs can change subscriptions' 
      });
    }

    const currentPlanId = organization.subscriptionPlanId;

    // Validate upgrade
    const upgradeCheck = accessControlService.canUpgrade(currentPlanId, targetPlanId);
    
    if (!upgradeCheck.allowed) {
      return res.status(400).json({ 
        error: upgradeCheck.reason 
      });
    }

    // Get feature changes
    const changes = accessControlService.getFeatureChanges(currentPlanId, targetPlanId);

    // Perform upgrade
    organization.subscriptionPlanId = targetPlanId;
    
    // Add to history
    organization.subscriptionHistory = organization.subscriptionHistory || [];
    organization.subscriptionHistory.push({
      planId: targetPlanId,
      changedAt: new Date(),
      changedBy: req.user._id,
      action: 'upgrade'
    });

    await organization.save();

    // Handle backfill for leadership reports if upgrading to leadership/custom
    let backfillResult = null;
    if (targetPlanId === 'leadership' || targetPlanId === 'custom') {
      if (changes.gained.includes('monthlyReportsLeadership')) {
        // Trigger backfill (implementation depends on report generation service)
        backfillResult = {
          status: 'queued',
          months: backfillMonths,
          message: `Backfilling ${backfillMonths} months of leadership reports`
        };
      }
    }

    res.json({
      success: true,
      upgrade: {
        from: currentPlanId,
        to: targetPlanId,
        featuresGained: changes.gained,
        featuresLost: changes.lost
      },
      backfill: backfillResult,
      organization: {
        subscriptionPlanId: organization.subscriptionPlanId,
        customFeatures: organization.customFeatures
      }
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({ 
      error: 'Failed to upgrade subscription',
      message: error.message 
    });
  }
});

/**
 * PUT /api/subscriptions/downgrade
 * Downgrade organization to a lower plan
 */
router.put('/downgrade', async (req, res) => {
  try {
    const organization = req.organization;
    const { targetPlanId, archiveLeadershipReports = true } = req.body;

    if (!organization) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    // Check permissions
    if (req.user.role !== 'HR_ADMIN' && req.user.role !== 'CEO') {
      return res.status(403).json({ 
        error: 'Only HR admins and CEOs can change subscriptions' 
      });
    }

    const currentPlanId = organization.subscriptionPlanId;

    // Validate downgrade
    const downgradeCheck = accessControlService.canDowngrade(currentPlanId, targetPlanId);
    
    if (!downgradeCheck.allowed) {
      return res.status(400).json({ 
        error: downgradeCheck.reason 
      });
    }

    // Get feature changes
    const changes = accessControlService.getFeatureChanges(currentPlanId, targetPlanId);

    // Perform downgrade
    organization.subscriptionPlanId = targetPlanId;
    
    // Add to history
    organization.subscriptionHistory = organization.subscriptionHistory || [];
    organization.subscriptionHistory.push({
      planId: targetPlanId,
      changedAt: new Date(),
      changedBy: req.user._id,
      action: 'downgrade'
    });

    await organization.save();

    // Handle leadership report archival if downgrading from leadership
    let archivalResult = null;
    if (changes.lost.includes('monthlyReportsLeadership') && archiveLeadershipReports) {
      archivalResult = {
        status: 'archived',
        message: 'Leadership reports archived (read-only access for HR)'
      };
      // TODO: Implement actual archival logic
    }

    res.json({
      success: true,
      downgrade: {
        from: currentPlanId,
        to: targetPlanId,
        featuresGained: changes.gained,
        featuresLost: changes.lost
      },
      archival: archivalResult,
      organization: {
        subscriptionPlanId: organization.subscriptionPlanId,
        customFeatures: organization.customFeatures
      },
      warning: changes.lost.length > 0 
        ? 'Some features will no longer be accessible' 
        : null
    });
  } catch (error) {
    console.error('Error downgrading subscription:', error);
    res.status(500).json({ 
      error: 'Failed to downgrade subscription',
      message: error.message 
    });
  }
});

/**
 * PUT /api/subscriptions/custom-features
 * Update custom features for enterprise plan
 */
router.put('/custom-features', async (req, res) => {
  try {
    const organization = req.organization;
    const { customFeatures } = req.body;

    if (!organization) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    // Only available for custom plan
    if (organization.subscriptionPlanId !== 'custom') {
      return res.status(403).json({ 
        error: 'Custom features only available for Organizational Intelligence plan' 
      });
    }

    // Only CEO can modify custom features
    if (req.user.role !== 'CEO') {
      return res.status(403).json({ 
        error: 'Only CEO can modify custom features' 
      });
    }

    // Update custom features
    organization.customFeatures = {
      ...organization.customFeatures,
      ...customFeatures
    };

    await organization.save();

    res.json({
      success: true,
      customFeatures: organization.customFeatures
    });
  } catch (error) {
    console.error('Error updating custom features:', error);
    res.status(500).json({ 
      error: 'Failed to update custom features',
      message: error.message 
    });
  }
});

/**
 * GET /api/subscriptions/feature-comparison
 * Compare features between plans
 */
router.get('/feature-comparison', async (req, res) => {
  try {
    const { currentPlan, targetPlan } = req.query;

    if (!currentPlan || !targetPlan) {
      return res.status(400).json({ 
        error: 'Both currentPlan and targetPlan query parameters required' 
      });
    }

    const changes = accessControlService.getFeatureChanges(currentPlan, targetPlan);
    const currentPlanDef = PLAN_DEFINITIONS[currentPlan];
    const targetPlanDef = PLAN_DEFINITIONS[targetPlan];

    res.json({
      current: currentPlanDef,
      target: targetPlanDef,
      changes
    });
  } catch (error) {
    console.error('Error comparing features:', error);
    res.status(500).json({ 
      error: 'Failed to compare features',
      message: error.message 
    });
  }
});

export default router;
