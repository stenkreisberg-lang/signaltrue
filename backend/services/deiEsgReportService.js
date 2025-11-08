import DeiEsgReport from '../models/deiEsgReport.js';

export async function aggregateDeiEsgReports() {
  // Example: summarize DEI/ESG reports by org
  const summary = await DeiEsgReport.aggregate([
    { $group: {
      _id: '$organizationId',
      reports: { $push: '$$ROOT' },
      count: { $sum: 1 }
    }}
  ]);
  return summary;
}

export async function createDeiEsgReport(data) {
  return DeiEsgReport.create(data);
}

export async function getDeiEsgReports(orgId) {
  return DeiEsgReport.find({ organizationId: orgId });
}

export async function updateDeiEsgReport(id, data) {
  return DeiEsgReport.findByIdAndUpdate(id, data, { new: true });
}

export async function deleteDeiEsgReport(id) {
  return DeiEsgReport.findByIdAndDelete(id);
}
