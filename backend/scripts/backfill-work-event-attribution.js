import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import { backfillWorkEventAttribution } from '../services/workEventAttributionService.js';

const domain = process.argv[2];
const days = Number(process.argv[3] || 90);

if (!domain) {
  console.error('Usage: node scripts/backfill-work-event-attribution.js <org-domain-or-slug> [days]');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI);

const org = await Organization.findOne({
  $or: [{ domain: new RegExp(domain, 'i') }, { slug: new RegExp(domain, 'i') }],
}).lean();

if (!org) {
  console.error(`Organization not found for ${domain}`);
  await mongoose.disconnect();
  process.exit(1);
}

const since = new Date();
since.setDate(since.getDate() - days);

const result = await backfillWorkEventAttribution(org._id, {
  since,
  sources: ['microsoft-outlook', 'microsoft-teams', 'google-calendar', 'google-chat', 'slack'],
});

console.log(
  `Backfill complete for ${org.name}: scanned=${result.scanned}, matched=${result.matched}, updated=${result.updated}`
);

await mongoose.disconnect();
process.exit(0);
