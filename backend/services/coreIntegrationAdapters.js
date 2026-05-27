/**
 * Core Integration Adapters for Slack, Microsoft (Outlook/Teams), and Google Calendar
 *
 * These adapters sync data from organization-level OAuth tokens stored in
 * Organization.integrations and create WorkEvent documents for analytics.
 */

import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';
import User from '../models/user.js';
import { decryptString, encryptString } from '../utils/crypto.js';
import { getMicrosoftAppToken } from './tokenService.js';
import mongoose from 'mongoose';

// ============================================================
// BASE CLASS FOR ORG-LEVEL INTEGRATIONS
// ============================================================

class OrgIntegrationAdapter {
  constructor(source) {
    this.source = source;
  }

  /**
   * Get access token from Organization.integrations (refreshing if needed)
   */
  async getAccessToken(orgId) {
    const org = await Organization.findById(orgId).lean();
    if (!org) throw new Error(`Organization not found: ${orgId}`);

    const integration = this.getIntegrationData(org);
    if (!integration?.accessToken) {
      throw new Error(`${this.source} not connected for org ${orgId}`);
    }

    // Check if token is expired
    if (integration.expiry && new Date(integration.expiry) <= new Date()) {
      if (integration.refreshToken) {
        return await this.refreshToken(org, integration);
      }
      throw new Error(`${this.source} token expired and no refresh token available`);
    }

    return decryptString(integration.accessToken);
  }

  /**
   * Override in subclass to get the right integrations path
   */
  getIntegrationData(org) {
    throw new Error('getIntegrationData must be implemented');
  }

  /**
   * Override in subclass to refresh the token
   */
  async refreshToken(org, integration) {
    throw new Error('refreshToken must be implemented');
  }

  /**
   * Main sync function
   */
  async sync(orgId, since, until) {
    const startTime = Date.now();
    console.log(
      `[${this.source}] Starting sync for org ${orgId} from ${since.toISOString()} to ${until.toISOString()}`
    );

    try {
      const accessToken = await this.getAccessToken(orgId);
      const rawEvents = await this.fetchEvents(orgId, accessToken, since, until);

      console.log(`[${this.source}] Fetched ${rawEvents.length} raw events`);

      if (rawEvents.length === 0) {
        return {
          success: true,
          source: this.source,
          eventsProcessed: 0,
          duration: Date.now() - startTime,
        };
      }

      // Transform to WorkEvents
      const workEvents = await this.transformToWorkEvents(rawEvents, orgId);

      // Bulk upsert to avoid duplicates
      const bulkOps = workEvents.map((event) => ({
        updateOne: {
          filter: { externalId: event.externalId, source: event.source },
          update: { $set: event },
          upsert: true,
        },
      }));

      let upserted = 0,
        modified = 0;
      if (bulkOps.length > 0) {
        const result = await WorkEvent.bulkWrite(bulkOps, { ordered: false });
        upserted = result.upsertedCount || 0;
        modified = result.modifiedCount || 0;
      }

      console.log(`[${this.source}] Saved ${upserted} new, ${modified} updated events`);

      // Update sync timestamp in org
      await this.updateSyncStatus(orgId, true, rawEvents.length);

      return {
        success: true,
        source: this.source,
        eventsProcessed: rawEvents.length,
        eventsCreated: upserted,
        eventsUpdated: modified,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`[${this.source}] Sync error for org ${orgId}:`, error.message);
      await this.updateSyncStatus(orgId, false, 0, error.message);
      return { success: false, source: this.source, error: error.message };
    }
  }

  async updateSyncStatus(orgId, success, count, error = null) {
    // Override in subclass
  }

  async fetchEvents(orgId, accessToken, since, until) {
    throw new Error('fetchEvents must be implemented');
  }

  async transformToWorkEvents(rawEvents, orgId) {
    throw new Error('transformToWorkEvents must be implemented');
  }
}

// ============================================================
// SLACK ADAPTER
// ============================================================

export class SlackAdapter extends OrgIntegrationAdapter {
  constructor() {
    super('slack');
  }

  getIntegrationData(org) {
    return org.integrations?.slack;
  }

