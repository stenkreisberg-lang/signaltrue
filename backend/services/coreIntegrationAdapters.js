/**
 * Core Integration Adapters for Slack, Microsoft (Outlook/Teams), and Google Calendar
 *
 * These adapters sync data from organization-level OAuth tokens stored in
 * Organization.integrations and create WorkEvent documents for analytics.
 */

import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';
import User from '../models/user.js';
import IntegrationConnection from '../models/integrationConnection.js';
import { decryptString, encryptString } from '../utils/crypto.js';
import { getMicrosoftAppToken } from './tokenService.js';
import { enrichWorkEvents } from './workEventAttributionService.js';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { createGoogleWorkspaceAuth } from './googleWorkspaceAdminService.js';

export async function fetchGraphCollection(
  initialUrl,
  accessToken,
  { maxPages = 100, maxRetries = 1 } = {}
) {
  const items = [];
  let nextUrl = initialUrl;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    let response;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: globalThis.AbortSignal.timeout(15_000),
        });
      } catch (error) {
        if (attempt === maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
        continue;
      }

      const transient = response.status === 429 || response.status >= 500;
      if (!transient || attempt === maxRetries) break;
      const retryAfter = Number(response.headers?.get?.('retry-after'));
      const delayMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 500 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Microsoft Graph ${response.status}: ${body.slice(0, 300)}`);
      error.status = response.status;
      throw error;
    }
    const data = await response.json();
    items.push(...(data.value || []));
    nextUrl = data['@odata.nextLink'] || null;
    pages++;
  }

  if (nextUrl) {
    console.warn(`[Microsoft] Pagination stopped after ${maxPages} pages for ${initialUrl}`);
  }
  return items;
}

function hashMetadata(orgId, value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(`${orgId}:${value}`).digest('hex');
}

function getMessageLengthBucket(content) {
  const length = String(content || '')
    .replace(/<[^>]*>/g, '')
    .trim().length;
  if (length < 50) return 'short';
  if (length <= 300) return 'medium';
  return 'long';
}

async function fetchSlackCollection(url, accessToken, { maxPages = 100 } = {}) {
  const items = [];
  let nextUrl = url;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Slack API request failed');
    }
    items.push(...(data.channels || data.messages || []));
    const cursor = data.response_metadata?.next_cursor;
    if (!cursor) break;
    const next = new URL(nextUrl);
    next.searchParams.set('cursor', cursor);
    nextUrl = next.toString();
    pages++;
  }

  if (nextUrl && pages >= maxPages) {
    console.warn(`[Slack] Pagination stopped after ${maxPages} pages for ${url}`);
  }
  return items;
}

async function fetchGoogleCollection(url, accessToken, itemKey, { maxPages = 100 } = {}) {
  const items = [];
  let nextUrl = url;
  let pages = 0;

  while (nextUrl && pages < maxPages) {
    const response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google API ${response.status}: ${error.slice(0, 300)}`);
    }
    const data = await response.json();
    items.push(...(data[itemKey] || []));
    if (!data.nextPageToken) break;
    const next = new URL(nextUrl);
    next.searchParams.set('pageToken', data.nextPageToken);
    nextUrl = next.toString();
    pages++;
  }

  if (nextUrl && pages >= maxPages) {
    console.warn(`[Google] Pagination stopped after ${maxPages} pages for ${url}`);
  }
  return items;
}

function normalizeAttendeeResponse(value) {
  const response = String(value || 'none').trim();
  if (
    ['organizer', 'accepted', 'declined', 'tentativelyAccepted', 'notResponded', 'none'].includes(
      response
    )
  ) {
    return response;
  }
  if (response === 'tentative') return 'tentativelyAccepted';
  if (response === 'needsAction') return 'notResponded';
  return 'none';
}

