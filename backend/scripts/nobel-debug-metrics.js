import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import WorkEvent from '../models/workEvent.js';

await mongoose.connect(process.env.MONGO_URI);
const org = await Organization.findOne({ domain: 'nobeldigital.ee' });

const date = new Date('2026-03-08');
const window7dStart = new Date(date);
window7dStart.setDate(window7dStart.getDate() - 7);
const endOfDay = new Date(date);
endOfDay.setDate(endOfDay.getDate() + 1);

const events = await WorkEvent.find({
  orgId: org._id,
  timestamp: { $gte: window7dStart, $lt: endOfDay }
}).lean();

console.log('Total events in 7-day window:', events.length);

const meetEvents = events.filter(e =>
  e.source === 'meet' || e.source === 'calendar' ||
  e.source === 'google-calendar' || e.source === 'microsoft-outlook' ||
  (e.eventType === 'meeting')
);
console.log('Meeting events:', meetEvents.length);

const events7d = meetEvents.filter(e => new Date(e.timestamp) >= window7dStart);
console.log('Events in 7d window:', events7d.length);

const withDuration = events7d.filter(e => (e.metadata?.durationMinutes || 0) > 0);
console.log('With durationMinutes > 0:', withDuration.length);

if (withDuration.length > 0) {
  console.log('First 3:', withDuration.slice(0, 3).map(e => ({
    ts: e.timestamp.toISOString(),
    dur: e.metadata.durationMinutes,
    src: e.source
  })));
}

const totalHours = withDuration.reduce((sum, e) => sum + e.metadata.durationMinutes, 0) / 60;
console.log('Total meeting hours:', totalHours.toFixed(1));

await mongoose.disconnect();