  async updateSyncStatus(orgId, success, count, error = null) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.slack.sync.lastSync': new Date(),
        'integrations.slack.sync.status': success ? 'success' : 'error',
        'integrations.slack.sync.error': error,
        'integrations.slack.sync.eventsCount': count,
      },
    });
  }

  async fetchEvents(orgId, accessToken, since, until) {
    const allMessages = [];

    // Get list of channels
    const channelsRes = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100',
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const channelsData = await channelsRes.json();

    if (!channelsData.ok) {
      console.warn('Slack channels fetch failed:', channelsData.error);
      return [];
    }

    const channels = channelsData.channels || [];
    const oldestTs = Math.floor(since.getTime() / 1000);
    const latestTs = Math.floor(until.getTime() / 1000);

    // Fetch messages from each channel (limit to first 5 channels for performance)
    for (const channel of channels.slice(0, 5)) {
      try {
        const historyRes = await fetch(
          `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${oldestTs}&latest=${latestTs}&limit=200`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const historyData = await historyRes.json();

        if (historyData.ok && historyData.messages) {
          const messages = historyData.messages.map((m) => ({
            ...m,
            channelId: channel.id,
            channelName: channel.name,
          }));
          allMessages.push(...messages);
        }
      } catch (err) {
        console.warn(`Failed to fetch Slack channel ${channel.id}:`, err.message);
      }
    }

    return allMessages;
  }

  async transformToWorkEvents(rawMessages, orgId) {
    return rawMessages.map((msg) => ({
      orgId: new mongoose.Types.ObjectId(orgId),
      source: 'slack',
      eventType: 'message',
      externalId: `slack-${msg.ts}`,
      timestamp: new Date(parseFloat(msg.ts) * 1000),
      metadata: {
        channelId: msg.channelId,
        channelName: msg.channelName,
        userId: msg.user,
        threadTs: msg.thread_ts,
        hasReactions: (msg.reactions?.length || 0) > 0,
        messageLength: msg.text?.length || 0,
        isReply: !!msg.thread_ts,
      },
      raw: { text: msg.text?.substring(0, 500) }, // Truncate for storage
    }));
  }
}

// ============================================================
// MICROSOFT ADAPTER (Outlook Calendar + Teams)
// ============================================================

export class MicrosoftAdapter extends OrgIntegrationAdapter {
  constructor() {
    super('microsoft');
  }

  getIntegrationData(org) {
    return org.integrations?.microsoft;
  }

