import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import { triggerImmediateSync } from '../services/integrationSyncScheduler.js';

await mongoose.connect(process.env.MONGO_URI);

const org = await Organization.findOne({ domain: /nobel/i });
if (!org) { console.error('Org not found'); process.exit(1); }

console.log(`🚀 Triggering immediate sync for ${org.name} (${org._id})...`);
console.log(`   This will: sync events → compute metrics → generate signals → bridge to dashboard\n`);

const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days back for good coverage
const results = await triggerImmediateSync(org._id, { since });

console.log('\n📊 Sync Results:');
for (const r of results) {
  if (r.success) {
    console.log(`  ✅ ${r.source}: ${r.eventsProcessed || 0} events (${r.eventsCreated || 0} new, ${r.eventsUpdated || 0} updated)`);
  } else {
    console.log(`  ❌ ${r.source}: ${r.error}`);
  }
}

// Check what we have now
import WorkEvent from '../models/workEvent.js';
const recentEvents = await WorkEvent.aggregate([
  { $match: { orgId: org._id, timestamp: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } } },
  { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

console.log('\n📋 WorkEvents (last 14 days):');
for (const e of recentEvents) {
  console.log(`  ${e._id.source} / ${e._id.eventType}: ${e.count}`);
}

await mongoose.disconnect();
console.log('\n✅ Done');
