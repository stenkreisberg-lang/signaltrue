// Types for the Fit Questionnaire component

export interface QuestionOption {
  label: string;
  value: string;
  score: number;
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
}

export interface QuestionnaireAnswer {
  questionId: number;
  value: string;
  score: number;
}

export type FitTier = 'strong-fit' | 'good-fit' | 'not-yet-fit';

export interface QuestionnaireResult {
  score: number;
  tier: FitTier;
  tierLabel: string;
  tierDescription: string;
}

export interface QuestionnaireSubmission {
  email: string;
  score: number;
  tier: FitTier;
  answers: QuestionnaireAnswer[];
  consentGiven: boolean;
}
