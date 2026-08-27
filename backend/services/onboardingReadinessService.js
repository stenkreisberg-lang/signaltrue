import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';

const SOURCE_DEFINITIONS = [
  { type: 'microsoft-outlook', name: 'Microsoft Outlook', category: 'Meetings & Email' },
  { type: 'microsoft-teams', name: 'Microsoft Teams', category: 'Communication' },
  { type: 'slack', name: 'Slack', category: 'Communication' },
  { type: 'google-calendar', name: 'Google Calendar', category: 'Meetings' },
  { type: 'google-chat', name: 'Google Chat', category: 'Communication' },
  { type: 'jira', name: 'Jira', category: 'Project Management' },
  { type: 'asana', name: 'Asana', category: 'Project Management' },
  { type: 'gmail', name: 'Gmail', category: 'Communication' },
  { type: 'meet', name: 'Google Meet', category: 'Meetings' },
  { type: 'notion', name: 'Notion', category: 'Documentation' },
  { type: 'hubspot', name: 'HubSpot', category: 'CRM' },
  { type: 'pipedrive', name: 'Pipedrive', category: 'CRM' },
  { type: 'basecamp', name: 'Basecamp', category: 'Project Management' },
];

const DIRECTORY_SOURCES = ['slack', 'google_workspace', 'google_chat', 'microsoft', 'hr_import'];
const CATCH_ALL_TEAMS = new Set(['general', 'unassigned']);

function id(value) {
  return value ? String(value._id || value) : null;
}

function legacyConnection(org, type) {
  const microsoftScope = org.integrations?.microsoft?.scope;
  const microsoftConnected = !!org.integrations?.microsoft?.accessToken;
  const microsoftConsent = !!org.integrations?.microsoft?.applicationConsentVerifiedAt;
  const microsoftConsentError = org.integrations?.microsoft?.applicationConsentLastError;

  if (type === 'microsoft-outlook') {
    const connected =
      microsoftConnected && (microsoftScope === 'outlook' || microsoftScope === 'both');
    return {
      connected,
      needsAdmin: connected && !microsoftConsent,
      connectedAt: org.integrations?.microsoft?.lastPulledAt || null,
      lastSync:
        org.integrations?.microsoft?.sync?.lastSync ||
        org.integrations?.microsoft?.lastPulledAt ||
        null,
      statusMessage:
        connected && !microsoftConsent
          ? microsoftConsentError ||
            'A Microsoft tenant administrator must grant company-wide access.'
          : null,
    };
  }
  if (type === 'microsoft-teams') {
    const connected =
      microsoftConnected && (microsoftScope === 'teams' || microsoftScope === 'both');
    return {
      connected,
      needsAdmin: connected && !microsoftConsent,
      connectedAt: org.integrations?.microsoft?.lastPulledAt || null,
      lastSync:
        org.integrations?.microsoft?.sync?.lastSync ||
        org.integrations?.microsoft?.lastPulledAt ||
        null,
      statusMessage:
        connected && !microsoftConsent
          ? microsoftConsentError ||
            'A Microsoft tenant administrator must grant company-wide access.'
          : null,
    };
  }
  if (type === 'slack') {
    return {
      connected: !!org.integrations?.slack?.accessToken,
      needsAdmin: false,
      connectedAt: null,
      lastSync: org.integrations?.slack?.sync?.lastSync || null,
      statusMessage: null,
    };
  }
  if (type === 'google-calendar') {
    const connected =
      org.integrations?.google?.scope === 'calendar' && !!org.integrations?.google?.accessToken;
    return {
      connected,
      needsAdmin: connected,
      connectedAt: null,
      lastSync:
        org.integrations?.google?.sync?.lastSync || org.integrations?.google?.lastPulledAt || null,
      statusMessage: connected
        ? 'Connected for the signed-in account only. Company-wide Google coverage requires Workspace administrator delegation.'
        : null,
    };
  }
  if (type === 'google-chat') {
    const connected = !!org.integrations?.googleChat?.accessToken;
    const directoryReady = !!org.integrations?.googleChat?.lastEmployeeSync;
    return {
      connected,
      needsAdmin: connected,
      connectedAt: null,
      lastSync:
        org.integrations?.googleChat?.sync?.lastSync ||
        org.integrations?.googleChat?.lastPulledAt ||
        null,
      statusMessage:
        connected && !directoryReady
          ? 'Reconnect with a Google Workspace administrator to authorize directory access.'
          : connected
            ? 'The directory is authorized, but Chat activity is still limited to the signed-in account until Workspace administrator delegation is configured.'
            : null,
    };
  }
  return { connected: false, needsAdmin: false, connectedAt: null, lastSync: null };
}

