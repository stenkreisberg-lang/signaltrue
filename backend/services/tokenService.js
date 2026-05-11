import Organization from '../models/organizationModel.js';
import { decryptString, encryptString } from '../utils/crypto.js';

// ─── In-memory cache for app-only tokens (avoid fetching on every sync) ───
const appTokenCache = new Map(); // tenantId → { token, expiresAt }

/**
 * Get a Microsoft app-only (client credentials) access token.
 * This token can read ALL users' calendars when the app has
 * Application-level "Calendars.Read" permission granted in Azure AD.
 *
 * No user sign-in required — uses MS_APP_CLIENT_ID + MS_APP_CLIENT_SECRET
 * with the org's tenant ID.
 */
export async function getMicrosoftAppToken(tenantId) {
  const clientId = process.env.MS_APP_CLIENT_ID;
  const clientSecret = process.env.MS_APP_CLIENT_SECRET;
  if (!clientId || !clientSecret || !tenantId) return null;

  // Return cached token if still valid (with 2-min buffer)
  const cached = appTokenCache.get(tenantId);
  if (cached && cached.expiresAt > Date.now() + 120_000) {
    return cached.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }).toString(),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(`Microsoft app token failed: ${data.error} — ${data.error_description || ''}`);
  }

  const token = data.access_token;
  const expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  appTokenCache.set(tenantId, { token, expiresAt });
  console.log(`[MicrosoftAppToken] Got app-only token for tenant ${tenantId}, expires in ${data.expires_in}s`);
  return token;
}

// Refresh Google access token using refresh token
export async function refreshGoogleAccessToken(refreshTokenEnc) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const refreshToken = decryptString(refreshTokenEnc);
  if (!clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (data.error) throw new Error(`${data.error}: ${data.error_description || ''}`);
  return {
    accessToken: encryptString(data.access_token),
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
  };
}

// Refresh Microsoft access token using refresh token
export async function refreshMicrosoftAccessToken(refreshTokenEnc) {
  const clientId = process.env.MS_APP_CLIENT_ID;
  const clientSecret = process.env.MS_APP_CLIENT_SECRET;
  const tenant = process.env.MS_APP_TENANT || 'common';
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const refreshToken = decryptString(refreshTokenEnc);
  if (!clientId || !clientSecret || !refreshToken) return null;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (data.error) throw new Error(`${data.error}: ${data.error_description || ''}`);
  return {
    accessToken: encryptString(data.access_token),
    expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
    refreshToken: data.refresh_token ? encryptString(data.refresh_token) : refreshTokenEnc,
  };
}

// Cron task: refresh tokens that will expire within the next 10 minutes
export async function refreshExpiringIntegrationTokens() {
  const threshold = new Date(Date.now() + 10 * 60 * 1000);
  const orgs = await Organization.find({
    $or: [
      { 'integrations.google.expiry': { $lte: threshold } },
      { 'integrations.microsoft.expiry': { $lte: threshold } },
    ],
  });

  for (const org of orgs) {
    try {
      // Google
      if (org.integrations?.google?.refreshToken) {
        const g = org.integrations.google;
        if (!g.expiry || g.expiry <= threshold) {
          try {
            const updated = await refreshGoogleAccessToken(g.refreshToken);
            if (updated?.accessToken) {
              g.accessToken = updated.accessToken;
              g.expiry = updated.expiresAt || g.expiry;
            }
          } catch (e) {
            console.error(`Failed to refresh Google token for org ${org.slug}:`, e.message);
          }
        }
      }

      // Microsoft
      if (org.integrations?.microsoft?.refreshToken) {
        const m = org.integrations.microsoft;
        if (!m.expiry || m.expiry <= threshold) {
          try {
            const updated = await refreshMicrosoftAccessToken(m.refreshToken);
            if (updated?.accessToken) {
              m.accessToken = updated.accessToken;
              m.expiry = updated.expiresAt || m.expiry;
              m.refreshToken = updated.refreshToken || m.refreshToken;
            }
          } catch (e) {
            console.error(`Failed to refresh Microsoft token for org ${org.slug}:`, e.message);
          }
        }
      }

      await org.save();
    } catch (err) {
      console.error('Token refresh error:', err.message);
    }
  }
}
