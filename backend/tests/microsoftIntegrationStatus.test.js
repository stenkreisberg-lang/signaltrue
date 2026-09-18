import { describe, expect, test } from '@jest/globals';
import { REQUIRED_MICROSOFT_APPLICATION_ROLES } from '../config/microsoftPermissions.js';
import { deriveMicrosoftIntegrationStatus } from '../services/microsoftIntegrationStatusService.js';

const checkedAt = new Date('2026-09-18T08:00:00.000Z');

function microsoft(overrides = {}) {
  return {
    tenantId: 'tenant-1',
    delegatedConnectedAt: checkedAt,
    ...overrides,
  };
}

function verifiedSources(overrides = {}) {
  return {
    outlook: {
      status: 'connected',
      verifiedAt: checkedAt,
      lastCheckedAt: checkedAt,
      missingRoles: [],
      probes: { directory: 'passed', calendar: 'passed' },
    },
    teams: {
      status: 'connected',
      verifiedAt: checkedAt,
      lastCheckedAt: checkedAt,
      missingRoles: [],
      probes: {
        directory: 'passed',
        teams: 'passed',
        channels: 'passed',
        messages: 'passed',
      },
    },
    ...overrides,
  };
}

describe('Microsoft customer-facing status mapping', () => {
  test('treats a linked identity with no application-role inspection as needs_admin', () => {
    const result = deriveMicrosoftIntegrationStatus(microsoft());

    expect(result.status).toBe('needs_admin');
    expect(result.requiresAdminConsent).toBe(true);
    expect(result.statusMessage).toBe(
      'Microsoft tenant connected. Company-wide Application permissions still require administrator consent.'
    );
  });

  test('reports Outlook connected and a Teams Graph failure as partial, never needs_admin', () => {
    const result = deriveMicrosoftIntegrationStatus(
      microsoft({
        applicationConsentLastCheckedAt: checkedAt,
        applicationConsentRoles: REQUIRED_MICROSOFT_APPLICATION_ROLES,
        applicationConsentSources: verifiedSources({
          teams: {
            status: 'error',
            lastCheckedAt: checkedAt,
            missingRoles: [],
            reasonCode: 'channels_probe_failed',
            lastError:
              'Company-wide Teams channels verification failed (BadRequest) for admin@example.test.',
            probes: {
              directory: 'passed',
              teams: 'passed',
              channels: 'failed',
              messages: 'not_run',
            },
          },
        }),
      }),
      {
        outlook: { status: 'connected' },
        teams: { status: 'error', statusMessage: 'Admin consent required for admin@example.test' },
      }
    );

    expect(result.status).toBe('partial');
    expect(result.sources.outlook.status).toBe('connected');
    expect(result.sources.teams.status).toBe('error');
    expect(result.requiresAdminConsent).toBe(false);
    expect(result.statusMessage).toBe('Outlook connected. Teams verification requires attention.');
    expect(result.sources.teams.statusMessage).toContain(
      'Microsoft permissions are present, but SignalTrue could not verify Teams.'
    );
    expect(result.sources.teams.statusMessage).not.toContain('admin@example.test');
    expect(result.sources.teams.statusMessage.toLowerCase()).not.toContain('consent required');
  });

  test('identifies a missing Teams role without downgrading verified Outlook', () => {
    const roles = REQUIRED_MICROSOFT_APPLICATION_ROLES.filter(
      (role) => role !== 'ChannelMessage.Read.All'
    );
    const result = deriveMicrosoftIntegrationStatus(
      microsoft({
        applicationConsentLastCheckedAt: checkedAt,
        applicationConsentRoles: roles,
        applicationConsentSources: verifiedSources({
          teams: {
            status: 'needs_admin',
            lastCheckedAt: checkedAt,
            missingRoles: ['ChannelMessage.Read.All'],
            reasonCode: 'missing_application_roles',
            probes: {
              directory: 'passed',
              teams: 'not_run',
              channels: 'not_run',
              messages: 'not_run',
            },
          },
        }),
      })
    );

    expect(result.status).toBe('partial');
    expect(result.sources.outlook.status).toBe('connected');
    expect(result.sources.teams.status).toBe('needs_admin');
    expect(result.sources.teams.missingRoles).toEqual(['ChannelMessage.Read.All']);
    expect(result.requiresAdminConsent).toBe(true);
  });

  test('reports both verified and operational sources as connected', () => {
    const result = deriveMicrosoftIntegrationStatus(
      microsoft({
        applicationConsentVerifiedAt: checkedAt,
        applicationConsentLastCheckedAt: checkedAt,
        applicationConsentRoles: REQUIRED_MICROSOFT_APPLICATION_ROLES,
        applicationConsentSources: verifiedSources(),
      }),
      {
        outlook: { status: 'connected' },
        teams: { status: 'connected' },
      }
    );

    expect(result.status).toBe('connected');
    expect(result.statusMessage).toBe('Microsoft 365 connected. Outlook and Teams are syncing.');
  });
});
