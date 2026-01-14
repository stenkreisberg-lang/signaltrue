// Types for the Workload Assessment & Cost Calculator

export interface CompanyInputs {
  teamSize: number;
  averageSalary: number;
  overheadMultiplier: number; // Default 1.3
}

export interface WorkloadInputs {
  meetingHoursPerWeek: number;
  backToBackFrequency: 'low' | 'medium' | 'high';
  afterHoursPerWeek: number;
}

export interface RetentionInputs {
  attritionPercent: number; // Default 10%
  roleType: 'professional' | 'manager' | 'custom';
  customReplacementCost?: number; // Only used when roleType is 'custom'
}

export interface AssessmentInputs {
  company: CompanyInputs;
  workload: WorkloadInputs;
  retention: RetentionInputs;
}

// Risk Level based on Workload Risk Index (0-100)
export type RiskLevel = 'low' | 'emerging' | 'high';

export interface WorkloadRiskScore {
  total: number; // 0-100
  level: RiskLevel;
  factors: {
    meetingLoad: number;
    fragmentation: number;
    afterHoursWork: number;
    focusTimeLoss: number;
  };
}

export interface CostBreakdown {
  loadedHourlyRate: number;
  weeklyMeetingCost: number;
  annualMeetingCost: number;
  meetingWasteCost: number;
  turnoverExposureLow: number;
  turnoverExposureHigh: number;
  totalCostLow: number;
  totalCostHigh: number;
}

export interface AssessmentResult {
  riskScore: WorkloadRiskScore;
  costBreakdown: CostBreakdown;
  assumptions: AssessmentAssumptions;
  insights: string[];
}

export interface AssessmentAssumptions {
  salary: number;
  overheadMultiplier: number;
  meetingWastePercent: number;
  attritionPercent: number;
  replacementMultiplier: number;
}

export interface AssessmentSubmission {
  email: string;
  result: AssessmentResult;
  inputs: AssessmentInputs;
  consentGiven: boolean;
}

// Session context for AI Chat
export interface AssessmentSession {
  sessionId: string;
  completed: boolean;
  result?: AssessmentResult;
  inputs?: AssessmentInputs;
  timestamp: Date;
}
