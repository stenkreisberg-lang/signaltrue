import express from 'express';
import Stripe from 'stripe';

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// POST /api/billing/create-checkout-session
// Body: { plan: 'starter' | 'pro' | 'enterprise', email?: string }
// Returns: { url } (Stripe Checkout URL)
router.post('/billing/create-checkout-session', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'Billing not configured. Set STRIPE_SECRET_KEY and price IDs.' });
    }

  const { plan = 'starter', email, orgSlug } = req.body || {};

    const priceMap = {
      starter: process.env.STRIPE_PRICE_ID_STARTER,
      pro: process.env.STRIPE_PRICE_ID_PRO || process.env.STRIPE_PRICE_ID_PROFESSIONAL,
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({ message: `Unknown plan or missing price id for '${plan}'.` });
    }

    const trialDays = parseInt(process.env.STRIPE_TRIAL_DAYS || '30', 10);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allow_promotion_codes: true,
      payment_method_collection: 'always', // require card upfront even during trial
      customer_email: email,
      line_items: [
        { price: priceId, quantity: 1 }
      ],
      subscription_data: {
        trial_period_days: trialDays,
      },
      metadata: {
        plan: String(plan),
        orgSlug: orgSlug ? String(orgSlug) : undefined,
      },
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?checkout=success`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/pricing?checkout=cancelled`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
// GET /api/billing/portal-session?customerId=cus_xxx
// Returns: { url }
router.get('/billing/portal-session', async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ message: 'Billing not configured. Set STRIPE_SECRET_KEY.' });
    }

    const { customerId, returnUrl } = req.query;
    if (!customerId) {
      return res.status(400).json({ message: 'customerId is required' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: String(customerId),
      return_url: String(returnUrl || `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`),
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return res.status(500).json({ message: err.message });
  }
});
