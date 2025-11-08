import CultureExperiment from '../models/cultureExperiment.js';

export async function aggregateCultureExperiments() {
  // Example: summarize completed experiments by org
  const summary = await CultureExperiment.aggregate([
    { $match: { status: 'completed' } },
    { $group: {
      _id: '$organizationId',
      experiments: { $push: '$$ROOT' },
      count: { $sum: 1 }
    }}
  ]);
  return summary;
}

export async function createCultureExperiment(data) {
  return CultureExperiment.create(data);
}

export async function getCultureExperiments(orgId) {
  return CultureExperiment.find({ organizationId: orgId });
}

export async function updateCultureExperiment(id, data) {
  return CultureExperiment.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteCultureExperiment(id) {
  return CultureExperiment.findByIdAndDelete(id);
}