  async refreshToken(org, integration) {
    const refreshToken = decryptString(integration.refreshToken);
    // Use the org's own tenant ID (stored at OAuth time) so multi-tenant clients work correctly.
    // Fall back to 'common' which Microsoft resolves from the refresh token itself.
    const tenant = integration.tenantId || org.integrations?.microsoft?.tenantId || 'common';

    const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MS_APP_CLIENT_ID,
        client_secret: process.env.MS_APP_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token refresh failed: ${error}`);
    }

    const tokens = await response.json();

    await Organization.findByIdAndUpdate(org._id, {
      $set: {
        'integrations.microsoft.accessToken': encryptString(tokens.access_token),
        'integrations.microsoft.refreshToken': tokens.refresh_token
          ? encryptString(tokens.refresh_token)
          : integration.refreshToken,
        'integrations.microsoft.expiry': new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return tokens.access_token;
  }

  async updateSyncStatus(orgId, success, count, error = null) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.microsoft.sync.lastSync': new Date(),
        'integrations.microsoft.sync.status': success ? 'success' : 'error',
        'integrations.microsoft.sync.error': error,
        'integrations.microsoft.sync.eventsCount': count,
      },
    });
  }

  async fetchEvents(orgId, accessToken, since, until) {
    const org = await Organization.findById(orgId).lean();
    const scope = org.integrations?.microsoft?.scope || 'outlook';

    if (scope === 'both') {
      // Fetch both Outlook calendar events and Teams messages
      const [outlookEvents, teamsMessages] = await Promise.all([
        this.fetchOutlookEvents(accessToken, since, until, orgId).catch((err) => {
          console.warn('[Microsoft] Outlook fetch failed:', err.message);
          return [];
        }),
        this.fetchTeamsMessages(accessToken, since, until).catch((err) => {
          console.warn('[Microsoft] Teams fetch failed:', err.message);
          return [];
        }),
      ]);
      return [...outlookEvents, ...teamsMessages];
    } else if (scope === 'outlook') {
      return await this.fetchOutlookEvents(accessToken, since, until, orgId);
    } else {
      return await this.fetchTeamsMessages(accessToken, since, until);
    }
  }

  async fetchOutlookEvents(delegatedToken, since, until, orgId = null) {
    const allEvents = [];
    const select =
      '$select=id,subject,start,end,organizer,attendees,isOnlineMeeting,isAllDay,showAs,location,recurrence&$top=100';

    // ── STRATEGY 1: App-only token (Calendars.Read application permission) ──
    // This is the correct approach: the app authenticates with its own identity
    // and reads every user's calendar directly.
    // Requires "Calendars.Read" APPLICATION permission granted in Azure AD.
    let appTokenWorked = false;
    if (orgId) {
      try {
        const org = await Organization.findById(orgId)
          .select('integrations.microsoft.tenantId')
          .lean();
        const tenantId = org?.integrations?.microsoft?.tenantId || process.env.MS_APP_TENANT;
        if (!tenantId) {
          console.warn('[Microsoft] No tenantId available for app-only token');
        } else {
          const appToken = await getMicrosoftAppToken(tenantId);
          if (appToken) {
            const orgUsers = await User.find({
              orgId,
              'externalIds.microsoftUserId': { $exists: true, $ne: null },
            })
              .select('_id email externalIds')
              .lean();

            if (orgUsers.length > 0) {
              console.log(`[Microsoft][AppOnly] Fetching calendars for ${orgUsers.length} users`);
              let successCount = 0;
              let failCount = 0;
              for (const user of orgUsers) {
                const msId = user.externalIds?.microsoftUserId;
                if (!msId) continue;
                try {
                  const url = `https://graph.microsoft.com/v1.0/users/${msId}/calendarview?startDateTime=${since.toISOString()}&endDateTime=${until.toISOString()}&${select}`;
                  const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${appToken}` },
                  });
                  if (res.ok) {
                    const data = await res.json();
                    const events = (data.value || []).map((e) => ({
                      ...e,
                      eventSource: 'outlook',
                      _internalUserId: user._id,
                      _userEmail: user.email,
                    }));
                    allEvents.push(...events);
                    successCount++;
                  } else {
                    const errText = await res.text();
                    if (res.status === 403) {
                      // App permission not yet granted — bail out of the loop early
                      console.warn(
                        `[Microsoft][AppOnly] 403 for ${user.email} — Calendars.Read application permission may not be granted yet`
                      );
                      failCount++;
                      if (failCount >= 3) {
                        console.warn(
                          '[Microsoft][AppOnly] Multiple 403s — app permission not available, switching to attendee expansion'
                        );
                        break;
                      }
                    } else {
                      console.warn(
                        `[Microsoft][AppOnly] calendarview failed for ${user.email}: ${res.status} ${errText.slice(0, 150)}`
                      );
                      failCount++;
                    }
                  }
                } catch (userErr) {
                  console.warn(`[Microsoft][AppOnly] error for ${user.email}:`, userErr.message);
                }
              }
              if (successCount > 0) {
                appTokenWorked = true;
                console.log(
                  `[Microsoft][AppOnly] SUCCESS: fetched ${allEvents.length} events from ${successCount}/${orgUsers.length} users`
                );
              }
            }
          }
        }
      } catch (appErr) {
        console.warn('[Microsoft][AppOnly] App token fetch failed:', appErr.message);
      }
    }

    if (appTokenWorked) return allEvents;

    // ── STRATEGY 2: Attendee expansion from /me/calendarview (delegated token) ──
    // The delegated token can only read the signed-in user's own calendar, but each
    // calendar event contains the full attendee list with email addresses.
    // We fetch the admin's calendar, then for each meeting we create one WorkEvent
    // per attendee whose email matches an internal user — giving us org-wide attribution
    // for all meetings the admin was part of.
    console.log(
      '[Microsoft] App-only token unavailable — using attendee expansion from /me/calendarview'
    );

    // Build a complete email → userId map for all org users
    const allOrgUsers = orgId ? await User.find({ orgId }).select('_id email').lean() : [];
    const emailToUserId = {};
    for (const u of allOrgUsers) {
      if (u.email) emailToUserId[u.email.toLowerCase()] = u._id;
    }
    console.log(
      `[Microsoft][AttendeeExpansion] Have ${Object.keys(emailToUserId).length} org users for matching`
    );

    const meUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${since.toISOString()}&endDateTime=${until.toISOString()}&${select}`;
    const meRes = await fetch(meUrl, { headers: { Authorization: `Bearer ${delegatedToken}` } });
    if (!meRes.ok) {
      const error = await meRes.text();
      throw new Error(`Outlook /me/calendarview fetch failed: ${error}`);
    }
    const meData = await meRes.json();
    const meEvents = meData.value || [];
    console.log(
      `[Microsoft][AttendeeExpansion] Got ${meEvents.length} events from /me, expanding attendees`
    );

    // For each calendar event, emit one copy per attendee that is an internal user
    for (const event of meEvents) {
      const attendeeEmails = (event.attendees || [])
        .map((a) => a.emailAddress?.address?.toLowerCase())
        .filter(Boolean);

      // Also include the organizer
      const organizerEmail = event.organizer?.emailAddress?.address?.toLowerCase();
      const allParticipants = [...new Set([...attendeeEmails, organizerEmail].filter(Boolean))];

      const matchedUsers = allParticipants
        .map((email) => ({ email, userId: emailToUserId[email] }))
        .filter((x) => x.userId);

      if (matchedUsers.length > 0) {
        // Emit one copy per matched internal user
        for (const { email, userId } of matchedUsers) {
          allEvents.push({
            ...event,
            eventSource: 'outlook',
            _internalUserId: userId,
            _userEmail: email,
            _attendeeExpanded: true,
          });
        }
      } else {
        // No attendee matched — keep event unattributed (will have userId: null)
        allEvents.push({ ...event, eventSource: 'outlook' });
      }
    }

    const attributed = allEvents.filter((e) => e._internalUserId).length;
    console.log(
      `[Microsoft][AttendeeExpansion] ${allEvents.length} total events, ${attributed} attributed to internal users`
    );
    return allEvents;
  }

