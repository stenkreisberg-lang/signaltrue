import crypto from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const organizationUpdate = jest.fn();
const connectionUpdate = jest.fn();
const organizationFindById = jest.fn();
const notifyHRIntegrationsComplete = jest.fn();
const notifyIntegrationConnected = jest.fn();
const verifyMicrosoftCompanyWideAccess = jest.fn();
const startMicrosoftCompanyBackfill = jest.fn();

jest.unstable_mockModule('../models/organizationModel.js', () => ({
  default: {
    findById: organizationFindById,
    findByIdAndUpdate: organizationUpdate,
    findOneAndUpdate: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/user.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/integrationConnection.js', () => ({
  default: {
    find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue([]) })),
    findOneAndUpdate: connectionUpdate,
  },
}));
jest.unstable_mockModule('../middleware/auth.js', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { orgId: 'org-1', userId: 'user-1', role: 'it_admin' };
    next();
  },
  authenticateTokenFromHeaderOrQuery: (req, _res, next) => {
    req.user = { orgId: 'org-1', userId: 'user-1', role: 'it_admin' };
    next();
  },
  requireRoles: () => (_req, _res, next) => next(),
}));
jest.unstable_mockModule('../utils/crypto.js', () => ({
  encryptString: (value) => `encrypted:${value}`,
}));
jest.unstable_mockModule('../services/employeeSyncService.js', () => ({
  syncEmployeesFromSlack: jest.fn(),
  syncEmployeesFromGoogle: jest.fn(),
  syncEmployeesFromMicrosoft: jest.fn(),
}));
jest.unstable_mockModule('../services/integrationNotifyService.js', () => ({
  notifyHRIntegrationsComplete,
}));
jest.unstable_mockModule('../services/superadminNotifyService.js', () => ({
  notifyIntegrationConnected,
}));
jest.unstable_mockModule('../services/immediateInsightsService.js', () => ({
  getSlackImmediateInsights: jest.fn(),
  getCalendarImmediateInsights: jest.fn(),
  getMicrosoftImmediateInsights: jest.fn(),
  getGoogleChatImmediateInsights: jest.fn(),
  getOrgVsBenchmarks: jest.fn(),
}));
jest.unstable_mockModule('../services/integrationSyncScheduler.js', () => ({
  startMicrosoftCompanyBackfill,
  triggerImmediateSync: jest.fn(),
}));
jest.unstable_mockModule('../services/microsoftAdminConsentService.js', () => ({
  verifyMicrosoftCompanyWideAccess,
}));
jest.unstable_mockModule('../services/googleWorkspaceAdminService.js', () => ({
  getGoogleWorkspacePublicConfig: jest.fn(() => ({})),
  verifyGoogleWorkspaceDelegation: jest.fn(),
}));

const { default: integrationsRouter } = await import('../routes/integrations.js');

function signedState(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

function createApp() {
  const app = express();
  app.use('/api', integrationsRouter);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MS_APP_CLIENT_ID = 'signaltrue-client-id';
  process.env.MS_APP_CLIENT_SECRET = 'signaltrue-client-secret';
  process.env.MS_APP_REDIRECT_URI =
    'https://api.signaltrue.test/api/integrations/microsoft/oauth/callback';
  process.env.APP_URL = 'https://app.signaltrue.test';
  startMicrosoftCompanyBackfill.mockReturnValue({ startedAt: new Date(), daysBack: 60 });
});

