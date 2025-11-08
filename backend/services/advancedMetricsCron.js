import { aggregateCommHygieneScore } from "../services/commHygieneScoreService.js";
import { aggregateRecognitionMetrics } from "../services/recognitionMetricsService.js";

export default async function runAdvancedMetricsCrons() {
  await aggregateCommHygieneScore();
  await aggregateRecognitionMetrics();
}
