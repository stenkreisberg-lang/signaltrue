/**
 * Deep audit of Teams messages - what's in DB vs what's available in Graph API
 */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB\n');

const org = await Organization.findOne({ domain: 'nobeldigital.ee' });

// ─── PART 1: What's in the DB? ───
console.log('═══ PART 1: Teams messages currently in DB ═══');
const allTeamsEvents = await WorkEvent.find({
  orgId: org._id,
  source: 'microsoft-teams',
})
  .sort({ timestamp: -1 })
  .lean();

console.log(`Total Teams WorkEvents: ${allTeamsEvents.length}`);

if (allTeamsEvents.length > 0) {
  const newest = allTeamsEvents[0];
  const oldest = allTeamsEvents[allTeamsEvents.length - 1];
  console.log(`  Oldest: ${oldest.timestamp?.toISOString()} - ${oldest.title?.substring(0, 60)}`);
  console.log(`  Newest: ${newest.timestamp?.toISOString()} - ${newest.title?.substring(0, 60)}`);

  // Group by month
  const byMonth = {};
  for (const e of allTeamsEvents) {
    const key = e.timestamp?.toISOString().substring(0, 7) || 'no-date';
    byMonth[key] = (byMonth[key] || 0) + 1;
  }
  console.log('\n  By month:');
  for (const [month, count] of Object.entries(byMonth).sort()) {
    console.log(`    ${month}: ${count} messages`);
  }

  // Recent ones (last 14 days)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const recent = allTeamsEvents.filter((e) => e.timestamp >= twoWeeksAgo);
  console.log(`\n  Last 14 days: ${recent.length} messages`);
  for (const e of recent) {
    console.log(`    ${e.timestamp?.toISOString()} | ${e.title?.substring(0, 80)}`);
  }
}

// ─── PART 2: What does Graph API actually have? ───
console.log('\n═══ PART 2: Graph API - Full Teams scan ═══');
const accessToken = org.integrations?.microsoft?.accessToken;

// Get ALL teams
const teamsRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
  headers: { Authorization: `Bearer ${accessToken}` },
});
const teamsData = await teamsRes.json();
const teams = teamsData.value || [];
console.log(`\nJoined teams: ${teams.length}`);

let totalApiMessages = 0;
let recentApiMessages = 0;
const twoWeeksAgo = new Date();
twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

for (const team of teams) {
  console.log(`\n📁 Team: ${team.displayName}`);

  // Get ALL channels for this team
  const chRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${team.id}/channels`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const chData = await chRes.json();
  const channels = chData.value || [];
  console.log(`   Channels: ${channels.length}`);

  for (const ch of channels) {
    try {
      // Get messages - request more (top=50)
      const msgRes = await fetch(
        `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${ch.id}/messages?$top=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const msgData = await msgRes.json();
      const msgs = (msgData.value || []).filter((m) => m.messageType === 'message');

      const recentMsgs = msgs.filter((m) => new Date(m.createdDateTime) >= twoWeeksAgo);

      totalApiMessages += msgs.length;
      recentApiMessages += recentMsgs.length;

      if (msgs.length > 0) {
        const newest = msgs[0];
        const oldest = msgs[msgs.length - 1];
        console.log(
          `   📝 #${ch.displayName}: ${msgs.length} messages (${recentMsgs.length} recent)`
        );
        console.log(`      Oldest: ${oldest.createdDateTime}`);
        console.log(`      Newest: ${newest.createdDateTime}`);

        // Show recent messages
        for (const m of recentMsgs) {
          const preview = (m.body?.content || '').replace(/<[^>]*>/g, '').substring(0, 80);
          console.log(
            `      → ${m.createdDateTime} | ${m.from?.user?.displayName || 'unknown'}: ${preview}`
          );
        }
      } else {
        console.log(`   📝 #${ch.displayName}: 0 messages`);
      }
    } catch (err) {
      console.log(`   ⚠️  #${ch.displayName}: ${err.message}`);
    }
  }
}

console.log('\n═══ SUMMARY ═══');
console.log(`Total messages in Graph API (up to 50/channel): ${totalApiMessages}`);
console.log(`Recent messages (last 14 days): ${recentApiMessages}`);
console.log(`Messages in DB (all time): ${allTeamsEvents.length}`);
console.log(
  `Messages in DB (last 14 days): ${allTeamsEvents.filter((e) => e.timestamp >= twoWeeksAgo).length}`
);

// ─── PART 3: Check adapter config ───
console.log('\n═══ PART 3: Current adapter limits ═══');
console.log('fetchTeamsMessages() scans: 5 teams × 3 channels per team');
console.log(`Actual teams: ${teams.length}`);
for (const team of teams) {
  const chRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${team.id}/channels`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const chData = await chRes.json();
  console.log(`  "${team.displayName}": ${(chData.value || []).length} channels`);
}

await mongoose.disconnect();
console.log('\n✅ Done');
