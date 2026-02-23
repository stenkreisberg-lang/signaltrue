/**
 * Core Integration Adapters for Slack, Microsoft (Outlook/Teams), and Google Calendar
 * 
 * These adapters sync data from organization-level OAuth tokens stored in
 * Organization.integrations and create WorkEvent documents for analytics.
 */

import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';
import { decryptString, encryptString } from '../utils/crypto.js';
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
    console.log(`[${this.source}] Starting sync for org ${orgId} from ${since.toISOString()} to ${until.toISOString()}`);
    
    try {
      const accessToken = await this.getAccessToken(orgId);
      const rawEvents = await this.fetchEvents(orgId, accessToken, since, until);
      
      console.log(`[${this.source}] Fetched ${rawEvents.length} raw events`);
      
      if (rawEvents.length === 0) {
        return { success: true, source: this.source, eventsProcessed: 0, duration: Date.now() - startTime };
      }
      
      // Transform to WorkEvents
      const workEvents = await this.transformToWorkEvents(rawEvents, orgId);
      
      // Bulk upsert to avoid duplicates
      const bulkOps = workEvents.map(event => ({
        updateOne: {
          filter: { externalId: event.externalId, source: event.source },
          update: { $set: event },
          upsert: true
        }
      }));
      
      let upserted = 0, modified = 0;
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
        duration: Date.now() - startTime
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
        'integrations.slack.sync.eventsCount': count
      }
    });
  }
  
  async fetchEvents(orgId, accessToken, since, until) {
    const allMessages = [];
    
    // Get list of channels
    const channelsRes = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
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
          const messages = historyData.messages.map(m => ({
            ...m,
            channelId: channel.id,
            channelName: channel.name
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
    return rawMessages.map(msg => ({
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
      raw: { text: msg.text?.substring(0, 500) } // Truncate for storage
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
    const tenant = process.env.MS_APP_TENANT || 'common';
    
    const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MS_APP_CLIENT_ID,
        client_secret: process.env.MS_APP_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      }).toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token refresh failed: ${error}`);
    }
    
    const tokens = await response.json();
    
    await Organization.findByIdAndUpdate(org._id, {
      $set: {
        'integrations.microsoft.accessToken': encryptString(tokens.access_token),
        'integrations.microsoft.refreshToken': tokens.refresh_token ? encryptString(tokens.refresh_token) : integration.refreshToken,
        'integrations.microsoft.expiry': new Date(Date.now() + tokens.expires_in * 1000)
      }
    });
    
    return tokens.access_token;
  }
  
  async updateSyncStatus(orgId, success, count, error = null) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.microsoft.sync.lastSync': new Date(),
        'integrations.microsoft.sync.status': success ? 'success' : 'error',
        'integrations.microsoft.sync.error': error,
        'integrations.microsoft.sync.eventsCount': count
      }
    });
  }
  
  async fetchEvents(orgId, accessToken, since, until) {
    const org = await Organization.findById(orgId).lean();
    const scope = org.integrations?.microsoft?.scope || 'outlook';
    
    if (scope === 'both') {
      // Fetch both Outlook calendar events and Teams messages
      const [outlookEvents, teamsMessages] = await Promise.all([
        this.fetchOutlookEvents(accessToken, since, until).catch(err => {
          console.warn('[Microsoft] Outlook fetch failed:', err.message);
          return [];
        }),
        this.fetchTeamsMessages(accessToken, since, until).catch(err => {
          console.warn('[Microsoft] Teams fetch failed:', err.message);
          return [];
        }),
      ]);
      return [...outlookEvents, ...teamsMessages];
    } else if (scope === 'outlook') {
      return await this.fetchOutlookEvents(accessToken, since, until);
    } else {
      return await this.fetchTeamsMessages(accessToken, since, until);
    }
  }
  
  async fetchOutlookEvents(accessToken, since, until) {
    // Fetch calendar events
    const url = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${since.toISOString()}&endDateTime=${until.toISOString()}&$top=100`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Outlook fetch failed: ${error}`);
    }
    
    const data = await response.json();
    return (data.value || []).map(event => ({ ...event, eventSource: 'outlook' }));
  }
  
  async fetchTeamsMessages(accessToken, since, until) {
    // Get joined teams
    const teamsRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const teamsData = await teamsRes.json();
    const teams = teamsData.value || [];
    
    const allMessages = [];
    
    // For each team, get channels and messages (limit to 3 teams)
    for (const team of teams.slice(0, 3)) {
      try {
        const channelsRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${team.id}/channels`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const channelsData = await channelsRes.json();
        const channels = channelsData.value || [];
        
        // Get messages from first 2 channels per team
        for (const channel of channels.slice(0, 2)) {
          const msgsRes = await fetch(
            `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${channel.id}/messages?$top=50`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const msgsData = await msgsRes.json();
          const messages = (msgsData.value || []).map(m => ({
            ...m,
            teamId: team.id,
            teamName: team.displayName,
            channelId: channel.id,
            channelName: channel.displayName,
            eventSource: 'teams'
          }));
          allMessages.push(...messages);
        }
      } catch (err) {
        console.warn(`Failed to fetch Teams channel for ${team.displayName}:`, err.message);
      }
    }
    
    return allMessages;
  }
  
  async transformToWorkEvents(rawEvents, orgId) {
    return rawEvents.map(event => {
      if (event.eventSource === 'outlook') {
        // Calendar event
        const start = new Date(event.start?.dateTime + 'Z');
        const end = new Date(event.end?.dateTime + 'Z');
        const durationMinutes = (end - start) / (1000 * 60);
        
        return {
          orgId: new mongoose.Types.ObjectId(orgId),
          source: 'microsoft-outlook',
          eventType: 'meeting',
          externalId: `outlook-${event.id}`,
          timestamp: start,
          duration: durationMinutes,
          metadata: {
            subject: event.subject,
            organizer: event.organizer?.emailAddress?.address,
            attendeeCount: event.attendees?.length || 0,
            isOnlineMeeting: event.isOnlineMeeting,
            isAllDay: event.isAllDay,
            showAs: event.showAs, // 'busy', 'free', 'tentative'
            location: event.location?.displayName,
          },
          raw: { id: event.id }
        };
      } else {
        // Teams message
        return {
          orgId: new mongoose.Types.ObjectId(orgId),
          source: 'microsoft-teams',
          eventType: 'message',
          externalId: `teams-${event.id}`,
          timestamp: new Date(event.createdDateTime),
          metadata: {
            teamId: event.teamId,
            teamName: event.teamName,
            channelId: event.channelId,
            channelName: event.channelName,
            from: event.from?.user?.displayName,
            messageType: event.messageType,
            hasAttachments: (event.attachments?.length || 0) > 0,
          },
          raw: { id: event.id }
        };
      }
    });
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
        grant_type: 'refresh_token'
      }).toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token refresh failed: ${error}`);
    }
    
    const tokens = await response.json();
    
    await Organization.findByIdAndUpdate(org._id, {
      $set: {
        'integrations.google.accessToken': encryptString(tokens.access_token),
        'integrations.google.expiry': new Date(Date.now() + tokens.expires_in * 1000)
      }
    });
    
    return tokens.access_token;
  }
  
  async updateSyncStatus(orgId, success, count, error = null) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.google.sync.lastSync': new Date(),
        'integrations.google.sync.status': success ? 'success' : 'error',
        'integrations.google.sync.error': error,
        'integrations.google.sync.eventsCount': count
      }
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
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar fetch failed: ${error}`);
    }
    
    const data = await response.json();
    return data.items || [];
  }
  
  async transformToWorkEvents(rawEvents, orgId) {
    return rawEvents.map(event => {
      const start = event.start?.dateTime ? new Date(event.start.dateTime) : new Date(event.start?.date);
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
        },
        raw: { id: event.id }
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
        grant_type: 'refresh_token'
      }).toString()
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Chat token refresh failed: ${error}`);
    }
    
    const tokens = await response.json();
    
    await Organization.findByIdAndUpdate(org._id, {
      $set: {
        'integrations.googleChat.accessToken': encryptString(tokens.access_token),
        'integrations.googleChat.expiry': new Date(Date.now() + tokens.expires_in * 1000)
      }
    });
    
    return tokens.access_token;
  }
  
  async updateSyncStatus(orgId, success, count, error = null) {
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.googleChat.sync.lastSync': new Date(),
        'integrations.googleChat.sync.status': success ? 'success' : 'error',
        'integrations.googleChat.sync.error': error,
        'integrations.googleChat.sync.eventsCount': count
      }
    });
  }
  
  async fetchEvents(orgId, accessToken, since, until) {
    // Get list of spaces
    const spacesRes = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=20', {
      headers: { Authorization: `Bearer ${accessToken}` }
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
        const messages = (messagesData.messages || []).map(m => ({
          ...m,
          spaceName: space.displayName || space.name
        }));
        allMessages.push(...messages);
      } catch (err) {
        console.warn(`Failed to fetch Google Chat space ${space.name}:`, err.message);
      }
    }
    
    return allMessages;
  }
  
  async transformToWorkEvents(rawMessages, orgId) {
    return rawMessages.map(msg => ({
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
      raw: { name: msg.name }
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
  syncCoreIntegrations
};
