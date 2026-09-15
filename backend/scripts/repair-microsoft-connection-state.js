import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization, { ACTIVE_ORG_FILTER } from '../models/organizationModel.js';
import {
  inspectMicrosoftCompanyWideAccess,
  verifyMicrosoftCompanyWideAccess,
} from '../services/microsoftAdminConsentService.js';

const apply = process.argv.includes('--apply');
const target = process.argv.slice(2).find((value) => !value.startsWith('--'));
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

await mongoose.connect(process.env.MONGO_URI);
try {
  const query = {
    ...ACTIVE_ORG_FILTER,
    'integrations.microsoft.tenantId': { $exists: true, $ne: null },
  };
  if (target) {
    query.$or = [
      { name: { $regex: target, $options: 'i' } },
      { domain: { $regex: target, $options: 'i' } },
    ];
  }

  const organizations = await Organization.find(query).select('_id name domain').lean();
  const results = [];
  for (const organization of organizations) {
    try {
      const verification = apply
        ? await verifyMicrosoftCompanyWideAccess(organization._id)
        : await inspectMicrosoftCompanyWideAccess(organization._id);
      results.push({
        organization: organization.name,
        orgId: String(organization._id),
        applied: apply,
        verified: verification.verified,
        roles: verification.roles,
        sources: verification.sources,
        transitions: verification.transitions || [],
      });
    } catch (error) {
      const verification = error.verification;
      results.push({
        organization: organization.name,
        orgId: String(organization._id),
        applied: apply,
        verified: false,
        error: error.message,
        roles: verification?.roles || [],
        sources: verification?.sources || null,
      });
    }
  }

  console.log(JSON.stringify({ apply, matched: organizations.length, results }, null, 2));
} finally {
  await mongoose.disconnect();
}