describe('Microsoft OAuth routes', () => {
  test('starts a delegated identity flow without calendar or Teams data scopes', async () => {
    const response = await request(createApp()).get(
      '/api/integrations/microsoft/oauth/start?scope=teams&token=test-token'
    );

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.hostname).toBe('login.microsoftonline.com');
    expect(location.searchParams.get('client_id')).toBe('signaltrue-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe(process.env.MS_APP_REDIRECT_URI);
    const scopes = location.searchParams.get('scope').split(' ');
    expect(scopes).toEqual(['openid', 'email', 'profile', 'https://graph.microsoft.com/User.Read']);
  });

  test('uses the tenant-specific v2 admin-consent endpoint for application roles', async () => {
    organizationFindById.mockReturnValue({
      select: () => ({
        lean: async () => ({ integrations: { microsoft: { tenantId: 'tenant-1' } } }),
      }),
    });

    const response = await request(createApp()).get(
      '/api/integrations/microsoft/admin-consent/start?returnTo=integrations&token=test-token'
    );

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe('/tenant-1/v2.0/adminconsent');
    expect(location.searchParams.get('scope')).toBe('https://graph.microsoft.com/.default');
  });

  test('returns a cancelled Microsoft consent to SignalTrue as an error', async () => {
    const state = signedState({ orgId: 'org-1', userId: 'user-1', scope: 'teams' });
    const response = await request(createApp()).get(
      `/api/integrations/microsoft/oauth/callback?error=access_denied&state=${encodeURIComponent(state)}`
    );

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe('/dashboard');
    expect(location.searchParams.get('integrationStatus')).toBe('error');
    expect(location.searchParams.get('connected')).toBeNull();
  });

  test('does not report success when Microsoft tokens cannot be saved', async () => {
    const state = signedState({ orgId: 'org-1', userId: 'user-1', scope: 'teams' });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600,
          scope: 'Calendars.Read Team.ReadBasic.All ChannelMessage.Read.All',
          id_token: `${Buffer.from('{}').toString('base64url')}.${Buffer.from(
            JSON.stringify({ tid: 'tenant-1' })
          ).toString('base64url')}.signature`,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userPrincipalName: 'it@test' }) });
    organizationUpdate.mockRejectedValueOnce(new Error('database unavailable'));

    const response = await request(createApp()).get(
      `/api/integrations/microsoft/oauth/callback?code=authorization-code&state=${encodeURIComponent(state)}`
    );

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe('/dashboard');
    expect(location.searchParams.get('integrationStatus')).toBe('error');
    expect(location.searchParams.get('connected')).toBeNull();
    expect(connectionUpdate).not.toHaveBeenCalled();
  });

  test('stores delegated-only sign-in as awaiting admin access and sends no success email', async () => {
    const state = signedState({ orgId: 'org-1', userId: 'user-1', scope: 'teams' });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        json: async () => ({
          access_token: 'identity-token',
          expires_in: 3600,
          scope: 'openid profile email User.Read',
          id_token: `${Buffer.from('{}').toString('base64url')}.${Buffer.from(
            JSON.stringify({ tid: 'tenant-1' })
          ).toString('base64url')}.signature`,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ userPrincipalName: 'it@test' }) });
    organizationUpdate.mockResolvedValue({ _id: 'org-1', name: 'Test Org' });
    connectionUpdate.mockResolvedValue({ status: 'needs_admin' });
    verifyMicrosoftCompanyWideAccess.mockRejectedValue(
      new Error('outlook: Missing application permissions: Calendars.Read, User.Read.All.')
    );

    const response = await request(createApp()).get(
      `/api/integrations/microsoft/oauth/callback?code=authorization-code&state=${encodeURIComponent(state)}`
    );

    expect(response.status).toBe(302);
    const location = new URL(response.headers.location);
    expect(location.pathname).toBe('/integrations');
    expect(location.searchParams.get('microsoftIdentity')).toBe('connected');
    expect(location.searchParams.get('connected')).toBeNull();
    expect(connectionUpdate).toHaveBeenCalledTimes(2);
    for (const [, update] of connectionUpdate.mock.calls) {
      expect(update.$set.status).toBe('needs_admin');
      expect(update.$set['sync.enabled']).toBe(false);
      expect(update.$unset).toEqual({ connectedAt: 1, connectedBy: 1 });
    }
    expect(notifyHRIntegrationsComplete).not.toHaveBeenCalled();
    expect(notifyIntegrationConnected).not.toHaveBeenCalled();
    expect(startMicrosoftCompanyBackfill).not.toHaveBeenCalled();
  });

  test('repeated admin callbacks only complete the genuine connection transition once', async () => {
    const state = signedState({
      orgId: 'org-1',
      userId: 'user-1',
      scope: 'application',
      returnTo: '/integrations',
    });
    organizationFindById.mockReturnValue({
      _id: 'org-1',
      name: 'Test Org',
      select: () => ({
        lean: async () => ({ integrations: { microsoft: { tenantId: 'tenant-1' } } }),
      }),
    });
    organizationUpdate.mockResolvedValue({});
    verifyMicrosoftCompanyWideAccess
      .mockResolvedValueOnce({
        verified: true,
        tenantId: 'tenant-1',
        transitions: ['microsoft-outlook', 'microsoft-teams'],
      })
      .mockResolvedValueOnce({ verified: true, tenantId: 'tenant-1', transitions: [] });
    notifyHRIntegrationsComplete.mockResolvedValue({ success: true });
    notifyIntegrationConnected.mockResolvedValue({ sent: true });

    const callback = `/api/integrations/microsoft/oauth/callback?admin_consent=true&tenant=tenant-1&state=${encodeURIComponent(state)}`;
    const first = await request(createApp()).get(callback);
    const second = await request(createApp()).get(callback);

    expect(first.status).toBe(302);
    expect(second.status).toBe(302);
    expect(notifyHRIntegrationsComplete).toHaveBeenCalledTimes(1);
    expect(notifyIntegrationConnected).toHaveBeenCalledTimes(1);
    expect(startMicrosoftCompanyBackfill).toHaveBeenCalledTimes(1);
  });
});
