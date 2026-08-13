/**
 * Google Chat Service
 * Fetches messages from Google Chat API and analyzes team communication patterns
 * Includes ad-hoc meeting detection from Google Meet links
 */

import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import { createSnapshot } from '../utils/bdiHistory.js';
import { decryptString } from '../utils/crypto.js';

/**
 * Fetch messages from a Google Chat space
 * @param {string} accessToken - OAuth access token
 * @param {string} spaceId - Google Chat space ID
 * @param {number} days - Days to look back
 * @returns {Array} Messages
 */
export async function fetchSpaceMessages(accessToken, spaceId, days = 7) {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 3600 * 1000);
    const cutoffTimestamp = cutoffDate.toISOString();

    // Google Chat API v1 endpoint
    const url = new URL(`https://chat.googleapis.com/v1/${spaceId}/messages`);
    url.searchParams.set('pageSize', '1000');
    url.searchParams.set('orderBy', 'createTime desc');
    url.searchParams.set('filter', `createTime > "${cutoffTimestamp}"`);

    const response = await fetch(String(url), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Chat API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error fetching Google Chat messages:', error.message);
    return [];
  }
}

/**
 * List all spaces (rooms) the bot has access to
 * @param {string} accessToken - OAuth access token
 * @returns {Array} Spaces
 */
export async function listSpaces(accessToken) {
  try {
    const url = 'https://chat.googleapis.com/v1/spaces';

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Chat API error: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.spaces || [];
  } catch (error) {
    console.error('Error listing Google Chat spaces:', error.message);
    return [];
  }
}

/**
 * Deprecated compatibility stub. SignalTrue does not analyze chat sentiment.
 */
export async function analyzeSentiment() {
  return 0;
}

/**
 * Deprecated compatibility stub. We do not inspect message text for meeting links.
 */
export function detectAdHocMeetings() {
  return {
    adHocMeetingCount: 0,
    estimatedMeetingHours: 0,
    afterHoursMeetings: 0,
    meetLinks: [],
  };
}

/**
 * Analyze a Google Chat space
 * @param {string} accessToken - OAuth access token
 * @param {string} spaceId - Space ID to analyze
 * @returns {Object} Analysis results
 */
export async function analyzeSpace(accessToken, spaceId) {
  // Fetch messages
  const messages = await fetchSpaceMessages(accessToken, spaceId, 7);
  const messageCount = messages.length;

  // Calculate average response delay (time between messages from different users)
  let totalDelay = 0;
  let delays = 0;

  // Sort messages by time (oldest first for proper delay calculation)
  const sortedMessages = messages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));

  for (let i = 1; i < sortedMessages.length; i++) {
    const prev = sortedMessages[i - 1];
    const cur = sortedMessages[i];

    // Only count delays between different users
    if (prev.sender?.name && cur.sender?.name && prev.sender.name !== cur.sender.name) {
      const prevTime = new Date(prev.createTime).getTime();
      const curTime = new Date(cur.createTime).getTime();
      const delaySeconds = Math.abs(curTime - prevTime) / 1000;
      totalDelay += delaySeconds;
      delays++;
    }
  }

  const avgResponseDelayHours = delays ? totalDelay / delays / 3600 : 0;

  // Count after-hours messages (before 8am or after 6pm)
  const afterHoursCount = messages.filter((m) => {
    const hour = new Date(m.createTime).getHours();
    return hour < 8 || hour >= 18;
  }).length;

  // Count thread depth (messages in threads)
  const threadMessages = messages.filter((m) => m.thread?.name).length;
  const avgThreadDepth = threadMessages / Math.max(1, messageCount);

  // Compatibility field only. Meeting links are not read from message bodies.
  const meetingData = detectAdHocMeetings(messages);

  return {
    messageCount,
    avgResponseDelayHours: Math.round(avgResponseDelayHours * 10) / 10,
    afterHoursCount,
    afterHoursPercentage: messageCount > 0 ? Math.round((afterHoursCount / messageCount) * 100) : 0,
    avgThreadDepth: Math.round(avgThreadDepth * 100) / 100,
    sentiment: 0,
    adHocMeetings: meetingData,
  };
}

