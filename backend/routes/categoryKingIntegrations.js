import express from 'express';
import crypto from 'node:crypto';
import IntegrationConnection from '../models/integrationConnection.js';
import WorkEvent from '../models/workEvent.js';
import Organization from '../models/organizationModel.js';
import { authenticateToken } from '../middleware/auth.js';
import { encryptString, decryptString } from '../utils/crypto.js';
import { notifyIntegrationConnected } from '../services/superadminNotifyService.js';

const router = express.Router();

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function b64(json) {
  return Buffer.from(JSON.stringify(json)).toString('base64url');
}

function b64parse(str) {
  try { 
    return JSON.parse(Buffer.from(String(str || ''), 'base64url').toString('utf8')); 
  } catch { 
    return {}; 
  }
}

function getAppUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  if (process.env.NODE_ENV === 'production') return 'https://www.signaltrue.ai';
  return 'http://localhost:3000';
}

function getBackendBaseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = (req.headers['x-forwarded-host'] || req.get('host'));
  return `${proto}://${host}`;
}

// ============================================================
// JIRA INTEGRATION
// ============================================================

/**
 * GET /api/integrations/jira/oauth/start
 * Start Jira OAuth flow
 */
router.get('/jira/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.JIRA_CLIENT_ID;
    const redirectUri = process.env.JIRA_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/jira/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'Jira OAuth not configured. Set JIRA_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    // Atlassian OAuth 2.0 authorization URL
    const scopes = [
      'read:jira-work',
      'read:jira-user',
      'offline_access'
    ].join('%20');
    
    const url = `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&response_type=code&prompt=consent`;
    
    return res.redirect(url);
  } catch (err) {
    console.error('Jira OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start Jira OAuth' });
  }
});

/**
 * GET /api/integrations/jira/oauth/callback
 * Handle Jira OAuth callback
 */
router.get('/jira/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.JIRA_CLIENT_ID;
    const clientSecret = process.env.JIRA_CLIENT_SECRET;
    const redirectUri = process.env.JIRA_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/jira/oauth/callback`;
    
    // Exchange code for tokens
    const tokenRes = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri
      })
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('Jira token error:', tokens);
      return res.status(400).send('Jira authorization failed');
    }
    
    // Get accessible resources (Jira sites)
    const resourcesRes = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const resources = await resourcesRes.json();
    
    const site = resources[0]; // Use first site for now
    
    // Save or update integration connection
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'jira' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.refreshToken': tokens.refresh_token,
          'auth.tokenExpiresAt': new Date(Date.now() + tokens.expires_in * 1000),
          'auth.scopes': tokens.scope?.split(' ') || [],
          'auth.cloudId': site?.id,
          'auth.siteUrl': site?.url,
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('Jira OAuth: Connected for org', orgId);
    
    // Notify superadmin about new integration
    const org = await Organization.findById(orgId);
    if (org) {
      notifyIntegrationConnected(org, 'jira');
    }
    
    // Trigger initial sync in background
    // TODO: Call syncJiraEvents(orgId)
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=jira`);
  } catch (err) {
    console.error('Jira OAuth callback error:', err);
    return res.status(500).send('Jira OAuth callback error');
  }
});

// ============================================================
// ASANA INTEGRATION
// ============================================================

/**
 * GET /api/integrations/asana/oauth/start
 */
