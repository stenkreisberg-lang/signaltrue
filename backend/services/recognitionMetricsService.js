import Team from '../models/team.js';
import RecognitionMetrics from '../models/recognitionMetrics.js';

export async function aggregateRecognitionMetrics() {
  const teams = await Team.find({});
  const week = getCurrentWeek();
  for (const team of teams) {
    // TODO: Replace with real Slack/Teams data
    const recognitionsPerFTE = Math.random() * 2;
    const giverReceiverRatio = Math.random() * 2;
    const distributionEquity = Math.random();
    const heatmap = { dept: 'Sales', value: Math.random() };
    const aiTip = 'Recognition skewed toward few individuals.';
    await RecognitionMetrics.findOneAndUpdate(
      { teamId: team._id, week },
      { teamId: team._id, week, recognitionsPerFTE, giverReceiverRatio, distributionEquity, heatmap, aiTip },
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
