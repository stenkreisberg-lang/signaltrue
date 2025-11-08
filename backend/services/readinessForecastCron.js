import { aggregateReadinessForecasts } from './readinessForecastService.js';

export async function runReadinessForecastAggregation() {
  // This could be extended to trigger notifications, update dashboards, etc.
  await aggregateReadinessForecasts();
}
