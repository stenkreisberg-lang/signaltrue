import express from 'express';
import Stripe from 'stripe';

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

// Important: The server must configure express.raw for this path BEFORE express.json()
// See server.js where we do: app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }))
router.post('/stripe/webhook', async (req, res) => {
  const stripe = getStripe();
  if (!stripe) {
    return res.status(503).json({ message: 'Billing not configured. Set STRIPE_SECRET_KEY.' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (!webhookSecret) {
      // If no secret is configured, accept the event without verification (dev only).
      // In production, always set STRIPE_WEBHOOK_SECRET.
      event = req.body && req.body.type ? req.body : JSON.parse(req.body?.toString() || '{}');
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    }
  } catch (err) {
    console.error('⚠️  Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        // TODO: persist mapping between your user/org and session.customer / subscription
        console.log('✅ Checkout completed:', {
          customer: session.customer,
          subscription: session.subscription,
          mode: session.mode,
        });
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        // TODO: update subscription status in your DB
        console.log(`ℹ️ Subscription event (${event.type}):`, {
          id: sub.id,
          status: sub.status,
          customer: sub.customer,
          current_period_end: sub.current_period_end,
        });
        break;
      }
      default:
        // For unhandled events, just log
        console.log(`➡️  Unhandled event type: ${event.type}`);
    }

    // Return a 200 to acknowledge receipt of the event
    res.json({ received: true });
  } catch (err) {
    console.error('❌ Webhook handler error:', err.message);
    res.status(500).json({ message: 'Webhook handler error' });
  }
});

export default router;
