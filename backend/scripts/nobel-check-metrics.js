import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import IntegrationMetricsDaily from '../models/integrationMetricsDaily.js';

await mongoose.connect(process.env.MONGO_URI);
const org = await Organization.findOne({ domain: 'nobeldigital.ee' });

const latest = await IntegrationMetricsDaily.findOne({
  orgId: org._id,
  teamId: null,
})
  .sort({ date: -1 })
  .lean();

if (latest) {
  console.log('Latest org-level metrics:', latest.date?.toISOString().split('T')[0]);
  console.log('  meetingCount7d:', latest.meetingCount7d);
  console.log('  meetingDurationTotalHours7d:', latest.meetingDurationTotalHours7d);
  console.log('  backToBackMeetingBlocks:', latest.backToBackMeetingBlocks);
  console.log('  messageCount7d:', latest.messageCount7d);
  console.log('  messagesPerDay:', latest.messagesPerDay);
  console.log('  afterHoursMessageCount:', latest.afterHoursMessageCount);
  console.log('  afterHoursMessageRatio:', latest.afterHoursMessageRatio);
  console.log('  uniqueChannels7d:', latest.uniqueChannels7d);
  console.log('  messageSources:', latest.messageSources);
  console.log('  sources:', latest.sources);
  console.log('  eventsProcessed:', latest.eventsProcessed);
  console.log('  confidence:', latest.confidence);
} else {
  console.log('No metrics found');
}

await mongoose.disconnect();
