/**
 * Baseline Computation Utilities
 * 
 * Implements robust baseline statistics for signal detection:
 * - Baseline window: last 6 full weeks after calibration
 * - Robust statistics (median, MAD, percentiles) preferred over mean/std
 * - Baseline confidence scoring based on data coverage
 */

import { BASELINE_WEEKS, MIN_COVERAGE } from '../config/signalTemplates.js';

/**
 * Calculate comprehensive baseline statistics for a metric
 * 
 * @param {Array<number>} values - Array of metric values from baseline period
 * @param {number} expectedCount - Expected number of values (for coverage calculation)
 * @returns {Object} Baseline statistics
 */
export function calculateBaselineStats(values, expectedCount = null) {
  if (!values || values.length === 0) {
    return {
      mean: null,
      median: null,
      std: null,
      mad: null,
      p25: null,
      p75: null,
      confidence: 0,
      windowWeeks: BASELINE_WEEKS,
      sampleSize: 0
    };
  }
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  // Mean
  const mean = values.reduce((sum, val) => sum + val, 0) / n;
  
  // Median
  const median = calculatePercentile(sorted, 50);
  
  // Standard deviation
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  
  // MAD (Median Absolute Deviation) - robust alternative to std
  const mad = calculateMAD(sorted, median);
  
  // Percentiles for robust bands
  const p25 = calculatePercentile(sorted, 25);
  const p75 = calculatePercentile(sorted, 75);
  
  // Baseline confidence (0-1)
  const dataCoverage = expectedCount ? Math.min(1, n / expectedCount) : 1;
  const confidence = calculateBaselineConfidence(dataCoverage, n);
  
  return {
    mean,
    median,
    std,
    mad,
    p25,
    p75,
    confidence,
    windowWeeks: BASELINE_WEEKS,
    sampleSize: n
  };
}

/**
 * Calculate percentile from sorted array
 */
