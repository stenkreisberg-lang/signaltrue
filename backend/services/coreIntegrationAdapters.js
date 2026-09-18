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
import { MICROSOFT_TEAMS_APPLICATION_ROLES } from '../config/microsoftPermissions.js';

export async function fetchGraphCollection(
  initialUrl,
  accessToken,
  { maxPages = 100, maxRetries = 2, baseRetryDelayMs = 500, maxRetryDelayMs = 30_000 } = {}
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
      const delayMs = Math.min(
        maxRetryDelayMs,
        Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1000
          : baseRetryDelayMs * 2 ** attempt
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (!response.ok) {
      const body = await response.text();
      let graphCode = null;
      try {
        const parsed = JSON.parse(body);
        graphCode = parsed?.error?.code || null;
      } catch {
        // A status and a stable provider code are enough for logs and UI state.
      }
      const error = new Error(
        `Microsoft Graph ${response.status}${graphCode ? ` (${graphCode})` : ''}`
      );
      error.status = response.status;
      error.graphCode = graphCode;
      throw error;
    }
    const data = await response.json();
    items.push(...(data.value || []));
    nextUrl = data['@odata.nextLink'] || null;
    pages++;
  }

  if (nextUrl) {
    const error = new Error(`Microsoft Graph pagination exceeded the ${maxPages}-page safety limit`);
    error.code = 'MICROSOFT_GRAPH_PAGE_LIMIT';
    throw error;
  }
  return items;
}

function getMicrosoftTokenRoles(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString());
    return Array.isArray(payload.roles) ? payload.roles : [];
  } catch {
    return [];
  }
}

export function classifyMicrosoftSyncError(error) {
  const message = String(error?.message || error || 'Microsoft synchronization failed');
  const providerCode = String(error?.microsoftCode || error?.graphCode || error?.code || '');

  if (/AADSTS700082|refresh token has expired|invalid_grant/i.test(`${providerCode} ${message}`)) {
    return {
      kind: 'reauthorization_required',
      status: 'error',
      disableSync: true,
      message: 'Microsoft authorization expired. Reconnect Microsoft to resume synchronization.',
    };
  }
  if (/AADSTS900023|tenant.*invalid|invalid.*tenant/i.test(`${providerCode} ${message}`)) {
    return {
      kind: 'invalid_tenant',
      status: 'error',
      disableSync: true,
      message: 'The Microsoft tenant is invalid. Reconnect Microsoft with the correct tenant.',
    };
  }
  if (
    error?.kind === 'missing_application_roles' ||
    (Array.isArray(error?.missingRoles) && error.missingRoles.length > 0) ||
    /application permissions? (?:are )?(?:missing|not granted)/i.test(message)
  ) {
    return {
      kind: 'admin_consent_required',
      status: 'needs_admin',
      disableSync: false,
      message: error?.missingRoles?.length
        ? `Microsoft administrator consent is required for: ${error.missingRoles.join(', ')}.`
        : 'Microsoft administrator consent is required for this data source.',
    };
  }
  if (error?.status === 403 || /Forbidden|Authorization_RequestDenied|ErrorAccessDenied/i.test(message)) {
    return {
      kind: 'graph_access_denied',
      status: 'error',
      disableSync: false,
      message:
        'Microsoft permissions are present, but Graph denied this data-source request. Check application access policies and the live Graph diagnostic.',
    };
  }
  return {
    kind: 'sync_failed',
    status: 'error',
    disableSync: false,
    message: message.slice(0, 300),
  };
}

export function isUnavailableMicrosoftMailboxError(error) {
  const code = String(error?.graphCode || error?.microsoftCode || error?.message || '');
  return (
    error?.status === 404 ||
    /^(?:Error)?(?:MailboxNotEnabledForRESTAPI|MailboxNotFound|InvalidUser|ResourceNotFound)$/i.test(
      code
    )
  );
}

