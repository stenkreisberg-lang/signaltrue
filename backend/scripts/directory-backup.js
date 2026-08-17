/**
 * Local restore-point backup for one organization's directory.
 *
 * Dumps every User and every WorkEvent for the organization to a timestamped
 * folder under backend/backups/. Read-only — safe to run anytime, and intended
 * to be run right before directory-cleanup.js --apply so the removals/merges
 * are reversible without a database snapshot.
 *
 *   node scripts/directory-backup.js <name-or-domain>
 */
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';

const target = process.argv.slice(2).find((v) => !v.startsWith('--'));
if (!target) throw new Error('Usage: directory-backup.js <name-or-domain>');
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
  const users = await User.find({ orgId: org._id }).lean();
  const events = await WorkEvent.find({ orgId: org._id }).lean();

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.resolve(__dirname, '../backups', `${org.domain}-${stamp}`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'organization.json'), JSON.stringify(org, null, 2));
  await fs.writeFile(path.join(dir, 'users.json'), JSON.stringify(users, null, 2));
  await fs.writeFile(path.join(dir, 'workEvents.json'), JSON.stringify(events, null, 2));

  console.log(
    JSON.stringify(
      {
        organization: { id: String(org._id), name: org.name, domain: org.domain },
        backedUp: { users: users.length, workEvents: events.length },
        location: dir,
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
