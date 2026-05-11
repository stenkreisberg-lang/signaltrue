/**
 * Tests Microsoft app-only (client credentials) token and calendar access.
 *
 * Run from backend/:  node scripts/nobel-test-app-token.js
 *
 * What it checks:
 *   1. Can we get a client_credentials token?
 *   2. Does it have 'roles' (app permissions)?  Without roles → no app perms granted
 *   3. Can we call /users/{id}/calendarview with it?
 *   4. Summary: what needs to change in Azure AD
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;
const CLIENT_ID = process.env.MS_APP_CLIENT_ID;
const CLIENT_SECRET = process.env.MS_APP_CLIENT_SECRET;
const TENANT_ID = process.env.MS_APP_TENANT || '310333cd-4ae5-409b-ad4d-2524eadf4fca';

// ─── Decode JWT payload without verifying signature ───
function decodeJwt(token) {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch { return null; }
}

async function main() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ MS_APP_CLIENT_ID or MS_APP_CLIENT_SECRET not set in .env');
    process.exit(1);
  }

  console.log(`\n=== Microsoft App-Only Token Test ===`);
  console.log(`Tenant : ${TENANT_ID}`);
  console.log(`App ID : ${CLIENT_ID}`);

  // ── 1. Get token ──
  console.log('\n[1] Requesting client_credentials token...');
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }).toString(),
    }
  );
  const tokenData = await tokenRes.json();

  if (tokenData.error) {
    console.error(`\n❌ Token error: ${tokenData.error}`);
    console.error(`   ${tokenData.error_description}`);
    console.error('\nFix: verify CLIENT_ID and CLIENT_SECRET are correct in .env');
    process.exit(1);
  }

  const appToken = tokenData.access_token;
  const claims = decodeJwt(appToken);
  console.log(`✅ Token obtained (expires in ${tokenData.expires_in}s)`);
  console.log(`   Token type : ${claims?.idtyp || '(unknown)'}`);
  console.log(`   Roles      : ${JSON.stringify(claims?.roles || [])}`);
  console.log(`   App ID     : ${claims?.appid || claims?.azp}`);

  if (!claims?.roles || claims.roles.length === 0) {
    console.error('\n⚠️  Token has NO roles — this means no Application permissions are granted.');
    console.error('   Calling /users/{id}/calendarview will return 403.');
    console.error('\n📋 How to fix in Azure AD:');
    console.error('   1. Go to portal.azure.com → Azure Active Directory → App registrations');
    console.error(`   2. Find "SignalTrue" (App ID: ${CLIENT_ID})`);
    console.error('   3. Click "API permissions" → "Add a permission" → "Microsoft Graph"');
    console.error('   4. Choose "Application permissions" (NOT delegated)');
    console.error('   5. Search for and add: Calendars.Read');
    console.error('   6. Click "Grant admin consent for [org name]"');
    console.error('   7. Re-run this script — roles should then include "Calendars.Read"');
  } else {
    const hasCalendars = claims.roles.includes('Calendars.Read');
    console.log(hasCalendars
      ? '\n✅ Token has Calendars.Read application permission!'
      : '\n⚠️  Token lacks Calendars.Read — add Application permission in Azure AD'
    );
  }

  // ── 2. Try a real user's calendarview ──
  console.log('\n[2] Testing /users/{id}/calendarview...');
  await mongoose.connect(MONGO_URI);
  const User = (await import('../models/user.js')).default;

  const testUser = await User.findOne({
    'externalIds.microsoftUserId': { $exists: true, $ne: null }
  }).lean();

  if (!testUser) {
    console.warn('   No users with microsoftUserId found in DB');
  } else {
    const msId = testUser.externalIds.microsoftUserId;
    const since = new Date(Date.now() - 7 * 86400_000).toISOString();
    const until = new Date().toISOString();
    const url = `https://graph.microsoft.com/v1.0/users/${msId}/calendarview?startDateTime=${since}&endDateTime=${until}&$select=subject,start,end&$top=5`;

    const calRes = await fetch(url, { headers: { Authorization: `Bearer ${appToken}` } });
    if (calRes.ok) {
      const calData = await calRes.json();
      console.log(`✅ SUCCESS — got ${(calData.value || []).length} events for ${testUser.email}`);
      (calData.value || []).slice(0, 3).forEach(e =>
        console.log(`   • ${e.subject} @ ${e.start?.dateTime}`)
      );
    } else {
      const errText = await calRes.text();
      console.error(`❌ ${calRes.status} — ${errText.slice(0, 300)}`);
      if (calRes.status === 403) {
        console.error('\n   This confirms "Calendars.Read" Application permission has NOT been granted.');
        console.error('   Follow the steps above to add and consent the permission in Azure AD.');
      }
    }
  }

  await mongoose.disconnect();
  console.log('\n=== Done ===\n');
}

main().catch(err => { console.error(err); process.exit(1); });
