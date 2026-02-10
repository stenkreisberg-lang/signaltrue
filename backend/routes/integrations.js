import express from 'express';
import crypto from 'node:crypto';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js'; // Import User model
import IntegrationConnection from '../models/integrationConnection.js';
import { authenticateToken } from '../middleware/auth.js';
import { encryptString, decryptString } from '../utils/crypto.js';
import { syncEmployeesFromSlack, syncEmployeesFromGoogle } from '../services/employeeSyncService.js';
import { notifyHRIntegrationsComplete } from '../services/integrationNotifyService.js';
import { notifyIntegrationConnected } from '../services/superadminNotifyService.js';
import { 
  getSlackImmediateInsights, 
  getCalendarImmediateInsights, 
  getMicrosoftImmediateInsights,
  getGoogleChatImmediateInsights,
  getOrgVsBenchmarks 
} from '../services/immediateInsightsService.js';
import { triggerImmediateSync } from '../services/integrationSyncScheduler.js';

const router = express.Router();

// GET /api/integrations/metrics - returns Google/Microsoft event/team counts for current org
router.get('/integrations/metrics', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      // Return zeros if user doesn't have an org yet
      return res.json({ googleEvents: 0, msEvents: 0, msTeams: 0 });
    }
    const org = await Organization.findById(orgId);
    if (!org) {
      // Return zeros if org not found
      return res.json({ googleEvents: 0, msEvents: 0, msTeams: 0 });
    }
    const googleEvents = org.integrations?.google?.eventsCount || 0;
    const msEvents = org.integrations?.microsoft?.eventsCount || 0;
    const msTeams = org.integrations?.microsoft?.teamsCount || 0;
    res.json({ googleEvents, msEvents, msTeams });
  } catch (e) {
    console.error('Error in /integrations/metrics:', e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/integrations/immediate-insights - returns immediate stats after integrations connect
router.get('/integrations/immediate-insights', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.json({ message: 'No organization found', insights: {} });
    }
    
    const org = await Organization.findById(orgId).lean();
    if (!org) {
      return res.json({ message: 'Organization not found', insights: {} });
    }
    
    // Collect all immediate insights from integrations
    const insights = {};
    
    // Slack insights
    if (org.integrations?.slack?.immediateInsights) {
      insights.slack = org.integrations.slack.immediateInsights;
    }
    
    // Google Calendar insights
    if (org.integrations?.google?.immediateInsights) {
      insights.google = org.integrations.google.immediateInsights;
    }
    
    // Google Chat insights
    if (org.integrations?.googleChat?.immediateInsights) {
      insights.googleChat = org.integrations.googleChat.immediateInsights;
    }
    
    // Microsoft insights
    if (org.integrations?.microsoft?.immediateInsights) {
      insights.microsoft = org.integrations.microsoft.immediateInsights;
    }
    
    // Calculate aggregate stats
    const totalMeetingsThisWeek = 
      (insights.google?.stats?.meetingsThisWeek || 0) + 
      (insights.microsoft?.stats?.meetingsThisWeek || 0);
    
    const totalUsers = insights.slack?.stats?.activeUsers || 0;
    const totalChannels = insights.slack?.stats?.channelCount || 0;
    
    res.json({
      insights,
      summary: {
        totalMeetingsThisWeek,
        totalUsers,
        totalChannels,
        integrationsConnected: Object.keys(insights).length,
        hasData: Object.keys(insights).length > 0,
      },
      calibrationStatus: {
        inProgress: org.calibrationStatus !== 'complete',
        daysRemaining: org.calibrationDaysRemaining || 30,
        message: org.calibrationStatus === 'complete' 
          ? 'Baseline established - full insights available'
          : 'Collecting baseline data. Industry benchmarks shown for comparison.',
      }
    });
  } catch (e) {
    console.error('Error in /integrations/immediate-insights:', e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/integrations/benchmarks - returns industry benchmark comparison
router.get('/integrations/benchmarks', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) {
      return res.json({ message: 'No organization found', benchmarks: null });
    }
    
    const comparison = await getOrgVsBenchmarks(orgId);
    res.json(comparison);
  } catch (e) {
    console.error('Error in /integrations/benchmarks:', e);
    res.status(500).json({ message: e.message });
  }
});

