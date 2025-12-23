import express from 'express';
import Team from '../models/team.js';
import { requireApiKey } from '../middleware/auth.js';
import { getExpandedEnergyIndex } from '../services/energyIndexService.js';
import dotenv from 'dotenv';

const router = express.Router();

// PATCH /api/teams/:teamId/drivers
// Update driverWeights and seasonalityFlags for a team
router.patch('/teams/:teamId/drivers', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { driverWeights, seasonalityFlags } = req.body;
    if (!teamId) return res.status(400).json({ message: 'teamId required' });
    const update = {};
    if (driverWeights) update.driverWeights = driverWeights;
    if (seasonalityFlags) update.seasonalityFlags = seasonalityFlags;
    const team = await Team.findByIdAndUpdate(teamId, update, { new: true });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json({ message: 'Drivers updated', team });
  } catch (err) {
    console.error('Update drivers error', err);
    res.status(500).json({ message: err.message });
  }
});

// Simple in-memory rate limiter for analyze: { ip: { count, ts } }
const analyzeRate = new Map();
const ANALYZE_LIMIT = Number(process.env.ANALYZE_LIMIT || 6); // calls per window
const ANALYZE_WINDOW_MS = Number(process.env.ANALYZE_WINDOW_MS || 60_000); // 1 minute default

// Helper to generate mock teams if DB empty
async function seedMockTeams() {
  const count = await Team.countDocuments();
  if (count === 0) {
    const mock = [
      { name: 'Marketing', zone: 'Watch', bdi: 46, trend: -8, favorite: true, slackSignals: { messageCount: 120, avgResponseDelayHours: 3.2, sentiment: -0.2 } },
      { name: 'Engineering', zone: 'Stable', bdi: 62, trend: 4, favorite: false, slackSignals: { messageCount: 85, avgResponseDelayHours: 6.1, sentiment: 0.1 } },
      { name: 'Customer Success', zone: 'Surge', bdi: 30, trend: -12, favorite: false, slackSignals: { messageCount: 200, avgResponseDelayHours: 1.5, sentiment: -0.5 } },
    ];
    await Team.insertMany(mock);
  }
}

// GET /api/teams
router.get('/teams', async (req, res) => {
  try {
    await seedMockTeams();
    const teams = await Team.find().sort({ favorite: -1, updatedAt: -1 });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/analyze
router.post('/analyze', async (req, res) => {
  try {
    const { teamId, context, model: requestedModel } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;

    // rate limiting per IP
    const now = Date.now();
    const info = analyzeRate.get(ip) || { count: 0, ts: now };
    if (now - info.ts > ANALYZE_WINDOW_MS) {
      info.count = 0;
      info.ts = now;
    }
    info.count += 1;
    analyzeRate.set(ip, info);
    if (info.count > ANALYZE_LIMIT) {
      return res.status(429).json({ message: 'Too many analyze requests, slow down' });
    }

    const modelEnv = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    const model = requestedModel || modelEnv;
    const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
    let playbook = '';

    // Determine which provider to use based on model name or env
    let effectiveProvider = provider;
    if (/^claude/i.test(model)) {
      effectiveProvider = 'anthropic';
    } else if (/^gpt/i.test(model)) {
      effectiveProvider = 'openai';
    }

    // Check if API key is available for the chosen provider
    if (effectiveProvider === 'openai' && !process.env.OPENAI_API_KEY) {
      playbook = `Playbook for ${teamId || 'team'}:\n- Focus on short async updates\n- Encourage 2-day recovery windows`;
      return res.json({ playbook });
    }

    if (effectiveProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      playbook = `Playbook (Claude unavailable) for ${teamId || 'team'}:\n- Configure ANTHROPIC_API_KEY to enable Claude`;
      return res.json({ playbook });
    }

    const prompt = `You are an expert org coach. Write a concise playbook for the team based on context:\n${context}`;

    // Temporarily set AI_PROVIDER to match effective provider
    const originalProvider = process.env.AI_PROVIDER;
    process.env.AI_PROVIDER = effectiveProvider;

    // Use provider adapter
    const providerClient = getProvider();
    const completion = await providerClient.generate({ prompt, model, max_tokens: 400 });
    playbook = completion.choices?.[0]?.message?.content || completion.choices?.[0]?.text || '';

    // Restore original provider env
    if (originalProvider !== undefined) {
      process.env.AI_PROVIDER = originalProvider;
    } else {
      delete process.env.AI_PROVIDER;
    }

    // Log usage if available
    try {
      const usage = completion.usage || null;
      if (usage) await incrementUsage({ model, promptTokens: usage.prompt_tokens || usage.promptTokens || 0, completionTokens: usage.completion_tokens || usage.completionTokens || 0, totalTokens: usage.total_tokens || usage.totalTokens || 0 });
    } catch (e) {
      console.warn('Failed to record AI usage', e.message || e);
    }

    // Optionally save to team
    if (teamId) {
      await Team.findByIdAndUpdate(teamId, { playbook }, { new: true });
    }

    res.json({ playbook });
  } catch (err) {
    console.error('Analyze error', err);
    res.status(500).json({ message: 'Error generating playbook' });
  }
});

// GET /api/ai-usage - protected by API key
router.get('/ai-usage', requireApiKey, async (req, res) => {
  try {
    const data = await readUsage();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/teams/:teamId/energy-expanded
// Returns expanded Energy Index with capability indicators breakdown
router.get('/teams/:teamId/energy-expanded', async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    const expandedEnergy = await getExpandedEnergyIndex(team);
    res.json(expandedEnergy);
  } catch (err) {
    console.error('Error fetching expanded energy:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
