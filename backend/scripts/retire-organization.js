/**
 * Retire an organization once the relationship has ended.
 *
 * Stops all outbound email, removes our stored access to their systems, and
 * deletes identifiable personal records, while keeping team-level aggregates
 * that carry no personal data. Runs entirely on our side — the customer is not
 * required to disconnect anything or be contacted.
 *
 *   node scripts/retire-organization.js <name-or-domain>                  # preview
 *   node scripts/retire-organization.js <name-or-domain> --apply          # do it
 *   node scripts/retire-organization.js <name-or-domain> --apply --drop-aggregates
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import { retireOrganization } from '../services/organizationRetirementService.js';

const args = process.argv.slice(2);
const target = args.find((v) => !v.startsWith('--'));
const apply = args.includes('--apply');
const dropAggregates = args.includes('--drop-aggregates');

if (!target) throw new Error('Usage: retire-organization.js <name-or-domain> [--apply]');
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

  const result = await retireOrganization(matches[0]._id, {
    dryRun: !apply,
    keepAggregates: !dropAggregates,
  });
  console.log(JSON.stringify(result, null, 2));
} finally {
  await mongoose.disconnect();
}
