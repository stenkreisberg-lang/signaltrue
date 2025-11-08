import Team from '../models/team.js';
import CommHygieneScore from '../models/commHygieneScore.js';

export async function aggregateCommHygieneScore() {
  const teams = await Team.find({});
  const week = getCurrentWeek();
  for (const team of teams) {
    // TODO: Replace with real Slack API data
    const medianReplyTime = Math.floor(Math.random() * 60) + 10; // minutes
    const unansweredThreadsPct = Math.random();
    const reactionCoverage = Math.random();
    const hygieneScore = Math.round(100 - (medianReplyTime/120)*40 - unansweredThreadsPct*30 - (1-reactionCoverage)*30);
    await CommHygieneScore.findOneAndUpdate(
      { teamId: team._id, week },
      { teamId: team._id, week, hygieneScore, medianReplyTime, unansweredThreadsPct, reactionCoverage, kpis: { medianReplyTime, unansweredThreadsPct, reactionCoverage } },
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
