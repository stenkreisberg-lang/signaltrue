import express from 'express';
import Stripe from 'stripe';
import Analytics from '../models/analytics.js';

const router = express.Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2026-07-29.dahlia', maxNetworkRetries: 2 });
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

  if (!webhookSecret && process.env.NODE_ENV === 'production') {
    console.error('Stripe webhook rejected: STRIPE_WEBHOOK_SECRET is not configured.');
    return res.status(503).json({ message: 'Webhook verification is not configured.' });
  }

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
        // Persist mapping between organization and Stripe IDs, if metadata provided
        try {
          const { default: Organization } = await import('../models/organizationModel.js');
          const meta = session.metadata || {};
          const rawPlan = (meta.plan || '').toString();
          const planMap = {
            visibility: 'team',
            interpretation: 'leadership',
            per_manager: 'team',
            starter: 'team',
            pro: 'leadership',
            professional: 'leadership',
            enterprise: 'custom',
          };
          const normalizedPlan = planMap[rawPlan] || 'team';
          const customerId = session.customer;
          const subscriptionId = session.subscription;
          const orgSlug = (meta.orgSlug || 'default').toString().toLowerCase();
          const orgId = (meta.orgId || '').toString();

          // Upsert organization by slug
          const update = {
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            subscriptionPlanId: normalizedPlan,
            subscription: {
              plan: normalizedPlan,
              status: 'active',
            },
          };

          await Organization.findOneAndUpdate(
            orgId ? { _id: orgId } : { slug: orgSlug },
            {
              $setOnInsert: {
                name:
                  orgSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ||
                  'Default Org',
                industry: 'General',
              },
              $set: update,
            },
            { upsert: true, returnDocument: 'after' }
          );
          await Analytics.updateOne(
            {
              eventName: 'subscription_started',
              'payload.checkoutSessionId': session.id,
            },
            {
              $setOnInsert: {
                eventName: 'subscription_started',
                payload: {
                  plan: rawPlan || normalizedPlan,
                  organizationId: orgId,
                  checkoutSessionId: session.id,
                  subscriptionId,
                  timestamp: new Date().toISOString(),
                },
              },
            },
            { upsert: true }
          );
        } catch (e) {
          console.error('Webhook persist error (checkout.session.completed):', e.message);
        }
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
        // Update subscription status in your DB
        try {
          const { default: Organization } = await import('../models/organizationModel.js');
          // Map Stripe status to app status
          const statusMap = {
            trialing: 'active',
            active: 'active',
            past_due: 'inactive',
            unpaid: 'inactive',
            canceled: 'inactive',
            incomplete: 'inactive',
            incomplete_expired: 'inactive',
            paused: 'suspended',
          };
          const appStatus = statusMap[sub.status] || 'inactive';
          await Organization.findOneAndUpdate(
            { stripeCustomerId: sub.customer },
            {
              $set: {
                stripeSubscriptionId: sub.id,
                'subscription.status': appStatus,
                'subscription.expiresAt': sub.cancel_at
                  ? new Date(sub.cancel_at * 1000)
                  : undefined,
              },
            }
          );

          // If subscription has a default payment method, save the card details
          if (sub.default_payment_method) {
            try {
              const pm = await stripe.paymentMethods.retrieve(sub.default_payment_method);
              if (pm.card) {
                await Organization.findOneAndUpdate(
                  { stripeCustomerId: sub.customer },
                  {
                    $set: {
                      'paymentMethod.last4': pm.card.last4,
                      'paymentMethod.brand': pm.card.brand,
                      'paymentMethod.expiryMonth': pm.card.exp_month,
                      'paymentMethod.expiryYear': pm.card.exp_year,
                      'paymentMethod.expiryReminderSent': false, // Reset when card updated
                    },
                  }
                );
                console.log(`💳 Saved card ending ${pm.card.last4} for customer ${sub.customer}`);
              }
            } catch (pmErr) {
              console.error('Failed to fetch/save payment method:', pmErr.message);
            }
          }
        } catch (e) {
          console.error('Webhook persist error (subscription.*):', e.message);
        }
        console.log(`ℹ️ Subscription event (${event.type}):`, {
          id: sub.id,
          status: sub.status,
          customer: sub.customer,
          current_period_end: sub.current_period_end,
        });
        break;
      }
      case 'payment_method.attached': {
        // When a new payment method is attached to a customer
        const pm = event.data.object;
        if (pm.card && pm.customer) {
          try {
            const { default: Organization } = await import('../models/organizationModel.js');
            await Organization.findOneAndUpdate(
              { stripeCustomerId: pm.customer },
              {
                $set: {
                  'paymentMethod.last4': pm.card.last4,
                  'paymentMethod.brand': pm.card.brand,
                  'paymentMethod.expiryMonth': pm.card.exp_month,
                  'paymentMethod.expiryYear': pm.card.exp_year,
                  'paymentMethod.expiryReminderSent': false, // Reset reminder when new card added
                },
              }
            );
            console.log(
              `💳 Payment method attached: **** ${pm.card.last4} exp ${pm.card.exp_month}/${pm.card.exp_year}`
            );
          } catch (e) {
            console.error('Webhook persist error (payment_method.attached):', e.message);
          }
        }
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
