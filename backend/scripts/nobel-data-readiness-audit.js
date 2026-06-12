/**
 * Privacy-safe Nobel Digital data readiness audit.
 *
 * Reports aggregate coverage and Microsoft Graph permission status only.
 * It intentionally does not print employee identities, message content, or
 * meeting subjects.
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationConnection from '../models/integrationConnection.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import EngagementTeamDaily from '../models/engagementTeamDaily.js';
import EngagementBaseline from '../models/engagementBaseline.js';
import EngagementStrainWeekly from '../models/engagementStrainWeekly.js';
import Action from '../models/action.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import Signal from '../models/signal.js';
import { decryptString } from '../utils/crypto.js';

function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

async function getAppPermissionStatus(tenantId) {
  if (!tenantId || !process.env.MS_APP_CLIENT_ID || !process.env.MS_APP_CLIENT_SECRET) {
    return { configured: false, roles: [], calendarProbeStatus: null };
  }

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MS_APP_CLIENT_ID,
      client_secret: process.env.MS_APP_CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    return { configured: true, tokenStatus: response.status, roles: [], calendarProbeStatus: null };
  }

  return {
    configured: true,
    tokenStatus: response.status,
    token: data.access_token,
    roles: decodeJwt(data.access_token).roles || [],
    calendarProbeStatus: null,
  };
}

async function getTeamsApiCoverage(token, since, knownMicrosoftIds = new Set()) {
  if (!token) return null;

  const teamsResponse = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!teamsResponse.ok) return { status: teamsResponse.status };

  const teamsData = await teamsResponse.json();
  const teams = teamsData.value || [];
  const senderIds = new Set();
  const recentSenderIds = new Set();
  let channels = 0;
  let channelsWithMessages = 0;
  let firstPageMessages = 0;
  let recentMessages = 0;
  let channelsWithMorePages = 0;
  const channelListStatuses = {};
  const messageListStatuses = {};
  let firstChannelListError = null;

  for (const team of teams) {
    const channelsResponse = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${team.id}/channels`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    channelListStatuses[channelsResponse.status] =
      (channelListStatuses[channelsResponse.status] || 0) + 1;
    if (!channelsResponse.ok) {
      if (!firstChannelListError) {
        const errorData = await channelsResponse.json().catch(() => ({}));
        firstChannelListError = {
          code: errorData.error?.code || null,
          message: errorData.error?.message || null,
        };
      }
      continue;
    }
    const channelsData = await channelsResponse.json();
    const teamChannels = channelsData.value || [];
    channels += teamChannels.length;

    for (const channel of teamChannels) {
      const messagesResponse = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${channel.id}/messages?$top=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      messageListStatuses[messagesResponse.status] =
        (messageListStatuses[messagesResponse.status] || 0) + 1;
      if (!messagesResponse.ok) continue;
      const messagesData = await messagesResponse.json();
      const messages = (messagesData.value || []).filter(
        (message) => message.messageType === 'message'
      );
      if (messages.length > 0) channelsWithMessages++;
      if (messagesData['@odata.nextLink']) channelsWithMorePages++;
      firstPageMessages += messages.length;
      for (const message of messages) {
        if (message.from?.user?.id) senderIds.add(message.from.user.id);
        if (new Date(message.createdDateTime) >= since) {
          recentMessages++;
          if (message.from?.user?.id) recentSenderIds.add(message.from.user.id);
        }
      }
    }
  }

  return {
    status: teamsResponse.status,
    joinedTeams: teams.length,
    channels,
    channelsWithMessages,
    firstPageMessages,
    recentMessages,
    distinctSenderIdsOnFirstPages: senderIds.size,
    senderIdsMatchingDirectory: [...senderIds].filter((id) => knownMicrosoftIds.has(id)).length,
    distinctRecentSenderIds: recentSenderIds.size,
    recentSenderIdsMatchingDirectory: [...recentSenderIds].filter((id) => knownMicrosoftIds.has(id))
      .length,
    channelsWithMorePages,
    channelListStatuses,
    messageListStatuses,
    firstChannelListError,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const org = await Organization.findOne({ domain: /nobeldigital/i }).lean();
  if (!org) throw new Error('Nobel Digital organization not found');

  const orgId = org._id;
  const minimumTeamSize = Math.max(1, Number(org.settings?.minTeamSize) || 1);
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [users, teams, connections] = await Promise.all([
    User.find({ orgId }).select('_id teamId externalIds accountStatus').lean(),
    Team.find({ orgId }).select('_id name metadata timezone isActive analyticsEnabled').lean(),
    IntegrationConnection.find({ orgId }).select('integrationType status sync coverage').lean(),
  ]);

  const bySource = await WorkEvent.aggregate([
    { $match: { orgId } },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        mappedUsers: { $addToSet: '$actorUserId' },
        mappedTeams: { $addToSet: '$teamId' },
        earliest: { $min: '$timestamp' },
        latest: { $max: '$timestamp' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const recentBySource = await WorkEvent.aggregate([
    { $match: { orgId, timestamp: { $gte: fourteenDaysAgo } } },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        mappedUsers: { $addToSet: '$actorUserId' },
        mappedTeams: { $addToSet: '$teamId' },
        latest: { $max: '$timestamp' },
      },
    },
  ]);

  const teamsEventMetadata = await WorkEvent.aggregate([
    { $match: { orgId, source: 'microsoft-teams' } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        withActor: { $sum: { $cond: [{ $ne: ['$actorUserId', null] }, 1, 0] } },
        withTeam: { $sum: { $cond: [{ $ne: ['$teamId', null] }, 1, 0] } },
        withSenderEmail: {
          $sum: { $cond: [{ $ne: [{ $ifNull: ['$metadata.fromEmail', null] }, null] }, 1, 0] },
        },
        withSenderMicrosoftId: {
          $sum: {
            $cond: [{ $ne: [{ $ifNull: ['$metadata.microsoftUserId', null] }, null] }, 1, 0],
          },
        },
        senderMicrosoftIds: { $addToSet: '$metadata.microsoftUserId' },
        sourceTeams: { $addToSet: '$metadata.externalTeamId' },
        sourceChannels: { $addToSet: '$metadata.externalChannelId' },
      },
    },
  ]);

  const dailyEligibility = await WorkEvent.aggregate([
    {
      $match: {
        orgId,
        timestamp: { $gte: sixtyDaysAgo },
        actorUserId: { $ne: null },
        teamId: { $ne: null },
      },
    },
    {
      $project: {
        teamId: 1,
        actorUserId: 1,
        day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
      },
    },
    {
      $group: {
        _id: { teamId: '$teamId', day: '$day' },
        people: { $addToSet: '$actorUserId' },
        events: { $sum: 1 },
      },
    },
    { $project: { people: { $size: '$people' }, events: 1 } },
    {
      $group: {
        _id: '$_id.teamId',
        days: { $sum: 1 },
        eligibleDays: {
          $sum: { $cond: [{ $gte: ['$people', minimumTeamSize] }, 1, 0] },
        },
        maxPeople: { $max: '$people' },
        avgPeople: { $avg: '$people' },
      },
    },
  ]);

  const delegatedToken = decryptString(org.integrations?.microsoft?.accessToken);
  const delegatedClaims = decodeJwt(delegatedToken);
  const appPermissions = await getAppPermissionStatus(org.integrations?.microsoft?.tenantId);

  const probeUser = users.find((user) => user.externalIds?.microsoftUserId);
  if (appPermissions.token && probeUser) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const end = now.toISOString();
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${probeUser.externalIds.microsoftUserId}/calendarview?startDateTime=${start}&endDateTime=${end}&$top=1&$select=id`,
      { headers: { Authorization: `Bearer ${appPermissions.token}` } }
    );
    appPermissions.calendarProbeStatus = response.status;
  }
  delete appPermissions.token;

  let delegatedUsersProbeStatus = null;
  let joinedTeamsStatus = null;
  let joinedTeamsCount = null;
  if (delegatedToken) {
    const usersResponse = await fetch('https://graph.microsoft.com/v1.0/users?$top=1&$select=id', {
      headers: { Authorization: `Bearer ${delegatedToken}` },
    });
    delegatedUsersProbeStatus = usersResponse.status;

    const teamsResponse = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
      headers: { Authorization: `Bearer ${delegatedToken}` },
    });
    joinedTeamsStatus = teamsResponse.status;
    if (teamsResponse.ok) {
      const data = await teamsResponse.json();
      joinedTeamsCount = data.value?.length ?? 0;
    }
  }

  const delegatedCalendarProbeStatuses = {};
  for (const user of users.filter((entry) => entry.externalIds?.microsoftUserId).slice(0, 5)) {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${user.externalIds.microsoftUserId}/calendarview?startDateTime=${start}&endDateTime=${now.toISOString()}&$top=1&$select=id`,
      { headers: { Authorization: `Bearer ${delegatedToken}` } }
    );
    delegatedCalendarProbeStatuses[response.status] =
      (delegatedCalendarProbeStatuses[response.status] || 0) + 1;
  }

  const knownMicrosoftIds = new Set(
    users.map((user) => user.externalIds?.microsoftUserId).filter(Boolean)
  );
  const teamsApiCoverage = await getTeamsApiCoverage(
    delegatedToken,
    fourteenDaysAgo,
    knownMicrosoftIds
  );

  const collectionCounts = {
    integrationMetricsDaily: await IntegrationMetricsDaily.countDocuments({ orgId }),
    engagementTeamDaily: await EngagementTeamDaily.countDocuments({ orgId }),
    engagementBaseline: await EngagementBaseline.countDocuments({ orgId }),
    engagementStrainWeekly: await EngagementStrainWeekly.countDocuments({ orgId }),
    actions: await Action.countDocuments({ orgId }),
    categoryKingSignals: await CategoryKingSignal.countDocuments({ orgId }),
    dashboardSignals: await Signal.countDocuments({ orgId }),
  };

  const teamMembershipCounts = teams
    .map((team) => users.filter((user) => String(user.teamId) === String(team._id)).length)
    .sort((a, b) => b - a);

  const result = {
    generatedAt: now,
    organization: {
      minimumTeamSize,
      microsoftScope: org.integrations?.microsoft?.scope,
      tenantIdPresent: Boolean(org.integrations?.microsoft?.tenantId),
      accessTokenPresent: Boolean(org.integrations?.microsoft?.accessToken),
      refreshTokenPresent: Boolean(org.integrations?.microsoft?.refreshToken),
      tokenExpiry: org.integrations?.microsoft?.expiry,
      sync: org.integrations?.microsoft?.sync,
    },
    directory: {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.accountStatus === 'active').length,
      usersWithTeam: users.filter((user) => user.teamId).length,
      usersWithMicrosoftId: users.filter((user) => user.externalIds?.microsoftUserId).length,
      totalTeams: teams.length,
      teamsWithIsActiveTrue: teams.filter((team) => team.isActive === true).length,
      teamsWithIsActiveMissing: teams.filter((team) => team.isActive === undefined).length,
      teamSizeBands: teams.map((team) => team.metadata?.actualSize ?? null),
      teamMembershipCounts,
      unassignedMembershipCount: users.filter((user) => {
        const team = teams.find((entry) => String(entry._id) === String(user.teamId));
        return team?.name === 'Unassigned';
      }).length,
    },
    microsoftPermissions: {
      delegatedScopes: delegatedClaims.scp?.split(' ') || [],
      delegatedUsersProbeStatus,
      joinedTeamsStatus,
      joinedTeamsCount,
      delegatedCalendarProbeStatuses,
      teamsApiCoverage,
      application: appPermissions,
    },
    connections: connections.map((connection) => ({
      integrationType: connection.integrationType,
      status: connection.status,
      lastSyncAt: connection.sync?.lastSyncAt,
      lastSyncStatus: connection.sync?.lastSyncStatus,
      lastSyncEventsCount: connection.sync?.lastSyncEventsCount,
      totalUsers: connection.coverage?.totalUsers,
      mappedUsers: connection.coverage?.mappedUsers,
    })),
    allTimeEvents: bySource.map((entry) => ({
      source: entry._id,
      count: entry.count,
      mappedUsers: entry.mappedUsers.filter(Boolean).length,
      mappedTeams: entry.mappedTeams.filter(Boolean).length,
      earliest: entry.earliest,
      latest: entry.latest,
    })),
    recentEvents: recentBySource.map((entry) => ({
      source: entry._id,
      count: entry.count,
      mappedUsers: entry.mappedUsers.filter(Boolean).length,
      mappedTeams: entry.mappedTeams.filter(Boolean).length,
      latest: entry.latest,
    })),
    teamsEventMetadata: teamsEventMetadata[0]
      ? {
          total: teamsEventMetadata[0].total,
          withActor: teamsEventMetadata[0].withActor,
          withTeam: teamsEventMetadata[0].withTeam,
          withSenderEmail: teamsEventMetadata[0].withSenderEmail,
          withSenderMicrosoftId: teamsEventMetadata[0].withSenderMicrosoftId,
          distinctSenderMicrosoftIds:
            teamsEventMetadata[0].senderMicrosoftIds.filter(Boolean).length,
          sourceTeams: teamsEventMetadata[0].sourceTeams.filter(Boolean).length,
          sourceChannels: teamsEventMetadata[0].sourceChannels.filter(Boolean).length,
        }
      : null,
    eligibleTeamDaysLast60Days: dailyEligibility.map((entry) => ({
      daysWithEvents: entry.days,
      daysMeetingConfiguredGate: entry.eligibleDays,
      maximumActivePeople: entry.maxPeople,
      averageActivePeople: Number(entry.avgPeople.toFixed(2)),
    })),
    collectionCounts,
  };

  console.log(JSON.stringify(result, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
