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
import { authenticateToken, requireCurrentUserRoles } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(async (req, res, next) => {
  try {
    if (!req.user?.orgId) {
      return res.status(403).json({ error: 'Organization context required' });
    }
    req.organization = await Organization.findById(req.user.orgId);
    if (!req.organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
});

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
        source: 'defaults',
      });
    }

    res.json({
      plans,
      source: 'database',
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription plans',
      message: error.message,
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
        error: 'Organization context required',
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
        subscriptionHistory: organization.subscriptionHistory || [],
      },
      access: {
        features: accessibleFeatures,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Error fetching current subscription:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription details',
      message: error.message,
    });
  }
});

/**
 * PUT /api/subscriptions/upgrade
 * Upgrade organization to a higher plan
 */
router.put('/upgrade', requireCurrentUserRoles(['master_admin','admin','hr_admin','org_admin','executive']), (req, res) => {
  const targetPlanId = req.body?.targetPlanId;
  if (!PLAN_DEFINITIONS[targetPlanId]) return res.status(400).json({ error: 'Unknown target plan' });
  const checkoutPlan = targetPlanId === 'leadership' ? 'interpretation'
    : targetPlanId === 'team' ? 'visibility' : null;
  return res.status(409).json({
    error: 'Payment verification required; subscription has not been changed.',
    code: 'CHECKOUT_REQUIRED',
    checkoutPath: checkoutPlan ? '/api/billing/create-checkout-session' : null,
    checkoutPlan,
    guidance: checkoutPlan
      ? 'Create a Stripe checkout session, then await the verified subscription webhook.'
      : 'Contact billing to arrange the enterprise plan.',
  });
});

/**
 * PUT /api/subscriptions/downgrade
 * Downgrade organization to a lower plan
 */
router.put('/downgrade', requireCurrentUserRoles(['master_admin','admin','hr_admin','org_admin','executive']), (_req, res) => {
  return res.status(409).json({
    error: 'Manage the subscription in the billing portal; no local plan change was made.',
    code: 'BILLING_PORTAL_REQUIRED',
    billingPortalPath: '/api/billing/portal-session',
  });
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
        error: 'Custom features only available for Organizational Intelligence plan',
      });
    }

    // Only CEO can modify custom features
    if (req.user.role !== 'CEO') {
      return res.status(403).json({
        error: 'Only CEO can modify custom features',
      });
    }

    // Update custom features
    organization.customFeatures = {
      ...organization.customFeatures,
      ...customFeatures,
    };

    await organization.save();

    res.json({
      success: true,
      customFeatures: organization.customFeatures,
    });
  } catch (error) {
    console.error('Error updating custom features:', error);
    res.status(500).json({
      error: 'Failed to update custom features',
      message: error.message,
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
        error: 'Both currentPlan and targetPlan query parameters required',
      });
    }

    const changes = accessControlService.getFeatureChanges(currentPlan, targetPlan);
    const currentPlanDef = PLAN_DEFINITIONS[currentPlan];
    const targetPlanDef = PLAN_DEFINITIONS[targetPlan];

    res.json({
      current: currentPlanDef,
      target: targetPlanDef,
      changes,
    });
  } catch (error) {
    console.error('Error comparing features:', error);
    res.status(500).json({
      error: 'Failed to compare features',
      message: error.message,
    });
  }
});

export default router;
