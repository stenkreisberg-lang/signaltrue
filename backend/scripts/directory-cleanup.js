/**
 * Directory cleanup for one organization.
 *
 * Removes resource/role mailboxes and out-of-domain (external) accounts, and
 * collapses duplicate accounts for the same person into one. Dry-run by
 * default — pass --apply to write. Output is aggregate/account-level only.
 *
 *   node scripts/directory-cleanup.js <name-or-domain>            # preview
 *   node scripts/directory-cleanup.js <name-or-domain> --apply    # apply
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import { cleanupInvalidEmployees } from '../services/employeeSyncService.js';

const args = process.argv.slice(2);
const target = args.find((value) => !value.startsWith('--'));
const apply = args.includes('--apply');

if (!target) throw new Error('Usage: directory-cleanup.js <name-or-domain> [--apply]');
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

await mongoose.connect(process.env.MONGO_URI);
try {
  const matches = await Organization.find({
    $or: [
      { name: { $regex: target, $options: 'i' } },
      { domain: { $regex: target, $options: 'i' } },
    ],
  });
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one matching organization; found ${matches.length}`);
  }
  const org = matches[0];
  const result = await cleanupInvalidEmployees(org._id, { dryRun: !apply });

  console.log(
    JSON.stringify(
      {
        organization: { id: String(org._id), name: org.name, domain: org.domain },
        applied: apply,
        evaluated: result.evaluated,
        removed: {
          count: apply ? result.removed : result.wouldRemove,
          accounts: result.removedEmployees,
        },
        duplicatesMerged: {
          count: apply ? result.duplicatesMerged : result.wouldMergeDuplicates,
          groups: result.duplicates,
        },
        normalizedNames: apply ? result.normalized : result.wouldNormalize,
        protected: result.protectedEmployees,
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
