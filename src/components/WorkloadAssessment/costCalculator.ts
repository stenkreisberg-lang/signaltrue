// Cost Calculator Logic
// All calculations are transparent and assumption-based

import {
  AssessmentInputs,
  AssessmentResult,
  WorkloadRiskScore,
  CostBreakdown,
  AssessmentAssumptions,
  RiskLevel,
} from './types';

// Constants
const WORK_HOURS_PER_YEAR = 2080; // 40 hours/week × 52 weeks
const DEFAULT_MEETING_WASTE_PERCENT = 0.25; // 25% waste default
const REPLACEMENT_COSTS = {
  professional: 0.8, // 80% of annual salary
  manager: 2.0, // 200% of annual salary
};

/**
 * Calculate Workload Risk Index (0-100)
 * Factors weighted: meeting load, fragmentation, after-hours, focus time loss
 */
export function calculateWorkloadRiskScore(inputs: AssessmentInputs): WorkloadRiskScore {
  const { workload } = inputs;

  // Meeting Load Score (0-25 points)
  // 0-5 hours = low (5pts), 6-10 = medium (15pts), 11+ = high (25pts)
  let meetingLoadScore: number;
  if (workload.meetingHoursPerWeek <= 5) {
    meetingLoadScore = 5;
  } else if (workload.meetingHoursPerWeek <= 10) {
    meetingLoadScore = 10 + (workload.meetingHoursPerWeek - 5) * 2;
  } else if (workload.meetingHoursPerWeek <= 20) {
    meetingLoadScore = 20 + Math.min((workload.meetingHoursPerWeek - 10) * 0.5, 5);
  } else {
    meetingLoadScore = 25;
  }

  // Fragmentation Score (0-25 points) - back-to-back meeting intensity
  const fragmentationScores = { low: 5, medium: 15, high: 25 };
  const fragmentationScore = fragmentationScores[workload.backToBackFrequency];

  // After-Hours Work Score (0-25 points)
  // 0 hours = 0pts, 1-3 = 10pts, 4-6 = 18pts, 7+ = 25pts
  let afterHoursScore: number;
  if (workload.afterHoursPerWeek === 0) {
    afterHoursScore = 0;
  } else if (workload.afterHoursPerWeek <= 3) {
    afterHoursScore = 5 + workload.afterHoursPerWeek * 2;
  } else if (workload.afterHoursPerWeek <= 6) {
    afterHoursScore = 12 + (workload.afterHoursPerWeek - 3) * 2;
  } else {
    afterHoursScore = 25;
  }

  // Focus Time Loss Score (0-25 points) - derived from meetings + fragmentation
  // High meetings + high fragmentation = very little focus time
  const focusTimeLossScore = Math.min(
    25,
    (meetingLoadScore * 0.6) + (fragmentationScore * 0.4)
  );

  const total = Math.round(
    meetingLoadScore + fragmentationScore + afterHoursScore + focusTimeLossScore
  );

  // Determine risk level
  let level: RiskLevel;
  if (total <= 33) {
    level = 'low';
  } else if (total <= 66) {
    level = 'emerging';
  } else {
    level = 'high';
  }

  return {
    total: Math.min(100, total),
    level,
    factors: {
      meetingLoad: meetingLoadScore,
      fragmentation: fragmentationScore,
      afterHoursWork: afterHoursScore,
      focusTimeLoss: Math.round(focusTimeLossScore),
    },
  };
}

/**
 * Calculate all cost breakdowns
 */
export function calculateCostBreakdown(
  inputs: AssessmentInputs,
  wastePercent: number = DEFAULT_MEETING_WASTE_PERCENT
): CostBreakdown {
  const { company, workload, retention } = inputs;

  // A. Loaded Hourly Rate
  const loadedHourlyRate = (company.averageSalary * company.overheadMultiplier) / WORK_HOURS_PER_YEAR;

  // B. Meeting Cost
  const weeklyMeetingCost = workload.meetingHoursPerWeek * company.teamSize * loadedHourlyRate;
  const annualMeetingCost = weeklyMeetingCost * 52;

  // C. Meeting Waste Cost (assumption-based)
  const meetingWasteCost = annualMeetingCost * wastePercent;

  // D. Turnover Exposure Cost (range)
  const expectedExits = company.teamSize * (retention.attritionPercent / 100);
  
  let replacementMultiplier: number;
  if (retention.roleType === 'custom' && retention.customReplacementCost !== undefined) {
    replacementMultiplier = retention.customReplacementCost / 100;
  } else {
    replacementMultiplier = REPLACEMENT_COSTS[retention.roleType === 'manager' ? 'manager' : 'professional'];
  }

  // Show as range: 80% to 120% of calculated value
  const baseTurnoverCost = expectedExits * company.averageSalary * replacementMultiplier;
  const turnoverExposureLow = baseTurnoverCost * 0.8;
  const turnoverExposureHigh = baseTurnoverCost * 1.2;

  // E. Total Collaboration Drag (Annual) - Range
  const totalCostLow = meetingWasteCost + turnoverExposureLow;
  const totalCostHigh = meetingWasteCost + turnoverExposureHigh;

  return {
    loadedHourlyRate,
    weeklyMeetingCost,
    annualMeetingCost,
    meetingWasteCost,
    turnoverExposureLow,
    turnoverExposureHigh,
    totalCostLow,
    totalCostHigh,
  };
}