function sourceStatus({ connection, fallback, eventCount, mappedUsers, totalUsers }) {
  const connectedByModel = connection && connection.status !== 'disconnected';
  const connected = fallback.connected || connectedByModel;
  const companyWideScope = /company|organization|domain-wide/i.test(
    connection?.measurementScope || ''
  );
  const needsAdmin =
    (fallback.needsAdmin && !companyWideScope) || connection?.status === 'needs_admin';
  const status = !connected
    ? 'disconnected'
    : needsAdmin
      ? 'needs_admin'
      : eventCount > 0
        ? 'measuring'
        : connection?.status === 'error'
          ? 'error'
          : 'connected';

  return {
    status,
    statusMessage:
      (needsAdmin
        ? fallback.statusMessage || connection?.statusMessage
        : connection?.statusMessage ||
          (fallback.needsAdmin && companyWideScope ? null : fallback.statusMessage)) ||
      (status === 'connected' ? 'Authorized; waiting for the first activity sync.' : null),
    connectedAt: fallback.connectedAt || connection?.connectedAt || null,
    lastSync:
      fallback.lastSync ||
      connection?.sync?.lastSuccessfulSyncAt ||
      connection?.sync?.lastSyncAt ||
      null,
    backfillProgress: connection?.sync?.backfillProgress || 0,
    backfillComplete: connection?.sync?.backfillComplete || false,
    coverage: {
      mapped: mappedUsers,
      total: totalUsers,
      percent: totalUsers > 0 ? Math.round((mappedUsers / totalUsers) * 100) : 0,
      events: eventCount,
    },
  };
}

function nextStep(readiness) {
  if (readiness.connectedSources === 0) return 'connect_sources';
  if (!readiness.permissionsReady) return 'grant_admin_access';
  if (!readiness.directoryReady) return 'sync_directory';
  if (!readiness.timezoneReady) return 'confirm_timezone';
  if (!readiness.teamsReady) return 'assign_teams';
  if (!readiness.activityReady) return 'waiting_for_activity';
  if (!readiness.mappingReady) return 'map_activity';
  if (!readiness.contributorCoverageReady) return 'build_team_coverage';
  if (!readiness.historyReady || !readiness.volumeReady) return 'baseline_forming';
  if (!readiness.reportingReady) return 'build_team_coverage';
  return 'baseline_forming';
}

