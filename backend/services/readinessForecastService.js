import ReadinessForecast from '../models/readinessForecast.js';

export async function aggregateReadinessForecasts() {
  // Example: summarize readiness by org and date
  const summary = await ReadinessForecast.aggregate([
    { $group: {
      _id: { org: '$organizationId', date: '$forecastDate' },
      avgScore: { $avg: '$readinessScore' },
      count: { $sum: 1 },
      forecasts: { $push: '$$ROOT' }
    }}
  ]);
  return summary;
}

export async function createReadinessForecast(data) {
  return ReadinessForecast.create(data);
}

export async function getReadinessForecasts(orgId) {
  return ReadinessForecast.find({ organizationId: orgId });
}

export async function updateReadinessForecast(id, data) {
  return ReadinessForecast.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteReadinessForecast(id) {
  return ReadinessForecast.findByIdAndDelete(id);
}
