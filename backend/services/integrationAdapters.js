/**
 * Base Integration Adapter Pattern
 * 
 * Each integration (Jira, Asana, Gmail, Meet, Notion, CRM)
 * implements this interface to normalize events into WorkEvent schema.
 */

import WorkEvent from '../models/workEvent.js';
import IntegrationConnection from '../models/integrationConnection.js';
import { decryptString } from '../utils/crypto.js';

// ============================================================
// ADAPTER INTERFACE (Abstract Base)
// ============================================================

export class BaseIntegrationAdapter {
  constructor(source) {
    this.source = source;
  }
  
  /**
   * Get decrypted access token for org
   */
  async getAccessToken(orgId) {
    const connection = await IntegrationConnection.findOne({
      orgId,
      integrationType: this.source,
      status: 'active'
    });
    
    if (!connection) {
      throw new Error(`No active ${this.source} connection for org ${orgId}`);
    }
    
    // Check if token needs refresh
    if (connection.credentials.expiresAt && 
        new Date(connection.credentials.expiresAt) < new Date()) {
      return this.refreshToken(connection);
    }
    
    return decryptString(connection.credentials.accessTokenEncrypted);
  }
  
  /**
   * Refresh OAuth token - implement per adapter
   */
  async refreshToken(connection) {
    throw new Error('refreshToken must be implemented by subclass');
  }
  
  /**
   * Fetch events from external API
   * Returns: Array of raw API responses
   */
  async fetchEvents(orgId, since, until) {
    throw new Error('fetchEvents must be implemented by subclass');
  }
  
