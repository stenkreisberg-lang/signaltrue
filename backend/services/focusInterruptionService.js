import Team from '../models/team.js';
import FocusInterruption from '../models/focusInterruption.js';
// import Calendar/Slack data sources as needed

// Dummy aggregation logic for demo (replace with real data fetch)
export async function aggregateFocusInterruption() {
  const teams = await Team.find({});
  const week = getCurrentWeek();
  for (const team of teams) {
    // TODO: Fetch real data from Calendar/Slack
    const totalFocusHours = Math.floor(Math.random() * 10) + 5;
    const uninterruptedHours = Math.floor(totalFocusHours * Math.random());
    const interruptions = [
      { source: 'Slack', count: Math.floor(Math.random() * 5) },
      { source: 'Meetings', count: Math.floor(Math.random() * 3) }
    ];
    const fii = 1 - (uninterruptedHours / (totalFocusHours || 1));
    const topSources = interruptions.sort((a,b) => b.count - a.count).slice(0,3).map(i => i.source);
    await FocusInterruption.findOneAndUpdate(
      { teamId: team._id, week },
      { teamId: team._id, week, focusInterruptionIndex: fii, totalFocusHours, uninterruptedHours, interruptions, topSources },
      { upsert: true }
    );
  }
}

function getCurrentWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil((((now - new Date(year,0,1)) / 86400000) + new Date(year,0,1).getDay()+1)/7);
  return `${year}-W${week}`;
}
