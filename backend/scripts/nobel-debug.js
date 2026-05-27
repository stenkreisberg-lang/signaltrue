import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';

await mongoose.connect(process.env.MONGO_URI);

const org = await Organization.findOne({ domain: /nobel/i });
const ms = org.integrations?.microsoft;

console.log('=== Microsoft Integration Details ===');
console.log('scope:', ms?.scope);
console.log('hasAccessToken:', !!ms?.accessToken);
console.log('hasRefreshToken:', !!ms?.refreshToken);
console.log('email:', ms?.email);
console.log('tenantId:', ms?.tenantId);
console.log('sync:', JSON.stringify(ms?.sync, null, 2));

console.log('\n=== ALL integration keys ===');
const ints = org.integrations?.toObject?.() || org.integrations || {};
for (const key of Object.keys(ints)) {
  const val = ints[key];
  if (val && typeof val === 'object' && Object.keys(val).length > 0) {
    console.log(
      key + ':',
      JSON.stringify(
        {
          hasToken: !!val.accessToken,
          scope: val.scope,
          installed: val.installed,
          email: val.email,
        },
        null,
        2
      )
    );
  }
}

console.log('\n=== WorkEvent source breakdown (ALL TIME) ===');
const sources = await WorkEvent.aggregate([
  { $match: { orgId: org._id } },
  {
    $group: {
      _id: { source: '$source', eventType: '$eventType' },
      count: { $sum: 1 },
      earliest: { $min: '$timestamp' },
      latest: { $max: '$timestamp' },
    },
  },
  { $sort: { count: -1 } },
]);

for (const s of sources) {
  console.log(
    `  ${s._id.source} / ${s._id.eventType}: ${s.count} events (${new Date(s.earliest).toLocaleDateString()} → ${new Date(s.latest).toLocaleDateString()})`
  );
}

console.log('\n=== WorkEvent by week (last 3 weeks) ===');
const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
const weeklyBreakdown = await WorkEvent.aggregate([
  { $match: { orgId: org._id, timestamp: { $gte: threeWeeksAgo } } },
  {
    $group: {
      _id: {
        source: '$source',
        eventType: '$eventType',
        week: { $isoWeek: '$timestamp' },
        year: { $isoWeekYear: '$timestamp' },
      },
      count: { $sum: 1 },
    },
  },
  { $sort: { '_id.year': 1, '_id.week': 1, '_id.source': 1 } },
]);

for (const w of weeklyBreakdown) {
  console.log(
    `  Week ${w._id.week}/${w._id.year}: ${w._id.source}/${w._id.eventType} = ${w.count}`
  );
}

await mongoose.disconnect();
