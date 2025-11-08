import { aggregateCultureExperiments } from './cultureExperimentService.js';

export async function runCultureExperimentAggregation() {
  // This could be extended to trigger notifications, update dashboards, etc.
  await aggregateCultureExperiments();
}