router.get('/asana/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.ASANA_CLIENT_ID;
    const redirectUri = process.env.ASANA_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/asana/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'Asana OAuth not configured. Set ASANA_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    // Asana doesn't have a native prompt parameter, but adding response_type=code forces login
    const url = `https://app.asana.com/-/oauth_authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    
    return res.redirect(url);
  } catch (err) {
    console.error('Asana OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start Asana OAuth' });
  }
});

/**
 * GET /api/integrations/asana/oauth/callback
 */
router.get('/asana/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.ASANA_CLIENT_ID;
    const clientSecret = process.env.ASANA_CLIENT_SECRET;
    const redirectUri = process.env.ASANA_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/asana/oauth/callback`;
    
    const tokenRes = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code
      }).toString()
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('Asana token error:', tokens);
      return res.status(400).send('Asana authorization failed');
    }
    
    // Get user info to find workspaces
    const userRes = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const userData = await userRes.json();
    
    const workspace = userData.data?.workspaces?.[0];
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'asana' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.refreshToken': tokens.refresh_token,
          'auth.tokenExpiresAt': tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
          'auth.workspaceId': workspace?.gid,
          'auth.workspaceName': workspace?.name,
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('Asana OAuth: Connected for org', orgId);
    
    // Notify superadmin about new integration
    const org = await Organization.findById(orgId);
    if (org) {
      notifyIntegrationConnected(org, 'asana');
    }
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=asana`);
  } catch (err) {
    console.error('Asana OAuth callback error:', err);
    return res.status(500).send('Asana OAuth callback error');
  }
});

// ============================================================
// GMAIL INTEGRATION (Workspace or Per-User)
// ============================================================

/**
 * GET /api/integrations/gmail/oauth/start
 */
router.get('/gmail/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/gmail/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    // Request metadata-only Gmail scope
    const scopes = [
      'https://www.googleapis.com/auth/gmail.metadata',
      'openid',
      'email',
      'profile'
    ].join(' ');
    
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    
    return res.redirect(url.toString());
  } catch (err) {
    console.error('Gmail OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start Gmail OAuth' });
  }
});

/**
 * GET /api/integrations/gmail/oauth/callback
 */
router.get('/gmail/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/gmail/oauth/callback`;
    
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('Gmail token error:', tokens);
      return res.status(400).send('Gmail authorization failed');
    }
    
    // Get user info
    let email = null;
    try {
      const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      const userData = await userRes.json();
      email = userData.email;
    } catch (e) {
      console.warn('Could not fetch Gmail user info:', e.message);
    }
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'gmail' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.refreshToken': tokens.refresh_token,
          'auth.tokenExpiresAt': new Date(Date.now() + tokens.expires_in * 1000),
          'auth.scopes': tokens.scope?.split(' ') || [],
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('Gmail OAuth: Connected for org', orgId, 'email:', email);
    
    // Notify superadmin about new integration
    const org = await Organization.findById(orgId);
    if (org) {
      notifyIntegrationConnected(org, 'gmail');
    }
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=gmail`);
  } catch (err) {
    console.error('Gmail OAuth callback error:', err);
    return res.status(500).send('Gmail OAuth callback error');
  }
});

// ============================================================
// GOOGLE MEET INTEGRATION (via Calendar API)
// ============================================================

/**
 * GET /api/integrations/meet/oauth/start
 * Google Meet metadata is accessed via Calendar API
 */
router.get('/meet/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.MEET_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/meet/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'openid',
      'email',
      'profile'
    ].join(' ');
    
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('scope', scopes);
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    
    return res.redirect(url.toString());
  } catch (err) {
    console.error('Meet OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start Meet OAuth' });
  }
});

/**
 * GET /api/integrations/meet/oauth/callback
 */
router.get('/meet/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.MEET_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/meet/oauth/callback`;
    
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('Meet token error:', tokens);
      return res.status(400).send('Meet authorization failed');
    }
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'meet' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.refreshToken': tokens.refresh_token,
          'auth.tokenExpiresAt': new Date(Date.now() + tokens.expires_in * 1000),
          'auth.scopes': tokens.scope?.split(' ') || [],
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('Meet OAuth: Connected for org', orgId);
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=meet`);
  } catch (err) {
    console.error('Meet OAuth callback error:', err);
    return res.status(500).send('Meet OAuth callback error');
  }
});

// ============================================================
// NOTION INTEGRATION
// ============================================================

/**
 * GET /api/integrations/notion/oauth/start
 */
router.get('/notion/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/notion/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'Notion OAuth not configured. Set NOTION_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    const url = `https://api.notion.com/v1/oauth/authorize?client_id=${clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    return res.redirect(url);
  } catch (err) {
    console.error('Notion OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start Notion OAuth' });
  }
});

/**
 * GET /api/integrations/notion/oauth/callback
 */
