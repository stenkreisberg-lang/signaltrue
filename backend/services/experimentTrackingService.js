/**
 * Experiment Tracking Service
 * Manages intervention lifecycle: start, track, complete experiments
 */

import Experiment from '../models/experiment.js';
import TeamAction from '../models/teamAction.js';
import Impact from '../models/impact.js';
import MetricsDaily from '../models/metricsDaily.js';
import Baseline from '../models/baseline.js';

/**
 * Map metric keys to actual MetricsDaily fields
 */
const METRIC_FIELD_MAP = {
  'after_hours_activity': 'afterHoursRate',
  'meeting_load': 'meetingLoadIndex',
  'back_to_back_meetings': 'meetingHoursWeek',
  'focus_time': 'focusTimeRatio',
  'response_time': 'responseMedianMins',
  'participation_drift': 'uniqueContacts',
  'meeting_fragmentation': 'meetingHoursWeek'
};

/**
 * Capture baseline metrics before experiment starts
 */
async function capturePreMetrics(teamId, successMetrics) {
  const preMetrics = [];
  
  // Get most recent week's metrics (last 7 days average)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  for (const sm of successMetrics) {
    const fieldName = METRIC_FIELD_MAP[sm.metricKey];
    if (!fieldName) continue;
    
    // Get average over last 7 days
    const metrics = await MetricsDaily.find({
      teamId,
      date: { $gte: startDate, $lte: endDate }
    }).select(fieldName).lean();
    
    const values = metrics.map(m => m[fieldName]).filter(v => v != null);
    const avgValue = values.length > 0 
      ? values.reduce((sum, v) => sum + v, 0) / values.length 
      : null;
    
    // Get baseline for comparison
    const baseline = await Baseline.findOne({ teamId }).lean();
    const baselineValue = baseline?.metrics?.[sm.metricKey]?.mean || null;
    
    preMetrics.push({
      metricKey: sm.metricKey,
      value: avgValue,
      baseline: baselineValue,
      timestamp: new Date()
    });
  }
  
  return preMetrics;
}

/**
 * Capture metrics after experiment completes
 */
async function capturePostMetrics(teamId, successMetrics, startDate) {
  const postMetrics = [];
  
  // Get most recent week's metrics (last 7 days average)
  const endDate = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  for (const sm of successMetrics) {
    const fieldName = METRIC_FIELD_MAP[sm.metricKey];
    if (!fieldName) continue;
    
    // Get average over last 7 days
    const metrics = await MetricsDaily.find({
      teamId,
      date: { $gte: weekAgo, $lte: endDate }
    }).select(fieldName).lean();
    
    const values = metrics.map(m => m[fieldName]).filter(v => v != null);
    const avgValue = values.length > 0 
      ? values.reduce((sum, v) => sum + v, 0) / values.length 
      : null;
    
    // Get baseline for comparison
    const baseline = await Baseline.findOne({ teamId }).lean();
    const baselineValue = baseline?.metrics?.[sm.metricKey]?.mean || null;
    
    postMetrics.push({
      metricKey: sm.metricKey,
      value: avgValue,
      baseline: baselineValue,
      timestamp: new Date()
    });
  }
  
  return postMetrics;
}

/**
 * Complete an experiment and generate impact
 */
async function completeExperiment(experimentId) {
  const experiment = await Experiment.findById(experimentId).populate('actionId');
  
  if (!experiment || experiment.status !== 'running') {
    throw new Error('Experiment not found or not running');
  }
  
  // Capture post-metrics
  const postMetrics = await capturePostMetrics(
    experiment.teamId,
    experiment.successMetrics,
    experiment.startDate
  );
  
  experiment.postMetrics = postMetrics;
  experiment.status = 'completed';
  await experiment.save();
  
  // Mark action as completed
  const action = await TeamAction.findById(experiment.actionId);
  if (action) {
    action.status = 'completed';
    await action.save();
  }
  
  // Generate impact analysis
  const impact = await generateImpact(experiment);
  
  return { experiment, impact };
}

/**
 * Generate impact analysis from completed experiment
 */
