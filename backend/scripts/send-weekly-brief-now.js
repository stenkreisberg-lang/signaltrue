/**
 * Send the weekly intelligence brief NOW for Nobeldigital
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

import '../models/organizationModel.js';
import '../models/user.js';
import '../models/team.js';
import '../models/driftEvent.js';
import '../models/behavioralDriftIndex.js';
import '../models/driftPlaybook.js';
import '../models/workEvent.js';
import '../models/integrationMetricsDaily.js';
import '../models/signal.js';
import '../models/categoryKingSignal.js';

import { sendWeeklyBrief } from '../services/weeklyBriefService.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to MongoDB');

const orgId = '69831a7c2681136ee2e56c93'; // Nobeldigital

try {
  console.log('Sending weekly brief…');
  await sendWeeklyBrief(orgId);
  console.log('✅ Brief sent successfully!');
} catch (err) {
  console.error('❌ Failed to send:', err.message);
  console.error(err.stack);
}

await mongoose.disconnect();
