import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';
import { MicrosoftAdapter } from '../services/coreIntegrationAdapters.js';

await mongoose.connect(process.env.MONGO_URI);
const org = await Organization.findOne({ domain: /nobeldigital/i }).lean();
console.log(`Re-syncing org: ${org.name} (${org._id})`);

// Delete existing microsoft-outlook WorkEvents so we start clean with userId attribution
const deleted = await WorkEvent.deleteMany({ orgId: org._id, source: 'microsoft-outlook' });
console.log(`Deleted ${deleted.deletedCount} existing microsoft-outlook WorkEvents`);

// Re-sync last 14 days
const until = new Date();
const since = new Date(until);
since.setDate(since.getDate() - 14);
console.log(`Syncing ${since.toLocaleDateString()} → ${until.toLocaleDateString()}`);

const adapter = new MicrosoftAdapter();
const result = await adapter.sync(org._id.toString(), since, until);
console.log('\nSync result:', JSON.stringify(result, null, 2));

// Verify: count events with userId set vs null
const total = await WorkEvent.countDocuments({ orgId: org._id, source: 'microsoft-outlook' });
const withUser = await WorkEvent.countDocuments({
  orgId: org._id,
  source: 'microsoft-outlook',
  actorUserId: { $ne: null },
});
console.log(`\nAfter re-sync:`);
console.log(`  Total outlook events: ${total}`);
console.log(
  `  With userId set:      ${withUser}  (${total > 0 ? Math.round((withUser / total) * 100) : 0}%)`
);
console.log(`  Without userId:       ${total - withUser}`);

// Quick per-user hour breakdown
const perUser = await WorkEvent.aggregate([
  {
    $match: {
      orgId: org._id,
      source: 'microsoft-outlook',
      eventType: 'meeting',
      'metadata.durationMinutes': { $gt: 0 },
    },
  },
  {
    $group: {
      _id: '$actorUserId',
      totalMinutes: { $sum: '$metadata.durationMinutes' },
      meetings: { $sum: 1 },
    },
  },
  { $sort: { totalMinutes: -1 } },
]);
console.log(`\nPer-user meeting hours (last 14 days, top 10):`);
import User from '../models/user.js';
const userIds = perUser.map((u) => u._id).filter(Boolean);
const users = await User.find({ _id: { $in: userIds } })
  .select('name email')
  .lean();
const umap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
for (const u of perUser.slice(0, 10)) {
  const info = u._id ? umap[u._id.toString()] : null;
  console.log(
    `  ${(info?.name || 'unknown').padEnd(25)} ${(u.totalMinutes / 60).toFixed(1).padStart(5)}h  (${u.meetings} meetings)`
  );
}
if (perUser.length > 10) console.log(`  ... and ${perUser.length - 10} more`);
console.log(
  `\n  No userId: ${
    perUser
      .filter((u) => !u._id)
      .map((u) => (u.totalMinutes / 60).toFixed(1) + 'h')
      .join(', ') || 'none'
  }`
);

await mongoose.disconnect();
process.exit(0);
