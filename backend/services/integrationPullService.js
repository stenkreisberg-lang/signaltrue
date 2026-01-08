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
    console.log(`ℹ️ [Pull] Google calendar: ${count} upcoming events for org ${org.slug}`);
  org.integrations.google.lastPulledAt = new Date();
  org.integrations.google.eventsCount = count;
  org.integrations.google.sync = org.integrations.google.sync || {};
  org.integrations.google.sync.lastStatus = 'ok';
  org.integrations.google.sync.lastRunAt = new Date();
  await org.save();
  return { ok: true, events: count };
  } catch (e) {
    console.error(`❌ [Pull] Google data failed for org ${org?.slug}:`, e.message);
    if (org?.integrations?.google) {
      org.integrations.google.sync = org.integrations.google.sync || {};
      org.integrations.google.sync.lastStatus = 'error';
      org.integrations.google.sync.lastRunAt = new Date();
      await org.save().catch(() => {});
    }
    return { ok: false, error: e.message };
  }
}

// Placeholder: In a future iteration, pull real data from Microsoft Graph using org.integrations.microsoft.accessToken
export async function pullMicrosoftOrgData(org) {
  try {
  if (!org?.integrations?.microsoft?.accessToken) return { skipped: true };
  const token = decryptString(org.integrations.microsoft.accessToken);
    // Outlook events
    const evRes = await fetch('https://graph.microsoft.com/v1.0/me/events?$top=25&$select=subject,organizer,start,end', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let eventsCount = 0;
    if (evRes.ok) {
      const ev = await evRes.json();
      if (Array.isArray(ev.value)) eventsCount = ev.value.length;
    }
    // Teams joined (simple metadata)
    const teamRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams?$top=25&$select=id,displayName', {
      headers: { Authorization: `Bearer ${token}` }
    });
    let teamsCount = 0;
    if (teamRes.ok) {
      const tv = await teamRes.json();
      if (Array.isArray(tv.value)) teamsCount = tv.value.length;
    }
    console.log(`ℹ️ [Pull] Microsoft: ${eventsCount} events, ${teamsCount} joined teams for org ${org.slug}`);
  org.integrations.microsoft.lastPulledAt = new Date();
  org.integrations.microsoft.eventsCount = eventsCount;
  org.integrations.microsoft.teamsCount = teamsCount;
  org.integrations.microsoft.sync = org.integrations.microsoft.sync || {};
  org.integrations.microsoft.sync.lastStatus = 'ok';
  org.integrations.microsoft.sync.lastRunAt = new Date();
  await org.save();
  return { ok: true, events: eventsCount, teams: teamsCount };
  } catch (e) {
    console.error(`❌ [Pull] Microsoft data failed for org ${org?.slug}:`, e.message);
    if (org?.integrations?.microsoft) {
      org.integrations.microsoft.sync = org.integrations.microsoft.sync || {};
      org.integrations.microsoft.sync.lastStatus = 'error';
      org.integrations.microsoft.sync.lastRunAt = new Date();
      await org.save().catch(() => {});
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
