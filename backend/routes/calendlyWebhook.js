import crypto from 'node:crypto';
import express from 'express';
import Analytics from '../models/analytics.js';
import Lead from '../models/lead.js';

const router = express.Router();
const SIGNATURE_TOLERANCE_SECONDS = 180;
const LEAD_TRACKING_PATTERN = /^stlead_([a-f\d]{24})$/i;
const SUPPORTED_EVENTS = new Map([
  ['invitee.created', 'calendly_booking_created'],
  ['invitee.canceled', 'calendly_booking_canceled'],
]);

function safeText(value, maxLength = 512) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function signatureParts(header = '') {
  return String(header)
    .split(',')
    .map((part) => part.trim().split('=', 2))
    .reduce((result, [key, value]) => {
      if (key && value) result[key] = value;
      return result;
    }, {});
}

export function verifyCalendlyWebhookSignature(
  rawBody,
  signatureHeader,
  secret,
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = SIGNATURE_TOLERANCE_SECONDS
) {
  if (!Buffer.isBuffer(rawBody) || !secret || !signatureHeader) return false;
  const { t, v1 } = signatureParts(signatureHeader);
  const timestamp = Number(t);
  if (!Number.isFinite(timestamp) || !v1) return false;
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${rawBody.toString('utf8')}`)
    .digest('hex');

  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(v1, 'utf8');
  return (
    expectedBuffer.length === providedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export function trackedLeadIdFromCalendlyPayload(payload = {}) {
  const utmContent = safeText(payload?.tracking?.utm_content, 255);
  const match = LEAD_TRACKING_PATTERN.exec(utmContent);
  return match ? match[1] : null;
}

function trackedValue(payload, key) {
  return safeText(payload?.tracking?.[key], 255) || null;
}

async function findLeadForInvitee(payload, LeadModel, now = new Date()) {
  const trackedLeadId = trackedLeadIdFromCalendlyPayload(payload);
  if (trackedLeadId) {
    const lead = await LeadModel.findById(trackedLeadId);
    if (lead) return { lead, matchedBy: 'tracking_id' };
  }

  const email = safeText(payload?.email, 320).toLowerCase();
  if (!email) return { lead: null, matchedBy: null };
  const createdAt = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
  const query = LeadModel.findOne({ email, createdAt });
  const lead = typeof query?.sort === 'function' ? await query.sort({ createdAt: -1 }) : await query;
  return { lead: lead || null, matchedBy: lead ? 'recent_email' : null };
}

export async function processCalendlyWebhookEvent(
  body,
  { AnalyticsModel = Analytics, LeadModel = Lead, now = new Date() } = {}
) {
  const eventName = safeText(body?.event, 64);
  const analyticsEvent = SUPPORTED_EVENTS.get(eventName);
  if (!analyticsEvent) return { ignored: true, reason: 'unsupported_event' };

  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
  const inviteeUri = safeText(payload.uri, 1024);
  const eventUri = safeText(payload.event, 1024);
  if (!inviteeUri || !eventUri) return { ignored: true, reason: 'missing_resource_uri' };

  const duplicate = await AnalyticsModel.findOne({
    eventName: analyticsEvent,
    'payload.inviteeUri': inviteeUri,
  });
  if (duplicate) return { duplicate: true, analyticsEvent };

  const { lead, matchedBy } = await findLeadForInvitee(payload, LeadModel, now);
  const createdAt = body?.created_at ? new Date(body.created_at) : now;
  const effectiveAt = Number.isNaN(createdAt.getTime()) ? now : createdAt;
  const status = eventName === 'invitee.created' ? 'scheduled' : 'canceled';

  if (lead) {
    lead.calendly = {
      eventUri,
      inviteeUri,
      status,
      bookedAt:
        status === 'scheduled' ? effectiveAt : lead.calendly?.bookedAt || undefined,
      canceledAt: status === 'canceled' ? effectiveAt : undefined,
      rescheduled: Boolean(payload.rescheduled),
      utmSource: trackedValue(payload, 'utm_source'),
      utmMedium: trackedValue(payload, 'utm_medium'),
      utmCampaign: trackedValue(payload, 'utm_campaign'),
      matchedBy,
    };
    await lead.save();
  }

  const analytics = new AnalyticsModel({
    eventName: analyticsEvent,
    payload: {
      leadId: lead?._id ? String(lead._id) : null,
      matchedLead: Boolean(lead),
      matchedBy,
      eventUri,
      inviteeUri,
      rescheduled: Boolean(payload.rescheduled),
      utmSource: trackedValue(payload, 'utm_source'),
      utmMedium: trackedValue(payload, 'utm_medium'),
      utmCampaign: trackedValue(payload, 'utm_campaign'),
      occurredAt: effectiveAt.toISOString(),
      source: 'calendly_webhook',
    },
  });
  await analytics.save();

  return {
    accepted: true,
    analyticsEvent,
    matchedLead: Boolean(lead),
    leadId: lead?._id ? String(lead._id) : null,
  };
}

router.post('/', async (req, res) => {
  const secret = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!secret) {
    return res.status(503).json({
      success: false,
      code: 'calendly_webhook_not_configured',
    });
  }

  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('');
  const signature = req.get('calendly-webhook-signature') || '';
  if (!verifyCalendlyWebhookSignature(rawBody, signature, secret)) {
    return res.status(401).json({ success: false, code: 'invalid_signature' });
  }

  let body;
  try {
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, code: 'invalid_json' });
  }

  try {
    const result = await processCalendlyWebhookEvent(body);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Calendly webhook processing failed:', error);
    return res.status(500).json({ success: false, code: 'processing_failed' });
  }
});

export default router;
