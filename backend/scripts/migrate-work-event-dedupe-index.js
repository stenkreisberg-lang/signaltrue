import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const LEGACY_WORK_EVENT_INDEX_KEY = { source: 1, externalId: 1 };
export const TENANT_WORK_EVENT_INDEX_KEY = { orgId: 1, source: 1, externalId: 1 };
export const TENANT_WORK_EVENT_INDEX_NAME = 'orgId_1_source_1_externalId_1';

export function hasExactIndexKey(index, expectedKey) {
  const actualEntries = Object.entries(index?.key || {});
  const expectedEntries = Object.entries(expectedKey);
  return (
    actualEntries.length === expectedEntries.length &&
    actualEntries.every(
      ([field, direction], position) =>
        expectedEntries[position]?.[0] === field && expectedEntries[position]?.[1] === direction
    )
  );
}

/**
 * Replace the old cross-tenant unique key with a tenant-scoped unique key.
 * The replacement is created first, and only an index with the exact legacy
 * key pattern is ever dropped. Re-running the migration is safe.
 */
export async function migrateWorkEventDedupeIndex(collection, { dryRun = false } = {}) {
  const indexes = await collection.indexes();
  const legacyIndex = indexes.find((index) => hasExactIndexKey(index, LEGACY_WORK_EVENT_INDEX_KEY));
  const tenantIndex = indexes.find((index) => hasExactIndexKey(index, TENANT_WORK_EVENT_INDEX_KEY));

  const result = {
    dryRun,
    legacyIndex: legacyIndex?.name || null,
    tenantIndex: tenantIndex?.name || null,
    created: false,
    dropped: false,
  };
  if (dryRun) return result;

  if (!tenantIndex) {
    result.tenantIndex = await collection.createIndex(TENANT_WORK_EVENT_INDEX_KEY, {
      unique: true,
      sparse: true,
      name: TENANT_WORK_EVENT_INDEX_NAME,
    });
    result.created = true;
  }

  if (legacyIndex) {
    await collection.dropIndex(legacyIndex.name);
    result.dropped = true;
  }

  return result;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  const dryRun = process.argv.includes('--dry-run');

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const result = await migrateWorkEventDedupeIndex(
      mongoose.connection.db.collection('workevents'),
      { dryRun }
    );
    console.log(result);
  } finally {
    await mongoose.disconnect();
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error('[migrate-work-event-dedupe-index] Migration failed:', error.message);
    process.exitCode = 1;
  });
}
