/**
 * One-click responses to the weekly brief.
 *
 * The reader is in an inbox, not signed in, so each link carries a signature
 * derived from the server secret. That keeps the endpoint usable from email
 * while preventing anyone from recording responses for an organization by
 * guessing its id.
 */
import express from 'express';
import crypto from 'crypto';
import BriefResponse from '../models/briefResponse.js';

const router = express.Router();

const VALID_RESPONSES = ['useful', 'not_useful', 'nothing_to_act_on', 'acted_outside_tool'];

const CONFIRMATION = {
  useful: 'Thanks — noted that this week’s brief was useful.',
  not_useful: 'Thanks — noted that this week’s brief missed the mark.',
  nothing_to_act_on: 'Thanks — recorded that there was nothing to act on this week.',
  acted_outside_tool: 'Thanks — recorded that you acted on this outside SignalTrue.',
};

function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required to sign brief response links');
  return secret;
}

export function signBriefResponse(orgId, weekKey, response) {
  return crypto
    .createHmac('sha256', signingKey())
    .update(`${orgId}.${weekKey}.${response}`)
    .digest('hex')
    .slice(0, 32);
}

export function buildBriefResponseUrl(orgId, weekKey, response) {
  const base = process.env.BACKEND_URL || 'https://signaltrue-backend.onrender.com';
  const signature = signBriefResponse(orgId, weekKey, response);
  const params = new URLSearchParams({
    org: String(orgId),
    week: weekKey,
    response,
    sig: signature,
  });
  return `${base}/api/brief-response?${params.toString()}`;
}

function page(message) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SignalTrue</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;"><div style="max-width:420px;text-align:center;"><p style="font-size:17px;line-height:1.6;">${message}</p></div></body></html>`;
}

router.get('/', async (req, res) => {
  const { org, week, response, sig } = req.query;

  if (!org || !week || !response || !sig || !VALID_RESPONSES.includes(String(response))) {
    return res.status(400).send(page('That link is not valid.'));
  }

  let expected;
  try {
    expected = signBriefResponse(org, week, response);
  } catch {
    return res.status(500).send(page('That link could not be checked right now.'));
  }

  const provided = Buffer.from(String(sig));
  const expectedBuffer = Buffer.from(expected);
  const valid =
    provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
  if (!valid) {
    return res.status(403).send(page('That link is not valid.'));
  }

  try {
    // One response per organization per week: a second click updates rather
    // than stacking duplicates.
    await BriefResponse.findOneAndUpdate(
      { orgId: org, weekKey: String(week) },
      { $set: { response: String(response), viaEmail: true } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  } catch (error) {
    console.error('[BriefResponse] Failed to record:', error.message);
    return res.status(500).send(page('That could not be recorded. Please try again.'));
  }

  res.send(page(CONFIRMATION[String(response)]));
});

export default router;
