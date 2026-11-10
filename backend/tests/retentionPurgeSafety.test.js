import { afterEach, describe, expect, jest, test } from '@jest/globals';
import RetentionPolicy from '../models/retentionPolicy.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';
import MetricsDaily from '../models/metricsDaily.js';
import ScoringAuditLog from '../models/scoringAuditLog.js';
import ChatLog from '../models/chatLog.js';
import {
  buildTenantRetentionFilters, purgeOrgData, purgeGlobalPublicChatLogs,
} from '../services/retentionPurgeService.js';

const now = new Date('2026-11-10T16:00:00Z');
const policy = {
  rawEventRetentionDays: 90,
  metricsRetentionDays: 730,
  auditLogRetentionDays: 1825,
  chatLogRetentionDays: 30,
};
const before = process.env.WORK_EVENT_RETENTION_ENFORCEMENT;
afterEach(() => {
  jest.restoreAllMocks();
  if (before === undefined) delete process.env.WORK_EVENT_RETENTION_ENFORCEMENT;
  else process.env.WORK_EVENT_RETENTION_ENFORCEMENT = before;
});

function setup() {
  jest.spyOn(RetentionPolicy, 'findOne').mockReturnValue({
    lean: async () => policy,
  });
  jest.spyOn(RetentionPolicy, 'findOneAndUpdate').mockResolvedValue({});
  const counts = [
    [WorkEvent, 25], [IntegrationMetricsDaily, 0],
    [MetricsDaily, 0], [ScoringAuditLog, 0],
  ];
  return counts.map(([model, n]) => ({
    count: jest.spyOn(model, 'countDocuments').mockResolvedValue(n),
    remove: jest.spyOn(model, 'deleteMany').mockResolvedValue({ deletedCount: n }),
  }));
}

describe('tenant-scoped retention enforcement', () => {
  test('targets the real WorkEvent timestamp field and always scopes by org', () => {
    const filters = buildTenantRetentionFilters('org-A', policy, now);
    expect(filters.WorkEvent).toEqual({
      orgId: 'org-A',
      timestamp: { $lt: new Date(now.getTime() - 90 * 86400000) },
    });
    expect(filters.WorkEvent).not.toHaveProperty('occurredAt');
    for (const query of Object.values(filters)) expect(query.orgId).toBe('org-A');
  });

  test('previews a backlog instead of unexpectedly deleting historic WorkEvents', async () => {
    delete process.env.WORK_EVENT_RETENTION_ENFORCEMENT;
    const spies = setup();
    const globalDelete = jest.spyOn(ChatLog, 'deleteMany');
    const result = await purgeOrgData('org-A', { now });
    expect(result.status).toBe('verification_required');
    expect(result.candidateCounts.WorkEvent).toBe(25);
    expect(result.WorkEvent).toBe(0);
    expect(spies[0].remove).not.toHaveBeenCalled();
    expect(globalDelete).not.toHaveBeenCalled();
  });

  test('dry run never deletes any collection or updates policy', async () => {
    const spies = setup();
    const result = await purgeOrgData('org-A', { now, dryRun: true });
    expect(result.status).toBe('verification_required');
    for (const spy of spies) expect(spy.remove).not.toHaveBeenCalled();
    expect(RetentionPolicy.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('enforced WorkEvent deletion uses the verified timestamp and tenant', async () => {
    process.env.WORK_EVENT_RETENTION_ENFORCEMENT = 'true';
    const spies = setup();
    const result = await purgeOrgData('org-A', { now });
    expect(result.status).toBe('success');
    expect(result.WorkEvent).toBe(25);
    expect(spies[0].remove).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-A', timestamp: { $lt: expect.any(Date) },
    }));
  });

  test('global public chat retention runs once outside individual tenant purges', async () => {
    jest.spyOn(ChatLog, 'countDocuments').mockResolvedValue(12);
    const deleteSpy = jest.spyOn(ChatLog, 'deleteMany').mockResolvedValue({ deletedCount: 12 });
    const result = await purgeGlobalPublicChatLogs({ now });
    expect(result.deletedCount).toBe(12);
    expect(deleteSpy).toHaveBeenCalledWith({
      createdAt: { $lt: new Date(now.getTime() - 30 * 86400000) },
    });
  });
});
