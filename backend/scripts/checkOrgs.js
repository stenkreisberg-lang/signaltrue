import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function fix() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  // The OLD org with Slack connected
  const oldOrgId = new mongoose.Types.ObjectId('693bff1d7182d336060c8629');
  
  // Get the old org details
  const oldOrg = await db.collection('organizations').findOne({ _id: oldOrgId });
  console.log('Old org:', oldOrg?.name, '- Slack team:', oldOrg?.integrations?.slack?.teamName);
  
  // Find a team in the old org
  let team = await db.collection('teams').findOne({ orgId: oldOrgId });
  console.log('Team found:', team?.name, 'ID:', team?._id?.toString());
  
  // Check current user state
  const user = await db.collection('users').findOne({ email: 'sten.kreisberg@signaltrue.ai' });
  console.log('User current orgId:', user?.orgId?.toString());
  console.log('User current teamId:', user?.teamId?.toString());
  
  // Force update using $set
  await db.collection('users').updateOne(
    { email: 'sten.kreisberg@signaltrue.ai' },
    { 
      $set: { 
        orgId: oldOrgId,
        teamId: team._id,
        role: 'master_admin'
      }
    }
  );
  
  // Verify
  const updatedUser = await db.collection('users').findOne({ email: 'sten.kreisberg@signaltrue.ai' });
  console.log('After update - orgId:', updatedUser?.orgId?.toString());
  console.log('After update - teamId:', updatedUser?.teamId?.toString());
  
  await mongoose.disconnect();
}

fix();