  /**
   * Transform raw API response to WorkEvent schema
   * Returns: Array of WorkEvent documents (not saved)
   */
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    throw new Error('transformToWorkEvents must be implemented by subclass');
  }
  
  /**
   * Get user mapping (external ID -> internal user_id)
   */
  async getUserMappings(orgId) {
    const connection = await IntegrationConnection.findOne({
      orgId,
      integrationType: this.source,
      status: 'active'
    });
    
    if (!connection) return new Map();
    
    const mappings = new Map();
    for (const mapping of connection.userMappings || []) {
      mappings.set(mapping.externalId, mapping.internalUserId);
    }
    
    return mappings;
  }
  
  /**
   * Full sync: Fetch, transform, and save events
   */
  async sync(orgId, since, until) {
    const startTime = Date.now();
    
    try {
      // Update sync status to running
      await IntegrationConnection.findOneAndUpdate(
        { orgId, integrationType: this.source },
        { 
          'sync.status': 'running',
          'sync.lastSyncAt': new Date()
        }
      );
      
      // Fetch raw events from API
      const rawEvents = await this.fetchEvents(orgId, since, until);
      
      // Get user mappings
      const userMappings = await this.getUserMappings(orgId);
      
      // Transform to WorkEvent schema
      const workEvents = this.transformToWorkEvents(rawEvents, orgId, userMappings);
      
      // Upsert events (dedupe by externalId)
      const bulkOps = workEvents.map(event => ({
        updateOne: {
          filter: { 
            orgId: event.orgId, 
            source: event.source, 
            externalId: event.externalId 
          },
          update: { $set: event },
          upsert: true
        }
      }));
      
      let insertedCount = 0;
      let updatedCount = 0;
      
      if (bulkOps.length > 0) {
        const result = await WorkEvent.bulkWrite(bulkOps, { ordered: false });
        insertedCount = result.upsertedCount || 0;
        updatedCount = result.modifiedCount || 0;
      }
      
      // Update sync status to success
      await IntegrationConnection.findOneAndUpdate(
        { orgId, integrationType: this.source },
        { 
          'sync.status': 'idle',
          'sync.error': null,
          'metadata.lastSyncDuration': Date.now() - startTime,
          'metadata.totalEventsProcessed': (await IntegrationConnection.findOne({ orgId, integrationType: this.source }))?.metadata?.totalEventsProcessed || 0 + workEvents.length
        }
      );
      
      return {
        success: true,
        source: this.source,
        eventsProcessed: workEvents.length,
        inserted: insertedCount,
        updated: updatedCount,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      // Update sync status to error
      await IntegrationConnection.findOneAndUpdate(
        { orgId, integrationType: this.source },
        { 
          'sync.status': 'error',
          'sync.error': error.message
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Calculate coverage percentage for this integration
   */
  async calculateCoverage(orgId) {
    const connection = await IntegrationConnection.findOne({
      orgId,
      integrationType: this.source,
      status: 'active'
    });
    
    if (!connection) return 0;
    
    const mappedUsers = (connection.userMappings || []).filter(m => m.internalUserId).length;
    const totalUsers = (connection.userMappings || []).length;
    
    return totalUsers > 0 ? Math.round((mappedUsers / totalUsers) * 100) : 0;
  }
}

// ============================================================
// JIRA ADAPTER
// ============================================================

export class JiraAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('jira');
  }
  
  async refreshToken(connection) {
    // Jira Cloud uses OAuth 2.0 with refresh tokens
    const refreshToken = decryptString(connection.credentials.refreshTokenEncrypted);
    
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: process.env.JIRA_CLIENT_ID,
        client_secret: process.env.JIRA_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh Jira token');
    }
    
    const tokens = await response.json();
    
    // Update stored tokens
    await IntegrationConnection.findByIdAndUpdate(connection._id, {
      'credentials.accessTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.access_token),
      'credentials.refreshTokenEncrypted': tokens.refresh_token 
        ? require('../utils/crypto.js').encryptString(tokens.refresh_token)
        : connection.credentials.refreshTokenEncrypted,
      'credentials.expiresAt': new Date(Date.now() + (tokens.expires_in * 1000))
    });
    
    return tokens.access_token;
  }
  
  async fetchEvents(orgId, since, until) {
    const accessToken = await this.getAccessToken(orgId);
    const connection = await IntegrationConnection.findOne({
      orgId,
      integrationType: 'jira',
      status: 'active'
    });
    
    const cloudId = connection.metadata.cloudId;
    const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    
    // Fetch issues updated in time range
    const jql = `updated >= "${formatJiraDate(since)}" AND updated <= "${formatJiraDate(until)}"`;
    
    const response = await fetch(
      `${baseUrl}/search?jql=${encodeURIComponent(jql)}&expand=changelog&maxResults=100`,
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.issues || [];
  }
  
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    const workEvents = [];
    
    for (const issue of rawEvents) {
      // Base issue data
      const baseEvent = {
        orgId,
        source: 'jira',
        externalId: issue.id,
        timestamp: new Date(issue.fields.updated),
        privacyLevel: 'metadata_only'
      };
      
      // Map assignee to internal user
      const assigneeEmail = issue.fields.assignee?.emailAddress;
      const userId = userMappings.get(assigneeEmail) || null;
      
      // Determine event type from changelog
      if (issue.changelog?.histories) {
        for (const history of issue.changelog.histories) {
          for (const item of history.items) {
            if (item.field === 'status') {
              workEvents.push({
                ...baseEvent,
                externalId: `${issue.id}-${history.id}`,
                eventType: this.mapStatusChange(item.fromString, item.toString),
                userId,
                timestamp: new Date(history.created),
                metadataJson: {
                  issueKey: issue.key,
                  issueType: issue.fields.issuetype?.name,
                  priority: issue.fields.priority?.name,
                  fromStatus: item.fromString,
                  toStatus: item.toString,
                  storyPoints: issue.fields.customfield_10016 || null // Common story points field
                }
              });
            }
          }
        }
      }
      
      // If no status changes, create a generic task event
      if (workEvents.filter(e => e.externalId.startsWith(issue.id)).length === 0) {
        workEvents.push({
          ...baseEvent,
          eventType: 'task_created',
          userId,
          metadataJson: {
            issueKey: issue.key,
            issueType: issue.fields.issuetype?.name,
            priority: issue.fields.priority?.name,
            storyPoints: issue.fields.customfield_10016 || null
          }
        });
      }
    }
    
    return workEvents;
  }
  
  mapStatusChange(fromStatus, toStatus) {
    const doneStatuses = ['done', 'closed', 'resolved', 'complete'];
    const inProgressStatuses = ['in progress', 'in review', 'testing'];
    
    const toLower = toStatus?.toLowerCase() || '';
    const fromLower = fromStatus?.toLowerCase() || '';
    
    if (doneStatuses.some(s => toLower.includes(s))) {
      return 'task_completed';
    }
    
    if (doneStatuses.some(s => fromLower.includes(s)) && 
        inProgressStatuses.some(s => toLower.includes(s))) {
      return 'task_reopened';
    }
    
    if (inProgressStatuses.some(s => toLower.includes(s))) {
      return 'task_status_changed';
    }
    
    return 'task_status_changed';
  }
}

// ============================================================
// ASANA ADAPTER
// ============================================================

export class AsanaAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('asana');
  }
  
  async refreshToken(connection) {
    const refreshToken = decryptString(connection.credentials.refreshTokenEncrypted);
    
    const response = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.ASANA_CLIENT_ID,
        client_secret: process.env.ASANA_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh Asana token');
    }
    
    const tokens = await response.json();
    
    await IntegrationConnection.findByIdAndUpdate(connection._id, {
      'credentials.accessTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.access_token),
      'credentials.refreshTokenEncrypted': tokens.refresh_token 
        ? require('../utils/crypto.js').encryptString(tokens.refresh_token)
        : connection.credentials.refreshTokenEncrypted,
      'credentials.expiresAt': new Date(Date.now() + (tokens.expires_in * 1000))
    });
    
    return tokens.access_token;
  }
  
  async fetchEvents(orgId, since, until) {
    const accessToken = await this.getAccessToken(orgId);
    const connection = await IntegrationConnection.findOne({
      orgId,
      integrationType: 'asana',
      status: 'active'
    });
    
    const workspaceId = connection.metadata.workspaceId;
    
    // Fetch tasks modified in time range
    const response = await fetch(
      `https://app.asana.com/api/1.0/workspaces/${workspaceId}/tasks/search?` +
      `modified_at.after=${since.toISOString()}&` +
      `modified_at.before=${until.toISOString()}&` +
      `opt_fields=name,completed,completed_at,assignee,created_at,modified_at,memberships.project.name`,
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data || [];
  }
  
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    const workEvents = [];
    
    for (const task of rawEvents) {
      const userId = userMappings.get(task.assignee?.gid) || null;
      
      const eventType = task.completed ? 'task_completed' : 'task_status_changed';
      
      workEvents.push({
        orgId,
        source: 'asana',
        externalId: task.gid,
        eventType,
        userId,
        timestamp: new Date(task.completed_at || task.modified_at),
        privacyLevel: 'metadata_only',
        metadataJson: {
          taskName: task.name?.substring(0, 100), // Truncate for privacy
          completed: task.completed,
          project: task.memberships?.[0]?.project?.name
        }
      });
    }
    
    return workEvents;
  }
}

