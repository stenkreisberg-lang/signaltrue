import express from 'express';
import Team from '../models/team.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Simple linear regression helper
function linearRegression(data) {
  const n = data.length;
  if (n < 2) return null;
  
  const sumX = data.reduce((sum, d, i) => sum + i, 0);
  const sumY = data.reduce((sum, d) => sum + d, 0);
  const sumXY = data.reduce((sum, d, i) => sum + i * d, 0);
  const sumXX = data.reduce((sum, d, i) => sum + i * i, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope, intercept };
}

// GET /api/forecast/team/:teamId
// Predict BDI 2-4 weeks ahead
router.get('/team/:teamId', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { weeksAhead = 4 } = req.query;
    
    const team = await Team.findById(teamId);
    if (!team || !team.bdiHistory || team.bdiHistory.length < 3) {
      return res.status(404).json({ message: 'Insufficient data for forecasting' });
    }

    // Use last 8 weeks for regression
    const recentBdis = team.bdiHistory.slice(0, 8).map(h => h.bdi).reverse();
    const model = linearRegression(recentBdis);
    
    if (!model) return res.status(400).json({ message: 'Unable to compute forecast' });

    // Predict future BDI
    const forecasts = [];
    for (let week = 1; week <= parseInt(weeksAhead); week++) {
      const predictedBdi = Math.round(model.intercept + model.slope * (recentBdis.length + week - 1));
      forecasts.push({
        week,
        predictedBdi: Math.max(0, Math.min(100, predictedBdi)), // Clamp to 0-100
        confidence: week <= 2 ? 'high' : 'medium'
      });
    }

    // Check for danger zone alert
    const dangerZoneThreshold = 75;
    const alerts = forecasts
      .filter(f => f.predictedBdi >= dangerZoneThreshold)
      .map(f => ({
        week: f.week,
        message: `Team is forecast to enter Danger Zone (BDI ${f.predictedBdi}) in ${f.week} week(s)`
      }));

    res.json({
      teamName: team.name,
      currentBdi: team.bdi,
      forecasts,
      alerts,
      trend: model.slope > 0 ? 'increasing' : model.slope < 0 ? 'decreasing' : 'stable'
    });
  } catch (err) {
    console.error('Forecast error', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/forecast/org/:orgId
// Get forecasts for all teams in org, sorted by risk
router.get('/org/:orgId', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const teams = await Team.find({ orgId });
    
    const teamForecasts = [];
    
    for (const team of teams) {
      if (!team.bdiHistory || team.bdiHistory.length < 3) continue;
      
      const recentBdis = team.bdiHistory.slice(0, 8).map(h => h.bdi).reverse();
      const model = linearRegression(recentBdis);
      
      if (!model) continue;
      
      const week4Bdi = Math.max(0, Math.min(100, Math.round(model.intercept + model.slope * (recentBdis.length + 3))));
      const riskScore = week4Bdi >= 75 ? 'high' : week4Bdi >= 60 ? 'medium' : 'low';
      
      teamForecasts.push({
        teamId: team._id,
        teamName: team.name,
        currentBdi: team.bdi,
        forecast4Weeks: week4Bdi,
        riskScore,
        trend: model.slope
      });
    }
    
    // Sort by risk (high first)
    const sortedForecasts = teamForecasts.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.riskScore] - riskOrder[b.riskScore];
    });
    
    res.json({ forecasts: sortedForecasts });
  } catch (err) {
    console.error('Org forecast error', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
