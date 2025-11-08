import { aggregateDeiEsgReports } from './deiEsgReportService.js';

export async function runDeiEsgReportAggregation() {
  // This could be extended to trigger notifications, update dashboards, etc.
  await aggregateDeiEsgReports();
}