async function generateImpact(experiment) {
  const metricChanges = [];
  let totalPositiveSignals = 0;
  let totalNegativeSignals = 0;
  
  // Compare pre vs post metrics
  for (const successMetric of experiment.successMetrics) {
    const pre = experiment.preMetrics.find(m => m.metricKey === successMetric.metricKey);
    const post = experiment.postMetrics.find(m => m.metricKey === successMetric.metricKey);
    
    if (!pre || !post || pre.value === null || post.value === null) {
      continue; // Skip if data missing
    }
    
    const delta = post.value - pre.value;
    const percentChange = (delta / pre.value) * 100;
    
    const expectedDirection = successMetric.expectedDirection;
    const actualDirection = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'unchanged';
    const movedAsExpected = (expectedDirection === actualDirection);
    
    metricChanges.push({
      metricKey: successMetric.metricKey,
      preValue: pre.value,
      postValue: post.value,
      delta,
      percentChange,
      movedAsExpected
    });
    
    if (movedAsExpected && Math.abs(percentChange) > 5) {
      totalPositiveSignals++;
    } else if (!movedAsExpected && Math.abs(percentChange) > 5) {
      totalNegativeSignals++;
    }
  }
  
  // Classify result
  let result = 'neutral';
  let confidence = 50;
  
  if (totalPositiveSignals >= 2 && totalNegativeSignals === 0) {
    result = 'positive';
    confidence = Math.min(90, 60 + (totalPositiveSignals * 10));
  } else if (totalNegativeSignals >= 2) {
    result = 'negative';
    confidence = Math.min(90, 60 + (totalNegativeSignals * 10));
  } else if (totalPositiveSignals >= 1 && totalNegativeSignals === 0) {
    result = 'positive';
    confidence = 60;
  }
  
  // Generate summary
  const summaryText = generateImpactSummary(result, metricChanges, experiment);
  
  // Generate next step
  const nextStep = generateNextStep(result, experiment);
  
  const impact = await Impact.create({
    experimentId: experiment._id,
    result,
    confidence,
    summaryText,
    nextStep,
    metricChanges
  });
  
  return impact;
}

/**
 * Generate human-readable impact summary
 */
function generateImpactSummary(result, metricChanges, experiment) {
  const action = experiment.actionId;
  
  if (result === 'positive') {
    const improvedMetrics = metricChanges
      .filter(m => m.movedAsExpected && Math.abs(m.percentChange) > 5)
      .map(m => m.metricKey.replace(/_/g, ' '));
    
    return `"${action.title}" improved ${improvedMetrics.join(', ')} without negative side effects. Consider making this permanent.`;
  } else if (result === 'negative') {
    const worsenedMetrics = metricChanges
      .filter(m => !m.movedAsExpected && Math.abs(m.percentChange) > 5)
      .map(m => m.metricKey.replace(/_/g, ' '));
    
    return `"${action.title}" did not produce expected results. ${worsenedMetrics.join(', ')} moved in the wrong direction. Try a different approach.`;
  } else {
    return `"${action.title}" showed minimal impact. Metrics remained stable. May need more time or a stronger intervention.`;
  }
}

/**
 * Generate recommended next step
 */
function generateNextStep(result, experiment) {
  if (result === 'positive') {
    return 'Make this practice permanent and monitor for sustained improvement.';
  } else if (result === 'negative') {
    return 'Discontinue this intervention and try an alternative approach.';
  } else {
    return 'Extend the experiment duration or try a more targeted intervention.';
  }
}

/**
 * Check for experiments that should be completed (past end date)
 */
async function checkExpiredExperiments() {
  const now = new Date();
  
  const expiredExperiments = await Experiment.find({
    status: 'running',
    endDate: { $lte: now }
  });
  
  const results = [];
  
  for (const exp of expiredExperiments) {
    try {
      const { experiment, impact } = await completeExperiment(exp._id);
      results.push({ experiment, impact, error: null });
    } catch (error) {
      results.push({ experiment: exp, impact: null, error: error.message });
    }
  }
  
  return results;
}

export {
  capturePreMetrics,
  capturePostMetrics,
  completeExperiment,
  generateImpact,
  checkExpiredExperiments
};
