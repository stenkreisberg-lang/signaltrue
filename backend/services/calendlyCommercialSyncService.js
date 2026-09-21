import { processCalendlyWebhookEvent } from '../routes/calendlyWebhook.js';

const CALENDLY_API_ORIGIN = 'https://api.calendly.com';
const MAX_PAGES = 5;
const PAGE_SIZE = 100;

function isoOffset(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function safeCalendlyUrl(value) {
  const url = new URL(value, CALENDLY_API_ORIGIN);
  if (url.origin !== CALENDLY_API_ORIGIN) {
    throw new Error('Calendly pagination returned an unexpected origin');
  }
  return url;
}

async function calendlyGet(url, token, fetchImpl = fetch) {
  const safeUrl = safeCalendlyUrl(url);
  const response = await fetchImpl(safeUrl, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = new Error(`Calendly API request failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function pagedCollection(firstUrl, token, fetchImpl = fetch) {
  const items = [];
  let next = safeCalendlyUrl(firstUrl).toString();

  for (let page = 0; next && page < MAX_PAGES; page += 1) {
    const payload = await calendlyGet(next, token, fetchImpl);
    items.push(...(Array.isArray(payload?.collection) ? payload.collection : []));
    next = payload?.pagination?.next_page || null;
  }

  return items;
}

function inviteesUrl(eventUri) {
  const eventUrl = safeCalendlyUrl(eventUri);
  const url = new URL(`${eventUrl.pathname.replace(/\/$/, '')}/invitees`, CALENDLY_API_ORIGIN);
  url.searchParams.set('count', String(PAGE_SIZE));
  url.searchParams.set('sort', 'created_at:asc');
  return url.toString();
}

function eventBody(kind, invitee, event, fallbackTime) {
  const isCancellation = kind === 'invitee.canceled';
  const occurredAt =
    (isCancellation && invitee?.cancellation?.created_at) ||
    (isCancellation && invitee?.updated_at) ||
    invitee?.created_at ||
    event?.start_time ||
    fallbackTime.toISOString();

  return {
    event: kind,
    created_at: occurredAt,
    payload: {
      ...invitee,
      event: event.uri,
    },
  };
}

export async function syncCalendlyCommercialBookings({
  token = process.env.CALENDLY_ACCESS_TOKEN,
  now = new Date(),
  fetchImpl = fetch,
  processEvent = processCalendlyWebhookEvent,
} = {}) {
  if (!token) {
    return {
      configured: false,
      mode: 'polling',
      reason: 'CALENDLY_ACCESS_TOKEN is not configured',
      eventsSeen: 0,
      inviteesSeen: 0,
      accepted: 0,
      duplicates: 0,
      ignored: 0,
    };
  }

  const me = await calendlyGet('/users/me', token, fetchImpl);
  const userUri = me?.resource?.uri;
  if (!userUri) throw new Error('Calendly /users/me response did not include a user URI');

  const eventsUrl = new URL('/scheduled_events', CALENDLY_API_ORIGIN);
  eventsUrl.searchParams.set('user', userUri);
  eventsUrl.searchParams.set('min_start_time', isoOffset(now, -90));
  eventsUrl.searchParams.set('max_start_time', isoOffset(now, 365));
  eventsUrl.searchParams.set('count', String(PAGE_SIZE));
  eventsUrl.searchParams.set('sort', 'start_time:asc');

  const events = await pagedCollection(eventsUrl, token, fetchImpl);
  let inviteesSeen = 0;
  let accepted = 0;
  let duplicates = 0;
  let ignored = 0;

  for (const event of events) {
    if (!event?.uri) continue;
    const invitees = await pagedCollection(inviteesUrl(event.uri), token, fetchImpl);

    for (const invitee of invitees) {
      inviteesSeen += 1;

      const createdResult = await processEvent(eventBody('invitee.created', invitee, event, now));
      if (createdResult?.accepted) accepted += 1;
      else if (createdResult?.duplicate) duplicates += 1;
      else ignored += 1;

      if (invitee?.status === 'canceled') {
        const canceledResult = await processEvent(
          eventBody('invitee.canceled', invitee, event, now)
        );
        if (canceledResult?.accepted) accepted += 1;
        else if (canceledResult?.duplicate) duplicates += 1;
        else ignored += 1;
      }
    }
  }

  return {
    configured: true,
    mode: 'polling',
    eventsSeen: events.length,
    inviteesSeen,
    accepted,
    duplicates,
    ignored,
  };
}

export default syncCalendlyCommercialBookings;