// GET /api/integrations/status - returns consolidated status for the logged-in user
router.get('/integrations/status', authenticateToken, async (req, res) => {
  try {
    const { userId, orgId } = req.user;

    if (!userId) {
      return res.status(400).json({ message: 'Missing user ID from token.' });
    }

    // Fetch user
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // If no orgId, return empty/default integration status
    if (!orgId) {
      return res.json({
        available: {
          slack: !!process.env.SLACK_CLIENT_ID,
          google: !!process.env.GOOGLE_CLIENT_ID,
          googleChat: !!process.env.GOOGLE_CLIENT_ID,
          teams: !!process.env.MS_APP_CLIENT_ID,
          outlook: !!process.env.MS_APP_CLIENT_ID,
          jira: !!process.env.JIRA_CLIENT_ID,
          asana: !!process.env.ASANA_CLIENT_ID,
          hubspot: !!process.env.HUBSPOT_CLIENT_ID,
          pipedrive: !!process.env.PIPEDRIVE_CLIENT_ID,
          notion: !!process.env.NOTION_CLIENT_ID,
        },
        connected: {
          slack: false,
          google: false,
          googleChat: false,
          teams: false,
          outlook: false,
          jira: false,
          asana: false,
          hubspot: false,
          pipedrive: false,
          notion: false,
        },
        connections: {
          slack: false,
          googleChat: false,
          teams: false,
          googleCalendar: false,
          outlook: false,
          jira: false,
          asana: false,
          hubspot: false,
          pipedrive: false,
          notion: false,
        },
        details: {
          slack: null,
          google: null,
          googleChat: null,
          teams: null,
          outlook: null,
          jira: null,
          asana: null,
          hubspot: null,
          pipedrive: null,
          notion: null,
        },
        oauth: {
          slack: !!process.env.SLACK_CLIENT_ID ? '/auth/slack' : null,
          google: !!process.env.GOOGLE_CLIENT_ID ? '/auth/google' : null,
          calendar: !!process.env.GOOGLE_CLIENT_ID ? '/integrations/google/oauth/start' : null,
          googleChat: !!process.env.GOOGLE_CLIENT_ID ? '/integrations/google-chat/oauth/start' : null,
          teams: !!process.env.MS_APP_CLIENT_ID ? '/integrations/microsoft/oauth/start?scope=teams' : null,
          outlook: !!process.env.MS_APP_CLIENT_ID ? '/integrations/microsoft/oauth/start?scope=outlook' : null,
          jira: !!process.env.JIRA_CLIENT_ID ? '/integrations/jira/oauth/start' : null,
          asana: !!process.env.ASANA_CLIENT_ID ? '/integrations/asana/oauth/start' : null,
          hubspot: !!process.env.HUBSPOT_CLIENT_ID ? '/integrations/hubspot/oauth/start' : null,
          pipedrive: !!process.env.PIPEDRIVE_CLIENT_ID ? '/integrations/pipedrive/oauth/start' : null,
          notion: !!process.env.NOTION_CLIENT_ID ? '/integrations/notion/oauth/start' : null,
        }
      });
    }

    // Fetch organization
    const organization = await Organization.findById(orgId).lean();
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    // Fetch IntegrationConnection records for category king integrations
    const integrationConnections = await IntegrationConnection.find({ 
      orgId, 
      integrationType: { $in: ['jira', 'asana', 'hubspot', 'pipedrive', 'notion'] },
      status: 'connected'
    }).lean();
    
    // Convert to lookup map
    const connectedIntegrations = {};
    const integrationDetails = {};
    for (const conn of integrationConnections) {
      connectedIntegrations[conn.integrationType] = true;
      integrationDetails[conn.integrationType] = {
        connectedAt: conn.connectedAt,
        siteUrl: conn.auth?.siteUrl,
        cloudId: conn.auth?.cloudId,
      };
    }

    // --- Check Available Integrations (based on environment variables) ---
    const available = {
      slack: !!process.env.SLACK_CLIENT_ID,
      google: !!process.env.GOOGLE_CLIENT_ID,
      googleChat: !!process.env.GOOGLE_CLIENT_ID,
      teams: !!process.env.MS_APP_CLIENT_ID,
      outlook: !!process.env.MS_APP_CLIENT_ID,
      jira: !!process.env.JIRA_CLIENT_ID,
      asana: !!process.env.ASANA_CLIENT_ID,
      hubspot: !!process.env.HUBSPOT_CLIENT_ID,
      pipedrive: !!process.env.PIPEDRIVE_CLIENT_ID,
      notion: !!process.env.NOTION_CLIENT_ID,
    };

    // --- Check Connected Status (based on data in DB) ---
    const msScope = organization.integrations?.microsoft?.scope;
    const msHasToken = !!organization.integrations?.microsoft?.accessToken;
    
    const connected = {
      slack: !!organization.integrations?.slack?.accessToken,
      google: !!user.google?.accessToken,
      googleChat: !!organization.integrations?.googleChat?.accessToken,
      teams: msHasToken && msScope === 'teams',
      outlook: msHasToken && msScope === 'outlook',
      // Check both Organization.integrations and IntegrationConnection for these
      jira: !!organization.integrations?.jira?.accessToken || !!connectedIntegrations.jira,
      asana: !!organization.integrations?.asana?.accessToken || !!connectedIntegrations.asana,
      hubspot: !!organization.integrations?.hubspot?.accessToken || !!connectedIntegrations.hubspot,
      pipedrive: !!organization.integrations?.pipedrive?.accessToken || !!connectedIntegrations.pipedrive,
      notion: !!organization.integrations?.notion?.accessToken || !!connectedIntegrations.notion,
    };

    // --- Connections object (used by frontend for button states) ---
    const connections = {
      slack: connected.slack,
      googleChat: connected.googleChat,
      teams: connected.teams,
      googleCalendar: connected.google || (organization.integrations?.google?.scope === 'calendar' && !!organization.integrations?.google?.accessToken),
      outlook: connected.outlook,
      jira: connected.jira,
      asana: connected.asana,
      hubspot: connected.hubspot,
      pipedrive: connected.pipedrive,
      notion: connected.notion,
    };

    // --- Provide Connection Details ---
    const details = {
      slack: connected.slack ? {
        teamName: organization.integrations.slack.teamName,
        teamId: organization.integrations.slack.teamId,
      } : null,
      google: connected.google ? {
        email: user.email,
      } : null,
      googleChat: connected.googleChat ? {
        email: organization.integrations.googleChat.email,
      } : null,
      teams: connected.teams ? {
        email: organization.integrations.microsoft?.email,
        user: organization.integrations.microsoft?.user,
      } : null,
      outlook: connected.outlook ? {
        email: organization.integrations.microsoft?.email,
        user: organization.integrations.microsoft?.user,
      } : null,
      jira: connected.jira ? (integrationDetails.jira || {
        site: organization.integrations.jira?.siteName || organization.integrations.jira?.cloudId,
      }) : null,
      asana: connected.asana ? (integrationDetails.asana || {
        email: organization.integrations.asana?.email,
        workspace: organization.integrations.asana?.workspaceName,
      }) : null,
      hubspot: connected.hubspot ? (integrationDetails.hubspot || {
        portalId: organization.integrations.hubspot?.portalId,
      }) : null,
      pipedrive: connected.pipedrive ? (integrationDetails.pipedrive || {
        companyDomain: organization.integrations.pipedrive?.companyDomain,
      }) : null,
      notion: connected.notion ? (integrationDetails.notion || {
        workspaceName: organization.integrations.notion?.workspaceName,
      }) : null,
    };

    // --- OAuth Start URLs ---
    // Frontend expects these to accept ?token=...
    // Include orgSlug and orgId for proper token storage
    const orgSlug = organization.slug || 'default';
    const orgIdStr = organization._id.toString();
    const oauth = {
      slack: available.slack ? `/integrations/slack/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      google: available.google ? '/auth/google' : null,
      calendar: available.google ? `/integrations/google/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      googleChat: available.googleChat ? `/integrations/google-chat/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      teams: available.teams ? `/integrations/microsoft/oauth/start?scope=teams&orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      outlook: available.outlook ? `/integrations/microsoft/oauth/start?scope=outlook&orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      jira: available.jira ? `/integrations/jira/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      asana: available.asana ? `/integrations/asana/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      hubspot: available.hubspot ? `/integrations/hubspot/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      pipedrive: available.pipedrive ? `/integrations/pipedrive/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
      notion: available.notion ? `/integrations/notion/oauth/start?orgSlug=${orgSlug}&orgId=${orgIdStr}` : null,
    };

    res.json({ available, connected, connections, details, oauth });

  } catch (err) {
    console.error('Error in /integrations/status:', err);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
});

// --- Helpers ---
function b64(json) {
  return Buffer.from(JSON.stringify(json)).toString('base64url');
}

function b64parse(str) {
  try { return JSON.parse(Buffer.from(String(str || ''), 'base64url').toString('utf8')); } catch { return {}; }
}

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  // Sensible production default for our deployment
  if (process.env.NODE_ENV === 'production') return 'https://www.signaltrue.ai';
  return 'http://localhost:3000';
}

// Determine the effective backend base URL and Google redirect URI.
// Falls back to the current request host if env var is missing or clearly wrong.
function getBackendBaseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = (req.headers['x-forwarded-host'] || req.get('host'));
  return `${proto}://${host}`;
}

function getGoogleRedirectUri(req) {
  const envUri = process.env.GOOGLE_REDIRECT_URI;
  // If env is provided and does NOT point to a known bad domain, use it.
  if (envUri && !/\.up\.render\.com/i.test(envUri)) return envUri;
  // Otherwise, construct from the current request host.
  return `${getBackendBaseUrl(req)}/api/integrations/google/oauth/callback`;
}

// --- Slack OAuth ---
// GET /api/integrations/slack/oauth/start?orgId=xxx or ?orgSlug=acme
router.get('/integrations/slack/oauth/start', async (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(503).json({ message: 'Slack OAuth not configured. Set SLACK_CLIENT_ID and SLACK_REDIRECT_URI.' });
  }
  // Support both orgId and orgSlug for flexibility
  const state = b64({ 
    orgId: req.query.orgId || null,
    orgSlug: req.query.orgSlug || null, 
    nonce: crypto.randomBytes(8).toString('hex') 
  });
  const url = new URL('https://slack.com/oauth/v2/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('scope', 'channels:history,channels:read,chat:write');
  url.searchParams.set('user_scope', '');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  // Force workspace selection - don't auto-pick last used workspace
  url.searchParams.set('team', '');
  return res.redirect(String(url));
});

// GET /api/integrations/slack/oauth/callback?code=...&state=...
router.get('/integrations/slack/oauth/callback', async (req, res) => {
  try {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    // Allow override of redirect_uri via query to match whatever was used during authorization
    // This helps when the initial auth used a frontend callback (e.g., https://www.signaltrue.ai/auth/slack/callback)
    // and the backend needs to pass the exact same value to Slack's token endpoint.
    const redirectUri = (req.query.redirect_uri && /^https?:\/\//.test(String(req.query.redirect_uri)))
      ? String(req.query.redirect_uri)
      : process.env.SLACK_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(503).send('Slack OAuth not configured.');
    }

    const { code, state } = req.query;
    console.log('Slack OAuth callback - raw state:', state);
    const parsed = b64parse(state);
    console.log('Slack OAuth callback - parsed state:', JSON.stringify(parsed));
    const orgId = parsed.orgId || null;
    const orgSlug = parsed.orgSlug || null;
    console.log('Slack OAuth callback - orgId:', orgId, 'orgSlug:', orgSlug);

    // Exchange code for token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code || ''),
        redirect_uri: redirectUri,
      }).toString()
    });
    const data = await tokenRes.json();
    if (!data.ok) {
      console.error('Slack OAuth error:', data);
      return res.status(400).send('Slack authorization failed.');
    }

    // Persist minimal info to Organization.integrations.slack
    // Try to find org by ID first, then by slug, then by domain
    try {
      let org = null;
      if (orgId) {
        org = await Organization.findById(orgId);
      }
      if (!org && orgSlug) {
        org = await Organization.findOne({ $or: [{ slug: orgSlug }, { domain: orgSlug }] });
      }
      
      if (org) {
        await Organization.findByIdAndUpdate(org._id, {
          $set: {
            'settings.features.slackIntegration': true,
            'integrations.slack': {
              accessToken: encryptString(data.access_token),
              botUserId: data.bot_user_id,
              team: data.team,
              teamId: data.team?.id,
              teamName: data.team?.name,
              authedUser: data.authed_user,
              installed: true,
              sync: { enabled: true }
            }
          }
        });
        console.log('Slack OAuth: saved token for org', org._id);

        // Get immediate insights (runs in background, doesn't block redirect)
        getSlackImmediateInsights(org._id, data.access_token)
          .then(insights => {
            console.log('Slack immediate insights:', JSON.stringify(insights));
          })
          .catch(err => {
            console.error('Slack immediate insights error:', err.message);
          });

        // Trigger an immediate core sync (populate initial work events/metrics)
        triggerImmediateSync(org._id)
          .then(results => {
            console.log('Slack immediate sync results:', results);
          })
          .catch(err => {
            console.error('Slack immediate sync error:', err.message);
          });

        // Trigger employee sync in background
        syncEmployeesFromSlack(org._id)
          .then(result => {
            console.log('Slack employee sync completed:', result.stats);
            // Check if integrations are now complete and notify HR
            notifyHRIntegrationsComplete(org._id);
            // Notify superadmin about new integration
            notifyIntegrationConnected(org, 'slack');
          })
          .catch(err => {
            console.error('Slack employee sync failed:', err.message);
          });
      } else {
        console.error('Slack OAuth: no org found for orgId:', orgId, 'orgSlug:', orgSlug);
      }
    } catch (e) {
      console.error('Slack OAuth persist error:', e.message);
    }

    const redirect = `${getAppUrl()}/dashboard?connected=slack`;
    return res.redirect(redirect);
  } catch (err) {
    console.error('Slack OAuth callback error:', err.message);
    return res.status(500).send('Slack OAuth callback error');
  }
});

