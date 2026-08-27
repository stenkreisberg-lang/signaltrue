import { describe, expect, test } from '@jest/globals';
import { evaluateIntegrationHealth } from '../services/integrationHealthMonitorService.js';

describe('integration health monitoring', () => {
  test('reports failed, stale and unmapped integrations with stable problem keys', () => {
    const now = new Date('2026-08-14T12:00:00.000Z');
    const issues = evaluateIntegrationHealth(
      {
        integrationType: 'microsoft-teams',
        status: 'error',
        statusMessage: 'Admin consent required',
        connectedAt: new Date('2026-08-10T12:00:00.000Z'),
        sync: {
          lastSyncStatus: 'failed',
          lastSuccessfulSyncAt: new Date('2026-08-12T12:00:00.000Z'),
        },
        coverage: { totalUsers: 87, mappedUsers: 0 },
      },
      now
    );
    expect(issues.map((issue) => issue.key)).toEqual([
      'microsoft-teams:sync-failed',
      'microsoft-teams:stale',
      'microsoft-teams:unmapped',
    ]);
  });

  test('reports inaccessible Microsoft mailboxes without including account identities', () => {
    const issues = evaluateIntegrationHealth({
      integrationType: 'microsoft-outlook',
      status: 'connected',
      sync: { lastSuccessfulSyncAt: new Date() },
      coverage: {
        totalUsers: 77,
        mappedUsers: 53,
        unavailableUsers: 16,
        failedUsers: 2,
      },
    });

    expect(issues.map((issue) => issue.key)).toEqual([
      'microsoft-outlook:mailboxes-unavailable',
      'microsoft-outlook:mailbox-checks-failed',
    ]);
    expect(JSON.stringify(issues)).not.toContain('@');
  });
});
