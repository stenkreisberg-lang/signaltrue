import express from 'express';
import Team from '../models/team.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/resilience/team/:teamId
// Calculate organizational resilience score for a team
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    if (!team || !team.bdiHistory || team.bdiHistory.length < 4) {
      return res.status(404).json({ message: 'Insufficient data for resilience calculation' });
    }

    // Calculate BDI volatility (standard deviation)
    const bdis = team.bdiHistory.slice(0, 12).map(h => h.bdi);
    const mean = bdis.reduce((a, b) => a + b, 0) / bdis.length;
    const variance = bdis.reduce((sum, bdi) => sum + Math.pow(bdi - mean, 2), 0) / bdis.length;
    const volatility = Math.sqrt(variance);

    // Calculate recovery time (how fast team bounces back after stress)
    let recoveryTime = 0;
    let stressCount = 0;
    for (let i = 0; i < team.bdiHistory.length - 1; i++) {
      const current = team.bdiHistory[i];
      const previous = team.bdiHistory[i + 1];
      
      // If BDI increased after a drop (recovery)
      if (previous.bdi >= 70 && current.bdi < previous.bdi - 10) {
        // Found a stress point, now find recovery
        for (let j = i - 1; j >= 0; j--) {
          if (team.bdiHistory[j].bdi >= previous.bdi - 5) {
            recoveryTime += (i - j);
            stressCount++;
            break;
          }
        }
      }
    }
    
    const avgRecoveryWeeks = stressCount > 0 ? recoveryTime / stressCount : 0;

    // Compute resilience score (0-100)
    // Lower volatility = higher resilience
    // Faster recovery = higher resilience
    const volatilityScore = Math.max(0, 100 - volatility * 2);
    const recoveryScore = avgRecoveryWeeks > 0 ? Math.max(0, 100 - avgRecoveryWeeks * 15) : 80;
    const resilienceScore = Math.round((volatilityScore + recoveryScore) / 2);

    res.json({
      teamName: team.name,
      resilienceScore,
      metrics: {
        volatility: Math.round(volatility * 10) / 10,
        avgRecoveryWeeks: Math.round(avgRecoveryWeeks * 10) / 10,
        stressEvents: stressCount
      },
      rating: resilienceScore >= 80 ? 'Highly Resilient' : resilienceScore >= 60 ? 'Moderately Resilient' : 'Low Resilience',
      recommendation: resilienceScore < 60 ? 'Focus on stress management and support systems' : 'Maintain current practices'
    });
  } catch (err) {
    console.error('Resilience calculation error', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/resilience/org/:orgId
// Get resilience scores for all teams in org
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const teams = await Team.find({ orgId });
    
    const resilienceData = [];
    
    for (const team of teams) {
      if (!team.bdiHistory || team.bdiHistory.length < 4) continue;
      
      const bdis = team.bdiHistory.slice(0, 12).map(h => h.bdi);
      const mean = bdis.reduce((a, b) => a + b, 0) / bdis.length;
      const variance = bdis.reduce((sum, bdi) => sum + Math.pow(bdi - mean, 2), 0) / bdis.length;
      const volatility = Math.sqrt(variance);
      
      const volatilityScore = Math.max(0, 100 - volatility * 2);
      const resilienceScore = Math.round(volatilityScore);
      
      resilienceData.push({
        teamId: team._id,
        teamName: team.name,
        resilienceScore,
        volatility: Math.round(volatility * 10) / 10
      });
    }
    
    const avgResilience = resilienceData.length > 0 
      ? Math.round(resilienceData.reduce((sum, t) => sum + t.resilienceScore, 0) / resilienceData.length)
      : 0;
    
    res.json({
      teams: resilienceData.sort((a, b) => b.resilienceScore - a.resilienceScore),
      organizationalResilience: avgResilience
    });
  } catch (err) {
    console.error('Org resilience error', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
