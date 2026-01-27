import express from 'express';
import Stripe from 'stripe';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

/**
 * POST /api/billing/create-checkout-session
 * Creates Stripe Checkout for subscription
 * Body: { plan: 'visibility' | 'interpretation' }
 * 
 * Plans:
 *   - visibility: €99/month
 *   - interpretation: €199/month
 */
router.post('/billing/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'Billing not configured. Set STRIPE_SECRET_KEY.' });
    }

    const { plan = 'visibility' } = req.body || {};

    // Map plan names to Stripe Price IDs
    // Set these in your environment after creating products in Stripe Dashboard
    const priceMap = {
      visibility: process.env.STRIPE_PRICE_VISIBILITY,      // €99/month
      interpretation: process.env.STRIPE_PRICE_INTERPRETATION, // €199/month
      // Legacy names for backwards compatibility
      starter: process.env.STRIPE_PRICE_VISIBILITY,
      pro: process.env.STRIPE_PRICE_INTERPRETATION,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({ 
        message: `Unknown plan '${plan}'. Available: visibility (€99), interpretation (€199)` 
      });
    }

    // Get user's org info
    const { default: Organization } = await import('../models/organizationModel.js');
    const org = await Organization.findById(req.user.orgId);
    
    // Create or get customer
    let customerId = org?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: org?.name || req.user.name,
        metadata: {
          orgId: req.user.orgId?.toString() || '',
          orgSlug: org?.slug || '',
        }
      });
      customerId = customer.id;
      
      // Save customer ID to org
      if (org) {
        await Organization.findByIdAndUpdate(org._id, { stripeCustomerId: customerId });
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      allow_promotion_codes: true,
      payment_method_types: ['card'],
      line_items: [
        { price: priceId, quantity: 1 }
      ],
      metadata: {
        plan: String(plan),
        orgSlug: org?.slug || '',
        orgId: req.user.orgId?.toString() || '',
      },
      subscription_data: {
        metadata: {
          plan: String(plan),
          orgSlug: org?.slug || '',
          orgId: req.user.orgId?.toString() || '',
        }
      },
      success_url: `${process.env.FRONTEND_URL || 'https://signaltrue.ai'}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://signaltrue.ai'}/pricing?payment=cancelled`,
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * POST /api/billing/portal-session
 * Creates Stripe Customer Portal for managing subscription
 */
router.post('/billing/portal-session', authenticateToken, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'Billing not configured.' });
    }

    const { default: Organization } = await import('../models/organizationModel.js');
    const org = await Organization.findById(req.user.orgId);
    
    if (!org?.stripeCustomerId) {
      return res.status(400).json({ message: 'No billing account found. Subscribe first.' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL || 'https://signaltrue.ai'}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/billing/status
 * Get current subscription status for the user's org
 */
router.get('/billing/status', authenticateToken, async (req, res) => {
  try {
    const { default: Organization } = await import('../models/organizationModel.js');
    const org = await Organization.findById(req.user.orgId);
    
    if (!org) {
      return res.json({
        plan: 'trial',
        status: 'active',
        trialDaysRemaining: 30,
        hasActiveSubscription: false,
      });
    }

    const trialEnd = org.trial?.endDate ? new Date(org.trial.endDate) : null;
    const trialDaysRemaining = trialEnd 
      ? Math.max(0, Math.ceil((trialEnd - new Date()) / (1000 * 60 * 60 * 24)))
      : 0;

    const isTrialActive = trialDaysRemaining > 0 && !org.stripeSubscriptionId;
    const hasActiveSubscription = !!org.stripeSubscriptionId && org.subscription?.status === 'active';

    res.json({
      plan: org.subscription?.plan || 'trial',
      status: org.subscription?.status || 'active',
      trialDaysRemaining: isTrialActive ? trialDaysRemaining : 0,
      trialEndDate: org.trial?.endDate,
      hasActiveSubscription,
      isTrialActive,
      canAccessFeatures: isTrialActive || hasActiveSubscription,
    });
  } catch (err) {
    console.error('Billing status error:', err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
