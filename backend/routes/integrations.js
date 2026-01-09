import express from 'express';
import crypto from 'node:crypto';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js'; // Import User model
import { authenticateToken } from '../middleware/auth.js';
import { encryptString, decryptString } from '../utils/crypto.js';
import { syncEmployeesFromSlack, syncEmployeesFromGoogle } from '../services/employeeSyncService.js';

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
        },
        connected: {
          slack: false,
          google: false,
          googleChat: false,
        },
        details: {
          slack: null,
          google: null,
          googleChat: null,
        },
        oauth: {
          slack: !!process.env.SLACK_CLIENT_ID ? '/auth/slack' : null,
          google: !!process.env.GOOGLE_CLIENT_ID ? '/auth/google' : null,
          googleChat: !!process.env.GOOGLE_CLIENT_ID ? '/auth/google-chat' : null,
        }
      });
    }

    // Fetch organization
    const organization = await Organization.findById(orgId).lean();
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    // --- Check Available Integrations (based on environment variables) ---
    const available = {
      slack: !!process.env.SLACK_CLIENT_ID,
      google: !!process.env.GOOGLE_CLIENT_ID,
      googleChat: !!process.env.GOOGLE_CLIENT_ID,
    };

    // --- Check Connected Status (based on data in DB) ---
    const connected = {
      slack: !!organization.integrations?.slack?.accessToken,
      google: !!user.google?.accessToken,
      googleChat: !!organization.integrations?.googleChat?.accessToken,
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
    };

    // --- OAuth Start URLs ---
    // Frontend expects these to accept ?token=...
    const oauth = {
      slack: available.slack ? '/auth/slack' : null,
      google: available.google ? '/auth/google' : null,
      googleChat: available.googleChat ? '/auth/google-chat' : null,
    };

    res.json({ available, connected, details, oauth });

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

        // Trigger employee sync in background
        syncEmployeesFromSlack(org._id)
          .then(result => {
            console.log('Slack employee sync completed:', result.stats);
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
// GET /api/integrations/microsoft/oauth/start?scope=outlook|teams&orgSlug=acme
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
  const state = b64({ orgSlug: req.query.orgSlug || 'default', scope: scopeParam, nonce: crypto.randomBytes(8).toString('hex') });
  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
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

      await Organization.findOneAndUpdate(
        { slug: orgSlug },
        {
          $setOnInsert: { name: orgSlug, industry: 'General' },
          $set: {
            integrations: {
              microsoft: {
                scope: scopeParam,
                refreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : null,
                accessToken: tokens.access_token ? encryptString(tokens.access_token) : null,
                expiry: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
                user: msUser ? { upn: msUser.userPrincipalName || msUser.mail, displayName: msUser.displayName } : undefined,
                tenantId: tenantId
              }
            }
          }
        },
        { upsert: true }
      );
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
      org.integrations.google = {
        scope: '', refreshToken: '', accessToken: '', expiry: undefined
      };
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
