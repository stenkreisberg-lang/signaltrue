import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';

await mongoose.connect(process.env.MONGO_URI);
const org = await Organization.findOne({ domain: 'nobeldigital.ee' });

// Check IntegrationConnection collection
const conns = await IntegrationConnection.find({ orgId: org._id }).lean();
console.log('IntegrationConnections for NobelDigital:', conns.length);
for (const c of conns) {
  console.log(`  provider=${c.provider}, platform=${c.platform}, type=${c.type}, hasAccessToken=${!!c.accessToken}`);
}

// Check org.integrations embedded doc
console.log('\nOrg.integrations:');
const integrations = org.integrations || {};
if (integrations.microsoft) {
  console.log('  microsoft:', JSON.stringify({
    connected: integrations.microsoft.connected,
    scope: integrations.microsoft.scope,
    hasAccessToken: !!integrations.microsoft.accessToken,
    tokenExpiry: integrations.microsoft.tokenExpiry,
    email: integrations.microsoft.email,
  }, null, 2));
}

await mongoose.disconnect();
