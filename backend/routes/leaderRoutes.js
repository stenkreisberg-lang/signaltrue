import express from 'express';
import Team from '../models/team.js';
import getProvider from '../utils/aiProvider.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/leader/dashboard/:teamId
// Personalized dashboard for team leaders with AI-generated leadership focuses
router.get('/dashboard/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });

    // Compute key metrics
    const { bdi, zone, trend, driverWeights, seasonalityFlags, bdiHistory } = team;
    const recentHistory = bdiHistory.slice(0, 4);
    
    // Analyze patterns
    const isImproving = trend > 0;
    const isStagnant = Math.abs(trend) < 3;
    const inDangerZone = zone === 'Surge' || zone === 'Watch';
    
    // Build context for AI
    const context = `
Team: ${team.name}
Current BDI: ${bdi} (${zone})
Trend: ${trend}% (${isImproving ? 'improving' : trend < 0 ? 'declining' : 'stable'})
Recent History: ${recentHistory.map(h => `${h.bdi} on ${new Date(h.timestamp).toLocaleDateString()}`).join(', ')}
Top Drivers: ${Object.entries(driverWeights || {}).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${v})`).join(', ')}
`;

    // Generate AI recommendations
    const provider = getProvider();
    const prompt = `You are an executive coach for team leaders. Based on the following team analytics, provide exactly 3 actionable leadership focuses for this week. Be specific, practical, and empathetic.

${context}

Format your response as:
1. [Focus Title]: [2-sentence recommendation]
2. [Focus Title]: [2-sentence recommendation]
3. [Focus Title]: [2-sentence recommendation]

Keep it under 150 words total.`;

    const aiRecommendations = await provider.generateText(prompt, { max_tokens: 250 });

    res.json({
      teamName: team.name,
      metrics: {
        bdi,
        zone,
        trend,
        status: isImproving ? 'improving' : trend < 0 ? 'declining' : 'stable'
      },
      topDrivers: Object.entries(driverWeights || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, weight]) => ({ name, weight })),
      leadershipFocuses: aiRecommendations,
      alerts: inDangerZone ? [`Team is in ${zone} zone - requires immediate attention`] : []
    });
  } catch (err) {
    console.error('Leader dashboard error', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