function normalizeAttendeeType(value) {
  const type = String(value || 'unknown').trim();
  return ['required', 'optional', 'resource', 'organizer'].includes(type) ? type : 'unknown';
}

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
  getIntegrationData(_org) {
    throw new Error('getIntegrationData must be implemented');
  }

  /**
   * Override in subclass to refresh the token
   */
  async refreshToken(_org, _integration) {
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
      const transformedEvents = await this.transformToWorkEvents(rawEvents, orgId);
      const workEvents = await enrichWorkEvents(transformedEvents, orgId);

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
      await this.updateConnectionCoverage(orgId, workEvents);

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

  async updateSyncStatus(_orgId, _success, _count, _error = null) {
    // Override in subclass
  }

  async updateConnectionCoverage(orgId, workEvents) {
    const [totalUsers, organization] = await Promise.all([
      User.countDocuments({ orgId, accountStatus: { $ne: 'inactive' } }),
      Organization.findById(orgId)
        .select('integrations.microsoft.applicationConsentVerifiedAt')
        .lean(),
    ]);
    const companyWideVerified = Boolean(
      organization?.integrations?.microsoft?.applicationConsentVerifiedAt
    );
    const mappedUsers = new Set(
      workEvents.map((event) => String(event.actorUserId || '')).filter(Boolean)
    ).size;

    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: this.source },
      {
        $set: {
          status: mappedUsers > 0 ? 'connected' : 'needs_admin',
          statusMessage:
            mappedUsers > 0
              ? 'Core integration connected and syncing metadata'
              : 'Connected, but no events are mapped to internal users yet',
          statusUpdatedAt: new Date(),
          connectedAt: new Date(),
          'sync.lastSyncAt': new Date(),
          'sync.lastSuccessfulSyncAt': new Date(),
          'sync.lastSyncStatus': mappedUsers > 0 ? 'success' : 'partial',
          'sync.lastSyncEventsCount': workEvents.length,
          'coverage.totalUsers': totalUsers,
          'coverage.mappedUsers': mappedUsers,
          'coverage.lastCoverageUpdatedAt': new Date(),
          measurementScope: 'metadata only',
        },
      },
      { upsert: true }
    );
  }

  async fetchEvents(_orgId, _accessToken, _since, _until) {
    throw new Error('fetchEvents must be implemented');
  }

  async transformToWorkEvents(_rawEvents, _orgId) {
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

  async fetchEvents(_orgId, accessToken, since, until) {
    const allMessages = [];

    const channels = await fetchSlackCollection(
      'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=200',
      accessToken
    ).catch((error) => {
      console.warn('Slack channels fetch failed:', error.message);
      return [];
    });
    const oldestTs = Math.floor(since.getTime() / 1000);
    const latestTs = Math.floor(until.getTime() / 1000);

    for (const channel of channels) {
      try {
        const messages = await fetchSlackCollection(
          `https://slack.com/api/conversations.history?channel=${channel.id}&oldest=${oldestTs}&latest=${latestTs}&limit=200`,
          accessToken,
          { maxPages: 25 }
        );
        allMessages.push(
          ...messages.map((m) => ({
            ...m,
            channelId: channel.id,
            channelType: channel.is_im ? 'dm' : channel.is_private ? 'private' : 'public',
          }))
        );
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
      externalId: `slack-${msg.channelId}-${msg.ts}`,
      timestamp: new Date(parseFloat(msg.ts) * 1000),
      metadata: {
        slackUserId: msg.user,
        channelType: msg.channelType || 'public',
        channelHash: hashMetadata(orgId, msg.channelId),
        externalChannelId: msg.channelId,
        externalMessageId: msg.ts,
        threadIdHash: hashMetadata(orgId, msg.thread_ts || msg.ts),
        replyToIdHash:
          msg.thread_ts && msg.thread_ts !== msg.ts ? hashMetadata(orgId, msg.thread_ts) : null,
        isReply: Boolean(msg.thread_ts && msg.thread_ts !== msg.ts),
        reactionCount: msg.reactions?.length || 0,
        messageLengthBucket: getMessageLengthBucket(msg.text),
        hasAttachment: (msg.files?.length || 0) > 0,
      },
      raw: { ts: msg.ts },
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

  async updateConnectionCoverage(orgId, workEvents) {
    const [totalUsers, organization] = await Promise.all([
      User.countDocuments({ orgId, accountStatus: { $ne: 'inactive' } }),
      Organization.findById(orgId)
        .select('integrations.microsoft.applicationConsentVerifiedAt')
        .lean(),
    ]);

    // Tenant-wide admin consent means the connection is genuinely live even
    // before any event maps to an internal user. The closure below reads this,
    // so it has to be resolved here — it was previously only declared in the
    // other adapter's method, which made every call through this path throw
    // ReferenceError once it reached the status payload.
    const companyWideVerified = Boolean(
      organization?.integrations?.microsoft?.applicationConsentVerifiedAt
    );

    const updateForType = async (integrationType, source) => {
      const sourceEvents = workEvents.filter((event) => event.source === source);

      const coverageStart = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
      const [sourceEventCount, mappedUsers] = await Promise.all([
        WorkEvent.countDocuments({
          orgId,
          source,
          timestamp: { $gte: coverageStart },
        }),
        WorkEvent.distinct('actorUserId', {
          orgId,
          source,
          timestamp: { $gte: coverageStart },
          actorUserId: { $ne: null },
        }),
      ]);
      const mappedUserCount = mappedUsers.length;
      const hasMappedHistory = mappedUserCount > 0;

      const setPayload = {
        status: hasMappedHistory || companyWideVerified ? 'connected' : 'needs_admin',
        statusMessage:
          sourceEvents.length === 0 && hasMappedHistory
            ? 'Microsoft metadata is connected; no new events were found in the latest sync'
            : hasMappedHistory
              ? 'Microsoft metadata is syncing and mapped to internal users'
              : companyWideVerified
                ? 'Company-wide Microsoft access is verified; waiting for mapped activity'
                : 'Microsoft metadata is syncing, but events are not mapped to internal users',
        statusUpdatedAt: new Date(),
        connectedAt: new Date(),
        'sync.lastSyncAt': new Date(),
        'sync.lastSyncStatus': hasMappedHistory ? 'success' : 'partial',
        'sync.lastSyncEventsCount': sourceEvents.length,
        'coverage.totalUsers': totalUsers,
        'coverage.mappedUsers': mappedUserCount,
        'coverage.lastCoverageUpdatedAt': new Date(),
        measurementScope: companyWideVerified
          ? 'organization-wide Microsoft metadata'
          : 'metadata only',
      };
      if (hasMappedHistory) setPayload['sync.lastSuccessfulSyncAt'] = new Date();
      if (sourceEventCount === 0 && sourceEvents.length === 0) {
        setPayload.statusMessage =
          'Microsoft metadata is connected, but no Teams or Outlook events were found in the coverage window';
      }

      await IntegrationConnection.findOneAndUpdate(
        { orgId, integrationType },
        { $set: setPayload },
        { upsert: true }
      );
    };

    await Promise.all([
      updateForType('microsoft-outlook', 'microsoft-outlook'),
      updateForType('microsoft-teams', 'microsoft-teams'),
    ]);
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
        this.fetchTeamsMessages(accessToken, since, until, orgId).catch((err) => {
          console.warn('[Microsoft] Teams fetch failed:', err.message);
          return [];
        }),
      ]);
      return [...outlookEvents, ...teamsMessages];
    } else if (scope === 'outlook') {
      return await this.fetchOutlookEvents(accessToken, since, until, orgId);
    } else {
      return await this.fetchTeamsMessages(accessToken, since, until, orgId);
    }
  }

  async fetchOutlookEvents(delegatedToken, since, until, orgId = null) {
    const allEvents = [];
    const select =
      '$select=id,start,end,organizer,attendees,isOnlineMeeting,isAllDay,showAs,recurrence,seriesMasterId,isCancelled,type&$top=100';

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
                  try {
                    const calendarEvents = await fetchGraphCollection(url, appToken);
                    const events = calendarEvents.map((e) => ({
                      ...e,
                      eventSource: 'outlook',
                      _internalUserId: user._id,
                      _userEmail: user.email,
                    }));
                    allEvents.push(...events);
                    successCount++;
                  } catch (calendarError) {
                    if (calendarError.status === 403) {
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
                        `[Microsoft][AppOnly] calendarview failed for ${user.email}: ${calendarError.message}`
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
    const allOrgUsers = orgId ? await User.find({ orgId }).select('_id email teamId').lean() : [];
    const emailToUserId = {};
    for (const u of allOrgUsers) {
      if (u.email) emailToUserId[u.email.toLowerCase()] = u._id;
    }
    console.log(
      `[Microsoft][AttendeeExpansion] Have ${Object.keys(emailToUserId).length} org users for matching`
    );

    const meUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${since.toISOString()}&endDateTime=${until.toISOString()}&${select}`;
    const meEvents = await fetchGraphCollection(meUrl, delegatedToken);
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

  async fetchTeamsMessages(delegatedToken, since, until, orgId = null) {
    if (orgId) {
      try {
        const org = await Organization.findById(orgId)
          .select('integrations.microsoft.tenantId')
          .lean();
        const tenantId = org?.integrations?.microsoft?.tenantId || process.env.MS_APP_TENANT;
        const appToken = tenantId ? await getMicrosoftAppToken(tenantId) : null;
        if (appToken) {
          const tenantMessages = await this.fetchTenantWideTeamsMessages(
            appToken,
            since,
            until,
            orgId
          );
          console.log(
            `[Microsoft][AppOnly] Teams: fetched ${tenantMessages.length} tenant-wide channel/chat messages`
          );
          return tenantMessages;
        }
      } catch (error) {
        console.warn(
          '[Microsoft][AppOnly] Tenant-wide Teams access unavailable; using delegated fallback:',
          error.message
        );
      }
    }

    return this.fetchDelegatedTeamsMessages(delegatedToken, since, until);
  }

  async fetchTenantWideTeamsMessages(appToken, since, until, orgId) {
    const orgUsers = await User.find({
      orgId,
      'externalIds.microsoftUserId': { $exists: true, $ne: null },
      accountStatus: { $ne: 'inactive' },
    })
      .select('externalIds.microsoftUserId')
      .lean();
    const teamById = new Map();
    for (const user of orgUsers) {
      const microsoftUserId = user.externalIds?.microsoftUserId;
      if (!microsoftUserId) continue;
      try {
        const joinedTeams = await fetchGraphCollection(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/joinedTeams?$top=100&$select=id,displayName`,
          appToken,
          { maxPages: 10 }
        );
        for (const team of joinedTeams) teamById.set(team.id, team);
      } catch (error) {
        console.warn(
          `[Microsoft][AppOnly] Could not list joined teams for one mapped user: ${error.message}`
        );
      }
    }
    const teams = [...teamById.values()];
    const allMessages = [];
    let successfulTeamReads = 0;
    const filter = encodeURIComponent(
      `lastModifiedDateTime gt ${since.toISOString()} and lastModifiedDateTime lt ${until.toISOString()}`
    );

    for (const team of teams) {
      let channelById = new Map();
      try {
        const channels = await fetchGraphCollection(
          `https://graph.microsoft.com/v1.0/teams/${team.id}/allChannels`,
          appToken
        );
        channelById = new Map(channels.map((channel) => [channel.id, channel]));
      } catch (error) {
        console.warn(`[Microsoft][AppOnly] Channel metadata failed for ${team.id}:`, error.message);
      }

      try {
        const messages = await fetchGraphCollection(
          `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/getAllMessages?$top=50&$filter=${filter}`,
          appToken
        );
        successfulTeamReads++;
        for (const message of messages) {
          if (message.messageType !== 'message') continue;
          const created = new Date(message.createdDateTime);
          if (created < since || created > until) continue;
          const channelId = message.channelIdentity?.channelId || null;
          const channel = channelById.get(channelId);
          allMessages.push({
            ...message,
            teamId: message.channelIdentity?.teamId || team.id,
            teamName: team.displayName,
            channelId,
            channelName: channel?.displayName,
            channelType: channel?.membershipType === 'standard' ? 'public' : 'private',
            eventSource: 'teams',
          });
        }
      } catch (error) {
        console.warn(
          `[Microsoft][AppOnly] Team message export failed for ${team.id}:`,
          error.message
        );
      }
    }

    if (teams.length > 0 && successfulTeamReads === 0) {
      throw new Error('Tenant teams are visible, but ChannelMessage.Read.All is unavailable');
    }

    // Chat.Read.All is optional. When granted, include 1:1, group, and meeting chats.
    try {
      const chatMessages = await fetchGraphCollection(
        `https://graph.microsoft.com/v1.0/chats/getAllMessages?$top=50&$filter=${filter}`,
        appToken
      );
      const chatTypeById = new Map();
      for (const chatId of new Set(chatMessages.map((message) => message.chatId).filter(Boolean))) {
        try {
          const response = await fetch(`https://graph.microsoft.com/v1.0/chats/${chatId}`, {
            headers: { Authorization: `Bearer ${appToken}` },
          });
          if (response.ok) {
            const chat = await response.json();
            chatTypeById.set(chatId, chat.chatType);
          }
        } catch {}
      }
      for (const message of chatMessages) {
        if (message.messageType !== 'message') continue;
        const created = new Date(message.createdDateTime);
        if (created < since || created > until) continue;
        allMessages.push({
          ...message,
          chatId: message.chatId,
          channelType: chatTypeById.get(message.chatId) === 'oneOnOne' ? 'dm' : 'group_dm',
          eventSource: 'teams-chat',
        });
      }
    } catch (error) {
      console.info('[Microsoft][AppOnly] Chat metadata not available:', error.message);
    }

    return allMessages;
  }

  async fetchDelegatedTeamsMessages(accessToken, since, until) {
    const teams = await fetchGraphCollection(
      'https://graph.microsoft.com/v1.0/me/joinedTeams',
      accessToken
    );
    const allMessages = [];

    for (const team of teams) {
      let channels = [];
      try {
        channels = await fetchGraphCollection(
          `https://graph.microsoft.com/v1.0/teams/${team.id}/channels`,
          accessToken
        );
      } catch (error) {
        console.warn(`Failed to fetch Teams channels for ${team.displayName}:`, error.message);
        continue;
      }

      for (const channel of channels) {
        try {
          const roots = await fetchGraphCollection(
            `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${channel.id}/messages?$top=50`,
            accessToken,
            { maxPages: 20 }
          );
          const messages = [...roots];
          const relevantRoots = roots.filter((root) => {
            const activityTime = new Date(root.lastModifiedDateTime || root.createdDateTime);
            return !isNaN(activityTime) && activityTime >= since;
          });
          for (const root of relevantRoots) {
            try {
              const replies = await fetchGraphCollection(
                `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${channel.id}/messages/${root.id}/replies?$top=50`,
                accessToken
              );
              messages.push(...replies);
            } catch (error) {
              console.warn(
                `[Microsoft] Failed to fetch replies for ${team.displayName}/${channel.displayName}:`,
                error.message
              );
            }
          }

          for (const message of messages) {
            if (message.messageType !== 'message') continue;
            const created = new Date(message.createdDateTime);
            if (created < since || created > until) continue;
            allMessages.push({
              ...message,
              teamId: team.id,
              teamName: team.displayName,
              channelId: channel.id,
              channelName: channel.displayName,
              channelType: channel.membershipType === 'standard' ? 'public' : 'private',
              eventSource: 'teams',
            });
          }
        } catch (error) {
          console.warn(
            `[Microsoft] Failed to fetch messages for ${team.displayName}/${channel.displayName}:`,
            error.message
          );
        }
      }
    }

    try {
      const chats = await fetchGraphCollection(
        'https://graph.microsoft.com/v1.0/me/chats?$top=50',
        accessToken
      );
      for (const chat of chats) {
        try {
          const messages = await fetchGraphCollection(
            `https://graph.microsoft.com/v1.0/chats/${chat.id}/messages?$top=50`,
            accessToken,
            { maxPages: 20 }
          );
          for (const message of messages) {
            if (message.messageType !== 'message') continue;
            const created = new Date(message.createdDateTime);
            if (created < since || created > until) continue;
            allMessages.push({
              ...message,
              chatId: chat.id,
              channelType: chat.chatType === 'oneOnOne' ? 'dm' : 'group_dm',
              eventSource: 'teams-chat',
            });
          }
        } catch (error) {
          console.info(`[Microsoft] Chat ${chat.id} is not readable:`, error.message);
        }
      }
    } catch (error) {
      console.info('[Microsoft] Delegated chat metadata not available:', error.message);
    }

    console.log(
      `[Microsoft] Teams delegated fallback: fetched ${allMessages.length} messages from ${teams.length} joined teams plus accessible chats`
    );
    return allMessages;
  }

  async transformToWorkEvents(rawEvents, orgId) {
    // Build email → internal userId lookup for fallback matching
    const orgUsers = await User.find({ orgId }).select('_id email teamId externalIds').lean();
    const userByEmail = new Map(
      orgUsers.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u])
    );
    const userByMicrosoftId = new Map(
      orgUsers
        .filter((u) => u.externalIds?.microsoftUserId)
        .map((u) => [String(u.externalIds.microsoftUserId), u])
    );

    function summarizeOutlookParticipants(event, organizerEmail) {
      const attendees = (event.attendees || [])
        .map((attendee) => {
          const email = attendee.emailAddress?.address?.toLowerCase();
          if (!email) return null;
          return {
            email,
            response: normalizeAttendeeResponse(attendee.status?.response),
            type: normalizeAttendeeType(attendee.type),
          };
        })
        .filter(Boolean);
      const attendeeByEmail = new Map(attendees.map((attendee) => [attendee.email, attendee]));
      const participantEmails = [
        ...new Set(
          [...attendees.map((attendee) => attendee.email), organizerEmail].filter(Boolean)
        ),
      ];
      const internalParticipants = participantEmails
        .map((email) => {
          const user = userByEmail.get(email);
          if (!user) return null;
          const isOrganizer = Boolean(organizerEmail && email === organizerEmail);
          const attendee = attendeeByEmail.get(email);
          return {
            email,
            user,
            response: isOrganizer
              ? 'organizer'
              : normalizeAttendeeResponse(attendee?.response || 'none'),
            type: isOrganizer ? 'organizer' : normalizeAttendeeType(attendee?.type),
          };
        })
        .filter(Boolean);
      const responseCounts = {
        accepted: 0,
        declined: 0,
        tentative: 0,
        notResponded: 0,
      };
      for (const participant of internalParticipants) {
        if (participant.response === 'organizer') continue;
        if (participant.response === 'accepted') responseCounts.accepted++;
        else if (participant.response === 'declined') responseCounts.declined++;
        else if (participant.response === 'tentativelyAccepted') responseCounts.tentative++;
        else responseCounts.notResponded++;
      }

      return {
        participantEmails,
        internalParticipants,
        organizerUser: organizerEmail ? userByEmail.get(organizerEmail) : null,
        participantTeamIds: [
          ...new Set(
            internalParticipants.map((item) => String(item.user.teamId || '')).filter(Boolean)
          ),
        ],
        responseCounts,
      };
    }

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
          const participantSummary = summarizeOutlookParticipants(event, organizerEmail);
          const matchedUser =
            orgUsers.find((u) => String(u._id) === String(event._internalUserId)) ||
            (organizerEmail ? userByEmail.get(organizerEmail) : null);
          const userId = matchedUser?._id || null;
          const actorParticipant = participantSummary.internalParticipants.find(
            (participant) => String(participant.user._id) === String(userId)
          );
          const participantEmails = participantSummary.participantEmails;
          const internalParticipants = participantSummary.internalParticipants.map(
            (participant) => participant.user
          );
          const participantTeamIds = new Set(
            internalParticipants.map((user) => String(user.teamId || '')).filter(Boolean)
          );
          const attendeeCount = participantEmails.length;
          const isOneOnOne = attendeeCount === 2;
          const hasExternalParticipants = internalParticipants.length < attendeeCount;
          const meetingType = isOneOnOne
            ? 'one_on_one'
            : hasExternalParticipants
              ? 'external'
              : participantTeamIds.size > 1
                ? 'cross_team'
                : 'team';

          // For attendee-expanded events, append the userId to make the externalId unique
          // per person so the upsert doesn't collapse all attendee copies into one record.
          // For app-only per-user fetches, userId is also unique per user so same logic applies.
          const externalIdSuffix = userId ? `-${userId}` : '';
          return {
            orgId: new mongoose.Types.ObjectId(orgId),
            source: 'microsoft-outlook',
            eventType: 'meeting',
            actorUserId: userId,
            teamId: matchedUser?.teamId || null,
            externalId: `outlook-${event.id}${externalIdSuffix}`,
            timestamp: start,
            duration: durationMinutes,
            metadata: {
              meetingIdHash: hashMetadata(orgId, event.id),
              meetingInstanceIdHash: hashMetadata(orgId, event.id),
              attendeeCount,
              internalAttendeeCount: userId ? 1 : internalParticipants.length,
              externalAttendeeCount: Math.max(0, attendeeCount - internalParticipants.length),
              attendeeHashes: userId ? [hashMetadata(orgId, userId)] : [],
              organizerHash: hashMetadata(orgId, organizerEmail),
              organizerUserId: participantSummary.organizerUser?._id || null,
              organizerTeamId: participantSummary.organizerUser?.teamId || null,
              isOnlineMeeting: event.isOnlineMeeting,
              isAllDay: event.isAllDay,
              isRecurring: Boolean(
                event.recurrence ||
                event.seriesMasterId ||
                event.type === 'occurrence' ||
                event.type === 'exception'
              ),
              isCancelled: event.isCancelled === true,
              is1to1: isOneOnOne,
              meetingType,
              durationMinutes,
              participantTeamIds: participantSummary.participantTeamIds,
              attendeeResponseStatus: actorParticipant?.response,
              attendeeType: actorParticipant?.type,
              acceptedAttendeeCount: participantSummary.responseCounts.accepted,
              declinedAttendeeCount: participantSummary.responseCounts.declined,
              tentativeAttendeeCount: participantSummary.responseCounts.tentative,
              notRespondedAttendeeCount: participantSummary.responseCounts.notResponded,
              startTime: start.toISOString(),
              endTime: end ? end.toISOString() : null,
            },
            raw: { id: event.id },
          };
        } else {
          // Teams message
          const senderEmail = event.from?.user?.email?.toLowerCase() || null;
          const senderMsId = event.from?.user?.id || null;
          const matchedUser =
            (senderEmail ? userByEmail.get(senderEmail) : null) ||
            (senderMsId ? userByMicrosoftId.get(String(senderMsId)) : null);
          const userId = matchedUser?._id || null;
          const conversationId =
            event.chatId || event.channelId || event.channelIdentity?.channelId;
          const mentionedIds = (event.mentions || [])
            .map((mention) => mention.mentioned?.user?.id)
            .filter(Boolean);
          const externalId =
            event.eventSource === 'teams-chat'
              ? `teams-chat-${event.chatId}-${event.id}`
              : `teams-${event.id}`;

          return {
            orgId: new mongoose.Types.ObjectId(orgId),
            source: 'microsoft-teams',
            eventType: 'message',
            actorUserId: userId,
            teamId: matchedUser?.teamId || null,
            externalId,
            timestamp: new Date(event.createdDateTime),
            metadata: {
              externalTeamId: event.teamId || event.channelIdentity?.teamId,
              externalChannelId: event.channelId || event.channelIdentity?.channelId,
              externalMessageId: event.id,
              microsoftUserId: senderMsId,
              eventSource: event.eventSource || 'teams',
              channelType: event.channelType || 'public',
              channelHash: hashMetadata(orgId, conversationId),
              threadIdHash: hashMetadata(orgId, event.replyToId || event.id),
              replyToIdHash: hashMetadata(orgId, event.replyToId),
              isReply: Boolean(event.replyToId),
              mentionedUserHashes: mentionedIds.map((id) => hashMetadata(orgId, id)),
              reactionCount: event.reactions?.length || 0,
              messageLengthBucket: getMessageLengthBucket(event.body?.content),
              messageType: event.messageType,
              hasAttachment: (event.attachments?.length || 0) > 0,
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

  async getAccessToken(orgId) {
    const org = await Organization.findById(orgId).lean();
    if (org?.integrations?.googleWorkspace?.domainWideDelegationVerifiedAt) return 'workspace-dwd';
    return super.getAccessToken(orgId);
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
    if (accessToken === 'workspace-dwd') {
      const org = await Organization.findById(orgId).lean();
      const users = await User.find({
        orgId,
        accountStatus: { $ne: 'inactive' },
        email: { $ne: '' },
      })
        .select('email')
        .lean();
      const uniqueEvents = new Map();
      for (const user of users) {
        try {
          const auth = createGoogleWorkspaceAuth(user.email, [
            'https://www.googleapis.com/auth/calendar.readonly',
          ]);
          const token = await auth.getAccessToken();
          const userEvents = await this.fetchEvents(orgId, token.token || token, since, until);
          userEvents.forEach((event) => uniqueEvents.set(event.id, event));
        } catch (error) {
          console.warn(`[Google Calendar] ${user.email} sync skipped: ${error.message}`);
        }
      }
      return [...uniqueEvents.values()];
    }
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', since.toISOString());
    url.searchParams.set('timeMax', until.toISOString());
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');
    url.searchParams.set('maxResults', '2500');

    return fetchGoogleCollection(url.toString(), accessToken, 'items');
  }

  async transformToWorkEvents(rawEvents, orgId) {
    const orgUsers = await User.find({
      orgId,
      accountStatus: { $ne: 'inactive' },
    })
      .select('_id email teamId')
      .lean();
    const userByEmail = new Map(
      orgUsers.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user])
    );

    return rawEvents.flatMap((event) => {
      const start = event.start?.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start?.date);
      const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(event.end?.date);
      const durationMinutes = (end - start) / (1000 * 60);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || durationMinutes <= 0) {
        return [];
      }
      const organizerEmail = event.organizer?.email?.toLowerCase();
      const participantEmails = [
        ...new Set(
          [organizerEmail, ...(event.attendees || []).map((attendee) => attendee.email)]
            .filter(Boolean)
            .map((email) => email.toLowerCase())
        ),
      ];
      const internalParticipants = participantEmails
        .map((email) => userByEmail.get(email))
        .filter(Boolean);
      const organizerUser = organizerEmail ? userByEmail.get(organizerEmail) : null;
      const attendeeByEmail = new Map(
        (event.attendees || [])
          .filter((attendee) => attendee.email)
          .map((attendee) => [attendee.email.toLowerCase(), attendee])
      );
      const responseCounts = {
        accepted: 0,
        declined: 0,
        tentative: 0,
        notResponded: 0,
      };
      for (const participant of internalParticipants) {
        if (String(participant._id) === String(organizerUser?._id)) continue;
        const attendee = attendeeByEmail.get(participant.email?.toLowerCase());
        const response = normalizeAttendeeResponse(attendee?.responseStatus);
        if (response === 'accepted') responseCounts.accepted++;
        else if (response === 'declined') responseCounts.declined++;
        else if (response === 'tentativelyAccepted') responseCounts.tentative++;
        else responseCounts.notResponded++;
      }
      const attendeeCount = participantEmails.length;
      const baseMetadata = {
        meetingIdHash: hashMetadata(orgId, event.id),
        meetingInstanceIdHash: hashMetadata(orgId, event.id),
        organizerHash: hashMetadata(orgId, organizerEmail),
        organizerUserId: organizerUser?._id || null,
        organizerTeamId: organizerUser?.teamId || null,
        participantTeamIds: [
          ...new Set(
            internalParticipants
              .map((participant) => String(participant.teamId || ''))
              .filter(Boolean)
          ),
        ],
        attendeeCount,
        internalAttendeeCount: internalParticipants.length,
        externalAttendeeCount: Math.max(0, attendeeCount - internalParticipants.length),
        acceptedAttendeeCount: responseCounts.accepted,
        declinedAttendeeCount: responseCounts.declined,
        tentativeAttendeeCount: responseCounts.tentative,
        notRespondedAttendeeCount: responseCounts.notResponded,
        isAllDay: !event.start?.dateTime,
        isOnlineMeeting: !!event.conferenceData,
        isRecurring: !!event.recurringEventId,
        durationMinutes,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      };
      const participants = internalParticipants.length > 0 ? internalParticipants : [null];
      return participants.map((participant) => ({
        orgId: new mongoose.Types.ObjectId(orgId),
        source: 'google-calendar',
        eventType: 'meeting',
        actorUserId: participant?._id || null,
        teamId: participant?.teamId || null,
        externalId: `gcal-${event.id}${participant?._id ? `-${participant._id}` : ''}`,
        timestamp: start,
        duration: durationMinutes,
        metadata: {
          ...baseMetadata,
          internalAttendeeCount: participant ? 1 : internalParticipants.length,
          attendeeHashes: participant ? [hashMetadata(orgId, participant._id)] : [],
          attendeeResponseStatus:
            participant && String(participant._id) === String(organizerUser?._id)
              ? 'organizer'
              : normalizeAttendeeResponse(
                  participant
                    ? attendeeByEmail.get(participant.email?.toLowerCase())?.responseStatus
                    : null
                ),
          attendeeType:
            participant && String(participant._id) === String(organizerUser?._id)
              ? 'organizer'
              : 'unknown',
        },
        raw: { id: event.id },
      }));
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

  async getAccessToken(orgId) {
    const org = await Organization.findById(orgId).lean();
    if (org?.integrations?.googleWorkspace?.domainWideDelegationVerifiedAt) return 'workspace-dwd';
    return super.getAccessToken(orgId);
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
    if (accessToken === 'workspace-dwd') {
      const users = await User.find({
        orgId,
        accountStatus: { $ne: 'inactive' },
        email: { $ne: '' },
      })
        .select('email')
        .lean();
      const uniqueMessages = new Map();
      for (const user of users) {
        try {
          const auth = createGoogleWorkspaceAuth(user.email, [
            'https://www.googleapis.com/auth/chat.spaces.readonly',
            'https://www.googleapis.com/auth/chat.messages.readonly',
          ]);
          const token = await auth.getAccessToken();
          const messages = await this.fetchEvents(orgId, token.token || token, since, until);
          messages.forEach((message) => uniqueMessages.set(message.name, message));
        } catch (error) {
          console.warn(`[Google Chat] ${user.email} sync skipped: ${error.message}`);
        }
      }
      return [...uniqueMessages.values()];
    }
    const spaces = await fetchGoogleCollection(
      'https://chat.googleapis.com/v1/spaces?pageSize=100',
      accessToken,
      'spaces'
    ).catch((error) => {
      console.warn('Google Chat spaces fetch failed:', error.message);
      return [];
    });

    const allMessages = [];

    for (const space of spaces) {
      try {
        const messagesUrl = new URL(`https://chat.googleapis.com/v1/${space.name}/messages`);
        messagesUrl.searchParams.set('pageSize', '1000');
        messagesUrl.searchParams.set('orderBy', 'createTime desc');
        messagesUrl.searchParams.set('filter', `createTime > "${since.toISOString()}"`);
        const messages = await fetchGoogleCollection(
          messagesUrl.toString(),
          accessToken,
          'messages',
          {
            maxPages: 25,
          }
        );
        allMessages.push(
          ...messages
            .filter((m) => {
              const created = new Date(m.createTime);
              return !Number.isNaN(created.getTime()) && created <= until;
            })
            .map((m) => ({
              ...m,
              spaceId: space.name,
              spaceType: space.spaceType,
            }))
        );
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
        googleUserId: msg.sender?.name,
        senderType: msg.sender?.type,
        channelType: msg.spaceType === 'DIRECT_MESSAGE' ? 'dm' : 'group_dm',
        channelHash: hashMetadata(orgId, msg.spaceId),
        externalChannelId: msg.spaceId,
        externalMessageId: msg.name,
        threadIdHash: hashMetadata(orgId, msg.thread?.name || msg.name),
        isReply: Boolean(msg.thread?.name),
        hasAttachment: (msg.attachment?.length || 0) > 0,
        hasThread: Boolean(msg.thread),
        messageLengthBucket: getMessageLengthBucket(msg.text),
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
  if (
    org.integrations?.google?.accessToken ||
    org.integrations?.googleWorkspace?.domainWideDelegationVerifiedAt
  ) {
    try {
      const adapter = new GoogleCalendarAdapter();
      const result = await adapter.sync(orgId, since, until);
      results.push(result);
    } catch (error) {
      results.push({ success: false, source: 'google-calendar', error: error.message });
    }
  }

  // Google Chat
  if (
    org.integrations?.googleChat?.accessToken ||
    org.integrations?.googleWorkspace?.domainWideDelegationVerifiedAt
  ) {
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