function calculatePercentile(sortedValues, percentile) {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

/**
 * Calculate Median Absolute Deviation (MAD)
 * More robust than standard deviation against outliers
 */
function calculateMAD(sortedValues, median) {
  if (!median || sortedValues.length === 0) return null;
  
  const absoluteDeviations = sortedValues.map(val => Math.abs(val - median));
  absoluteDeviations.sort((a, b) => a - b);
  
  return calculatePercentile(absoluteDeviations, 50);
}

/**
 * Calculate baseline confidence score
 * Higher confidence with better data coverage and larger sample size
 */
function calculateBaselineConfidence(dataCoverage, sampleSize) {
  // Data coverage factor (0-1)
  const coverageFactor = Math.min(1, dataCoverage / MIN_COVERAGE);
  
  // Sample size factor (0-1)
  // Good confidence at 30+ samples, excellent at 60+
  const sampleFactor = Math.min(1, sampleSize / (BASELINE_WEEKS * 7));
  
  // Combined confidence
  const confidence = 0.6 * coverageFactor + 0.4 * sampleFactor;
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Calculate robust z-score using MAD
 * robust_z = (current_value - baseline_median) / (1.4826 * baseline_mad)
 * 
 * The constant 1.4826 makes MAD comparable to standard deviation for normal distributions
 */
export function calculateRobustZScore(currentValue, baselineMedian, baselineMAD) {
  if (baselineMAD === null || baselineMAD === 0) return null;
  return (currentValue - baselineMedian) / (1.4826 * baselineMAD);
}

/**
 * Fallback: Calculate standard z-score
 * z = (current_value - baseline_mean) / baseline_std
 */
export function calculateZScore(currentValue, baselineMean, baselineStd) {
  if (baselineStd === null || baselineStd === 0) return null;
  return (currentValue - baselineMean) / baselineStd;
}

/**
 * Calculate percentage change from baseline
 */
export function calculateDeltaPct(currentValue, baselineValue) {
  if (baselineValue === 0 || baselineValue === null) return null;
  return ((currentValue - baselineValue) / Math.abs(baselineValue)) * 100;
}

/**
 * Calculate absolute change from baseline
 */
export function calculateDeltaAbs(currentValue, baselineValue) {
  if (baselineValue === null) return null;
  return currentValue - baselineValue;
}

/**
 * Check if a metric meets minimum data quality requirements
 */
export function meetsDataQualityRequirements(params) {
  const {
    activeUsersCount,
    minGroupSize = 8,
    dataCoverage = 0,
    minCoverage = MIN_COVERAGE,
    sampleSize = 0,
    minSampleSize = 0
  } = params;
  
  // Privacy check: minimum group size
  if (activeUsersCount < minGroupSize) {
    return {
      meets: false,
      reason: 'Below minimum group size for privacy'
    };
  }
  
  // Coverage check
  if (dataCoverage < minCoverage) {
    return {
      meets: false,
      reason: `Data coverage ${(dataCoverage * 100).toFixed(0)}% below minimum ${(minCoverage * 100).toFixed(0)}%`
    };
  }
  
  // Sample size check (if specified)
  if (minSampleSize > 0 && sampleSize < minSampleSize) {
    return {
      meets: false,
      reason: `Sample size ${sampleSize} below minimum ${minSampleSize}`
    };
  }
  
  return {
    meets: true,
    reason: null
  };
}

/**
 * Track sustained deviation across weeks
 * Returns the number of consecutive weeks a condition has been true
 */
export function calculateSustainedWeeks(historicalFlags) {
  if (!historicalFlags || historicalFlags.length === 0) return 0;
  
  // Count from most recent week backwards
  let sustained = 0;
  for (let i = historicalFlags.length - 1; i >= 0; i--) {
    if (historicalFlags[i]) {
      sustained++;
    } else {
      break;  // Streak broken
    }
  }
  
  return sustained;
}

/**
 * Build time series for UI visualization
 * Returns last N weeks of data with baseline bands
 */
export function buildTimeSeries(weeklyData, baseline, weeksToShow = 8) {
  if (!weeklyData || weeklyData.length === 0) return [];
  
  // Take last N weeks
  const recentWeeks = weeklyData.slice(-weeksToShow);
  
  return recentWeeks.map(week => ({
    weekStart: week.weekStart,  // ISO date string
    value: week.value,
    baselineMedian: baseline?.median || null,
    baselineLower: baseline?.p25 || null,    // Lower band (25th percentile)
    baselineUpper: baseline?.p75 || null,    // Upper band (75th percentile)
    isAboveUpperBand: baseline?.p75 ? week.value > baseline.p75 : false,
    isBelowLowerBand: baseline?.p25 ? week.value < baseline.p25 : false
  }));
}

/**
 * Normalize a value using baseline percentile bands
 * Returns 0-1 where 0 = p25, 0.5 = median, 1 = p75
 */
export function normalizeValue(value, baseline) {
  if (!baseline || baseline.p25 === null || baseline.p75 === null) return null;
  
  const range = baseline.p75 - baseline.p25;
  if (range === 0) return 0.5;  // No variance
  
  const normalized = (value - baseline.p25) / range;
  return Math.max(0, Math.min(1, normalized));  // Clamp to [0, 1]
}

/**
 * Check if current value is outside robust baseline bands
 */
export function isOutsideBaselineBands(value, baseline) {
  if (!baseline || baseline.p25 === null || baseline.p75 === null) {
    return { outside: false, direction: null };
  }
  
  if (value < baseline.p25) {
    return { outside: true, direction: 'below', band: 'p25' };
  }
  
  if (value > baseline.p75) {
    return { outside: true, direction: 'above', band: 'p75' };
  }
  
  return { outside: false, direction: null };
}

export default {
  calculateBaselineStats,
  calculateRobustZScore,
  calculateZScore,
  calculateDeltaPct,
  calculateDeltaAbs,
  meetsDataQualityRequirements,
  calculateSustainedWeeks,
  buildTimeSeries,
  normalizeValue,
  isOutsideBaselineBands
};
