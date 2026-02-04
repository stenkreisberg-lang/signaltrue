import { Question, QuestionnaireResult, FitTier } from './types';

// All 10 questions with 3 answer options each
// Scoring: 1 = lower fit, 2 = mid fit, 3 = high fit
export const questions: Question[] = [
  {
    id: 1,
    text: 'How many employees does your company have?',
    options: [
      { label: '5–20', value: '5-20', score: 1 },
      { label: '21–100', value: '21-100', score: 2 },
      { label: '100+', value: '100+', score: 3 },
    ],
  },
  {
    id: 2,
    text: 'How are your teams structured?',
    options: [
      { label: 'Mostly one small team', value: 'one-team', score: 1 },
      { label: 'Several teams with different roles', value: 'several-teams', score: 2 },
      { label: 'Many teams across functions', value: 'many-teams', score: 3 },
    ],
  },
  {
    id: 3,
    text: 'How do most people work?',
    options: [
      { label: 'Mostly onsite', value: 'onsite', score: 1 },
      { label: 'Hybrid', value: 'hybrid', score: 2 },
      { label: 'Mostly remote', value: 'remote', score: 3 },
    ],
  },
  {
    id: 4,
    text: 'Where does daily collaboration mainly happen?',
    options: [
      { label: 'Mostly meetings & email', value: 'meetings-email', score: 1 },
      { label: 'Slack, Google Chat, or Microsoft Teams', value: 'slack-chat', score: 2 },
      { label: 'Mix of async tools + chat platforms', value: 'async-mix', score: 3 },
    ],
  },
  {
    id: 5,
    text: 'How would you describe your current meeting culture?',
    options: [
      { label: 'Generally manageable', value: 'manageable', score: 1 },
      { label: 'Often feels heavy', value: 'heavy', score: 2 },
      { label: 'Clearly too much', value: 'too-much', score: 3 },
    ],
  },
  {
    id: 6,
    text: 'How early can you detect burnout risk today?',
    options: [
      { label: 'Usually too late', value: 'too-late', score: 3 },
      { label: 'Sometimes early', value: 'sometimes-early', score: 2 },
      { label: 'Early and reliably', value: 'early-reliable', score: 1 },
    ],
  },
  {
    id: 7,
    text: 'How often are you surprised by attrition?',
    options: [
      { label: 'Often', value: 'often', score: 3 },
      { label: 'Sometimes', value: 'sometimes', score: 2 },
      { label: 'Rarely', value: 'rarely', score: 1 },
    ],
  },
  {
    id: 8,
    text: 'How confident are you that workload is fairly distributed?',
    options: [
      { label: 'Not very', value: 'not-very', score: 3 },
      { label: 'Somewhat', value: 'somewhat', score: 2 },
      { label: 'Very', value: 'very', score: 1 },
    ],
  },
  {
    id: 9,
    text: 'Is your HR work more reactive or preventive?',
    options: [
      { label: 'Mostly reactive', value: 'reactive', score: 3 },
      { label: 'Balanced', value: 'balanced', score: 2 },
      { label: 'Mostly preventive', value: 'preventive', score: 1 },
    ],
  },
  {
    id: 10,
    text: 'How involved is leadership in people health early?',
    options: [
      { label: 'After problems escalate', value: 'after-escalation', score: 3 },
      { label: 'Occasionally involved', value: 'occasional', score: 2 },
      { label: 'Actively early', value: 'actively-early', score: 1 },
    ],
  },
];

// Calculate result tier based on total score
// Score range: 10-30
// 26-30 = Strong Fit, 18-25 = Good Fit, 10-17 = Not yet a fit
export function calculateResult(totalScore: number): QuestionnaireResult {
  let tier: FitTier;
  let tierLabel: string;
  let tierDescription: string;

  if (totalScore >= 26) {
    tier = 'strong-fit';
    tierLabel = 'Strong Fit';
    tierDescription =
      'SignalTrue is designed exactly for organizations like yours. Your team structure, collaboration patterns, and current visibility gaps make you an ideal candidate for early-warning team health insights.';
  } else if (totalScore >= 18) {
    tier = 'good-fit';
    tierLabel = 'Good Fit';
    tierDescription =
      'SignalTrue can help you catch team health risks before they turn costly. Your organization has the right conditions to benefit from proactive people analytics.';
  } else {
    tier = 'not-yet-fit';
    tierLabel = 'Not Yet a Fit';
    tierDescription =
      'Based on your current setup, SignalTrue may not be the right solution yet. As your organization grows or your tooling evolves, we could be a great partner.';
  }

  return {
    score: totalScore,
    tier,
    tierLabel,
    tierDescription,
  };
}

// Get question text by ID for email summary
export function getQuestionText(questionId: number): string {
  const question = questions.find((q) => q.id === questionId);
  return question?.text || `Question ${questionId}`;
}

// Get answer label by question ID and value
export function getAnswerLabel(questionId: number, value: string): string {
  const question = questions.find((q) => q.id === questionId);
  const option = question?.options.find((o) => o.value === value);
  return option?.label || value;
}