function missingMicrosoftRolesError(source, missingRoles) {
  const error = new Error(
    `Microsoft ${source} application permissions missing: ${missingRoles.join(', ')}`
  );
  error.kind = 'missing_application_roles';
  error.missingRoles = missingRoles;
  return error;
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

export function buildWorkEventUpsertOperations(workEvents) {
  return workEvents.map((event) => ({
    updateOne: {
      filter: { orgId: event.orgId, externalId: event.externalId, source: event.source },
      update: { $set: event },
      upsert: true,
    },
  }));
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
        await this.updateSyncStatus(orgId, true, 0);
        await this.updateConnectionCoverage(orgId, []);
        return {
          success: true,
          source: this.source,
          eventsProcessed: 0,
          duration: Date.now() - startTime,
          details: this.getSyncDetails?.(),
        };
      }

      // Transform to WorkEvents
      const transformedEvents = await this.transformToWorkEvents(rawEvents, orgId);
      const workEvents = await enrichWorkEvents(transformedEvents, orgId);

      // Bulk upsert to avoid duplicates
      const bulkOps = buildWorkEventUpsertOperations(workEvents);

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
        details: this.getSyncDetails?.(),
      };
    } catch (error) {
      const safeError =
        this.source === 'microsoft'
          ? classifyMicrosoftSyncError(error).message
          : String(error?.message || error).slice(0, 500);
      console.error(`[${this.source}] Sync error for org ${orgId}:`, safeError);
      await this.updateSyncStatus(orgId, false, 0, error);
      return {
        success: false,
        source: this.source,
        error: safeError,
        details: this.getSyncDetails?.(),
      };
    }
  }

  async updateSyncStatus(_orgId, _success, _count, _error = null) {
    // Override in subclass
  }

  async updateConnectionCoverage(orgId, workEvents) {
    const totalUsers = await User.countDocuments({
      orgId,
      accountStatus: { $ne: 'inactive' },
    });
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
        'integrations.slack.sync.error': error
          ? String(error?.message || error).slice(0, 500)
          : null,
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
    const joinedChannels = channels.filter((channel) => channel.is_member !== false);
    const skippedChannels = channels.length - joinedChannels.length;
    if (skippedChannels > 0) {
      console.info(`[Slack] Skipped ${skippedChannels} channels because the app is not a member`);
    }
    const oldestTs = Math.floor(since.getTime() / 1000);
    const latestTs = Math.floor(until.getTime() / 1000);

    for (const channel of joinedChannels) {
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
    this.lastFetchSummary = { sources: {} };
    this.pendingOutlookCoverage = null;
    this.pendingTeamsCoverage = null;
  }

  getSyncDetails() {
    return this.lastFetchSummary;
  }

  getIntegrationData(org) {
    return org.integrations?.microsoft;
  }

  async getAccessToken(orgId) {
    const org = await Organization.findById(orgId).lean();
    const tenantId = org?.integrations?.microsoft?.tenantId;
    if (!tenantId) throw new Error('Microsoft tenant identity is not connected.');
    const appToken = await getMicrosoftAppToken(tenantId);
    if (!appToken) throw new Error('Microsoft application credentials are not configured.');
    if (getMicrosoftTokenRoles(appToken).length === 0) {
      throw new Error('Microsoft application permissions are not granted for this tenant.');
    }
    return appToken;
  }

  async updateSyncStatus(orgId, success, count, error = null) {
    const failure = success ? null : classifyMicrosoftSyncError(error);
    const failedSources = Object.entries(this.lastFetchSummary?.sources || {})
      .filter(([, summary]) => summary?.attempted && !summary.success)
      .map(([source, summary]) => `${source}: ${summary.errorMessage || 'sync failed'}`);
    const syncStatus = success ? (failedSources.length > 0 ? 'partial' : 'ok') : 'error';
    const syncError =
      failure?.message || (failedSources.length > 0 ? failedSources.join(' ') : null);
    const now = new Date();
    const setPayload = {
      'integrations.microsoft.sync.lastRunAt': now,
      'integrations.microsoft.sync.lastStatus': syncStatus,
      'integrations.microsoft.sync.error': syncError,
      'integrations.microsoft.sync.eventsCount': count,
    };
    if (success) {
      setPayload['integrations.microsoft.sync.lastSync'] = now;
      setPayload['integrations.microsoft.lastPulledAt'] = now;
    }
    if (failure?.disableSync) setPayload['integrations.microsoft.sync.enabled'] = false;
    await Organization.findByIdAndUpdate(orgId, {
      $set: setPayload,
    });

    if (!success && failure) {
      const hasSourceResults = Object.values(this.lastFetchSummary?.sources || {}).some(
        (summary) => summary?.attempted
      );
      if (hasSourceResults) {
        // A combined Microsoft run can fail overall while one source remains
        // healthy. Persist each source result independently instead of
        // overwriting Outlook and Teams with the first error encountered.
        await this.updateConnectionCoverage(orgId, []);
        return;
      }
      const org = await Organization.findById(orgId).select('integrations.microsoft.scope').lean();
      const scope = org?.integrations?.microsoft?.scope || 'outlook';
      const integrationTypes =
        scope === 'both'
          ? ['microsoft-outlook', 'microsoft-teams']
          : [scope === 'teams' ? 'microsoft-teams' : 'microsoft-outlook'];
      await Promise.all(
        integrationTypes.map((integrationType) =>
          IntegrationConnection.findOneAndUpdate(
            { orgId, integrationType },
            {
              $set: {
                status: failure.status,
                statusMessage: failure.message,
                statusUpdatedAt: now,
                'sync.lastSyncAt': now,
                'sync.lastSyncStatus': 'failed',
                'sync.lastSyncMessage': failure.message,
                ...(failure.disableSync ? { 'sync.enabled': false } : {}),
              },
            },
            { upsert: true }
          )
        )
      );
    }
  }

  async updateConnectionCoverage(orgId, workEvents) {
    const [totalUsers, organization] = await Promise.all([
      User.countDocuments({ orgId, accountStatus: { $ne: 'inactive' } }),
      Organization.findById(orgId)
        .select(
          'integrations.microsoft.applicationConsentVerifiedAt integrations.microsoft.applicationConsentSources'
        )
        .lean(),
    ]);

    const updateForType = async (integrationType, source) => {
      const sourceKey = source === 'microsoft-outlook' ? 'outlook' : 'teams';
      const fetchSummary = this.lastFetchSummary?.sources?.[sourceKey];
      if (!fetchSummary?.attempted) return;
      const companyWideVerified = Boolean(
        organization?.integrations?.microsoft?.applicationConsentSources?.[sourceKey]?.verifiedAt ||
        organization?.integrations?.microsoft?.applicationConsentVerifiedAt
      );
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
      const fetchFailure = fetchSummary.success
        ? null
        : classifyMicrosoftSyncError(fetchSummary.error || 'Microsoft source fetch failed');
      const now = new Date();

      const setPayload = {
        status: fetchFailure
          ? fetchFailure.status
          : companyWideVerified
            ? 'connected'
            : 'needs_admin',
        statusMessage:
          fetchFailure?.message ||
          (sourceEvents.length === 0 && hasMappedHistory
            ? 'Microsoft metadata is connected; no new events were found in the latest sync'
            : hasMappedHistory
              ? 'Microsoft metadata is syncing and mapped to internal users'
              : companyWideVerified
                ? 'Company-wide Microsoft access is verified; waiting for mapped activity'
                : 'Microsoft administrator consent is required for organization-wide metadata.'),
        statusUpdatedAt: now,
        ...(companyWideVerified ? { connectedAt: now } : {}),
        'sync.lastSyncAt': now,
        'sync.lastSyncStatus': fetchFailure
          ? 'failed'
          : hasMappedHistory || fetchSummary.success
            ? 'success'
            : 'partial',
        'sync.lastSyncEventsCount': sourceEvents.length,
        'coverage.totalUsers': totalUsers,
        'coverage.mappedUsers': mappedUserCount,
        'coverage.lastCoverageUpdatedAt': now,
        measurementScope: companyWideVerified
          ? 'organization-wide Microsoft metadata'
          : 'metadata only',
      };
      if (fetchSummary.success) setPayload['sync.lastSuccessfulSyncAt'] = now;
      if (sourceKey === 'outlook' && fetchSummary.coverage) {
        setPayload['coverage.availableUsers'] = fetchSummary.coverage.availableUsers;
        setPayload['coverage.unavailableUsers'] = fetchSummary.coverage.unavailableUsers;
        setPayload['coverage.failedUsers'] = fetchSummary.coverage.failedUsers;
      }
      if (fetchSummary.coverage) {
        setPayload['coverage.attemptedUsers'] = fetchSummary.coverage.attemptedUsers;
        setPayload['coverage.syncedUsers'] = fetchSummary.coverage.syncedUsers;
        setPayload['coverage.skippedUsers'] = fetchSummary.coverage.skippedUsers;
        setPayload['coverage.eventsCollected'] = fetchSummary.coverage.eventsCollected;
        setPayload['coverage.errorCategories'] = fetchSummary.coverage.errorCategories;
        if (sourceKey === 'teams') {
          setPayload['coverage.teamsDiscovered'] = fetchSummary.coverage.teamsDiscovered;
          setPayload['coverage.teamsRead'] = fetchSummary.coverage.teamsRead;
          setPayload['coverage.teamsSkipped'] = fetchSummary.coverage.teamsSkipped;
        }
      }
      if (!fetchFailure && sourceEventCount === 0 && sourceEvents.length === 0) {
        setPayload.statusMessage = companyWideVerified
          ? `Company-wide Microsoft ${sourceKey === 'teams' ? 'Teams' : 'Outlook'} access is verified; no activity was found in the coverage window.`
          : `Microsoft ${sourceKey === 'teams' ? 'Teams' : 'Outlook'} needs administrator consent for organization-wide coverage.`;
      }

      const update = { $set: setPayload };
      if (!companyWideVerified) update.$unset = { connectedAt: 1, connectedBy: 1 };
      await IntegrationConnection.findOneAndUpdate({ orgId, integrationType }, update, {
        upsert: true,
      });
    };

    await Promise.all([
      updateForType('microsoft-outlook', 'microsoft-outlook'),
      updateForType('microsoft-teams', 'microsoft-teams'),
    ]);
  }

  async fetchEvents(orgId, accessToken, since, until) {
    const org = await Organization.findById(orgId).lean();
    const scope = org.integrations?.microsoft?.scope || 'outlook';
    this.lastFetchSummary = { sources: {} };
    this.pendingOutlookCoverage = null;
    this.pendingTeamsCoverage = null;

    const fetchSource = async (key, fetcher) => {
      try {
        const events = await fetcher();
        this.lastFetchSummary.sources[key] = {
          attempted: true,
          success: true,
          events: events.length,
          ...(key === 'outlook' && this.pendingOutlookCoverage
            ? { coverage: this.pendingOutlookCoverage }
            : {}),
          ...(key === 'teams' && this.pendingTeamsCoverage
            ? { coverage: this.pendingTeamsCoverage }
            : {}),
        };
        return events;
      } catch (error) {
        const failure = classifyMicrosoftSyncError(error);
        this.lastFetchSummary.sources[key] = {
          attempted: true,
          success: false,
          events: 0,
          error,
          errorKind: failure.kind,
          errorMessage: failure.message,
          ...(key === 'outlook' && this.pendingOutlookCoverage
            ? { coverage: this.pendingOutlookCoverage }
            : {}),
          ...(key === 'teams' && this.pendingTeamsCoverage
            ? { coverage: this.pendingTeamsCoverage }
            : {}),
        };
        console.warn(`[Microsoft] ${key} fetch failed: ${failure.message}`);
        return [];
      }
    };

    if (scope === 'both') {
      const [outlookEvents, teamsMessages] = await Promise.all([
        fetchSource('outlook', () => this.fetchOutlookEvents(accessToken, since, until, orgId)),
        fetchSource('teams', () => this.fetchTeamsMessages(accessToken, since, until, orgId)),
      ]);
      if (
        !this.lastFetchSummary.sources.outlook.success &&
        !this.lastFetchSummary.sources.teams.success
      ) {
        throw (
          this.lastFetchSummary.sources.outlook.error || this.lastFetchSummary.sources.teams.error
        );
      }
      return [...outlookEvents, ...teamsMessages];
    } else if (scope === 'outlook') {
      const events = await fetchSource('outlook', () =>
        this.fetchOutlookEvents(accessToken, since, until, orgId)
      );
      if (!this.lastFetchSummary.sources.outlook.success) {
        throw this.lastFetchSummary.sources.outlook.error;
      }
      return events;
    } else {
      const events = await fetchSource('teams', () =>
        this.fetchTeamsMessages(accessToken, since, until, orgId)
      );
      if (!this.lastFetchSummary.sources.teams.success) {
        throw this.lastFetchSummary.sources.teams.error;
      }
      return events;
    }
  }

  async fetchOutlookEvents(appToken, since, until, orgId = null) {
    const allEvents = [];
    this.pendingOutlookCoverage = null;
    const select =
      '$select=id,start,end,organizer,attendees,isOnlineMeeting,isAllDay,showAs,recurrence,seriesMasterId,isCancelled,type&$top=100';
    const roles = getMicrosoftTokenRoles(appToken);
    const requiredRoles = ['Calendars.Read', 'User.Read.All'];
    const missingRoles = requiredRoles.filter((role) => !roles.includes(role));
    if (missingRoles.length > 0) {
      throw missingMicrosoftRolesError('Outlook', missingRoles);
    }
    if (!orgId) throw new Error('Organization is required for company-wide Outlook collection.');

    const orgUsers = await User.find({
      orgId,
      'externalIds.microsoftUserId': { $exists: true, $ne: null },
      accountStatus: { $ne: 'inactive' },
    })
      .select('_id externalIds')
      .lean();
    if (orgUsers.length === 0) {
      throw new Error('Microsoft directory must be synchronized before Outlook collection.');
    }

    let successCount = 0;
    let unavailableCount = 0;
    let permissionDeniedCount = 0;
    let transientFailureCount = 0;
    let otherFailureCount = 0;
    for (const user of orgUsers) {
      const msId = user.externalIds?.microsoftUserId;
      if (!msId) continue;
      try {
        const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(msId)}/calendarview?startDateTime=${encodeURIComponent(since.toISOString())}&endDateTime=${encodeURIComponent(until.toISOString())}&${select}`;
        const calendarEvents = await fetchGraphCollection(url, appToken);
        allEvents.push(
          ...calendarEvents.map((event) => ({
            ...event,
            eventSource: 'outlook',
            _internalUserId: user._id,
          }))
        );
        successCount++;
      } catch (error) {
        if (isUnavailableMicrosoftMailboxError(error)) unavailableCount++;
        else if (error.status === 403) permissionDeniedCount++;
        else if (error.status === 429 || error.status >= 500) transientFailureCount++;
        else otherFailureCount++;
      }
    }

    this.pendingOutlookCoverage = {
      attemptedUsers: orgUsers.length,
      syncedUsers: successCount,
      skippedUsers:
        unavailableCount + permissionDeniedCount + transientFailureCount + otherFailureCount,
      eventsCollected: allEvents.length,
      availableUsers: successCount,
      unavailableUsers: unavailableCount,
      failedUsers: permissionDeniedCount + transientFailureCount + otherFailureCount,
      errorCategories: {
        mailboxUnavailable: unavailableCount,
        accessDenied: permissionDeniedCount,
        transient: transientFailureCount,
        other: otherFailureCount,
      },
    };
    if (successCount === 0) {
      const error = new Error('No organization mailbox was accessible during Outlook sync.');
      error.coverage = this.pendingOutlookCoverage;
      throw error;
    }
    console.log(
      `[Microsoft][AppOnly] Calendar coverage: ${successCount}/${orgUsers.length} accessible, ${unavailableCount} unavailable, ${permissionDeniedCount + otherFailureCount} failed`
    );
    return allEvents;
  }

  async fetchTeamsMessages(appToken, since, until, orgId = null) {
    const appRoles = getMicrosoftTokenRoles(appToken);
    const missingRoles = MICROSOFT_TEAMS_APPLICATION_ROLES.filter(
      (role) => !appRoles.includes(role)
    );
    if (missingRoles.length > 0) {
      throw missingMicrosoftRolesError('Teams', missingRoles);
    }
    if (!orgId) throw new Error('Organization is required for company-wide Teams collection.');

    const tenantMessages = await this.fetchTenantWideTeamsMessages(appToken, since, until, orgId);
    console.log(
      `[Microsoft][AppOnly] Teams: fetched ${tenantMessages.length} tenant-wide channel messages`
    );
    return tenantMessages;
  }

  async fetchTenantWideTeamsMessages(appToken, since, until, orgId) {
    this.pendingTeamsCoverage = null;
    const orgUsers = await User.find({
      orgId,
      'externalIds.microsoftUserId': { $exists: true, $ne: null },
      accountStatus: { $ne: 'inactive' },
    })
      .select('externalIds.microsoftUserId')
      .lean();
    if (orgUsers.length === 0) {
      throw new Error('Microsoft directory must be synchronized before Teams collection.');
    }

    const teamById = new Map();
    let membershipReads = 0;
    let membershipAccessDenied = 0;
    let membershipTransientFailures = 0;
    let membershipOtherFailures = 0;
    let lastMembershipError = null;
    for (const user of orgUsers) {
      const microsoftUserId = user.externalIds?.microsoftUserId;
      if (!microsoftUserId) continue;
      try {
        const joinedTeams = await fetchGraphCollection(
          `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(microsoftUserId)}/joinedTeams`,
          appToken
        );
        membershipReads++;
        for (const team of joinedTeams) teamById.set(team.id, team);
      } catch (error) {
        lastMembershipError = error;
        if (error.status === 403) membershipAccessDenied++;
        else if (error.status === 429 || error.status >= 500) membershipTransientFailures++;
        else membershipOtherFailures++;
      }
    }
    const teams = [...teamById.values()];
    const allMessages = [];
    let successfulTeamReads = 0;
    let failedTeamReads = 0;
    let channelMetadataFailures = 0;
    let lastTeamReadError = null;
    const filter = encodeURIComponent(
      `lastModifiedDateTime gt ${since.toISOString()} and lastModifiedDateTime lt ${until.toISOString()}`
    );

    for (const team of teams) {
      let channelById = new Map();
      try {
        const channels = await fetchGraphCollection(
          `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(team.id)}/allChannels?$select=id,displayName,membershipType`,
          appToken
        );
        channelById = new Map(channels.map((channel) => [channel.id, channel]));
      } catch {
        channelMetadataFailures++;
      }

      try {
        const messages = await fetchGraphCollection(
          `https://graph.microsoft.com/v1.0/teams/${encodeURIComponent(team.id)}/channels/getAllMessages?$top=50&$filter=${filter}`,
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
        failedTeamReads++;
        lastTeamReadError = error;
      }
    }

    this.pendingTeamsCoverage = {
      attemptedUsers: orgUsers.length,
      syncedUsers: membershipReads,
      skippedUsers: orgUsers.length - membershipReads,
      eventsCollected: allMessages.length,
      teamsDiscovered: teams.length,
      teamsRead: successfulTeamReads,
      teamsSkipped: failedTeamReads,
      errorCategories: {
        accessDenied: membershipAccessDenied,
        transient: membershipTransientFailures,
        other: membershipOtherFailures,
        channelMetadata: channelMetadataFailures,
        teamMessages: failedTeamReads,
      },
    };

    if (membershipReads === 0) {
      throw lastMembershipError || new Error('No mapped user could be checked for Teams membership.');
    }
    if (teams.length > 0 && successfulTeamReads === 0) {
      throw lastTeamReadError || new Error('No visible Microsoft Team could be read for messages.');
    }

    console.log(
      `[Microsoft][AppOnly] Teams coverage: ${membershipReads}/${orgUsers.length} membership checks succeeded, ${teams.length} teams discovered, ${successfulTeamReads} read, ${allMessages.length} messages collected`
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
        'integrations.google.sync.error': error
          ? String(error?.message || error).slice(0, 500)
          : null,
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
          console.warn(
            `[Google Calendar] User ${String(user._id).slice(-6)} sync skipped: ${String(error.message).slice(0, 200)}`
          );
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
        'integrations.googleChat.sync.error': error
          ? String(error?.message || error).slice(0, 500)
          : null,
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
          console.warn(
            `[Google Chat] User ${String(user._id).slice(-6)} sync skipped: ${String(error.message).slice(0, 200)}`
          );
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
  if (org.integrations?.slack?.accessToken && org.integrations?.slack?.sync?.enabled !== false) {
    try {
      const adapter = new SlackAdapter();
      const result = await adapter.sync(orgId, since, until);
      results.push(result);
    } catch (error) {
      results.push({ success: false, source: 'slack', error: error.message });
    }
  }

  // Microsoft (Outlook or Teams)
  if (
    org.integrations?.microsoft?.tenantId &&
    (org.integrations?.microsoft?.applicationConsentSources?.outlook?.verifiedAt ||
      org.integrations?.microsoft?.applicationConsentSources?.teams?.verifiedAt ||
      org.integrations?.microsoft?.applicationConsentVerifiedAt) &&
    org.integrations?.microsoft?.sync?.enabled !== false
  ) {
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
    (org.integrations?.google?.accessToken ||
      org.integrations?.googleWorkspace?.domainWideDelegationVerifiedAt) &&
    org.integrations?.google?.sync?.enabled !== false
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
    (org.integrations?.googleChat?.accessToken ||
      org.integrations?.googleWorkspace?.domainWideDelegationVerifiedAt) &&
    org.integrations?.googleChat?.sync?.enabled !== false
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
