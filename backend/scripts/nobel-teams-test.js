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

if (!ms?.accessToken) {
  console.error('No Microsoft access token');
  process.exit(1);
}

let accessToken;
try {
  accessToken = decryptString(ms.accessToken);
  console.log('✅ Token decrypted, length:', accessToken.length);
} catch (e) {
  console.error('❌ Token decryption failed:', e.message);
  process.exit(1);
}

// Check if token is expired
if (ms.expiry && new Date(ms.expiry) <= new Date()) {
  console.log('⚠️  Token expired at:', new Date(ms.expiry).toISOString());
  console.log('   Attempting refresh...');
  
  const refreshToken = decryptString(ms.refreshToken);
  const tenant = process.env.MS_APP_TENANT || 'common';
  
  const response = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.MS_APP_CLIENT_ID,
      client_secret: process.env.MS_APP_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    }).toString()
  });
  
  if (!response.ok) {
    const errText = await response.text();
    console.error('❌ Refresh failed:', errText);
    process.exit(1);
  }
  
  const tokens = await response.json();
  accessToken = tokens.access_token;
  console.log('✅ Token refreshed');
}

// Test 1: /me - basic auth check
console.log('\n--- Test 1: /me ---');
const meRes = await fetch('https://graph.microsoft.com/v1.0/me', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
if (meRes.ok) {
  const me = await meRes.json();
  console.log('✅ Authenticated as:', me.displayName, '(' + me.userPrincipalName + ')');
} else {
  console.error('❌ /me failed:', meRes.status, await meRes.text());
}

// Test 2: Outlook calendar events (last 7 days)
console.log('\n--- Test 2: Outlook Calendar Events ---');
const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
const until = new Date();
const calUrl = `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${since.toISOString()}&endDateTime=${until.toISOString()}&$top=5`;
const calRes = await fetch(calUrl, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
if (calRes.ok) {
  const calData = await calRes.json();
  console.log('✅ Calendar events found:', calData.value?.length || 0, '(showing top 5)');
  for (const ev of (calData.value || []).slice(0, 3)) {
    console.log('   ', ev.subject, '—', new Date(ev.start?.dateTime + 'Z').toLocaleString());
  }
} else {
  console.error('❌ Calendar failed:', calRes.status, await calRes.text());
}

// Test 3: Teams - joined teams
console.log('\n--- Test 3: Teams - Joined Teams ---');
const teamsRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
  headers: { Authorization: `Bearer ${accessToken}` }
});
if (teamsRes.ok) {
  const teamsData = await teamsRes.json();
  const teams = teamsData.value || [];
  console.log('✅ Joined teams:', teams.length);
  for (const t of teams) {
    console.log('   Team:', t.displayName, '(id:', t.id + ')');
  }
  
  // Test 4: Get channels + messages from first team
  if (teams.length > 0) {
    const firstTeam = teams[0];
    console.log('\n--- Test 4: Channels for team:', firstTeam.displayName, '---');
    
    const chRes = await fetch(`https://graph.microsoft.com/v1.0/teams/${firstTeam.id}/channels`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (chRes.ok) {
      const chData = await chRes.json();
      const channels = chData.value || [];
      console.log('✅ Channels:', channels.length);
      for (const ch of channels.slice(0, 5)) {
        console.log('   Channel:', ch.displayName, '(id:', ch.id + ')');
      }
      
      // Test 5: Get messages from first channel
      if (channels.length > 0) {
        const firstChannel = channels[0];
        console.log('\n--- Test 5: Messages in', firstChannel.displayName, '---');
        
        const msgRes = await fetch(
          `https://graph.microsoft.com/v1.0/teams/${firstTeam.id}/channels/${firstChannel.id}/messages?$top=5`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          const msgs = msgData.value || [];
          console.log('✅ Messages found:', msgs.length);
          for (const m of msgs.slice(0, 3)) {
            console.log('   [' + new Date(m.createdDateTime).toLocaleString() + '] from:', m.from?.user?.displayName || 'unknown');
          }
        } else {
          const errText = await msgRes.text();
          console.error('❌ Messages failed:', msgRes.status, errText.substring(0, 200));
        }
      }
    } else {
      const errText = await chRes.text();
      console.error('❌ Channels failed:', chRes.status, errText.substring(0, 200));
    }
  }
} else {
  const errText = await teamsRes.text();
  console.error('❌ Teams failed:', teamsRes.status, errText.substring(0, 300));
}

await mongoose.disconnect();
console.log('\n✅ Done');
