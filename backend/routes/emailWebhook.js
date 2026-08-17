/**
 * Email delivery/engagement webhook (Resend).
 *
 * Turns "we sent it" into "it was delivered, opened, clicked, or bounced".
 * Without this, a brief nobody reads is indistinguishable from one that was
 * read and found unhelpful — which are opposite problems.
 *
 * Mounted with express.raw so the exact bytes are available for signature
 * verification. Requires RESEND_WEBHOOK_SECRET; without it the endpoint
 * rejects everything rather than trusting unsigned input.
 */
import express from 'express';
import crypto from 'crypto';
import EmailEvent from '../models/emailEvent.js';

const router = express.Router();

// Resend signs with Svix: base64 HMAC-SHA256 over "<id>.<timestamp>.<body>".
function verifySignature(req, rawBody) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return { ok: false, reason: 'RESEND_WEBHOOK_SECRET is not configured' };

  const id = req.headers['svix-id'];
  const timestamp = req.headers['svix-timestamp'];
  const signatureHeader = req.headers['svix-signature'];
  if (!id || !timestamp || !signatureHeader) {
    return { ok: false, reason: 'missing signature headers' };
  }

  // Reject stale deliveries so a captured request cannot be replayed later.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    return { ok: false, reason: 'timestamp outside tolerance' };
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64');

  // The header may carry several space-separated "v1,<signature>" values.
  const provided = String(signatureHeader)
    .split(' ')
    .map((part) => part.split(',')[1])
    .filter(Boolean);

  const expectedBuffer = Buffer.from(expected);
  const matches = provided.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate);
    return (
      candidateBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(candidateBuffer, expectedBuffer)
    );
  });

  return matches ? { ok: true } : { ok: false, reason: 'signature mismatch' };
}

const EVENT_MAP = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
  'email.failed': 'failed',
};

function hashRecipient(email) {
  if (!email) return null;
  return crypto.createHash('sha256').update(String(email).toLowerCase()).digest('hex').slice(0, 32);
}

router.post('/resend', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);

  const verification = verifySignature(req, rawBody);
  if (!verification.ok) {
    console.warn(`[EmailWebhook] Rejected delivery: ${verification.reason}`);
    return res.status(401).json({ received: false });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ received: false });
  }

  const event = EVENT_MAP[payload?.type];
  if (!event) {
    // Unknown event types are acknowledged so the provider stops retrying.
    return res.json({ received: true, ignored: payload?.type || 'unknown' });
  }

  try {
    const data = payload.data || {};
    // Tags carry the context we set at send time.
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const tagValue = (name) => tags.find((tag) => tag.name === name)?.value || null;
    const recipient = Array.isArray(data.to) ? data.to[0] : data.to;

    await EmailEvent.create({
      providerMessageId: data.email_id || data.id || null,
      emailType: tagValue('email_type'),
      orgId: tagValue('org_id') || null,
      recipientHash: hashRecipient(recipient),
      event,
      linkUrl: data.click?.link || null,
      occurredAt: payload.created_at ? new Date(payload.created_at) : new Date(),
    });
  } catch (error) {
    console.error('[EmailWebhook] Failed to record event:', error.message);
    // Acknowledge anyway: a storage failure should not cause endless retries.
  }

  res.json({ received: true });
});

export default router;