/**
 * Generate contextual insights based on inputs
 */
export function generateInsights(inputs: AssessmentInputs, riskScore: WorkloadRiskScore): string[] {
  const insights: string[] = [];
  const { workload, company, retention } = inputs;

  // Meeting-related insights
  if (workload.meetingHoursPerWeek >= 15) {
    insights.push(
      `With ${workload.meetingHoursPerWeek} hours of meetings per week, your team may have limited time for focused work.`
    );
  } else if (workload.meetingHoursPerWeek >= 10) {
    insights.push(
      `${workload.meetingHoursPerWeek} weekly meeting hours per person is above typical thresholds for knowledge work productivity.`
    );
  }

  // Fragmentation insights
  if (workload.backToBackFrequency === 'high') {
    insights.push(
      `High frequency of back-to-back meetings creates fragmentation that reduces deep work capacity.`
    );
  } else if (workload.backToBackFrequency === 'medium') {
    insights.push(
      `Moderate back-to-back meeting patterns suggest some calendar fragmentation affecting focus time.`
    );
  }

  // After-hours insights
  if (workload.afterHoursPerWeek >= 5) {
    insights.push(
      `${workload.afterHoursPerWeek} hours of after-hours work weekly indicates potential workload spillover or boundary challenges.`
    );
  } else if (workload.afterHoursPerWeek >= 2) {
    insights.push(
      `Some after-hours work (${workload.afterHoursPerWeek}h/week) may indicate workload distribution issues.`
    );
  }

  // Team size context
  if (company.teamSize >= 50) {
    insights.push(
      `At ${company.teamSize} people, coordination overhead compounds quickly - small improvements scale significantly.`
    );
  }

  // Attrition context
  if (retention.attritionPercent >= 15) {
    insights.push(
      `Your ${retention.attritionPercent}% estimated attrition rate suggests significant turnover exposure.`
    );
  }

  // Risk level summary
  if (riskScore.level === 'high') {
    insights.push(
      `Your Workload Risk Index (${riskScore.total}/100) indicates high risk patterns that often precede burnout and attrition.`
    );
  } else if (riskScore.level === 'emerging') {
    insights.push(
      `Your Workload Risk Index (${riskScore.total}/100) shows emerging patterns worth addressing before they escalate.`
    );
  }

  return insights.slice(0, 3); // Return top 3 most relevant
}

/**
 * Calculate complete assessment result
 */
export function calculateAssessmentResult(
  inputs: AssessmentInputs,
  wastePercent: number = DEFAULT_MEETING_WASTE_PERCENT
): AssessmentResult {
  const riskScore = calculateWorkloadRiskScore(inputs);
  const costBreakdown = calculateCostBreakdown(inputs, wastePercent);
  const insights = generateInsights(inputs, riskScore);

  // Get replacement multiplier for display
  let replacementMultiplier: number;
  if (inputs.retention.roleType === 'custom' && inputs.retention.customReplacementCost !== undefined) {
    replacementMultiplier = inputs.retention.customReplacementCost / 100;
  } else {
    replacementMultiplier = REPLACEMENT_COSTS[inputs.retention.roleType === 'manager' ? 'manager' : 'professional'];
  }

  const assumptions: AssessmentAssumptions = {
    salary: inputs.company.averageSalary,
    overheadMultiplier: inputs.company.overheadMultiplier,
    meetingWastePercent: wastePercent,
    attritionPercent: inputs.retention.attritionPercent,
    replacementMultiplier,
  };

  return {
    riskScore,
    costBreakdown,
    assumptions,
    insights,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, currency: string = '€'): string {
  if (value >= 1000000) {
    return `${currency}${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${currency}${Math.round(value / 1000)}K`;
  }
  return `${currency}${Math.round(value).toLocaleString()}`;
}

/**
 * Format cost range for display
 */
export function formatCostRange(low: number, high: number, currency: string = '€'): string {
  return `${formatCurrency(low, currency)} – ${formatCurrency(high, currency)}`;
}
