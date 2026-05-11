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
const org = await Organization.findOne({ domain: /nobeldigital/i }).lean();
const ms = org.integrations?.microsoft;
const token = decryptString(ms.accessToken);

// 1. Decode the JWT to see scopes (no verification needed, just inspect)
const parts = token.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
console.log('=== TOKEN PAYLOAD ===');
console.log('scp (delegated scopes):', payload.scp);
console.log('roles (app scopes):', payload.roles);
console.log('oid (token owner):', payload.oid);
console.log('upn (user):', payload.upn);
console.log('app_displayname:', payload.app_displayname);
console.log('tid (tenant):', payload.tid);
console.log('exp:', new Date(payload.exp * 1000).toISOString());
console.log('token type (typ):', payload.typ);

// 2. Try /me to confirm what account this token belongs to
console.log('\n=== /me IDENTITY ===');
const meRes = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
  headers: { Authorization: `Bearer ${token}` }
});
const me = await meRes.json();
console.log(JSON.stringify(me, null, 2));

// 3. Try /organization to confirm tenant
console.log('\n=== /organization ===');
const orgRes = await fetch('https://graph.microsoft.com/v1.0/organization?$select=id,displayName,verifiedDomains', {
  headers: { Authorization: `Bearer ${token}` }
});
const orgData = await orgRes.json();
console.log(JSON.stringify(orgData?.value?.[0] || orgData, null, 2));

// 4. Try listing users (needs User.Read.All)
console.log('\n=== /users LIST (first 3) ===');
const usersRes = await fetch('https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail&$top=3', {
  headers: { Authorization: `Bearer ${token}` }
});
const usersData = await usersRes.json();
console.log('status:', usersRes.status);
console.log(JSON.stringify(usersData, null, 2));

// 5. Try accessing a specific known user's calendar directly
// Use the HR admin's Microsoft ID
const hrAdmin = await (await import('../models/user.js')).default.findOne({ orgId: org._id, role: 'hr_admin' }).lean();
if (hrAdmin?.externalIds?.microsoftUserId) {
  console.log(`\n=== /users/${hrAdmin.externalIds.microsoftUserId}/calendarview (${hrAdmin.email}) ===`);
  const now = new Date();
  const until = new Date(now); until.setDate(until.getDate() + 7);
  const calRes = await fetch(
    `https://graph.microsoft.com/v1.0/users/${hrAdmin.externalIds.microsoftUserId}/calendarview?startDateTime=${now.toISOString()}&endDateTime=${until.toISOString()}&$top=3`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const calData = await calRes.json();
  console.log('status:', calRes.status);
  console.log(JSON.stringify(calData, null, 2));
}

await mongoose.disconnect();
process.exit(0);