export async function getOrganizationReadiness(orgOrId) {
  const org =
    typeof orgOrId === 'object' && orgOrId?._id ? orgOrId : await Organization.findById(orgOrId);
  if (!org) throw new Error('Organization not found');

  const orgId = org._id;
  const activeUserQuery = { orgId, accountStatus: { $ne: 'inactive' } };
  const readinessStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const [connections, teams, users, eventBreakdown, totalEvents, mappedEvents, contributorIds] =
    await Promise.all([
      IntegrationConnection.find({ orgId }).lean(),
      Team.find({ orgId, isActive: { $ne: false } })
        .select('_id name')
        .lean(),
      User.find(activeUserQuery).select('_id source teamId externalIds').lean(),
      WorkEvent.aggregate([
        {
          $match: {
            orgId: new mongoose.Types.ObjectId(String(orgId)),
            timestamp: { $gte: readinessStart },
          },
        },
        {
          $group: {
            _id: '$source',
            events: { $sum: 1 },
            mappedUserIds: { $addToSet: '$actorUserId' },
            firstEventAt: { $min: '$timestamp' },
            lastEventAt: { $max: '$timestamp' },
          },
        },
      ]),
      WorkEvent.countDocuments({ orgId, timestamp: { $gte: readinessStart } }),
      WorkEvent.countDocuments({
        orgId,
        timestamp: { $gte: readinessStart },
        actorUserId: { $ne: null },
        teamId: { $ne: null },
      }),
      WorkEvent.distinct('actorUserId', {
        orgId,
        timestamp: { $gte: readinessStart },
        actorUserId: { $ne: null },
      }),
    ]);

  const teamById = new Map(teams.map((team) => [id(team), team]));
  const activeUsersByTeam = new Map();
  for (const user of users) {
    const teamId = id(user.teamId);
    if (teamId) activeUsersByTeam.set(teamId, (activeUsersByTeam.get(teamId) || 0) + 1);
  }

  const minTeamSize = Math.max(5, Number(org.settings?.minTeamSize || 5));
  const namedTeams = teams.filter((team) => !CATCH_ALL_TEAMS.has(String(team.name).toLowerCase()));
  const eligibleTeams = namedTeams.filter(
    (team) => (activeUsersByTeam.get(id(team)) || 0) >= minTeamSize
  );
  const eligibleTeamIds = eligibleTeams.map((team) => team._id);
  const readyTeamIds = eligibleTeamIds.length
    ? await WorkEvent.distinct('teamId', {
        orgId,
        timestamp: { $gte: readinessStart },
        teamId: { $in: eligibleTeamIds },
        actorUserId: { $ne: null },
      })
    : [];

  const eventsBySource = new Map(
    eventBreakdown.map((row) => [
      row._id,
      {
        events: row.events,
        mappedUsers: row.mappedUserIds.filter(Boolean).length,
        firstEventAt: row.firstEventAt,
        lastEventAt: row.lastEventAt,
      },
    ])
  );
  const connectionByType = new Map(
    connections.map((connection) => [connection.integrationType, connection])
  );
  const sources = SOURCE_DEFINITIONS.map((definition) => {
    const fallback = legacyConnection(org, definition.type);
    const connection = connectionByType.get(definition.type);
    const event = eventsBySource.get(definition.type) || {
      events: 0,
      mappedUsers: 0,
      firstEventAt: null,
      lastEventAt: null,
    };
    return {
      ...definition,
      ...sourceStatus({
        connection,
        fallback,
        eventCount: event.events,
        mappedUsers: event.mappedUsers,
        totalUsers: users.length,
      }),
      scopeSummary: connection?.measurementScope || 'metadata only',
      firstEventAt: event.firstEventAt || null,
      lastEventAt: event.lastEventAt || null,
    };
  });

  const connectedSources = sources.filter((source) => source.status !== 'disconnected').length;
  const measuringSources = sources.filter((source) => source.status === 'measuring').length;
  const needsAdminSources = sources.filter((source) => source.status === 'needs_admin').length;
  const errorSources = sources.filter((source) => source.status === 'error').length;
  const directorySyncedUsers = users.filter((user) =>
    DIRECTORY_SOURCES.includes(user.source)
  ).length;
  const unassignedUsers = users.filter((user) => {
    const team = teamById.get(id(user.teamId));
    return !team || CATCH_ALL_TEAMS.has(String(team.name).toLowerCase());
  }).length;
  const namedAssignedUsers = users.length - unassignedUsers;
  const mappingCoveragePct = totalEvents > 0 ? Math.round((mappedEvents / totalEvents) * 100) : 0;
  const contributorCoveragePct =
    users.length > 0 ? Math.round((contributorIds.length / users.length) * 100) : 0;
  const firstEventAt = eventBreakdown
    .map((row) => row.firstEventAt)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0];
  const lastEventAt = eventBreakdown
    .map((row) => row.lastEventAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0];
  const historyDays =
    firstEventAt && lastEventAt
      ? Math.max(
          0,
          Math.floor((new Date(lastEventAt) - new Date(firstEventAt)) / (24 * 60 * 60 * 1000))
        )
      : 0;
  const contributorCoverageReady = contributorCoveragePct >= 60;
  const historyReady = historyDays >= 21;
  const volumeReady = totalEvents >= Math.max(50, contributorIds.length * 3);

  const readiness = {
    connectedSources,
    measuringSources,
    needsAdminSources,
    errorSources,
    permissionsReady: connectedSources > 0 && needsAdminSources === 0 && errorSources === 0,
    directoryReady: users.length > 1 && directorySyncedUsers > 0,
    timezoneReady: !!org.settings?.timezoneConfirmedAt,
    teamsReady: namedAssignedUsers > 0 && eligibleTeams.length > 0,
    activityReady: totalEvents > 0,
    mappingReady: totalEvents > 0 && mappingCoveragePct >= 80,
    contributorCoverageReady,
    historyReady,
    volumeReady,
    reportingReady:
      readyTeamIds.length > 0 && contributorCoverageReady && historyReady && volumeReady,
  };
  readiness.setupComplete =
    readiness.permissionsReady &&
    readiness.directoryReady &&
    readiness.timezoneReady &&
    readiness.teamsReady &&
    readiness.activityReady &&
    readiness.mappingReady &&
    readiness.reportingReady;
  readiness.nextStep = nextStep(readiness);

  return {
    org: {
      id: id(orgId),
      name: org.name,
      domain: org.domain,
      timezone: org.settings?.timezone || 'UTC',
      timezoneConfirmedAt: org.settings?.timezoneConfirmedAt || null,
    },
    sources,
    directory: {
      totalUsers: users.length,
      directorySyncedUsers,
      namedAssignedUsers,
      unassignedUsers,
    },
    activity: {
      totalEvents,
      mappedEvents,
      mappingCoveragePct,
      contributorCoveragePct,
      historyDays,
      firstEventAt: firstEventAt || null,
      lastEventAt: lastEventAt || null,
    },
    teams: {
      total: namedTeams.length,
      eligible: eligibleTeams.length,
      ready: readyTeamIds.length,
      minimumSize: minTeamSize,
    },
    readiness,
  };
}

export { SOURCE_DEFINITIONS };
