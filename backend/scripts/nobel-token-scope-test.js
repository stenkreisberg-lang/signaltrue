import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import { decryptString } from '../utils/crypto.js';

await mongoose.connect(process.env.MONGO_URI);
const org = await Organization.findOne({ domain: /nobeldigital/i }).lean();
const token = decryptString(org.integrations.microsoft.accessToken);
const now = new Date();
const since = new Date(now); since.setDate(since.getDate() - 14);

// Test 1: /me/calendarview — Kätlin's own events with attendees
console.log('=== TEST 1: /me/calendarview (Kätlin own events) ===');
const meRes = await fetch(
  `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${since.toISOString()}&endDateTime=${now.toISOString()}&$select=id,subject,start,end,organizer,attendees,isOnlineMeeting,isAllDay&$top=10`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const meData = await meRes.json();
console.log('Status:', meRes.status, '| Events:', meData.value?.length);
if (meData.value?.length > 0) {
  const e = meData.value[0];
  console.log('Sample event attendees:', e.attendees?.slice(0, 5).map(a => a.emailAddress?.address));
}

// Test 2: Try /users/{id}/mailboxSettings — tests if we can read other users at all
const orgUsers = await User.find({ orgId: org._id, 'externalIds.microsoftUserId': { $exists: true } })
  .select('name email externalIds').limit(5).lean();

console.log('\n=== TEST 2: /users/{id}/mailboxSettings (other users) ===');
for (const u of orgUsers.slice(0, 3)) {
  const msId = u.externalIds?.microsoftUserId;
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${msId}/mailboxSettings`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`  ${u.email}: ${res.status}`);
}

// Test 3: /users/{id}/events (different endpoint than calendarview)
console.log('\n=== TEST 3: /users/{id}/events (first non-admin user) ===');
const testUser = orgUsers.find(u => !u.email.includes('admin') && !u.email.includes('katlin'));
if (testUser) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${testUser.externalIds.microsoftUserId}/events?$select=id,subject,start,end&$top=3`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  console.log(`  ${testUser.email}: status ${res.status}`);
  if (data.error) console.log('  Error:', data.error.code, data.error.message.slice(0, 100));
  else console.log('  Events:', data.value?.length);
}

// Test 4: check if /me/people works (social graph — shows who Kätlin interacts with)
console.log('\n=== TEST 4: /me/people (interaction graph) ===');
const peopleRes = await fetch('https://graph.microsoft.com/v1.0/me/people?$top=5&$select=displayName,scoredEmailAddresses', {
  headers: { Authorization: `Bearer ${token}` }
});
const peopleData = await peopleRes.json();
console.log('Status:', peopleRes.status);
if (peopleData.value) {
  for (const p of peopleData.value.slice(0, 5)) {
    console.log(' ', p.displayName, '-', p.scoredEmailAddresses?.[0]?.address);
  }
}

await mongoose.disconnect();
process.exit(0);
