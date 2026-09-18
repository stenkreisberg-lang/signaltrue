/**
 * Integration Debug Routes (Superadmin Only)
 *
 * Provides raw API response inspection for troubleshooting integration issues.
 * All endpoints require superadmin role.
 */

import express from 'express';
import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';
import WorkEvent from '../models/workEvent.js';
import { authenticateToken } from '../middleware/auth.js';
import { decryptString } from '../utils/crypto.js';
import {
  inspectMicrosoftCompanyWideAccess,
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
} from '../services/microsoftAdminConsentService.js';

const router = express.Router();

// Middleware to require superadmin
function requireSuperadmin(req, res, next) {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Superadmin access required' });
  }
  next();
}

/**
 * GET /api/debug/integrations/:orgId/slack
 * Fetch raw Slack API responses for debugging
 */
router.get('/integrations/:orgId/slack', authenticateToken, requireSuperadmin, async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId).lean();

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    if (!org.integrations?.slack?.accessToken) {
      return res.json({
        connected: false,
        message: 'Slack not connected for this org',
        integrationData: org.integrations?.slack || null,
      });
    }

    const token = decryptString(org.integrations.slack.accessToken);
    const results = { connected: true, responses: {} };

    // Test auth
    try {
      const authRes = await fetch('https://slack.com/api/auth.test', {
        headers: { Authorization: `Bearer ${token}` },
      });
      results.responses.authTest = await authRes.json();
    } catch (err) {
      results.responses.authTest = { error: err.message };
    }

    // Get team info
    try {
      const teamRes = await fetch('https://slack.com/api/team.info', {
        headers: { Authorization: `Bearer ${token}` },
      });
      results.responses.teamInfo = await teamRes.json();
    } catch (err) {
      results.responses.teamInfo = { error: err.message };
    }

    // Get channels
    try {
      const channelsRes = await fetch(
        'https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=10',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      results.responses.channels = await channelsRes.json();
    } catch (err) {
      results.responses.channels = { error: err.message };
    }

    // Get users
    try {
      const usersRes = await fetch('https://slack.com/api/users.list?limit=10', {
        headers: { Authorization: `Bearer ${token}` },
      });
      results.responses.users = await usersRes.json();
    } catch (err) {
      results.responses.users = { error: err.message };
    }

    // Get sample messages from first channel
    if (results.responses.channels?.channels?.[0]?.id) {
      try {
        const channelId = results.responses.channels.channels[0].id;
        const historyRes = await fetch(
          `https://slack.com/api/conversations.history?channel=${channelId}&limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        results.responses.sampleMessages = await historyRes.json();
        results.responses.sampleMessages._channel = channelId;
      } catch (err) {
        results.responses.sampleMessages = { error: err.message };
      }
    }

    results.tokenInfo = {
      hasToken: true,
      teamId: org.integrations.slack.teamId,
      teamName: org.integrations.slack.teamName,
      botUserId: org.integrations.slack.botUserId,
    };

    res.json(results);
  } catch (err) {
    console.error('Slack debug error:', err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/debug/integrations/:orgId/microsoft
 * Return a sanitized live Microsoft application-access assessment.
 */
router.get(
  '/integrations/:orgId/microsoft',
  authenticateToken,
  requireSuperadmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await Organization.findById(orgId).lean();

      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      if (!org.integrations?.microsoft?.tenantId) {
        return res.json({
          connected: false,
          message: 'Microsoft tenant identity is not connected for this org',
        });
      }

      let assessment;
      try {
        assessment = await inspectMicrosoftCompanyWideAccess(orgId);
      } catch {
        return res.status(400).json({
          microsoftTenant: {
            identityLinked: Boolean(
              org.integrations?.microsoft?.delegatedConnectedAt ||
              org.integrations?.microsoft?.accessToken
            ),
            tenantIdPresent: true,
          },
          liveVerification: {
            status: 'failed',
            reasonCode: 'microsoft_live_verification_unavailable',
          },
          finalVerdict: 'error',
        });
      }

      const [
        connections,
        outlookEvents,
        teamsEvents,
        outlookActorEvents,
        outlookTeamEvents,
        teamsActorEvents,
        teamsTeamEvents,
      ] = await Promise.all([
        IntegrationConnection.find({
          orgId,
          integrationType: { $in: ['microsoft-outlook', 'microsoft-teams'] },
        }).lean(),
        WorkEvent.countDocuments({ orgId, source: 'microsoft-outlook' }),
        WorkEvent.countDocuments({ orgId, source: 'microsoft-teams' }),
        WorkEvent.countDocuments({
          orgId,
          source: 'microsoft-outlook',
          actorUserId: { $ne: null },
        }),
        WorkEvent.countDocuments({
          orgId,
          source: 'microsoft-outlook',
          teamId: { $ne: null },
        }),
        WorkEvent.countDocuments({
          orgId,
          source: 'microsoft-teams',
          actorUserId: { $ne: null },
        }),
        WorkEvent.countDocuments({
          orgId,
          source: 'microsoft-teams',
          teamId: { $ne: null },
        }),
      ]);
      const connectionByType = new Map(
        connections.map((connection) => [connection.integrationType, connection])
      );
      const outlookConnection = connectionByType.get('microsoft-outlook');
      const teamsConnection = connectionByType.get('microsoft-teams');
      const sourceConnections = [outlookConnection, teamsConnection].filter(Boolean);
      const backfillProgress = sourceConnections.length
        ? Math.min(...sourceConnections.map((connection) => connection.sync?.backfillProgress || 0))
        : 0;
      const backfillStartedDates = sourceConnections
        .map((connection) => connection.sync?.backfillStartedAt)
        .filter(Boolean);
      const backfillCompleted =
        sourceConnections.length === 2 &&
        sourceConnections.every((connection) => connection.sync?.backfillComplete);
      const backfillCompletedDates = sourceConnections
        .map((connection) => connection.sync?.backfillCompletedAt)
        .filter(Boolean);
      const operationalSources = sourceConnections.filter(
        (connection) => connection.status === 'connected' && connection.sync?.enabled !== false
      ).length;
      const finalVerdict =
        assessment.status === 'needs_admin'
          ? 'needs_admin'
          : assessment.status === 'error'
            ? 'error'
            : assessment.status === 'partial'
              ? 'partial'
              : operationalSources === 2
                ? 'healthy'
                : operationalSources === 1
                  ? 'partial'
                  : 'error';

      return res.json({
        microsoftTenant: {
          identityLinked: Boolean(assessment.identityLinked),
          tenantIdPresent: true,
        },
        applicationRoles: Object.fromEntries(
          REQUIRED_MICROSOFT_APPLICATION_ROLES.map((role) => [
            role,
            assessment.roles.includes(role),
          ])
        ),
        outlook: {
          directoryProbe: assessment.sources.outlook.probes.directory,
          calendarProbe: assessment.sources.outlook.probes.calendar,
          verificationState: assessment.sources.outlook.status,
          reasonCode: assessment.sources.outlook.reasonCode || null,
          connectionState: outlookConnection?.status || 'disconnected',
          syncEnabled: Boolean(outlookConnection && outlookConnection.sync?.enabled !== false),
          lastSuccessfulSync: outlookConnection?.sync?.lastSuccessfulSyncAt || null,
          usersAttempted: outlookConnection?.coverage?.attemptedUsers || 0,
          usersSynced: outlookConnection?.coverage?.syncedUsers || 0,
          usersSkipped: outlookConnection?.coverage?.skippedUsers || 0,
          eventsCollected: outlookEvents,
          eventsWithActorAttribution: outlookActorEvents,
          eventsWithTeamAttribution: outlookTeamEvents,
          latestErrorCategories: outlookConnection?.coverage?.errorCategories || {},
        },
        teams: {
          directoryProbe: assessment.sources.teams.probes.directory,
          joinedTeamsProbe: assessment.sources.teams.probes.teams,
          channelsProbe: assessment.sources.teams.probes.channels,
          messagesProbe: assessment.sources.teams.probes.messages,
          verificationState: assessment.sources.teams.status,
          reasonCode: assessment.sources.teams.reasonCode || null,
          connectionState: teamsConnection?.status || 'disconnected',
          syncEnabled: Boolean(teamsConnection && teamsConnection.sync?.enabled !== false),
          lastSuccessfulSync: teamsConnection?.sync?.lastSuccessfulSyncAt || null,
          usersAttempted: teamsConnection?.coverage?.attemptedUsers || 0,
          usersMapped: teamsConnection?.coverage?.mappedUsers || 0,
          usersSkipped: teamsConnection?.coverage?.skippedUsers || 0,
          teamsDiscovered: teamsConnection?.coverage?.teamsDiscovered || 0,
          teamsRead: teamsConnection?.coverage?.teamsRead || 0,
          eventsCollected: teamsEvents,
          eventsWithActorAttribution: teamsActorEvents,
          eventsWithTeamAttribution: teamsTeamEvents,
          latestErrorCategories: teamsConnection?.coverage?.errorCategories || {},
        },
        backfill: {
          status: backfillCompleted
            ? 'completed'
            : backfillStartedDates.length > 0
              ? 'in_progress'
              : 'not_started',
          startedAt:
            backfillStartedDates.length > 0
              ? new Date(
                  Math.min(...backfillStartedDates.map((value) => new Date(value).getTime()))
                )
              : null,
          completedAt:
            backfillCompleted && backfillCompletedDates.length > 0
              ? new Date(
                  Math.max(...backfillCompletedDates.map((value) => new Date(value).getTime()))
                )
              : null,
          progress: backfillProgress,
          sources: Object.fromEntries(
            sourceConnections.map((connection) => [
              connection.integrationType,
              {
                status: connection.sync?.backfillComplete
                  ? 'completed'
                  : connection.sync?.backfillStartedAt
                    ? 'in_progress'
                    : 'not_started',
                progress: connection.sync?.backfillProgress || 0,
              },
            ])
          ),
        },
        finalVerdict,
      });
    } catch (err) {
      console.error('Microsoft debug error:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET /api/debug/integrations/:orgId/google
 * Fetch raw Google API responses for debugging
 */
router.get(
  '/integrations/:orgId/google',
  authenticateToken,
  requireSuperadmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await Organization.findById(orgId).lean();

      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      if (!org.integrations?.google?.accessToken) {
        return res.json({
          connected: false,
          message: 'Google Calendar not connected for this org',
          integrationData: org.integrations?.google || null,
        });
      }

      const token = decryptString(org.integrations.google.accessToken);
      const results = { connected: true, responses: {} };

      // Check token expiry
      results.tokenInfo = {
        hasToken: true,
        hasRefreshToken: !!org.integrations.google.refreshToken,
        scope: org.integrations.google.scope,
        expiry: org.integrations.google.expiry,
        isExpired: org.integrations.google.expiry
          ? new Date(org.integrations.google.expiry) < new Date()
          : 'unknown',
        email: org.integrations.google.email,
      };

      // Get user info
      try {
        const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });
        results.responses.userinfo = await userRes.json();
      } catch (err) {
        results.responses.userinfo = { error: err.message };
      }

      // Get calendar list
      try {
        const calListRes = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10',
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        results.responses.calendarList = await calListRes.json();
      } catch (err) {
        results.responses.calendarList = { error: err.message };
      }

      // Get upcoming events
      try {
        const now = new Date();
        const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const eventsRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${weekLater.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        results.responses.events = await eventsRes.json();
      } catch (err) {
        results.responses.events = { error: err.message };
      }

      res.json(results);
    } catch (err) {
      console.error('Google debug error:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET /api/debug/integrations/:orgId/google-chat
 * Fetch raw Google Chat API responses for debugging
 */
router.get(
  '/integrations/:orgId/google-chat',
  authenticateToken,
  requireSuperadmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await Organization.findById(orgId).lean();

      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      if (!org.integrations?.googleChat?.accessToken) {
        return res.json({
          connected: false,
          message: 'Google Chat not connected for this org',
          integrationData: org.integrations?.googleChat || null,
        });
      }

      const token = decryptString(org.integrations.googleChat.accessToken);
      const results = { connected: true, responses: {} };

      // Check token expiry
      results.tokenInfo = {
        hasToken: true,
        hasRefreshToken: !!org.integrations.googleChat.refreshToken,
        expiry: org.integrations.googleChat.expiry,
        isExpired: org.integrations.googleChat.expiry
          ? new Date(org.integrations.googleChat.expiry) < new Date()
          : 'unknown',
        email: org.integrations.googleChat.email,
      };

      // Get spaces
      try {
        const spacesRes = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=10', {
          headers: { Authorization: `Bearer ${token}` },
        });
        results.responses.spaces = await spacesRes.json();
      } catch (err) {
        results.responses.spaces = { error: err.message };
      }

      // Get messages from first space
      if (results.responses.spaces?.spaces?.[0]?.name) {
        try {
          const spaceName = results.responses.spaces.spaces[0].name;
          const messagesRes = await fetch(
            `https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=5`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          results.responses.sampleMessages = await messagesRes.json();
          results.responses.sampleMessages._spaceName = spaceName;
        } catch (err) {
          results.responses.sampleMessages = { error: err.message };
        }
      }

      res.json(results);
    } catch (err) {
      console.error('Google Chat debug error:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * GET /api/debug/integrations/:orgId/summary
 * Get a summary of all integrations for an org
 */
router.get(
  '/integrations/:orgId/summary',
  authenticateToken,
  requireSuperadmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const org = await Organization.findById(orgId).lean();

      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const integrations = org.integrations || {};

      const summary = {
        orgId: org._id,
        orgName: org.name,
        orgSlug: org.slug,
        integrations: {
          slack: {
            connected: !!integrations.slack?.accessToken,
            teamName: integrations.slack?.teamName,
            syncEnabled: integrations.slack?.sync?.enabled,
            lastSync: integrations.slack?.sync?.lastSync,
            syncStatus: integrations.slack?.sync?.status,
            syncError: integrations.slack?.sync?.error,
            hasImmediateInsights: !!integrations.slack?.immediateInsights,
          },
          microsoft: {
            identityLinked: Boolean(
              integrations.microsoft?.tenantId &&
              (integrations.microsoft?.delegatedConnectedAt || integrations.microsoft?.accessToken)
            ),
            connected: !!integrations.microsoft?.applicationConsentVerifiedAt,
            sources: {
              outlook: Boolean(
                integrations.microsoft?.applicationConsentSources?.outlook?.verifiedAt
              ),
              teams: Boolean(integrations.microsoft?.applicationConsentSources?.teams?.verifiedAt),
            },
            scope: integrations.microsoft?.scope,
            lastSync: integrations.microsoft?.sync?.lastSync,
            syncStatus: integrations.microsoft?.sync?.lastStatus,
            syncError: integrations.microsoft?.sync?.error,
            hasImmediateInsights: !!integrations.microsoft?.immediateInsights,
          },
          google: {
            connected: !!integrations.google?.accessToken,
            scope: integrations.google?.scope,
            email: integrations.google?.email,
            expiry: integrations.google?.expiry,
            isExpired: integrations.google?.expiry
              ? new Date(integrations.google.expiry) < new Date()
              : null,
            lastSync: integrations.google?.sync?.lastSync,
            syncStatus: integrations.google?.sync?.status,
            syncError: integrations.google?.sync?.error,
            hasImmediateInsights: !!integrations.google?.immediateInsights,
          },
          googleChat: {
            connected: !!integrations.googleChat?.accessToken,
            email: integrations.googleChat?.email,
            expiry: integrations.googleChat?.expiry,
            isExpired: integrations.googleChat?.expiry
              ? new Date(integrations.googleChat.expiry) < new Date()
              : null,
            lastSync: integrations.googleChat?.sync?.lastSync,
            syncStatus: integrations.googleChat?.sync?.status,
            syncError: integrations.googleChat?.sync?.error,
            hasImmediateInsights: !!integrations.googleChat?.immediateInsights,
          },
        },
      };

      res.json(summary);
    } catch (err) {
      console.error('Summary debug error:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

/**
 * POST /api/debug/integrations/:orgId/trigger-sync
 * Manually trigger a sync for an org (superadmin only)
 */
router.post(
  '/integrations/:orgId/trigger-sync',
  authenticateToken,
  requireSuperadmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { daysBack = 7 } = req.body;

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Import dynamically to avoid circular deps
      const { triggerImmediateSync } = await import('../services/integrationSyncScheduler.js');

      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
      const until = new Date();

      console.log(
        `[Debug] Triggering sync for org ${orgId} from ${since.toISOString()} to ${until.toISOString()}`
      );

      const results = await triggerImmediateSync(orgId, { since, until });

      res.json({
        message: 'Sync triggered successfully',
        orgId,
        daysBack,
        results,
      });
    } catch (err) {
      console.error('Trigger sync error:', err);
      res.status(500).json({ message: err.message });
    }
  }
);

export default router;
