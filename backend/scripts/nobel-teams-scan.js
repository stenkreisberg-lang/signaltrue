import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import { decryptString } from '../utils/crypto.js';

await mongoose.connect(process.env.MONGO_URI);

const org = await Organization.findOne({ domain: /nobel/i });
const ms = org.integrations?.microsoft;
let accessToken = decryptString(ms.accessToken);

// Get all 5 teams
const teamsRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
const teamsData = await teamsRes.json();
const teams = teamsData.value || [];

console.log(`Scanning ${teams.length} teams for recent messages...\n`);

for (const team of teams) {
  console.log(`\n📂 Team: ${team.displayName}`);
  
  const chRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${team.id}/channels`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!chRes.ok) {
    console.log('  ❌ Cannot read channels:', chRes.status);
    continue;
  }
  
  const chData = await chRes.json();
  const channels = chData.value || [];
  
  for (const ch of channels.slice(0, 5)) {
    const msgRes = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${team.id}/channels/${ch.id}/messages?$top=5`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    
    if (!msgRes.ok) {
      console.log(`  ❌ ${ch.displayName}: ${msgRes.status}`);
      continue;
    }
    
    const msgData = await msgRes.json();
    const msgs = msgData.value || [];
    
    if (msgs.length === 0) {
      console.log(`  📭 ${ch.displayName}: no messages`);
      continue;
    }
    
    const newest = new Date(msgs[0].createdDateTime);
    const oldest = new Date(msgs[msgs.length - 1].createdDateTime);
    
    const isRecent = newest >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    console.log(`  ${isRecent ? '🟢' : '🔴'} ${ch.displayName}: ${msgs.length} msgs, newest: ${newest.toLocaleDateString()}, oldest: ${oldest.toLocaleDateString()}`);
  }
}

await mongoose.disconnect();
console.log('\n✅ Done');
