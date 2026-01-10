/**
 * Subscription Plan Constants & Access Matrix
 * 
 * This file defines the pricing tiers and strict role-based access control.
 * SignalTrue pricing is a POWER BOUNDARY, not a feature toggle.
 */

export const PLAN_IDS = {
  TEAM: 'team',
  LEADERSHIP: 'leadership',
  CUSTOM: 'custom'
};

export const PLAN_DEFINITIONS = {
  [PLAN_IDS.TEAM]: {
    planId: 'team',
    name: 'Team Intelligence',
    priceEUR: 99,
    features: {
      weeklyReports: true,
      monthlyReportsHR: true,
      monthlyReportsLeadership: false,
      aiTactical: true,
      aiStrategic: false,
      industryBenchmarks: false,
      orgComparisons: false,
      customModels: false
    }
  },
  [PLAN_IDS.LEADERSHIP]: {
    planId: 'leadership',
    name: 'Leadership Intelligence',
    priceEUR: 199,
    features: {
      weeklyReports: true,
      monthlyReportsHR: true,
      monthlyReportsLeadership: true,
      aiTactical: true,
      aiStrategic: true,
      industryBenchmarks: true,
      orgComparisons: true,
      customModels: false
    }
  },
  [PLAN_IDS.CUSTOM]: {
    planId: 'custom',
    name: 'Organizational Intelligence',
    priceEUR: null, // Custom pricing
    features: {
      weeklyReports: true,
      monthlyReportsHR: true,
      monthlyReportsLeadership: true,
      aiTactical: true,
      aiStrategic: true,
      industryBenchmarks: true,
      orgComparisons: true,
      customModels: true
    }
  }
};

// Role definitions
export const ROLES = {
  HR_ADMIN: 'HR_ADMIN',
  MANAGER: 'MANAGER',
  CEO: 'CEO',
  BOARD: 'BOARD'
};

// Feature types
export const FEATURES = {
  WEEKLY_REPORT: 'weeklyReports',
  MONTHLY_HR_REPORT: 'monthlyReportsHR',
  MONTHLY_LEADERSHIP_REPORT: 'monthlyReportsLeadership',
  AI_TACTICAL: 'aiTactical',
  AI_STRATEGIC: 'aiStrategic',
  INDUSTRY_BENCHMARKS: 'industryBenchmarks',
  ORG_COMPARISONS: 'orgComparisons',
  CUSTOM_MODELS: 'customModels'
};

/**
 * STRICT ACCESS MATRIX
 * Enforced at API level, NOT just UI
 * 
 * Feature → Role mapping
 * ✅ = allowed, ❌ = blocked
 */
export const ACCESS_MATRIX = {
  [FEATURES.WEEKLY_REPORT]: {
    [ROLES.HR_ADMIN]: true,
    [ROLES.MANAGER]: true,
    [ROLES.CEO]: false,
    [ROLES.BOARD]: false
  },
  [FEATURES.MONTHLY_HR_REPORT]: {
    [ROLES.HR_ADMIN]: true,
    [ROLES.MANAGER]: false,
    [ROLES.CEO]: false,
    [ROLES.BOARD]: false
  },
  [FEATURES.MONTHLY_LEADERSHIP_REPORT]: {
    [ROLES.HR_ADMIN]: false,
    [ROLES.MANAGER]: false,
    [ROLES.CEO]: true,
    [ROLES.BOARD]: true
  },
  [FEATURES.AI_TACTICAL]: {
    [ROLES.HR_ADMIN]: true,
    [ROLES.MANAGER]: true,
    [ROLES.CEO]: false,
    [ROLES.BOARD]: false
  },
  [FEATURES.AI_STRATEGIC]: {
    [ROLES.HR_ADMIN]: false,
    [ROLES.MANAGER]: false,
    [ROLES.CEO]: true,
    [ROLES.BOARD]: true
  },
  [FEATURES.INDUSTRY_BENCHMARKS]: {
    [ROLES.HR_ADMIN]: false,
    [ROLES.MANAGER]: false,
    [ROLES.CEO]: true,
    [ROLES.BOARD]: true
  },
  [FEATURES.ORG_COMPARISONS]: {
    [ROLES.HR_ADMIN]: false,
    [ROLES.MANAGER]: false,
    [ROLES.CEO]: true,
    [ROLES.BOARD]: true
  },
  [FEATURES.CUSTOM_MODELS]: {
    [ROLES.HR_ADMIN]: false,
    [ROLES.MANAGER]: false,
    [ROLES.CEO]: true,
    [ROLES.BOARD]: true
  }
};

/**
 * Custom plan flags (enterprise-only)
 */
export const CUSTOM_FLAGS = {
  ENABLE_BOARD_REPORTS: 'enableBoardReports',
  ENABLE_CUSTOM_THRESHOLDS: 'enableCustomThresholds',
  ENABLE_CUSTOM_AI_PROMPTS: 'enableCustomAiPrompts',
  ENABLE_QUARTERLY_REVIEWS: 'enableQuarterlyReviews'
};

/**
 * AI mode configurations
 */
export const AI_MODES = {
  TACTICAL: {
    horizon: '7-14 days',
    maxRecommendations: 3,
    tone: 'action-oriented',
    restrictions: [
      'No leadership framing',
      'No industry comparison',
      'No strategic language',
      'Short-term focus only'
    ]
  },
  STRATEGIC: {
    horizon: '60-120 days',
    maxRecommendations: null, // No limit
    tone: 'decision-prompts',
    restrictions: [
      'No individual names',
      'No coaching language',
      'No tactical recommendations',
      'No HR metrics framing'
    ]
  }
};

export default {
  PLAN_IDS,
  PLAN_DEFINITIONS,
  ROLES,
  FEATURES,
  ACCESS_MATRIX,
  CUSTOM_FLAGS,
  AI_MODES
};