// --- Google OAuth (Gmail/Calendar) ---
// GET /api/integrations/google/oauth/start?scope=gmail|calendar&orgId=xxx
router.get('/integrations/google/oauth/start', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = getGoogleRedirectUri(req);
  if (!clientId || !redirectUri) {
    return res.status(503).json({ message: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.' });
  }
  const scopeParam = String(req.query.scope || 'calendar');
  const scopesCore = ['openid','email','profile'];
  const scopes = scopeParam === 'gmail'
    ? ['https://www.googleapis.com/auth/gmail.readonly', ...scopesCore]
    : ['https://www.googleapis.com/auth/calendar.readonly', ...scopesCore];
  const state = b64({ 
    orgId: req.query.orgId || null,
    orgSlug: req.query.orgSlug || null, 
    scope: scopeParam, 
    nonce: crypto.randomBytes(8).toString('hex') 
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return res.redirect(String(url));
});

router.get('/integrations/google/oauth/callback', async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = getGoogleRedirectUri(req);
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(503).send('Google OAuth not configured.');
    }
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const orgId = parsed.orgId || null;
    const orgSlug = parsed.orgSlug || null;
    const scopeParam = String(parsed.scope || 'calendar');
    
    console.log('Google OAuth callback - orgId:', orgId, 'orgSlug:', orgSlug, 'scope:', scopeParam);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code || ''),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
      console.error('Google OAuth error:', tokens);
      return res.status(400).send('Google authorization failed.');
    }

    try {
      // Fetch user info if possible
      let googleUser = null;
      try {
        const ui = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (ui.ok) {
          googleUser = await ui.json();
        }
      } catch {}

      // Find org by ID first, then by slug/domain
      let org = null;
      if (orgId) {
        org = await Organization.findById(orgId);
      }
      if (!org && orgSlug) {
        org = await Organization.findOne({ $or: [{ slug: orgSlug }, { domain: orgSlug }] });
      }
      
      if (org) {
        console.log('[Google OAuth] Saving to org:', org._id, 'scope:', scopeParam);
        
        const googleIntegration = {
          scope: scopeParam,
          refreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : '',
          accessToken: tokens.access_token ? encryptString(tokens.access_token) : '',
          expiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          email: googleUser?.email || '',
          user: googleUser || {}
        };
        
        await Organization.findByIdAndUpdate(org._id, {
          $set: {
            'integrations.google.scope': googleIntegration.scope,
            'integrations.google.refreshToken': googleIntegration.refreshToken,
            'integrations.google.accessToken': googleIntegration.accessToken,
            'integrations.google.expiry': googleIntegration.expiry,
            'integrations.google.email': googleIntegration.email,
            'integrations.google.user': googleIntegration.user
          }
        });
        console.log('[Google OAuth] Saved successfully to org:', org._id);
        
        // Get immediate calendar insights (runs in background, doesn't block redirect)
        if (scopeParam === 'calendar' && tokens.access_token) {
          getCalendarImmediateInsights(org._id, tokens.access_token)
            .then(insights => {
              console.log('Google Calendar immediate insights:', JSON.stringify(insights));
            })
            .catch(err => {
              console.error('Google Calendar immediate insights error:', err.message);
            });
        }
        // Trigger immediate core sync for calendar (populate events/metrics)
        triggerImmediateSync(org._id)
          .then(results => {
            console.log('Google immediate sync results:', results);
          })
          .catch(err => {
            console.error('Google immediate sync error:', err.message);
          });
        
        // Notify superadmin about new integration
        notifyIntegrationConnected(org, 'google', scopeParam);
      } else {
        console.error('[Google OAuth] No org found for orgId:', orgId, 'orgSlug:', orgSlug);
      }
    } catch (e) {
      console.error('Google OAuth persist error:', e.message, e.stack);
    }

    const redirect = `${getAppUrl()}/dashboard?connected=google-${scopeParam}`;
    return res.redirect(redirect);
  } catch (err) {
    console.error('Google OAuth callback error:', err.message);
    return res.status(500).send('Google OAuth callback error');
  }
});

