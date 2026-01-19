import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Get the user
  const user = await mongoose.connection.db.collection('users').findOne({ email: 'sten.kreisberg@signaltrue.ai' });
  console.log('User ID:', user._id);
  console.log('OrgId:', user.orgId);
  console.log('TeamId:', user.teamId);
  console.log('Has Google tokens:', !!user.google);
  console.log('Google access token exists:', !!user.google?.accessToken);
  console.log('Google refresh token exists:', !!user.google?.refreshToken);
  console.log('Google expiry:', user.google?.expiry_date ? new Date(user.google.expiry_date) : 'N/A');
  
  // Check organization for integrations
  const org = await mongoose.connection.db.collection('organizations').findOne({ _id: user.orgId });
  console.log('\nOrganization:', org?.name);
  console.log('Slack connected:', !!org?.integrations?.slack?.accessToken);
  console.log('Google Chat enabled:', org?.integrations?.googleChat?.sync?.enabled);
  console.log('Calibration status:', org?.calibration);
  console.log('Trial status:', org?.trial);
  
  // Check if there's any signals data
  const signals = await mongoose.connection.db.collection('signals').find({ orgId: user.orgId }).limit(5).toArray();
  console.log('\nSignals count:', signals.length);
  
  // Check signals_v2
  const signalsV2 = await mongoose.connection.db.collection('signals_v2').find({ orgId: user.orgId }).limit(5).toArray();
  console.log('Signals V2 count:', signalsV2.length);
  
  // Check baselines
  const baselines = await mongoose.connection.db.collection('baselines').find({ orgId: user.orgId }).toArray();
  console.log('Baselines count:', baselines.length);
  
  // Check loop closing metrics
  const loopClosing = await mongoose.connection.db.collection('loopclosings').find({ orgId: user.orgId }).toArray();
  console.log('Loop closing records:', loopClosing.length);
  
  // Check team data
  const team = await mongoose.connection.db.collection('teams').findOne({ _id: user.teamId });
  console.log('\nTeam name:', team?.name);
  console.log('Team calendar signals:', team?.calendarSignals);
  console.log('Team slack signals:', team?.slackSignals);
  
  await mongoose.disconnect();
}

check();
