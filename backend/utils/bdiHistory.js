import Team from '../models/team.js';

// Create a BDI snapshot for a team
export async function createSnapshot(teamId) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  const snapshot = {
    bdi: team.bdi,
    timestamp: new Date(),
    slackSignals: {
      messageCount: team.slackSignals?.messageCount || 0,
      avgResponseDelayHours: team.slackSignals?.avgResponseDelayHours || 0,
      sentiment: team.slackSignals?.sentiment || 0
    },
    calendarSignals: {
      meetingHoursWeek: team.calendarSignals?.meetingHoursWeek || 0,
      afterHoursMeetings: team.calendarSignals?.afterHoursMeetings || 0,
      recoveryScore: team.calendarSignals?.recoveryScore || 0
    }
  };

  // Add to beginning of history array (most recent first)
  team.bdiHistory.unshift(snapshot);

  // Keep only last 90 days of history (approx 90-180 snapshots depending on frequency)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  team.bdiHistory = team.bdiHistory.filter(h => h.timestamp >= ninetyDaysAgo);

  // Calculate trend (7-day)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weekOldSnapshot = team.bdiHistory.find(h => h.timestamp <= sevenDaysAgo);
  if (weekOldSnapshot) {
    const change = team.bdi - weekOldSnapshot.bdi;
    team.trend = Math.round((change / weekOldSnapshot.bdi) * 100);
  }

  await team.save();
  return snapshot;
}

// Get BDI history for a time range
export function getHistoryRange(team, days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return team.bdiHistory.filter(h => h.timestamp >= cutoff).reverse(); // oldest first for charts
}

// Calculate trend between two dates
export function calculateTrend(team, startDate, endDate = new Date()) {
  const start = team.bdiHistory.find(h => h.timestamp <= startDate);
  const end = team.bdiHistory.find(h => h.timestamp <= endDate);
  
  if (!start || !end) return null;
  
  const change = end.bdi - start.bdi;
  const percentChange = Math.round((change / start.bdi) * 100);
  
  return {
    start: start.bdi,
    end: end.bdi,
    change,
    percentChange,
    startDate: start.timestamp,
    endDate: end.timestamp
  };
}

// Set baseline for a team
export async function setBaseline(teamId, bdi = null, date = null) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  team.baseline = {
    bdi: bdi !== null ? bdi : team.bdi,
    date: date || new Date(),
    signals: {
      slack: { ...team.slackSignals },
      calendar: { ...team.calendarSignals }
    }
  };

  await team.save();
  return team.baseline;
}

// Compare current BDI to baseline
export function compareToBaseline(team) {
  if (!team.baseline || !team.baseline.bdi) {
    return null;
  }

  const change = team.bdi - team.baseline.bdi;
  const percentChange = Math.round((change / team.baseline.bdi) * 100);
  const daysSinceBaseline = Math.floor((Date.now() - team.baseline.date.getTime()) / (24 * 60 * 60 * 1000));

  return {
    baselineBdi: team.baseline.bdi,
    currentBdi: team.bdi,
    change,
    percentChange,
    daysSinceBaseline,
    baselineDate: team.baseline.date
  };
}

export default {
  createSnapshot,
  getHistoryRange,
  calculateTrend,
  setBaseline,
  compareToBaseline
};
