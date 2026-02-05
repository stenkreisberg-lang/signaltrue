import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { triggerImmediateSync } from '../services/integrationSyncScheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const orgId = process.argv[2];
  if (!orgId) {
    console.error('Usage: node scripts/runImmediateSync.js <orgId>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const results = await triggerImmediateSync(orgId);
    console.log('Immediate sync completed:', results);
  } catch (err) {
    console.error('Immediate sync error:', err);
  }
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