// ============================================================
// GMAIL ADAPTER (Metadata Only)
// ============================================================

export class GmailAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('gmail');
  }
  
  async refreshToken(connection) {
    const refreshToken = decryptString(connection.credentials.refreshTokenEncrypted);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh Gmail token');
    }
    
    const tokens = await response.json();
    
    await IntegrationConnection.findByIdAndUpdate(connection._id, {
      'credentials.accessTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.access_token),
      'credentials.expiresAt': new Date(Date.now() + (tokens.expires_in * 1000))
    });
    
    return tokens.access_token;
  }
  
  async fetchEvents(orgId, since, until) {
    const accessToken = await this.getAccessToken(orgId);
    
    // Gmail API - list messages (metadata only)
    const afterEpoch = Math.floor(since.getTime() / 1000);
    const beforeEpoch = Math.floor(until.getTime() / 1000);
    
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?` +
      `q=after:${afterEpoch} before:${beforeEpoch}&maxResults=500`,
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status}`);
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    // Fetch metadata for each message (batch for efficiency)
    const metadataPromises = messages.slice(0, 100).map(async (msg) => {
      const metaResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Date&metadataHeaders=From&metadataHeaders=To`,
        {
          headers: { 
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      if (!metaResponse.ok) return null;
      return metaResponse.json();
    });
    
    const messagesWithMeta = await Promise.all(metadataPromises);
    return messagesWithMeta.filter(m => m !== null);
  }
  
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    const workEvents = [];
    
    for (const message of rawEvents) {
      const headers = {};
      for (const header of message.payload?.headers || []) {
        headers[header.name.toLowerCase()] = header.value;
      }
      
      const dateHeader = headers['date'];
      const timestamp = dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate));
      
      // Determine if after hours (rough check - will be refined by metrics service)
      const hour = timestamp.getHours();
      const isAfterHours = hour < 8 || hour >= 18;
      
      // Email direction (sent vs received)
      const fromHeader = headers['from'] || '';
      const isSent = message.labelIds?.includes('SENT');
      
      workEvents.push({
        orgId,
        source: 'gmail',
        externalId: message.id,
        eventType: isSent ? 'email_sent' : 'email_received',
        userId: null, // Will be mapped by user email
        timestamp,
        privacyLevel: 'metadata_only',
        metadataJson: {
          isAfterHours,
          hour,
          threadId: message.threadId,
          labelIds: message.labelIds,
          // No subject, body, or full email addresses - metadata only
          hasAttachments: (message.payload?.parts || []).some(p => p.filename)
        }
      });
    }
    
    return workEvents;
  }
}

// ============================================================
// GOOGLE MEET / CALENDAR ADAPTER
// ============================================================

export class GoogleMeetAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('meet');
  }
  
  async refreshToken(connection) {
    // Same as Gmail - uses Google OAuth
    const refreshToken = decryptString(connection.credentials.refreshTokenEncrypted);
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh Google token');
    }
    
    const tokens = await response.json();
    
    await IntegrationConnection.findByIdAndUpdate(connection._id, {
      'credentials.accessTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.access_token),
      'credentials.expiresAt': new Date(Date.now() + (tokens.expires_in * 1000))
    });
    
    return tokens.access_token;
  }
  
  async fetchEvents(orgId, since, until) {
    const accessToken = await this.getAccessToken(orgId);
    
    // Calendar API - list events
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${since.toISOString()}&` +
      `timeMax=${until.toISOString()}&` +
      `maxResults=500&singleEvents=true`,
      {
        headers: { 
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.items || [];
  }
  
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    const workEvents = [];
    
    for (const event of rawEvents) {
      // Skip all-day events (not meetings)
      if (event.start?.date && !event.start?.dateTime) continue;
      
      const start = new Date(event.start?.dateTime || event.start?.date);
      const end = new Date(event.end?.dateTime || event.end?.date);
      const durationMinutes = Math.round((end - start) / (1000 * 60));
      
      // Only count events with multiple attendees as meetings
      const attendeeCount = (event.attendees || []).length;
      if (attendeeCount < 2) continue;
      
      // Check if it has a Meet link (conferencing)
      const hasMeetLink = event.conferenceData?.conferenceSolution?.name?.toLowerCase().includes('meet') ||
                          event.hangoutLink;
      
      workEvents.push({
        orgId,
        source: 'meet',
        externalId: event.id,
        eventType: 'meeting_ended',
        userId: null, // Will be mapped by organizer email
        timestamp: end, // Use end time as the event timestamp
        privacyLevel: 'metadata_only',
        metadataJson: {
          durationMinutes,
          attendeeCount,
          isRecurring: !!event.recurringEventId,
          hasVideo: hasMeetLink,
          responseStatus: event.attendees?.find(a => a.self)?.responseStatus,
          startHour: start.getHours()
        }
      });
    }
    
    return workEvents;
  }
}

// ============================================================
// NOTION ADAPTER
// ============================================================

export class NotionAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('notion');
  }
  
  async refreshToken(connection) {
    // Notion uses long-lived access tokens, no refresh needed
    return decryptString(connection.credentials.accessTokenEncrypted);
  }
  
  async fetchEvents(orgId, since, until) {
    const accessToken = await this.getAccessToken(orgId);
    
    // Search for recently edited pages
    const response = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: { property: 'object', value: 'page' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`Notion API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter to time range
    return (data.results || []).filter(page => {
      const edited = new Date(page.last_edited_time);
      return edited >= since && edited <= until;
    });
  }
  
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    const workEvents = [];
    
    for (const page of rawEvents) {
      const edited = new Date(page.last_edited_time);
      const created = new Date(page.created_time);
      
      // Determine if this is a creation or edit
      const isNewPage = (edited.getTime() - created.getTime()) < 60000; // Within 1 minute
      
      workEvents.push({
        orgId,
        source: 'notion',
        externalId: page.id,
        eventType: isNewPage ? 'doc_created' : 'doc_edited',
        userId: userMappings.get(page.last_edited_by?.id) || null,
        timestamp: edited,
        privacyLevel: 'metadata_only',
        metadataJson: {
          pageType: page.parent?.type,
          hasIcon: !!page.icon,
          hasCover: !!page.cover,
          archived: page.archived,
          // No title or content - metadata only
        }
      });
    }
    
    return workEvents;
  }
}

// ============================================================
// HUBSPOT CRM ADAPTER
// ============================================================

export class HubSpotAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('hubspot');
  }
  
  async refreshToken(connection) {
    const refreshToken = decryptString(connection.credentials.refreshTokenEncrypted);
    
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.HUBSPOT_CLIENT_ID,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh HubSpot token');
    }
    
    const tokens = await response.json();
    
    await IntegrationConnection.findByIdAndUpdate(connection._id, {
      'credentials.accessTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.access_token),
      'credentials.refreshTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.refresh_token),
      'credentials.expiresAt': new Date(Date.now() + (tokens.expires_in * 1000))
    });
    
    return tokens.access_token;
  }
  
  async fetchEvents(orgId, since, until) {
    const accessToken = await this.getAccessToken(orgId);
    
    // Fetch deals updated in time range
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/objects/deals/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'hs_lastmodifieddate',
              operator: 'BETWEEN',
              value: since.getTime(),
              highValue: until.getTime()
            }]
          }],
          properties: ['dealname', 'dealstage', 'amount', 'closedate', 'hubspot_owner_id'],
          limit: 100
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  }
  
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    const workEvents = [];
    
    for (const deal of rawEvents) {
      const userId = userMappings.get(deal.properties.hubspot_owner_id) || null;
      
      workEvents.push({
        orgId,
        source: 'hubspot',
        externalId: deal.id,
        eventType: 'deal_stage_changed',
        userId,
        timestamp: new Date(deal.updatedAt || deal.properties.hs_lastmodifieddate),
        privacyLevel: 'metadata_only',
        metadataJson: {
          dealStage: deal.properties.dealstage,
          hasAmount: !!deal.properties.amount,
          hasCloseDate: !!deal.properties.closedate
          // No deal name, amount, or customer info - metadata only
        }
      });
    }
    
    return workEvents;
  }
}

// ============================================================
// PIPEDRIVE CRM ADAPTER
// ============================================================

export class PipedriveAdapter extends BaseIntegrationAdapter {
  constructor() {
    super('pipedrive');
  }
  
  async refreshToken(connection) {
    const refreshToken = decryptString(connection.credentials.refreshTokenEncrypted);
    
    const response = await fetch('https://oauth.pipedrive.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.PIPEDRIVE_CLIENT_ID,
        client_secret: process.env.PIPEDRIVE_CLIENT_SECRET,
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to refresh Pipedrive token');
    }
    
    const tokens = await response.json();
    
    await IntegrationConnection.findByIdAndUpdate(connection._id, {
      'credentials.accessTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.access_token),
      'credentials.refreshTokenEncrypted': require('../utils/crypto.js').encryptString(tokens.refresh_token),
      'credentials.expiresAt': new Date(Date.now() + (tokens.expires_in * 1000))
    });
    
    return tokens.access_token;
  }
  
  async fetchEvents(orgId, since, until) {
    const accessToken = await this.getAccessToken(orgId);
    const connection = await IntegrationConnection.findOne({
      orgId,
      integrationType: 'pipedrive',
      status: 'active'
    });
    
    const apiDomain = connection.metadata.apiDomain || 'api.pipedrive.com';
    
    // Fetch deals
    const response = await fetch(
      `https://${apiDomain}/v1/deals?` +
      `filter_id=0&start=0&limit=100&` +
      `sort=update_time DESC`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Pipedrive API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter to time range
    return (data.data || []).filter(deal => {
      const updated = new Date(deal.update_time);
      return updated >= since && updated <= until;
    });
  }
  
  transformToWorkEvents(rawEvents, orgId, userMappings) {
    const workEvents = [];
    
    for (const deal of rawEvents) {
      const userId = userMappings.get(deal.owner_id?.toString()) || null;
      
      workEvents.push({
        orgId,
        source: 'pipedrive',
        externalId: deal.id.toString(),
        eventType: 'deal_stage_changed',
        userId,
        timestamp: new Date(deal.update_time),
        privacyLevel: 'metadata_only',
        metadataJson: {
          stageId: deal.stage_id,
          status: deal.status,
          won: deal.status === 'won',
          lost: deal.status === 'lost'
          // No deal title, value, or customer info - metadata only
        }
      });
    }
    
    return workEvents;
  }
}

