import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

  await mongoose.connect(process.env.MONGO_URI);
  try {
    const organizations = mongoose.connection.db.collection('organizations');
    const teams = mongoose.connection.db.collection('teams');

    const orgResult = await organizations.updateMany(
      {
        $or: [
          { 'settings.minTeamSize': { $lt: 5 } },
          { 'settings.minTeamSize': { $exists: false } },
        ],
      },
      { $set: { 'settings.minTeamSize': 5 } }
    );
    const teamResult = await teams.updateMany(
      { 'metadata.actualSize': { $lt: 5 } },
      { $set: { analyticsEnabled: false, privacyGateFiredAt: new Date() } }
    );

    console.log({
      organizationsUpdated: orgResult.modifiedCount,
      teamsSuppressed: teamResult.modifiedCount,
    });
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('[enforce-privacy-floor] Migration failed:', error.message);
  process.exit(1);
});
