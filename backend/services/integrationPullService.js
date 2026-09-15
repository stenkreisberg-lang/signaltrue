import Organization from '../models/organizationModel.js';
import { decryptString } from '../utils/crypto.js';
import { refreshAllTeamsFromGoogleChat } from './googleChatService.js';

// Placeholder: In a future iteration, pull real data from Google APIs using org.integrations.google.accessToken
export async function pullGoogleOrgData(org) {
  try {
    if (!org?.integrations?.google?.accessToken) return { skipped: true };
    const token = decryptString(org.integrations.google.accessToken);
    const now = new Date().toISOString();
    // List next few events from the primary calendar
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', now);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '25');
    const res = await fetch(String(url), { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Calendar API error: ${res.status} ${text}`);
    }
    const data = await res.json();
    const count = Array.isArray(data.items) ? data.items.length : 0;
    console.log(
      `ℹ️ [Pull] Google calendar: ${count} upcoming events for org ${org.slug || org._id}`
    );
    // Use findByIdAndUpdate instead of org.save() to work with both lean and non-lean docs
    await Organization.findByIdAndUpdate(org._id, {
      $set: {
        'integrations.google.lastPulledAt': new Date(),
        'integrations.google.eventsCount': count,
        'integrations.google.sync.lastStatus': 'ok',
        'integrations.google.sync.lastRunAt': new Date(),
      },
    });
    return { ok: true, events: count };
  } catch (e) {
    console.error(`❌ [Pull] Google data failed for org ${org?.slug || org?._id}:`, e.message);
    if (org?._id) {
      await Organization.findByIdAndUpdate(org._id, {
        $set: {
          'integrations.google.sync.lastStatus': 'error',
          'integrations.google.sync.lastRunAt': new Date(),
        },
      }).catch(() => {});
    }
    return { ok: false, error: e.message };
  }
}

// Microsoft is collected exclusively by the application-only adapter in
// integrationSyncScheduler. Keeping this legacy delegated pull as a no-op
// prevents a second scheduler from overwriting truthful permission state.
export async function pullMicrosoftOrgData(org) {
  return {
    skipped: true,
    reason: 'Microsoft collection is managed by the verified application-only scheduler.',
    organizationId: org?._id ? String(org._id) : null,
  };
}

export async function pullAllConnectedOrgs() {
  const orgs = await Organization.find({
    $or: [
      { 'integrations.google.accessToken': { $exists: true, $ne: '' } },
      { 'integrations.googleChat.accessToken': { $exists: true, $ne: '' } },
    ],
  });
  for (const org of orgs) {
    await pullGoogleOrgData(org);
  }

  // Pull Google Chat data for all teams
  await refreshAllTeamsFromGoogleChat();
}