// ============================================================
// FACTORY & UTILITIES
// ============================================================

export function getAdapter(source) {
  const adapters = {
    jira: JiraAdapter,
    asana: AsanaAdapter,
    gmail: GmailAdapter,
    meet: GoogleMeetAdapter,
    notion: NotionAdapter,
    hubspot: HubSpotAdapter,
    pipedrive: PipedriveAdapter
  };
  
  const AdapterClass = adapters[source];
  if (!AdapterClass) {
    throw new Error(`Unknown integration source: ${source}`);
  }
  
  return new AdapterClass();
}

export async function syncAllIntegrations(orgId, since, until) {
  const connections = await IntegrationConnection.find({
    orgId,
    status: 'active'
  });
  
  const results = [];
  
  for (const connection of connections) {
    try {
      const adapter = getAdapter(connection.integrationType);
      const result = await adapter.sync(orgId, since, until);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        source: connection.integrationType,
        error: error.message
      });
    }
  }
  
  return results;
}

function formatJiraDate(date) {
  return date.toISOString().split('T')[0];
}

export default {
  BaseIntegrationAdapter,
  JiraAdapter,
  AsanaAdapter,
  GmailAdapter,
  GoogleMeetAdapter,
  NotionAdapter,
  HubSpotAdapter,
  PipedriveAdapter,
  getAdapter,
  syncAllIntegrations
};