router.get('/notion/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.NOTION_CLIENT_ID;
    const clientSecret = process.env.NOTION_CLIENT_SECRET;
    const redirectUri = process.env.NOTION_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/notion/oauth/callback`;
    
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenRes = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encoded}`,
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('Notion token error:', tokens);
      return res.status(400).send('Notion authorization failed');
    }
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'notion' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.notionWorkspaceId': tokens.workspace_id,
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('Notion OAuth: Connected for org', orgId);
    
    // Notify superadmin about new integration
    const org = await Organization.findById(orgId);
    if (org) {
      notifyIntegrationConnected(org, 'notion');
    }
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=notion`);
  } catch (err) {
    console.error('Notion OAuth callback error:', err);
    return res.status(500).send('Notion OAuth callback error');
  }
});

// ============================================================
// HUBSPOT INTEGRATION
// ============================================================

/**
 * GET /api/integrations/hubspot/oauth/start
 */
router.get('/hubspot/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/hubspot/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'HubSpot OAuth not configured. Set HUBSPOT_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    const scopes = [
      'crm.objects.deals.read',
      'crm.objects.contacts.read',
      'tickets'
    ].join('%20');
    
    // HubSpot: Adding optional_scope forces re-consent flow
    const url = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&optional_scope=`;
    
    return res.redirect(url);
  } catch (err) {
    console.error('HubSpot OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start HubSpot OAuth' });
  }
});

/**
 * GET /api/integrations/hubspot/oauth/callback
 */
router.get('/hubspot/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
    const redirectUri = process.env.HUBSPOT_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/hubspot/oauth/callback`;
    
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code
      }).toString()
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('HubSpot token error:', tokens);
      return res.status(400).send('HubSpot authorization failed');
    }
    
    // Get portal ID
    const portalRes = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + tokens.access_token);
    const portalData = await portalRes.json();
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'hubspot' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.refreshToken': tokens.refresh_token,
          'auth.tokenExpiresAt': new Date(Date.now() + tokens.expires_in * 1000),
          'auth.hubspotPortalId': portalData.hub_id?.toString(),
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('HubSpot OAuth: Connected for org', orgId);
    
    // Notify superadmin about new integration
    const org = await Organization.findById(orgId);
    if (org) {
      notifyIntegrationConnected(org, 'hubspot');
    }
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=hubspot`);
  } catch (err) {
    console.error('HubSpot OAuth callback error:', err);
    return res.status(500).send('HubSpot OAuth callback error');
  }
});

// ============================================================
// PIPEDRIVE INTEGRATION
// ============================================================

/**
 * GET /api/integrations/pipedrive/oauth/start
 */
router.get('/pipedrive/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.PIPEDRIVE_CLIENT_ID;
    const redirectUri = process.env.PIPEDRIVE_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/pipedrive/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'Pipedrive OAuth not configured. Set PIPEDRIVE_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    // Pipedrive: prompt=login forces account selection
    const url = `https://oauth.pipedrive.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&prompt=login`;
    
    return res.redirect(url);
  } catch (err) {
    console.error('Pipedrive OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start Pipedrive OAuth' });
  }
});

/**
 * GET /api/integrations/pipedrive/oauth/callback
 */
router.get('/pipedrive/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.PIPEDRIVE_CLIENT_ID;
    const clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;
    const redirectUri = process.env.PIPEDRIVE_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/pipedrive/oauth/callback`;
    
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenRes = await fetch('https://oauth.pipedrive.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${encoded}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code
      }).toString()
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('Pipedrive token error:', tokens);
      return res.status(400).send('Pipedrive authorization failed');
    }
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'pipedrive' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.refreshToken': tokens.refresh_token,
          'auth.tokenExpiresAt': new Date(Date.now() + tokens.expires_in * 1000),
          'auth.pipedriveCompanyDomain': tokens.api_domain,
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('Pipedrive OAuth: Connected for org', orgId);
    
    // Notify superadmin about new integration
    const org = await Organization.findById(orgId);
    if (org) {
      notifyIntegrationConnected(org, 'pipedrive');
    }
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=pipedrive`);
  } catch (err) {
    console.error('Pipedrive OAuth callback error:', err);
    return res.status(500).send('Pipedrive OAuth callback error');
  }
});

