import { describe, expect, jest, test } from '@jest/globals';
import {
  LEGACY_WORK_EVENT_INDEX_KEY,
  TENANT_WORK_EVENT_INDEX_KEY,
  TENANT_WORK_EVENT_INDEX_NAME,
  hasExactIndexKey,
  migrateWorkEventDedupeIndex,
} from '../scripts/migrate-work-event-dedupe-index.js';

describe('WorkEvent tenant-scoped dedupe index migration', () => {
  test('creates the tenant key before dropping only the exact legacy key', async () => {
    const calls = [];
    const collection = {
      indexes: jest.fn(async () => [
        { name: '_id_', key: { _id: 1 } },
        { name: 'source_1_externalId_1', key: LEGACY_WORK_EVENT_INDEX_KEY },
      ]),
      createIndex: jest.fn(async (key, options) => {
        calls.push('create');
        expect(key).toEqual(TENANT_WORK_EVENT_INDEX_KEY);
        expect(options).toEqual({
          unique: true,
          sparse: true,
          name: TENANT_WORK_EVENT_INDEX_NAME,
        });
        return TENANT_WORK_EVENT_INDEX_NAME;
      }),
      dropIndex: jest.fn(async (name) => {
        calls.push('drop');
        expect(name).toBe('source_1_externalId_1');
      }),
    };

    await expect(migrateWorkEventDedupeIndex(collection)).resolves.toEqual({
      dryRun: false,
      legacyIndex: 'source_1_externalId_1',
      tenantIndex: TENANT_WORK_EVENT_INDEX_NAME,
      created: true,
      dropped: true,
    });
    expect(calls).toEqual(['create', 'drop']);
  });

  test('is idempotent when only the tenant-scoped index remains', async () => {
    const collection = {
      indexes: jest.fn(async () => [
        { name: TENANT_WORK_EVENT_INDEX_NAME, key: TENANT_WORK_EVENT_INDEX_KEY },
      ]),
      createIndex: jest.fn(),
      dropIndex: jest.fn(),
    };

    await expect(migrateWorkEventDedupeIndex(collection)).resolves.toMatchObject({
      tenantIndex: TENANT_WORK_EVENT_INDEX_NAME,
      created: false,
      dropped: false,
    });
    expect(collection.createIndex).not.toHaveBeenCalled();
    expect(collection.dropIndex).not.toHaveBeenCalled();
  });

  test('does not mistake a differently ordered or extended index for the legacy key', () => {
    expect(
      hasExactIndexKey({ key: { externalId: 1, source: 1 } }, LEGACY_WORK_EVENT_INDEX_KEY)
    ).toBe(false);
    expect(
      hasExactIndexKey({ key: { source: 1, externalId: 1, orgId: 1 } }, LEGACY_WORK_EVENT_INDEX_KEY)
    ).toBe(false);
  });
});
