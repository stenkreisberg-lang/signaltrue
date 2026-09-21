import crypto from 'node:crypto';
import express from 'express';
import Analytics from '../models/analytics.js';
import Lead from '../models/lead.js';

const router = express.Router();
const SIGNATURE_TOLERANCE_SECONDS = 180;
const LEAD_TRACKING_PATTERN = /^stlead_([a-f\d]{24})$/i;
const SUPPORTED_EVENTS = new Set(['invitee.created', 'invitee.canceled']);

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
  if (!SUPPORTED_EVENTS.has(eventName)) {
    return { ignored: true, reason: 'unsupported_event' };
  }

  const rescheduled = eventName === 'invitee.canceled' && Boolean(body?.payload?.rescheduled);
  const analyticsEvent =
    eventName === 'invitee.created'
      ? 'calendly_booking_created'
      : rescheduled
        ? 'calendly_booking_rescheduled'
        : 'calendly_booking_canceled';

  const payload = body?.payload && typeof body.payload === 'object' ? body.payload : {};
  const inviteeUri = safeText(payload.uri, 1024);
  const eventUri = safeText(payload.event, 1024);
  if (!inviteeUri || !eventUri) return { ignored: true, reason: 'missing_resource_uri' };

  const dedupeKey = `calendly:${analyticsEvent}:${inviteeUri}`;
  const duplicate = await AnalyticsModel.findOne({ dedupeKey });
  if (duplicate) return { duplicate: true, analyticsEvent };

  const { lead, matchedBy } = await findLeadForInvitee(payload, LeadModel, now);
  const signalTrueTracked = trackedValue(payload, 'utm_source') === 'signaltrue';
  if (!lead && !signalTrueTracked) {
    return { ignored: true, reason: 'unattributed_booking' };
  }

  const createdAt = body?.created_at ? new Date(body.created_at) : now;
  const effectiveAt = Number.isNaN(createdAt.getTime()) ? now : createdAt;
  const status = eventName === 'invitee.created' ? 'scheduled' : 'canceled';

  if (lead && !rescheduled) {
    lead.calendly = {
      eventUri,
      inviteeUri,
      status,
      bookedAt:
        status === 'scheduled' ? effectiveAt : lead.calendly?.bookedAt || undefined,
      canceledAt: status === 'canceled' ? effectiveAt : undefined,
      rescheduled,
      utmSource: trackedValue(payload, 'utm_source'),
      utmMedium: trackedValue(payload, 'utm_medium'),
      utmCampaign: trackedValue(payload, 'utm_campaign'),
      matchedBy,
    };
    await lead.save();
  } else if (lead && rescheduled && lead.calendly) {
    lead.calendly.rescheduled = true;
    await lead.save();
  }

  const analytics = new AnalyticsModel({
    eventName: analyticsEvent,
    occurredAt: effectiveAt,
    dedupeKey,
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
  try {
    await analytics.save();
  } catch (error) {
    if (error?.code === 11000) {
      return { duplicate: true, analyticsEvent };
    }
    throw error;
  }

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