// ============================================================
// BASECAMP INTEGRATION (Optional)
// ============================================================

/**
 * GET /api/integrations/basecamp/oauth/start
 */
router.get('/basecamp/oauth/start', authenticateToken, async (req, res) => {
  try {
    const clientId = process.env.BASECAMP_CLIENT_ID;
    const redirectUri = process.env.BASECAMP_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/basecamp/oauth/callback`;
    
    if (!clientId) {
      return res.status(503).json({ message: 'Basecamp OAuth not configured. Set BASECAMP_CLIENT_ID.' });
    }
    
    const state = b64({
      orgId: req.user.orgId?.toString(),
      userId: req.user.userId?.toString(),
      nonce: crypto.randomBytes(8).toString('hex')
    });
    
    const url = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    return res.redirect(url);
  } catch (err) {
    console.error('Basecamp OAuth start error:', err);
    return res.status(500).json({ message: 'Failed to start Basecamp OAuth' });
  }
});

/**
 * GET /api/integrations/basecamp/oauth/callback
 */
router.get('/basecamp/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    const parsed = b64parse(state);
    const { orgId, userId } = parsed;
    
    if (!code || !orgId) {
      return res.status(400).send('Missing authorization code or organization ID');
    }
    
    const clientId = process.env.BASECAMP_CLIENT_ID;
    const clientSecret = process.env.BASECAMP_CLIENT_SECRET;
    const redirectUri = process.env.BASECAMP_REDIRECT_URI || `${getBackendBaseUrl(req)}/api/integrations/basecamp/oauth/callback`;
    
    const tokenRes = await fetch('https://launchpad.37signals.com/authorization/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web_server',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code
      })
    });
    
    const tokens = await tokenRes.json();
    
    if (tokens.error) {
      console.error('Basecamp token error:', tokens);
      return res.status(400).send('Basecamp authorization failed');
    }
    
    // Get authorization info
    const authRes = await fetch('https://launchpad.37signals.com/authorization.json', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const authData = await authRes.json();
    
    const basecampAccount = authData.accounts?.find(a => a.product === 'bc3');
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: 'basecamp' },
      {
        $set: {
          status: 'connected',
          statusUpdatedAt: new Date(),
          connectedBy: userId,
          connectedAt: new Date(),
          'auth.accessToken': tokens.access_token,
          'auth.refreshToken': tokens.refresh_token,
          'auth.tokenExpiresAt': new Date(Date.now() + (tokens.expires_in || 1209600) * 1000),
          'auth.basecampAccountId': basecampAccount?.id?.toString(),
          'sync.enabled': true,
          measurementScope: 'metadata only'
        }
      },
      { upsert: true, new: true }
    );
    
    console.log('Basecamp OAuth: Connected for org', orgId);
    
    return res.redirect(`${getAppUrl()}/settings/integrations?connected=basecamp`);
  } catch (err) {
    console.error('Basecamp OAuth callback error:', err);
    return res.status(500).send('Basecamp OAuth callback error');
  }
});

// ============================================================
// DISCONNECT INTEGRATION
// ============================================================

/**
 * DELETE /api/integrations/:type/disconnect
 */
router.delete('/:type/disconnect', authenticateToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { orgId } = req.user;
    
    const validTypes = ['jira', 'asana', 'gmail', 'meet', 'notion', 'hubspot', 'pipedrive', 'basecamp'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid integration type' });
    }
    
    await IntegrationConnection.findOneAndUpdate(
      { orgId, integrationType: type },
      {
        $set: {
          status: 'disconnected',
          statusUpdatedAt: new Date(),
          'auth.accessToken': null,
          'auth.refreshToken': null,
          'sync.enabled': false
        }
      }
    );
    
    res.json({ message: `${type} integration disconnected` });
  } catch (err) {
    console.error('Disconnect error:', err);
    res.status(500).json({ message: 'Failed to disconnect integration' });
  }
});

export default router;
