import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Organization from '../models/organizationModel.js';
import { generateWeeklyBrief } from '../services/weeklyBriefService.js';

await mongoose.connect(process.env.MONGO_URI);
console.log('✅ Connected to MongoDB');

const org = await Organization.findOne({ domain: 'nobeldigital.ee' });
if (!org) { console.error('Org not found'); process.exit(1); }

console.log(`Generating weekly brief for ${org.name}...`);
const html = await generateWeeklyBrief(org._id);

// Save HTML to file for preview
const outPath = path.resolve(__dirname, '../weekly-brief-preview.html');
fs.writeFileSync(outPath, `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Weekly Brief Preview</title><style>body{background:#f3f4f6;padding:40px 20px;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}</style></head><body>${html}</body></html>`);
console.log(`\n✅ Brief saved to: ${outPath}`);

// Also strip HTML and print text version for quick review
const text = html
  .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/?(p|div|h[1-6]|tr|td|th|li|ul|ol|table|thead|tbody)[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, '\n\n')
  .trim();

console.log('\n' + '═'.repeat(70));
console.log('TEXT PREVIEW:');
console.log('═'.repeat(70));
console.log(text);

await mongoose.disconnect();
