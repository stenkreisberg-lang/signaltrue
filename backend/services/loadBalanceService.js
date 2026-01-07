/**
 * Team Load Balance Index Service
 * Reveals hidden load concentration without identifying individuals
 * 
 * Measures variance of:
 * - Meeting hours per person
 * - After-hours activity per person
 * - Response pressure per person
 * 
 * Output:
 * - Load Balance Index: Balanced / Moderately skewed / Highly skewed
 */

import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';

/**
 * Load Balance thresholds
 */
const BALANCE_THRESHOLDS = {
  BALANCED: 0.3,      // CV < 0.3 = balanced
  MODERATE: 0.5,      // CV 0.3-0.5 = moderately skewed
  // CV > 0.5 = highly skewed
};

/**
 * Calculate coefficient of variation (CV)
 * CV = standard deviation / mean
 * Lower CV = more balanced distribution
 * 
 * @param {Array} values - Array of numeric values
 * @returns {number} - Coefficient of variation (0-∞)
 */
function calculateCV(values) {
  if (!values || values.length < 2) return 0;
  
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  
  if (mean === 0) return 0;
  
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / n;
  const stdDev = Math.sqrt(variance);
  
  return stdDev / mean;
}

/**
 * Calculate variance of an array
 * @param {Array} values - Array of numeric values
 * @returns {number} - Variance
 */
function calculateVariance(values) {
  if (!values || values.length < 2) return 0;
  
  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  
  return squaredDiffs.reduce((sum, d) => sum + d, 0) / n;
}

/**
 * Determine balance state from CV
 * @param {number} cv - Coefficient of variation
 * @returns {string} - 'balanced' | 'moderate' | 'skewed'
 */
function determineBalanceState(cv) {
  if (cv < BALANCE_THRESHOLDS.BALANCED) return 'balanced';
  if (cv < BALANCE_THRESHOLDS.MODERATE) return 'moderate';
  return 'skewed';
}

/**
 * Calculate meeting load distribution
 * @param {Array} memberMetrics - Per-member meeting hours
 * @returns {Object} - Distribution metrics
 */
function calculateMeetingLoadDistribution(memberMetrics) {
  const meetingHours = memberMetrics.map(m => m.meetingHours || 0);
  
  return {
    values: meetingHours,
    cv: calculateCV(meetingHours),
    variance: calculateVariance(meetingHours),
    min: Math.min(...meetingHours),
    max: Math.max(...meetingHours),
    mean: meetingHours.reduce((s, v) => s + v, 0) / meetingHours.length,
    range: Math.max(...meetingHours) - Math.min(...meetingHours)
  };
}

/**
 * Calculate after-hours distribution
 * @param {Array} memberMetrics - Per-member after-hours activity
 * @returns {Object} - Distribution metrics
 */
function calculateAfterHoursDistribution(memberMetrics) {
  const afterHours = memberMetrics.map(m => m.afterHoursHours || 0);
  
  return {
    values: afterHours,
    cv: calculateCV(afterHours),
    variance: calculateVariance(afterHours),
    min: Math.min(...afterHours),
    max: Math.max(...afterHours),
    mean: afterHours.reduce((s, v) => s + v, 0) / afterHours.length
  };
}

/**
 * Calculate response pressure distribution
 * Response pressure = messages received + mentions
 * @param {Array} memberMetrics - Per-member response pressure
 * @returns {Object} - Distribution metrics
 */
function calculateResponsePressureDistribution(memberMetrics) {
  const pressure = memberMetrics.map(m => m.responsePressure || 0);
  
  return {
    values: pressure,
    cv: calculateCV(pressure),
    variance: calculateVariance(pressure),
    min: Math.min(...pressure),
    max: Math.max(...pressure),
    mean: pressure.reduce((s, v) => s + v, 0) / pressure.length
  };
}

/**
 * Calculate overall Load Balance Index (0-100)
 * Higher = more balanced
 * @param {Object} distributions - All distribution metrics
 * @returns {number} - Balance index
 */
function calculateLoadBalanceIndex(distributions) {
  // Weight each factor
  const weights = {
    meetingLoad: 0.4,
    afterHours: 0.35,
    responsePressure: 0.25
  };
  
  // Convert CV to balance score (lower CV = higher score)
  // CV of 0 = score of 100, CV of 1+ = score of 0
  const cvToScore = (cv) => Math.max(0, Math.min(100, (1 - cv) * 100));
  
  const meetingScore = cvToScore(distributions.meetingLoad.cv);
  const afterHoursScore = cvToScore(distributions.afterHours.cv);
  const pressureScore = cvToScore(distributions.responsePressure.cv);
  
  const weightedScore = 
    meetingScore * weights.meetingLoad +
    afterHoursScore * weights.afterHours +
    pressureScore * weights.responsePressure;
  
  return Math.round(weightedScore);
}

