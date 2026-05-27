import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';

await mongoose.connect(process.env.MONGO_URI);

const org = await Organization.findOne({ domain: /nobeldigital/i }).lean();
if (!org) {
  console.error('Org not found');
  process.exit(1);
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('  NOBELDIGITAL — DATA COVERAGE AUDIT');
console.log('═══════════════════════════════════════════════════════\n');

// ── 1. Total users in DB ──
const totalUsers = await User.countDocuments({ orgId: org._id });
const usersByRole = await User.aggregate([
  { $match: { orgId: org._id } },
  { $group: { _id: '$role', count: { $sum: 1 } } },
]);
console.log(`[1] USERS IN DATABASE`);
console.log(`    Total: ${totalUsers}`);
for (const r of usersByRole) console.log(`    ${r._id}: ${r.count}`);

// ── 2. Users who have any WorkEvents (= actually synced) ──
const now = new Date();
const thisWeekStart = new Date(now);
thisWeekStart.setDate(now.getDate() - 7);
thisWeekStart.setHours(0, 0, 0, 0);
const lastWeekStart = new Date(thisWeekStart);
lastWeekStart.setDate(lastWeekStart.getDate() - 7);

// Count distinct userIds with WorkEvents this week vs last week
const twUserEvents = await WorkEvent.aggregate([
  { $match: { orgId: org._id, timestamp: { $gte: thisWeekStart, $lte: now } } },
  { $group: { _id: '$userId' } },
]);
const lwUserEvents = await WorkEvent.aggregate([
  { $match: { orgId: org._id, timestamp: { $gte: lastWeekStart, $lt: thisWeekStart } } },
  { $group: { _id: '$userId' } },
]);

console.log(`\n[2] DISTINCT USERS WITH WORK EVENTS (calendar/meeting data)`);
console.log(
  `    This week  (${thisWeekStart.toLocaleDateString()} – today):      ${twUserEvents.length} users`
);
console.log(
  `    Last week  (${lastWeekStart.toLocaleDateString()} – ${thisWeekStart.toLocaleDateString()}): ${lwUserEvents.length} users`
);

// ── 3. Meeting events breakdown by source ──
const twMeetingsBySource = await WorkEvent.aggregate([
  {
    $match: { orgId: org._id, eventType: 'meeting', timestamp: { $gte: thisWeekStart, $lte: now } },
  },
  { $group: { _id: '$source', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
]);
const lwMeetingsBySource = await WorkEvent.aggregate([
  {
    $match: {
      orgId: org._id,
      eventType: 'meeting',
      timestamp: { $gte: lastWeekStart, $lt: thisWeekStart },
    },
  },
  { $group: { _id: '$source', count: { $sum: 1 }, uniqueUsers: { $addToSet: '$userId' } } },
]);

console.log(`\n[3] MEETING EVENTS BY SOURCE`);
console.log(`    THIS WEEK:`);
if (twMeetingsBySource.length === 0) console.log('    (none)');
for (const s of twMeetingsBySource) {
  console.log(
    `    ${s._id}: ${s.count} events, ${s.uniqueUsers.filter(Boolean).length} distinct users`
  );
}
console.log(`    LAST WEEK:`);
if (lwMeetingsBySource.length === 0) console.log('    (none)');
for (const s of lwMeetingsBySource) {
  console.log(
    `    ${s._id}: ${s.count} events, ${s.uniqueUsers.filter(Boolean).length} distinct users`
  );
}

// ── 4. Total meeting hours with user breakdown ──
const twMeetingHours = await WorkEvent.aggregate([
  {
    $match: {
      orgId: org._id,
      eventType: 'meeting',
      timestamp: { $gte: thisWeekStart, $lte: now },
      'metadata.durationMinutes': { $gt: 0 },
    },
  },
  {
    $group: {
      _id: '$userId',
      totalMinutes: { $sum: '$metadata.durationMinutes' },
      meetingCount: { $sum: 1 },
    },
  },
]);
const lwMeetingHours = await WorkEvent.aggregate([
  {
    $match: {
      orgId: org._id,
      eventType: 'meeting',
      timestamp: { $gte: lastWeekStart, $lt: thisWeekStart },
      'metadata.durationMinutes': { $gt: 0 },
    },
  },
  {
    $group: {
      _id: '$userId',
      totalMinutes: { $sum: '$metadata.durationMinutes' },
      meetingCount: { $sum: 1 },
    },
  },
]);

const twTotalHours = twMeetingHours.reduce((s, u) => s + u.totalMinutes, 0) / 60;
const lwTotalHours = lwMeetingHours.reduce((s, u) => s + u.totalMinutes, 0) / 60;
const twUsersWithHours = twMeetingHours.length;
const lwUsersWithHours = lwMeetingHours.length;

console.log(`\n[4] MEETING HOURS BREAKDOWN`);
console.log(`    THIS WEEK:`);
console.log(`    Total org hours:          ${twTotalHours.toFixed(1)}h`);
console.log(`    Users contributing hours: ${twUsersWithHours}`);
console.log(
  `    Avg per contributing user:${twUsersWithHours > 0 ? (twTotalHours / twUsersWithHours).toFixed(1) : '—'}h/week`
);
console.log(
  `    Avg across ALL ${totalUsers} users:  ${(twTotalHours / totalUsers).toFixed(1)}h/person/week`
);
console.log(`    LAST WEEK:`);
console.log(`    Total org hours:          ${lwTotalHours.toFixed(1)}h`);
console.log(`    Users contributing hours: ${lwUsersWithHours}`);
console.log(
  `    Avg per contributing user:${lwUsersWithHours > 0 ? (lwTotalHours / lwUsersWithHours).toFixed(1) : '—'}h/week`
);
console.log(
  `    Avg across ALL ${totalUsers} users:  ${(lwTotalHours / totalUsers).toFixed(1)}h/person/week`
);

// ── 5. Per-user meeting hours this week (top 15) ──
const userIds = twMeetingHours.map((u) => u._id).filter(Boolean);
const users = await User.find({ _id: { $in: userIds } })
  .select('name email')
  .lean();
const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

const sorted = [...twMeetingHours].sort((a, b) => b.totalMinutes - a.totalMinutes);
console.log(`\n[5] PER-USER MEETING HOURS THIS WEEK (top 20 by hours)`);
console.log(`    ${'Name'.padEnd(30)} ${'Email'.padEnd(40)} Hours   Meetings`);
console.log(`    ${'-'.repeat(90)}`);
for (const u of sorted.slice(0, 20)) {
  const info = u._id ? userMap[u._id.toString()] : null;
  const name = info?.name || (u._id ? '(no name)' : '(no userId on event)');
  const email = info?.email || '';
  console.log(
    `    ${name.slice(0, 29).padEnd(30)} ${email.slice(0, 39).padEnd(40)} ${(u.totalMinutes / 60).toFixed(1).padStart(5)}h  ${String(u.meetingCount).padStart(3)}`
  );
}
if (sorted.length > 20) console.log(`    ... and ${sorted.length - 20} more users`);

// ── 6. Events with no userId ──
const noUserEvents = await WorkEvent.countDocuments({
  orgId: org._id,
  eventType: 'meeting',
  userId: null,
  timestamp: { $gte: thisWeekStart },
});
console.log(`\n[6] MEETING EVENTS WITH NO userId THIS WEEK: ${noUserEvents}`);

// ── 7. IntegrationMetricsDaily records ──
const twMetrics = await IntegrationMetricsDaily.find({
  orgId: org._id,
  date: { $gte: thisWeekStart, $lte: now },
}).lean();
const lwMetrics = await IntegrationMetricsDaily.find({
  orgId: org._id,
  date: { $gte: lastWeekStart, $lt: thisWeekStart },
}).lean();
console.log(`\n[7] IntegrationMetricsDaily RECORDS`);
console.log(`    This week: ${twMetrics.length} records`);
console.log(`    Last week: ${lwMetrics.length} records`);
for (const m of twMetrics.slice(0, 5)) {
  console.log(
    `    date:${m.date?.toISOString().split('T')[0]}  meetingHours7d:${m.meetingDurationTotalHours7d?.toFixed(1)}  eventsProcessed:${m.eventsProcessed}  teamId:${m.teamId || 'null(org)'}`
  );
}

// ── 8. Summary ──
console.log(`\n═══════════════════════════════════════════════════════`);
console.log(`  SUMMARY`);
console.log(`═══════════════════════════════════════════════════════`);
console.log(`  Users registered in DB:          ${totalUsers}`);
console.log(`  Users with calendar data TW:     ${twUsersWithHours}`);
console.log(`  Users with calendar data LW:     ${lwUsersWithHours}`);
console.log(
  `  Coverage TW (of ${totalUsers} users):       ${totalUsers > 0 ? Math.round((twUsersWithHours / totalUsers) * 100) : 0}%`
);
console.log(
  `  Coverage LW (of ${totalUsers} users):       ${totalUsers > 0 ? Math.round((lwUsersWithHours / totalUsers) * 100) : 0}%`
);
console.log(`  Total org meeting hours TW:      ${twTotalHours.toFixed(1)}h`);
console.log(
  `  Per-person avg TW (connected):   ${twUsersWithHours > 0 ? (twTotalHours / twUsersWithHours).toFixed(1) : '—'}h`
);
console.log(
  `  Per-person avg LW (connected):   ${lwUsersWithHours > 0 ? (lwTotalHours / lwUsersWithHours).toFixed(1) : '—'}h`
);
console.log(`  ⚠️  Report showed: 60.1h TW vs 11.6h LW — this is ORG TOTAL, not per person`);
console.log('═══════════════════════════════════════════════════════\n');

await mongoose.disconnect();
process.exit(0);