/**
 * Refresh Google Chat data for all teams
 * Similar to Slack refresh, updates team signals and BDI
 */
export async function refreshAllTeamsFromGoogleChat() {
  console.log('🔄 Starting Google Chat data refresh for all teams...');

  // Find all organizations with Google Chat integration
  const orgs = await Organization.find({
    'integrations.googleChat.accessToken': { $exists: true, $ne: '' },
  });

  if (orgs.length === 0) {
    console.log('ℹ️  No organizations with Google Chat integration found');
    return { updated: 0, total: 0 };
  }

  let updated = 0;
  let totalTeams = 0;

  for (const org of orgs) {
    try {
      const accessToken = decryptString(org.integrations.googleChat.accessToken);

      // Find teams in this organization with Google Chat space IDs
      const teams = await Team.find({
        organizationId: org._id,
        googleChatSpaceId: { $exists: true, $ne: null },
      });

      totalTeams += teams.length;

      if (teams.length === 0) {
        console.log(`ℹ️  No teams with Google Chat spaces for org: ${org.name}`);
        continue;
      }

      for (const team of teams) {
        try {
          const spaceId = team.googleChatSpaceId;
          if (!spaceId) continue;

          const data = await analyzeSpace(accessToken, spaceId);

          // Update team with Google Chat signals
          team.googleChatSignals = {
            messageCount: data.messageCount,
            avgResponseDelayHours: data.avgResponseDelayHours,
            afterHoursCount: data.afterHoursCount,
            afterHoursPercentage: data.afterHoursPercentage,
            avgThreadDepth: data.avgThreadDepth,
            sentiment: data.sentiment,
            adHocMeetingCount: data.adHocMeetings.adHocMeetingCount,
            estimatedMeetingHours: data.adHocMeetings.estimatedMeetingHours,
            adHocAfterHoursMeetings: data.adHocMeetings.afterHoursMeetings,
          };

          // Update legacy BDI using metadata only. No message content or sentiment is read.
          const responseImpact = Math.max(-10, Math.min(10, (5 - data.avgResponseDelayHours) * 2));
          const afterHoursImpact = -Math.min(15, data.afterHoursPercentage * 0.3);
          const meetingImpact = -Math.min(10, data.adHocMeetings.adHocMeetingCount * 2);

          team.bdi = Math.max(
            0,
            Math.min(100, team.bdi + Math.round(responseImpact + afterHoursImpact + meetingImpact))
          );

          await team.save();

          // Create snapshot after updating BDI
          await createSnapshot(team._id);

          updated++;
          console.log(
            `✅ Updated team ${team.name} (BDI: ${team.bdi}, Ad-hoc meetings: ${data.adHocMeetings.adHocMeetingCount})`
          );
        } catch (err) {
          console.error(`❌ Google Chat refresh error for team ${team.name}:`, err.message);
        }
      }

      // Update organization sync counters
      org.integrations.googleChat.sync = org.integrations.googleChat.sync || {};
      org.integrations.googleChat.sync.lastSync = new Date();
      org.integrations.googleChat.sync.lastStatus = 'ok';
      org.integrations.googleChat.sync.lastRunAt = new Date();
      await org.save();
    } catch (err) {
      console.error(`❌ Google Chat refresh error for org ${org.name}:`, err.message);
    }
  }

  console.log(`✅ Google Chat refresh complete. Updated ${updated}/${totalTeams} teams.`);
  return { updated, total: totalTeams };
}

export default {
  fetchSpaceMessages,
  listSpaces,
  analyzeSentiment,
  detectAdHocMeetings,
  analyzeSpace,
  refreshAllTeamsFromGoogleChat,
};
