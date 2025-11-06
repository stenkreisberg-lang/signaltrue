
import express from 'express';
import crypto from 'node:crypto';
import Organization from '../models/organization.js';
import { authenticateToken } from '../middleware/auth.js';
import { encryptString, decryptString } from '../utils/crypto.js';

const router = express.Router();

// GET /api/integrations/metrics - returns Google/Microsoft event/team counts for current org
router.get('/integrations/metrics', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return res.status(400).json({ message: 'Missing orgId' });
    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });
    const googleEvents = org.integrations?.google?.eventsCount || 0;
    const msEvents = org.integrations?.microsoft?.eventsCount || 0;
    const msTeams = org.integrations?.microsoft?.teamsCount || 0;
    res.json({ googleEvents, msEvents, msTeams });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Simple status endpoint to power onboarding UI until full OAuth is wired
// Returns which providers are theoretically available (env configured)
// and a minimal connected=false placeholder so frontend can render.
router.get('/integrations/status', async (req, res) => {
  try {
    // Optionally compute connected state from Organization.integrations if org is provided
    const orgSlug = req.query.orgSlug ? String(req.query.orgSlug) : null;
    const orgId = req.query.orgId ? String(req.query.orgId) : null;
    let org = null;
    if (orgId) {
      org = await Organization.findById(orgId).catch(() => null);
    } else if (orgSlug) {
      org = await Organization.findOne({ slug: orgSlug }).catch(() => null);
    }
    const available = {
      slack: !!process.env.SLACK_CLIENT_ID,
      teams: !!process.env.MS_APP_CLIENT_ID,
      gmail: !!process.env.GOOGLE_CLIENT_ID,
      outlook: !!process.env.MS_APP_CLIENT_ID,
      calendar: !!process.env.GOOGLE_CLIENT_ID,
      hris: !!(process.env.BAMBOOHR_API_KEY || process.env.PERSONIO_CLIENT_ID || process.env.HIBOB_TOKEN || process.env.GUSTO_TOKEN)
    };

    // Placeholder connection state until tokens are stored in DB
    const connected = {
      slack: !!org?.integrations?.slack?.accessToken,
      teams: org?.integrations?.microsoft?.scope === 'teams' && !!org?.integrations?.microsoft?.accessToken,
      gmail: org?.integrations?.google?.scope === 'gmail' && !!org?.integrations?.google?.accessToken,
      outlook: org?.integrations?.microsoft?.scope === 'outlook' && !!org?.integrations?.microsoft?.accessToken,
      calendar: org?.integrations?.google?.scope === 'calendar' && !!org?.integrations?.google?.accessToken,
      hris: false
    };

    const oauth = {
      slack: available.slack ? `/api/integrations/slack/oauth/start${org?.slug ? `?orgSlug=${encodeURIComponent(org.slug)}` : ''}` : null,
      teams: available.teams ? `/api/integrations/microsoft/oauth/start?scope=teams${org?.slug ? `&orgSlug=${encodeURIComponent(org.slug)}` : ''}` : null,
      gmail: available.gmail ? `/api/integrations/google/oauth/start?scope=gmail${org?.slug ? `&orgSlug=${encodeURIComponent(org.slug)}` : ''}` : null,
      outlook: available.outlook ? `/api/integrations/microsoft/oauth/start?scope=outlook${org?.slug ? `&orgSlug=${encodeURIComponent(org.slug)}` : ''}` : null,
      calendar: available.calendar ? `/api/integrations/google/oauth/start?scope=calendar${org?.slug ? `&orgSlug=${encodeURIComponent(org.slug)}` : ''}` : null,
      hris: null
    };

    const details = {
      slack: connected.slack ? {
        teamName: org?.integrations?.slack?.team?.name || undefined,
        teamId: org?.integrations?.slack?.team?.id || undefined,
      } : null,
      gmail: connected.gmail ? { scope: 'gmail', email: org?.integrations?.google?.user?.email || org?.integrations?.google?.email } : null,
      calendar: connected.calendar ? { scope: 'calendar', email: org?.integrations?.google?.user?.email || org?.integrations?.google?.email } : null,
      outlook: connected.outlook ? { scope: 'outlook', upn: org?.integrations?.microsoft?.user?.upn || org?.integrations?.microsoft?.accountEmail, tenantId: org?.integrations?.microsoft?.tenantId || org?.integrations?.microsoft?.tenant } : null,
      teams: connected.teams ? { scope: 'teams', upn: org?.integrations?.microsoft?.user?.upn || org?.integrations?.microsoft?.accountEmail, tenantId: org?.integrations?.microsoft?.tenantId || org?.integrations?.microsoft?.tenant } : null,
    };

    res.json({ available, connected, oauth, details });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
// GET /api/integrations/slack/oauth/start?orgSlug=acme
router.get('/integrations/slack/oauth/start', async (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return res.status(503).json({ message: 'Slack OAuth not configured. Set SLACK_CLIENT_ID and SLACK_REDIRECT_URI.' });
  }
  const state = b64({ orgSlug: req.query.orgSlug || 'default', nonce: crypto.randomBytes(8).toString('hex') });
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
  const parsed = b64parse(state);
  let orgSlug = String(parsed.orgSlug || 'default');
  const maybeId = /^[0-9a-fA-F]{24}$/; // if state accidentally passed an ObjectId

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
    try {
      await Organization.findOneAndUpdate(
        { slug: orgSlug },
        {
          $setOnInsert: { name: orgSlug, industry: 'General' },
          $set: {
            'settings.features.slackIntegration': true,
            integrations: {
              slack: {
                accessToken: encryptString(data.access_token),
                botUserId: data.bot_user_id,
                team: data.team,
                authedUser: data.authed_user
              }
            }
          }
        },
        { upsert: true }
      );
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
// GET /api/integrations/google/oauth/start?scope=gmail|calendar&orgSlug=acme
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
  const state = b64({ orgSlug: req.query.orgSlug || 'default', scope: scopeParam, nonce: crypto.randomBytes(8).toString('hex') });
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
    const orgSlug = String(parsed.orgSlug || 'default');
    const scopeParam = String(parsed.scope || 'calendar');

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

  // Persist to a single canonical org slug to avoid mismatches during onboarding
  // Force 'default' so tokens do not end up under accidental ObjectId slugs
  const finalSlug = 'default';
      console.log('[Google OAuth] Saving to org slug:', finalSlug, 'Original orgSlug:', orgSlug, 'Has refresh token:', !!tokens.refresh_token);
      
      const googleIntegration = {
        scope: scopeParam,
        refreshToken: tokens.refresh_token ? encryptString(tokens.refresh_token) : '',
        accessToken: tokens.access_token ? encryptString(tokens.access_token) : '',
        expiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
        email: googleUser?.email || '',
        user: googleUser || {}
      };
      
      const query = { slug: finalSlug };
      const result = await Organization.findOneAndUpdate(
        query,
        {
          $setOnInsert: { name: finalSlug, slug: finalSlug, industry: 'General' },
          $set: {
           'integrations.google.scope': googleIntegration.scope,
           'integrations.google.refreshToken': googleIntegration.refreshToken,
           'integrations.google.accessToken': googleIntegration.accessToken,
           'integrations.google.expiry': googleIntegration.expiry,
           'integrations.google.email': googleIntegration.email,
           'integrations.google.user': googleIntegration.user
          }
        },
        { upsert: true, new: true }
      );
      console.log('[Google OAuth] Saved successfully. Org ID:', result._id, 'Calendar connected:', !!result.integrations?.google?.accessToken);
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
    if (!['slack','google','microsoft'].includes(provider)) {
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

// TEMP DEBUG: Show raw org data for debugging
router.get('/integrations/debug/org/:slug', async (req, res) => {
  try {
    const org = await Organization.findOne({ slug: req.params.slug });
    if (!org) return res.status(404).json({ message: 'Org not found' });
    res.json({
      id: org._id,
      slug: org.slug,
      name: org.name,
      google: {
        scope: org.integrations?.google?.scope,
        hasRefreshToken: !!org.integrations?.google?.refreshToken,
        hasAccessToken: !!org.integrations?.google?.accessToken,
        accessTokenLength: org.integrations?.google?.accessToken?.length || 0,
        email: org.integrations?.google?.email,
        expiry: org.integrations?.google?.expiry
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TEMP DEBUG: List all orgs with Google integrations
router.get('/integrations/debug/orgs-with-google', async (req, res) => {
  try {
    const orgs = await Organization.find({ 'integrations.google.accessToken': { $exists: true, $ne: '' } });
    res.json(orgs.map(o => ({
      id: o._id,
      slug: o.slug,
      name: o.name,
      googleScope: o.integrations?.google?.scope,
      googleEmail: o.integrations?.google?.email,
      hasAccessToken: !!o.integrations?.google?.accessToken,
      accessTokenLength: o.integrations?.google?.accessToken?.length || 0
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