  async fetchTeamsMessages(accessToken, since, until) {
    // Get joined teams
    const teamsRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const teamsData = await teamsRes.json();
    const teams = teamsData.value || [];

    const allMessages = [];

    // Scan ALL teams and ALL channels — no artificial limits
    for (const team of teams) {
      try {
        const channelsRes = await fetch(
          `https://graph.microsoft.com/v1.0/teams/${team.id}/channels`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const channelsData = await channelsRes.json();
        const channels = channelsData.value || [];

        for (const channel of channels) {
          try {
            // Use the /messages/delta endpoint or $filter to get only messages within our sync window.
            // The channel messages API doesn't support $filter directly, so we fetch recent
            // messages and filter client-side by the since/until window.
            const msgsRes = await fetch(
              `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${channel.id}/messages?$top=50`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            const msgsData = await msgsRes.json();

            // Filter messages to the requested time window
            const filtered = (msgsData.value || []).filter((m) => {
              const created = new Date(m.createdDateTime);
              return created >= since && created <= until;
            });

            const messages = filtered.map((m) => ({
              ...m,
              teamId: team.id,
              teamName: team.displayName,
              channelId: channel.id,
              channelName: channel.displayName,
              eventSource: 'teams',
            }));
            allMessages.push(...messages);
          } catch (chErr) {
            console.warn(
              `[Microsoft] Failed to fetch messages for ${team.displayName}/${channel.displayName}:`,
              chErr.message
            );
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch Teams channels for ${team.displayName}:`, err.message);
      }
    }

    console.log(
      `[Microsoft] Teams: fetched ${allMessages.length} messages within sync window from ${teams.length} teams (all channels scanned)`
    );
    return allMessages;
  }

  async transformToWorkEvents(rawEvents, orgId) {
    // Build email → internal userId lookup for fallback matching
    const orgUsers = await User.find({ orgId }).select('_id email').lean();
    const emailToUserId = new Map(orgUsers.map((u) => [u.email?.toLowerCase(), u._id]));

    // Helper: parse dateTime safely regardless of whether it already has a TZ offset
    function parseDateTime(dt) {
      if (!dt) return null;
      // If it already has offset info (+HH:MM or Z) don't append Z
      if (/[+-]\d{2}:\d{2}$/.test(dt) || dt.endsWith('Z')) return new Date(dt);
      // Microsoft returns local time without offset when timezone is specified separately — treat as UTC
      return new Date(dt + 'Z');
    }

    return rawEvents
      .map((event) => {
        if (event.eventSource === 'outlook') {
          const start = parseDateTime(event.start?.dateTime);
          const end = parseDateTime(event.end?.dateTime);
          if (!start || isNaN(start)) return null; // skip malformed
          const durationMinutes = end && !isNaN(end) ? (end - start) / (1000 * 60) : 0;

          // Resolve userId: prefer the _internalUserId stamped during per-user fetch,
          // fall back to matching organizer email against the User table
          const organizerEmail = event.organizer?.emailAddress?.address?.toLowerCase();
          const userId =
            event._internalUserId ||
            (organizerEmail ? emailToUserId.get(organizerEmail) : null) ||
            null;

          // For attendee-expanded events, append the userId to make the externalId unique
          // per person so the upsert doesn't collapse all attendee copies into one record.
          // For app-only per-user fetches, userId is also unique per user so same logic applies.
          const externalIdSuffix = userId ? `-${userId}` : '';
          return {
            orgId: new mongoose.Types.ObjectId(orgId),
            source: 'microsoft-outlook',
            eventType: 'meeting',
            actorUserId: userId,
            externalId: `outlook-${event.id}${externalIdSuffix}`,
            timestamp: start,
            duration: durationMinutes,
            metadata: {
              subject: event.subject,
              organizer: organizerEmail,
              attendeeCount: event.attendees?.length || 0,
              attendees: (event.attendees || [])
                .map((a) => a.emailAddress?.address?.toLowerCase())
                .filter(Boolean),
              isOnlineMeeting: event.isOnlineMeeting,
              isAllDay: event.isAllDay,
              showAs: event.showAs,
              location: event.location?.displayName,
              durationMinutes,
              startTime: start.toISOString(),
              endTime: end ? end.toISOString() : null,
            },
            raw: { id: event.id },
          };
        } else {
          // Teams message
          const senderEmail =
            event.from?.user?.email?.toLowerCase() ||
            event.from?.user?.userIdentityType === 'aadUser'
              ? null
              : null;
          const userId = senderEmail ? emailToUserId.get(senderEmail) : null;

          return {
            orgId: new mongoose.Types.ObjectId(orgId),
            source: 'microsoft-teams',
            eventType: 'message',
            actorUserId: userId,
            externalId: `teams-${event.id}`,
            timestamp: new Date(event.createdDateTime),
            metadata: {
              teamId: event.teamId,
              teamName: event.teamName,
              channelId: event.channelId,
              channelName: event.channelName,
              from: event.from?.user?.displayName,
              fromEmail: senderEmail,
              messageType: event.messageType,
              hasAttachments: (event.attachments?.length || 0) > 0,
            },
            raw: { id: event.id },
          };
        }
      })
      .filter(Boolean); // remove null (malformed) entries
  }
}

// ============================================================
// GOOGLE CALENDAR ADAPTER
// ============================================================

export class GoogleCalendarAdapter extends OrgIntegrationAdapter {
  constructor() {
    super('google-calendar');
  }

  getIntegrationData(org) {
    return org.integrations?.google;
  }

  async refreshToken(org, integration) {
    const refreshToken = decryptString(integration.refreshToken);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token refresh failed: ${error}`);
    }

    const tokens = await response.json();

    await Organization.findByIdAndUpdate(org._id, {
      $set: {
        'integrations.google.accessToken': encryptString(tokens.access_token),
        'integrations.google.expiry': new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return tokens.access_token;
  }

  async updateSyncStatus(orgId, success, count, error = null) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.google.sync.lastSync': new Date(),
        'integrations.google.sync.status': success ? 'success' : 'error',
        'integrations.google.sync.error': error,
        'integrations.google.sync.eventsCount': count,
      },
    });
  }

  async fetchEvents(orgId, accessToken, since, until) {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', since.toISOString());
    url.searchParams.set('timeMax', until.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '100');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar fetch failed: ${error}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  async transformToWorkEvents(rawEvents, orgId) {
    return rawEvents.map((event) => {
      const start = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start?.date);
      const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date);
      const durationMinutes = (end - start) / (1000 * 60);

      return {
        orgId: new mongoose.Types.ObjectId(orgId),
        source: 'google-calendar',
        eventType: 'meeting',
        externalId: `gcal-${event.id}`,
        timestamp: start,
        duration: durationMinutes,
        metadata: {
          summary: event.summary,
          organizer: event.organizer?.email,
          attendeeCount: event.attendees?.length || 0,
          hasVideoConference: !!event.conferenceData,
          status: event.status,
          isAllDay: !event.start?.dateTime,
          location: event.location,
          recurrence: !!event.recurringEventId,
          durationMinutes,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
        raw: { id: event.id },
      };
    });
  }
}

// ============================================================
// GOOGLE CHAT ADAPTER
// ============================================================

export class GoogleChatAdapter extends OrgIntegrationAdapter {
  constructor() {
    super('google-chat');
  }

  getIntegrationData(org) {
    return org.integrations?.googleChat;
  }

  async refreshToken(org, integration) {
    const refreshToken = decryptString(integration.refreshToken);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Chat token refresh failed: ${error}`);
    }

    const tokens = await response.json();

    await Organization.findByIdAndUpdate(org._id, {
      $set: {
        'integrations.googleChat.accessToken': encryptString(tokens.access_token),
        'integrations.googleChat.expiry': new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return tokens.access_token;
  }

  async updateSyncStatus(orgId, success, count, error = null) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.googleChat.sync.lastSync': new Date(),
        'integrations.googleChat.sync.status': success ? 'success' : 'error',
        'integrations.googleChat.sync.error': error,
        'integrations.googleChat.sync.eventsCount': count,
      },
    });
  }

  async fetchEvents(orgId, accessToken, since, until) {
    // Get list of spaces
    const spacesRes = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=20', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const spacesData = await spacesRes.json();
    const spaces = spacesData.spaces || [];

    const allMessages = [];

    // Fetch messages from each space (limit to 5 spaces)
    for (const space of spaces.slice(0, 5)) {
      try {
        const messagesRes = await fetch(
          `https://chat.googleapis.com/v1/${space.name}/messages?pageSize=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const messagesData = await messagesRes.json();
        const messages = (messagesData.messages || []).map((m) => ({
          ...m,
          spaceName: space.displayName || space.name,
        }));
        allMessages.push(...messages);
      } catch (err) {
        console.warn(`Failed to fetch Google Chat space ${space.name}:`, err.message);
      }
    }

    return allMessages;
  }

  async transformToWorkEvents(rawMessages, orgId) {
    return rawMessages.map((msg) => ({
      orgId: new mongoose.Types.ObjectId(orgId),
      source: 'google-chat',
      eventType: 'message',
      externalId: `gchat-${msg.name}`,
      timestamp: new Date(msg.createTime),
      metadata: {
        spaceName: msg.spaceName,
        senderName: msg.sender?.displayName,
        senderType: msg.sender?.type,
        hasAttachments: (msg.attachment?.length || 0) > 0,
        hasThread: !!msg.thread,
        messageLength: msg.text?.length || 0,
      },
      raw: { name: msg.name },
    }));
  }
}

// ============================================================
// SYNC ALL CORE INTEGRATIONS
// ============================================================

/**
 * Sync all core integrations for an org (Slack, Microsoft, Google)
 * This is separate from the IntegrationConnection-based syncs
 */
export async function syncCoreIntegrations(orgId, since, until) {
  const org = await Organization.findById(orgId).lean();
  if (!org) {
    console.error(`[CoreSync] Org not found: ${orgId}`);
    return [];
  }

  const results = [];

  // Slack
  if (org.integrations?.slack?.accessToken) {
    try {
      const adapter = new SlackAdapter();
      const result = await adapter.sync(orgId, since, until);
      results.push(result);
    } catch (error) {
      results.push({ success: false, source: 'slack', error: error.message });
    }
  }

  // Microsoft (Outlook or Teams)
  if (org.integrations?.microsoft?.accessToken) {
    try {
      const adapter = new MicrosoftAdapter();
      const result = await adapter.sync(orgId, since, until);
      results.push(result);
    } catch (error) {
      results.push({ success: false, source: 'microsoft', error: error.message });
    }
  }

  // Google Calendar
  if (org.integrations?.google?.accessToken) {
    try {
      const adapter = new GoogleCalendarAdapter();
      const result = await adapter.sync(orgId, since, until);
      results.push(result);
    } catch (error) {
      results.push({ success: false, source: 'google-calendar', error: error.message });
    }
  }

  // Google Chat
  if (org.integrations?.googleChat?.accessToken) {
    try {
      const adapter = new GoogleChatAdapter();
      const result = await adapter.sync(orgId, since, until);
      results.push(result);
    } catch (error) {
      results.push({ success: false, source: 'google-chat', error: error.message });
    }
  }

  return results;
}

export default {
  SlackAdapter,
  MicrosoftAdapter,
  GoogleCalendarAdapter,
  GoogleChatAdapter,
  syncCoreIntegrations,
};
