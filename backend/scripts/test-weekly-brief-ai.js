/**
 * Test script: generate weekly brief with AI analysis for NobelDigital
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// Import all models so they are registered
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

import { generateWeeklyBrief } from '../services/weeklyBriefService.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('Connected to MongoDB');

const orgId = '69831a7c2681136ee2e56c93';

console.log('Generating weekly brief with AI analysis…');
const startTime = Date.now();
const html = await generateWeeklyBrief(orgId);
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`Brief generated in ${elapsed}s (${html.length} chars)`);

// Check if AI section is present
const hasAI = html.includes('AI Analysis') || html.includes('AI Strategic');
console.log(`AI section present: ${hasAI ? '✅ YES' : '❌ NO (check OPENAI_API_KEY)'}`);

fs.writeFileSync('/tmp/weekly-brief-ai.html', html);
console.log('Saved to /tmp/weekly-brief-ai.html');

await mongoose.disconnect();
