import express from 'express';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import getProvider from '../utils/aiProvider.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/narrative/weekly/:orgId
// Generate a weekly narrative summary for CHRO
router.get('/weekly/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const org = await Organization.findById(orgId);
    if (!org) return res.status(404).json({ message: 'Organization not found' });

    // Fetch all teams in the org
    const teams = await Team.find({ orgId });
    if (!teams.length) {
      return res.json({ narrative: 'No teams found for this organization.' });
    }

    // Compute aggregate stats
    const avgBdi = teams.reduce((sum, t) => sum + (t.bdi || 0), 0) / teams.length;
    const zoneCount = { Recovery: 0, Stable: 0, Watch: 0, Surge: 0 };
    teams.forEach(t => {
      if (t.zone) zoneCount[t.zone] = (zoneCount[t.zone] || 0) + 1;
    });

    // Identify notable changes (teams with high positive/negative trends)
    const improving = teams.filter(t => t.trend > 5).sort((a, b) => b.trend - a.trend).slice(0, 3);
    const declining = teams.filter(t => t.trend < -5).sort((a, b) => a.trend - b.trend).slice(0, 3);
    const surgeTeams = teams.filter(t => t.zone === 'Surge');

    // Build context for AI
    const context = `
Organization: ${org.name}
Industry: ${org.industry}
Overall BDI: ${avgBdi.toFixed(1)}
Zone Distribution: Recovery (${zoneCount.Recovery}), Stable (${zoneCount.Stable}), Watch (${zoneCount.Watch}), Surge (${zoneCount.Surge})

Improving Teams:
${improving.map(t => `- ${t.name}: BDI ${t.bdi}, Trend +${t.trend}%`).join('\n')}

Declining Teams:
${declining.map(t => `- ${t.name}: BDI ${t.bdi}, Trend ${t.trend}%`).join('\n')}

Teams in Surge:
${surgeTeams.map(t => `- ${t.name}: BDI ${t.bdi}`).join('\n')}
`;

    // Generate narrative using AI
    const provider = getProvider();
    const prompt = `You are a CHRO's executive assistant. Generate a concise 3-paragraph weekly summary based on the following team analytics data. Focus on key insights, trends, and actionable recommendations. Use professional, data-driven language.

${context}

Generate a narrative in this format:
1. Overall organizational health and key metrics
2. Notable team improvements or concerns with specific examples
3. Recommended actions for leadership

Keep it under 200 words total.`;

    const narrative = await provider.generateText(prompt, { max_tokens: 300 });

    res.json({ narrative, context, generatedAt: new Date() });
  } catch (err) {
    console.error('Narrative generation error', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
