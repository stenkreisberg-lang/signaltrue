import Team from '../models/team.js';
import TeamEnergyIndex from '../models/teamEnergyIndex.js';
// import Slack/Teams/Calendar/PTO data sources as needed

// Dummy aggregation logic for demo (replace with real data fetch)
export async function aggregateTeamEnergyIndex() {
  const teams = await Team.find({});
  const week = getCurrentWeek();
  for (const team of teams) {
    // TODO: Fetch real data from Slack/Teams/Calendar/PTO
    const meetingHours = Math.floor(Math.random() * 10) + 10;
    const afterHoursMessages = Math.floor(Math.random() * 20);
    const ptoDays = Math.floor(Math.random() * 2);
    let energyIndex = (meetingHours * 0.4) + (afterHoursMessages * 0.4) - (ptoDays * 0.2);
    energyIndex = Math.max(0, Math.min(100, Math.round(energyIndex)));
    const drivers = {
      meetingLoadPct: Math.round((meetingHours / 20) * 100),
      afterHoursPct: Math.round((afterHoursMessages / 40) * 100),
      restScore: 100 - (ptoDays * 10)
    };
    await TeamEnergyIndex.findOneAndUpdate(
      { teamId: team._id, week },
      { teamId: team._id, week, energyIndex, meetingHours, afterHoursMessages, ptoDays, drivers },
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
