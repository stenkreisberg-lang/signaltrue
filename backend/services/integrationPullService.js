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
    console.log(`ℹ️ [Pull] Google calendar: ${count} upcoming events for org ${org.slug || org._id}`);
  // Use findByIdAndUpdate instead of org.save() to work with both lean and non-lean docs
  await Organization.findByIdAndUpdate(org._id, {
    $set: {
      'integrations.google.lastPulledAt': new Date(),
      'integrations.google.eventsCount': count,
      'integrations.google.sync.lastStatus': 'ok',
      'integrations.google.sync.lastRunAt': new Date(),
    }
  });
  return { ok: true, events: count };
  } catch (e) {
    console.error(`❌ [Pull] Google data failed for org ${org?.slug || org?._id}:`, e.message);
    if (org?._id) {
      await Organization.findByIdAndUpdate(org._id, {
        $set: {
          'integrations.google.sync.lastStatus': 'error',
          'integrations.google.sync.lastRunAt': new Date(),
        }
      }).catch(() => {});
    }
    return { ok: false, error: e.message };
  }
}

// Placeholder: In a future iteration, pull real data from Microsoft Graph using org.integrations.microsoft.accessToken
export async function pullMicrosoftOrgData(org) {
  try {
  if (!org?.integrations?.microsoft?.accessToken) return { skipped: true };
  const token = decryptString(org.integrations.microsoft.accessToken);
    // Outlook events — always try (token may have Calendars.Read even if scope says 'teams')
    let eventsCount = 0;
    try {
      const evRes = await fetch('https://graph.microsoft.com/v1.0/me/events?$top=25&$select=subject,organizer,start,end', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (evRes.ok) {
        const ev = await evRes.json();
        if (Array.isArray(ev.value)) eventsCount = ev.value.length;
      }
    } catch (e) {
      console.warn(`[Pull] Microsoft Outlook events error for org ${org.slug || org._id}:`, e.message);
    }
    // Teams joined — always try
    let teamsCount = 0;
    try {
      const teamRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams?$top=25&$select=id,displayName', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (teamRes.ok) {
        const tv = await teamRes.json();
        if (Array.isArray(tv.value)) teamsCount = tv.value.length;
      }
    } catch (e) {
      console.warn(`[Pull] Microsoft Teams error for org ${org.slug || org._id}:`, e.message);
    }
    console.log(`ℹ️ [Pull] Microsoft: ${eventsCount} events, ${teamsCount} joined teams for org ${org.slug || org._id}`);
  // Use findByIdAndUpdate instead of org.save() to work with both lean and non-lean docs
  await Organization.findByIdAndUpdate(org._id, {
    $set: {
      'integrations.microsoft.lastPulledAt': new Date(),
      'integrations.microsoft.eventsCount': eventsCount,
      'integrations.microsoft.teamsCount': teamsCount,
      'integrations.microsoft.sync.lastStatus': 'ok',
      'integrations.microsoft.sync.lastRunAt': new Date(),
    }
  });
  return { ok: true, events: eventsCount, teams: teamsCount };
  } catch (e) {
    console.error(`❌ [Pull] Microsoft data failed for org ${org?.slug || org?._id}:`, e.message);
    if (org?._id) {
      await Organization.findByIdAndUpdate(org._id, {
        $set: {
          'integrations.microsoft.sync.lastStatus': 'error',
          'integrations.microsoft.sync.lastRunAt': new Date(),
        }
      }).catch(() => {});
    }
    return { ok: false, error: e.message };
  }
}

export async function pullAllConnectedOrgs() {
  const orgs = await Organization.find({
    $or: [
      { 'integrations.google.accessToken': { $exists: true, $ne: '' } },
      { 'integrations.googleChat.accessToken': { $exists: true, $ne: '' } },
      { 'integrations.microsoft.accessToken': { $exists: true, $ne: '' } },
    ],
  });
  for (const org of orgs) {
    await pullGoogleOrgData(org);
    await pullMicrosoftOrgData(org);
  }
  
  // Pull Google Chat data for all teams
  await refreshAllTeamsFromGoogleChat();
}
