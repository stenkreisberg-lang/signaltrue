import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';

await mongoose.connect(process.env.MONGO_URI);
const org = await Organization.findOne({ domain: /nobeldigital/i }).lean();

const total = await User.countDocuments({ orgId: org._id });
const withMsId = await User.countDocuments({
  orgId: org._id,
  'externalIds.microsoftUserId': { $exists: true, $ne: null },
});
const withEmail = await User.countDocuments({ orgId: org._id, email: { $exists: true, $ne: '' } });

console.log(`Total users:                  ${total}`);
console.log(`With externalIds.microsoftUserId: ${withMsId}`);
console.log(`With email set:               ${withEmail}`);

// Sample a few to see what externalIds look like
const sample = await User.find({ orgId: org._id }).select('name email externalIds').limit(5).lean();
console.log('\nSample users:');
for (const u of sample) {
  console.log(`  ${u.name} | ${u.email} | externalIds: ${JSON.stringify(u.externalIds)}`);
}

await mongoose.disconnect();
process.exit(0);
