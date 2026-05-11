import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import WorkEvent from '../models/workEvent.js';
import Organization from '../models/organizationModel.js';

await mongoose.connect(process.env.MONGO_URI);
const org = await Organization.findOne({ domain: /nobeldigital/i }).lean();
const now = new Date();
const thisWeekStart = new Date(now);
thisWeekStart.setDate(now.getDate() - 7);
thisWeekStart.setHours(0, 0, 0, 0);

// Sample meeting events
const sample = await WorkEvent.find({
  orgId: org._id,
  eventType: 'meeting',
  timestamp: { $gte: thisWeekStart }
}).limit(5).lean();

console.log('=== SAMPLE MEETING EVENTS ===');
for (const e of sample) {
  console.log(JSON.stringify({
    userId: e.userId || 'NULL',
    source: e.source,
    timestamp: e.timestamp,
    metadata: {
      subject: e.metadata?.subject || e.metadata?.title,
      durationMinutes: e.metadata?.durationMinutes,
      attendeeCount: e.metadata?.attendeeCount,
      organizer: e.metadata?.organizer,
      attendees: e.metadata?.attendees?.slice(0, 3),
      calendarUserId: e.metadata?.calendarUserId || e.metadata?.userId,
      userEmail: e.metadata?.userEmail || e.metadata?.email,
    }
  }, null, 2));
  console.log('---');
}

// Check all unique metadata keys across all events
const allEvents = await WorkEvent.find({
  orgId: org._id,
  eventType: 'meeting',
  timestamp: { $gte: thisWeekStart }
}).lean();

const metaKeys = new Set();
for (const e of allEvents) {
  if (e.metadata) Object.keys(e.metadata).forEach(k => metaKeys.add(k));
}
console.log('\n=== ALL METADATA KEYS PRESENT ===');
console.log([...metaKeys].sort().join(', '));

// Check how many events have each potential user identifier
let withUserId = 0, withMetaEmail = 0, withMetaUserId = 0, withAttendees = 0, withOrganizer = 0;
for (const e of allEvents) {
  if (e.userId) withUserId++;
  if (e.metadata?.email || e.metadata?.userEmail) withMetaEmail++;
  if (e.metadata?.userId || e.metadata?.calendarUserId) withMetaUserId++;
  if (e.metadata?.attendees?.length > 0) withAttendees++;
  if (e.metadata?.organizer) withOrganizer++;
}
console.log('\n=== USER ATTRIBUTION COVERAGE (this week, all meeting events) ===');
console.log(`Total meeting events:         ${allEvents.length}`);
console.log(`With e.userId set:            ${withUserId}`);
console.log(`With metadata.email:          ${withMetaEmail}`);
console.log(`With metadata.userId:         ${withMetaUserId}`);
console.log(`With metadata.attendees:      ${withAttendees}`);
console.log(`With metadata.organizer:      ${withOrganizer}`);

await mongoose.disconnect();
process.exit(0);
