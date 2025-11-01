import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Write alongside backend folder, not relative to process.cwd()
const USAGE_FILE = path.join(__dirname, '..', 'ai-usage.json');

async function _read() {
  try {
    const raw = await fs.readFile(USAGE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { totalCalls: 0, totalTokens: 0, byModel: {} };
  }
}

async function _write(data) {
  await fs.mkdir(path.dirname(USAGE_FILE), { recursive: true });
  await fs.writeFile(USAGE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

export async function incrementUsage({ model = 'unknown', promptTokens = 0, completionTokens = 0, totalTokens = 0 }) {
  const data = await _read();
  data.totalCalls = (data.totalCalls || 0) + 1;
  data.totalTokens = (data.totalTokens || 0) + (totalTokens || promptTokens + completionTokens);
  data.byModel = data.byModel || {};
  data.byModel[model] = data.byModel[model] || { calls: 0, tokens: 0 };
  data.byModel[model].calls += 1;
  data.byModel[model].tokens += (totalTokens || promptTokens + completionTokens);
  await _write(data);
  return data;
}

export async function readUsage() {
  return await _read();
}

export default { incrementUsage, readUsage };