// --- Google Chat OAuth ---
// GET /api/integrations/google-chat/oauth/start?orgId=xxx or ?orgSlug=acme
router.get('/integrations/google-chat/oauth/start', async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_CHAT_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/google-chat/oauth/callback`;
  if (!clientId || !redirectUri) {
    return res.status(503).json({ message: 'Google Chat OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CHAT_REDIRECT_URI.' });
  }
  
  // Google Chat API scopes
  const scopes = [
    'https://www.googleapis.com/auth/chat.messages.readonly', // Read messages
    'https://www.googleapis.com/auth/chat.spaces.readonly',   // Read spaces/rooms
    'openid',
    'email',
    'profile'
  ];
  
  const state = b64({ 
    orgId: req.query.orgId || null,
    orgSlug: req.query.orgSlug || null, 
    nonce: crypto.randomBytes(8).toString('hex') 
  });
  
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  
  return res.redirect(String(url));
});

// GET /api/integrations/google-chat/oauth/callback
router.get('/integrations/google-chat/oauth/callback', async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CHAT_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/google-chat/oauth/callback`;
    
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(503).send('Google Chat OAuth not configured.');
    }
    
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const orgId = parsed.orgId || null;
    const orgSlug = parsed.orgSlug || null;
    
    console.log('Google Chat OAuth callback - orgId:', orgId, 'orgSlug:', orgSlug);

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code || ''),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });
    
    const tokens = await tokenRes.json();
    if (tokens.error) {
      console.error('Google Chat OAuth error:', tokens);
      return res.status(400).send('Google Chat authorization failed.');
    }

    try {
      // Fetch user info
      let googleUser = null;
      try {
        const ui = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (ui.ok) {
          googleUser = await ui.json();
        }
      } catch {}

      // Find org
      let org = null;
      if (orgId) {
        org = await Organization.findById(orgId);
      }
      if (!org && orgSlug) {
        org = await Organization.findOne({ $or: [{ slug: orgSlug }, { domain: orgSlug }] });
      }
      
      if (org) {
        console.log('[Google Chat OAuth] Saving to org:', org._id);
        
        await Organization.findByIdAndUpdate(org._id, {
          $set: {
            'integrations.googleChat.refreshToken': tokens.refresh_token ? encryptString(tokens.refresh_token) : '',
            'integrations.googleChat.accessToken': tokens.access_token ? encryptString(tokens.access_token) : '',
            'integrations.googleChat.expiry': tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
            'integrations.googleChat.email': googleUser?.email || '',
            'integrations.googleChat.user': googleUser || {},
            'integrations.googleChat.sync.enabled': true
          }
        });
        
        console.log('[Google Chat OAuth] Saved successfully to org:', org._id);
        
        // Get immediate Google Chat insights (runs in background)
        if (tokens.access_token) {
          getGoogleChatImmediateInsights(org._id, tokens.access_token)
            .then(insights => {
              console.log('Google Chat immediate insights:', JSON.stringify(insights));
            })
            .catch(err => {
              console.error('Google Chat immediate insights error:', err.message);
            });
        }
        // Trigger immediate core sync for Google Chat
        triggerImmediateSync(org._id)
          .then(results => {
            console.log('Google Chat immediate sync results:', results);
          })
          .catch(err => {
            console.error('Google Chat immediate sync error:', err.message);
          });
        
        // Notify superadmin about new integration
        notifyIntegrationConnected(org, 'googleChat');

        // Trigger employee sync in background (if Directory API is available)
        syncEmployeesFromGoogle(org._id)
          .then(result => {
            if (result.success) {
              console.log('Google Workspace employee sync completed:', result.stats);
            } else {
              console.log('Google Workspace employee sync skipped:', result.message);
            }
          })
          .catch(err => {
            console.error('Google Workspace employee sync failed:', err.message);
          });
      } else {
        console.error('[Google Chat OAuth] No org found for orgId:', orgId, 'orgSlug:', orgSlug);
      }
    } catch (e) {
      console.error('Google Chat OAuth persist error:', e.message, e.stack);
    }

    const redirect = `${getAppUrl()}/dashboard?connected=google-chat`;
    return res.redirect(redirect);
  } catch (err) {
    console.error('Google Chat OAuth callback error:', err.message);
    return res.status(500).send('Google Chat OAuth callback error');
  }
});

