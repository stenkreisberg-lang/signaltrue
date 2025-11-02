import MetricsDaily from '../models/metricsDaily.js';
import Team from '../models/team.js';

// Default weights for Energy Index
const DEFAULT_WEIGHTS = {
  tone: 0.4,
  response: 0.3,
  collaboration: 0.2,
  meetingBalance: 0.1,
};

export function computeEnergyIndex({ toneScore, responseScore, collaborationScore, meetingBalanceScore }, weights = DEFAULT_WEIGHTS) {
  // Normalize all scores to 0..100
  const energy = Math.round(
    weights.tone * toneScore +
    weights.response * responseScore +
    weights.collaboration * collaborationScore +
    weights.meetingBalance * meetingBalanceScore
  );
  return Math.max(0, Math.min(100, energy));
}

export async function updateEnergyIndexForTeam(team) {
  // Use last 7 days of metrics
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const rows = await MetricsDaily.find({ teamId: team._id, date: { $gte: since } });
  if (!rows.length) return null;
  // Example: use sentimentAvg, responseMedianMins, messagesCount, meetingHoursWeek
  const toneScore = Math.round(50 + 50 * (rows.map(r => r.sentimentAvg).reduce((a,b) => a+b,0)/rows.length));
  const responseScore = Math.round(100 - Math.min(100, rows.map(r => r.responseMedianMins).reduce((a,b) => a+b,0)/rows.length));
  const collaborationScore = Math.round(Math.min(100, rows.map(r => r.messagesCount).reduce((a,b) => a+b,0)/rows.length));
  const meetingBalanceScore = Math.round(100 - Math.min(100, rows.map(r => r.meetingHoursWeek).reduce((a,b) => a+b,0)/rows.length));
  const energy = computeEnergyIndex({ toneScore, responseScore, collaborationScore, meetingBalanceScore });
  team.energyIndex = energy;
  await team.save();
  return energy;
}

export default { computeEnergyIndex, updateEnergyIndexForTeam };