/**
 * Generate explanation message
 * @param {number} index - Load balance index
 * @param {string} state - Balance state
 * @param {Object} distributions - Distribution data
 * @returns {string} - Human-readable explanation
 */
function generateExplanation(index, state, distributions) {
  if (state === 'balanced') {
    return 'Workload is evenly distributed across the team';
  }
  
  // Find the most skewed dimension
  const cvs = {
    'meeting load': distributions.meetingLoad.cv,
    'after-hours work': distributions.afterHours.cv,
    'response pressure': distributions.responsePressure.cv
  };
  
  const mostSkewed = Object.entries(cvs)
    .sort(([, a], [, b]) => b - a)[0][0];
  
  if (state === 'moderate') {
    return `Workload is moderately uneven, particularly in ${mostSkewed}`;
  }
  
  return `Workload is highly skewed. ${mostSkewed.charAt(0).toUpperCase() + mostSkewed.slice(1)} shows significant imbalance`;
}

/**
 * Compute Team Load Balance Index
 * @param {string} teamId - Team ID
 * @param {Array} memberMetrics - Per-member workload metrics (anonymized)
 * @returns {Object} - Complete balance analysis
 */
export async function computeLoadBalanceIndex(teamId, memberMetrics = []) {
  const team = await Team.findById(teamId);
  if (!team) throw new Error('Team not found');

  // Need at least 3 members for meaningful variance
  if (memberMetrics.length < 3) {
    return {
      teamId,
      orgId: team.orgId,
      calculatedAt: new Date(),
      
      loadBalanceIndex: 50,
      balanceState: 'unknown',
      explanation: 'Insufficient data (need at least 3 team members)',
      hasData: false,
      
      distributions: null
    };
  }

  // Calculate distributions for each dimension
  const distributions = {
    meetingLoad: calculateMeetingLoadDistribution(memberMetrics),
    afterHours: calculateAfterHoursDistribution(memberMetrics),
    responsePressure: calculateResponsePressureDistribution(memberMetrics)
  };

  // Calculate overall index
  const loadBalanceIndex = calculateLoadBalanceIndex(distributions);

  // Determine state
  const avgCV = (distributions.meetingLoad.cv + distributions.afterHours.cv + distributions.responsePressure.cv) / 3;
  const balanceState = determineBalanceState(avgCV);

  // Generate explanation
  const explanation = generateExplanation(loadBalanceIndex, balanceState, distributions);

  return {
    teamId,
    orgId: team.orgId,
    calculatedAt: new Date(),
    
    loadBalanceIndex,
    balanceState,
    explanation,
    hasData: true,
    
    // Detailed distributions (no individual identifiers)
    distributions: {
      meetingLoad: {
        cv: Math.round(distributions.meetingLoad.cv * 100) / 100,
        range: distributions.meetingLoad.range,
        mean: Math.round(distributions.meetingLoad.mean * 10) / 10
      },
      afterHours: {
        cv: Math.round(distributions.afterHours.cv * 100) / 100,
        range: distributions.afterHours.max - distributions.afterHours.min,
        mean: Math.round(distributions.afterHours.mean * 10) / 10
      },
      responsePressure: {
        cv: Math.round(distributions.responsePressure.cv * 100) / 100,
        range: distributions.responsePressure.max - distributions.responsePressure.min,
        mean: Math.round(distributions.responsePressure.mean * 10) / 10
      }
    },
    
    // Team size (for context)
    teamSize: memberMetrics.length
  };
}

/**
 * Generate sample member metrics from aggregate data
 * Used when individual data isn't available
 * @param {Object} teamAggregates - Aggregate team metrics
 * @param {number} teamSize - Number of team members
 * @returns {Array} - Simulated member metrics
 */
export function generateSampleMetrics(teamAggregates, teamSize = 5) {
  const { avgMeetingHours, avgAfterHours, avgResponsePressure, variance = 0.3 } = teamAggregates;
  
  const members = [];
  
  for (let i = 0; i < teamSize; i++) {
    // Generate values with specified variance
    const multiplier = 1 + (Math.random() - 0.5) * 2 * variance;
    
    members.push({
      meetingHours: avgMeetingHours * multiplier,
      afterHoursHours: avgAfterHours * multiplier,
      responsePressure: avgResponsePressure * multiplier
    });
  }
  
  return members;
}

/**
 * Get balance state color
 * @param {string} state - Balance state
 * @returns {string} - CSS color
 */
export function getBalanceStateColor(state) {
  switch (state) {
    case 'balanced': return '#22c55e';
    case 'moderate': return '#eab308';
    case 'skewed': return '#ef4444';
    default: return '#6b7280';
  }
}

export default {
  computeLoadBalanceIndex,
  generateSampleMetrics,
  getBalanceStateColor,
  calculateCV,
  BALANCE_THRESHOLDS
};