// --- Microsoft OAuth (Outlook/Teams) ---
// GET /api/integrations/microsoft/oauth/start?scope=outlook|teams&orgSlug=acme&orgId=xxx
router.get('/integrations/microsoft/oauth/start', async (req, res) => {
  const clientId = process.env.MS_APP_CLIENT_ID;
  const tenant = process.env.MS_APP_TENANT || 'common';
  const redirectUri = process.env.MS_APP_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(503).json({ message: 'Microsoft OAuth not configured. Set MS_APP_CLIENT_ID and MS_APP_REDIRECT_URI.' });
  }
  const scopeParam = String(req.query.scope || 'outlook');
  const scopesCore = ['openid','email','profile','offline_access','https://graph.microsoft.com/User.Read'];
  const scopes = scopeParam === 'teams'
    ? ['https://graph.microsoft.com/ChannelMessage.Read.All', ...scopesCore]
    : ['https://graph.microsoft.com/Calendars.Read', ...scopesCore];
  const state = b64({ 
    orgSlug: req.query.orgSlug || 'default', 
    orgId: req.query.orgId || null,
    scope: scopeParam, 
    nonce: crypto.randomBytes(8).toString('hex') 
  });
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'select_account'); // Force account selection
  return res.redirect(String(url));
});

router.get('/integrations/microsoft/oauth/callback', async (req, res) => {
  try {
    const clientId = process.env.MS_APP_CLIENT_ID;
    const clientSecret = process.env.MS_APP_CLIENT_SECRET;
    const tenant = process.env.MS_APP_TENANT || 'common';
    const redirectUri = process.env.MS_APP_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
      return res.status(503).send('Microsoft OAuth not configured.');
    }
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const orgSlug = String(parsed.orgSlug || 'default');
    const orgId = parsed.orgId || null;
    const scopeParam = String(parsed.scope || 'outlook');

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: String(code || ''),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });
    const tokens = await tokenRes.json();
    if (tokens.error) {
      console.error('Microsoft OAuth error:', tokens);
      return res.status(400).send('Microsoft authorization failed.');
    }

    try {
      // Fetch basic user from Microsoft Graph
      let msUser = null;
      try {
        const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (meRes.ok) msUser = await meRes.json();
      } catch {}

      // Parse tenant from id_token if present
      let tenantId;
      if (tokens.id_token) {
        try {
          const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString('utf8'));
          tenantId = payload.tid || payload.tenant || undefined;
        } catch {}
      }

      // Prefer lookup by orgId if available, fall back to slug
      let updatedOrg;
      if (orgId) {
        updatedOrg = await Organization.findByIdAndUpdate(
          orgId,
          {
            $set: {
              [`integrations.microsoft`]: {
                scope: scopeParam,
                refreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : null,
                accessToken: tokens.access_token ? encryptString(tokens.access_token) : null,
                expiry: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
                user: msUser ? { upn: msUser.userPrincipalName || msUser.mail, displayName: msUser.displayName } : undefined,
                tenantId: tenantId
              }
            }
          },
          { new: true }
        );
      }
      
      // Fallback to slug lookup if orgId not found or not provided
      if (!updatedOrg) {
        updatedOrg = await Organization.findOneAndUpdate(
          { slug: orgSlug },
          {
            $setOnInsert: { name: orgSlug, industry: 'General' },
            $set: {
              [`integrations.microsoft`]: {
                scope: scopeParam,
                refreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : null,
                accessToken: tokens.access_token ? encryptString(tokens.access_token) : null,
                expiry: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
                user: msUser ? { upn: msUser.userPrincipalName || msUser.mail, displayName: msUser.displayName } : undefined,
                tenantId: tenantId
              }
            }
          },
          { upsert: true, new: true }
        );
      }
      
      // Check if all integrations are complete and notify HR admins
      if (updatedOrg) {
        // Get immediate Microsoft insights (runs in background)
        if (tokens.access_token) {
          getMicrosoftImmediateInsights(updatedOrg._id, tokens.access_token, scopeParam)
            .then(insights => {
              console.log('Microsoft immediate insights:', JSON.stringify(insights));
            })
            .catch(err => {
              console.error('Microsoft immediate insights error:', err.message);
            });
        }
        
        notifyHRIntegrationsComplete(updatedOrg._id);
        // Notify superadmin about new integration
        notifyIntegrationConnected(updatedOrg, 'microsoft', scopeParam);
        // Trigger immediate core sync for Microsoft (Outlook/Teams)
        triggerImmediateSync(updatedOrg._id)
          .then(results => {
            console.log('Microsoft immediate sync results:', results);
          })
          .catch(err => {
            console.error('Microsoft immediate sync error:', err.message);
          });
      }
    } catch (e) {
      console.error('Microsoft OAuth persist error:', e.message);
    }

    const redirect = `${getAppUrl()}/dashboard?connected=microsoft-${scopeParam}`;
    return res.redirect(redirect);
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err.message);
    return res.status(500).send('Microsoft OAuth callback error');
  }
});

// --- Disconnect endpoints (Authenticated) ---
// POST /api/integrations/:provider/disconnect
// Clears stored tokens for the current user's organization
router.post('/integrations/:provider/disconnect', authenticateToken, async (req, res) => {
  try {
    const provider = String(req.params.provider || '').toLowerCase();
    if (!['slack','google','google-chat','googlechat','microsoft'].includes(provider)) {
      return res.status(400).json({ message: 'Unsupported provider' });
    }
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'No organization found for user' });
    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    if (provider === 'slack') {
      org.integrations.slack = {
        accessToken: '', botUserId: '', team: {}, authedUser: {}
      };
    } else if (provider === 'google') {
      // Clear organization-level Google integration
      org.integrations.google = {
        scope: '', refreshToken: '', accessToken: '', expiry: undefined
      };
      // Also clear user-level Google tokens (for Calendar)
      await User.findByIdAndUpdate(req.user.userId, {
        $unset: { google: 1 }
      });
    } else if (provider === 'google-chat' || provider === 'googlechat') {
      org.integrations.googleChat = {
        refreshToken: '', accessToken: '', expiry: undefined, email: '', user: {}
      };
    } else if (provider === 'microsoft') {
      org.integrations.microsoft = {
        scope: '', refreshToken: '', accessToken: '', expiry: undefined
      };
    }

    await org.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error('Disconnect error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

export default router;
