import { useEffect, useCallback } from 'react';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { useQuestionnaire } from './useQuestionnaire';
import QuestionStep from './QuestionStep';
import ResultsScreen from './ResultsScreen';
import { QuestionnaireSubmission } from './types';

// API base URL - use proxy in dev, full URL in production
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://signaltrue-backend.onrender.com' 
  : '';

interface FitQuestionnaireProps {
  onTrackEvent?: (eventName: string, data?: Record<string, unknown>) => void;
}

const FitQuestionnaire = ({ onTrackEvent }: FitQuestionnaireProps) => {
  const {
    currentStep,
    totalSteps,
    currentQuestion,
    answers,
    result,
    isComplete,
    hasStarted,
    selectAnswer,
    goBack,
    reset,
    start,
  } = useQuestionnaire();

  // Track questionnaire started
  useEffect(() => {
    if (hasStarted && currentStep === 0) {
      onTrackEvent?.('questionnaire_started');
    }
  }, [hasStarted, currentStep, onTrackEvent]);

  // Track questionnaire completed
  useEffect(() => {
    if (isComplete && result) {
      onTrackEvent?.('questionnaire_completed', {
        score: result.score,
        tier: result.tier,
      });
    }
  }, [isComplete, result, onTrackEvent]);

  const handleSubmitEmail = useCallback(async (email: string, consent: boolean) => {
    if (!result) return;

    const submission: QuestionnaireSubmission = {
      email,
      score: result.score,
      tier: result.tier,
      answers,
      consentGiven: consent,
    };

    const response = await fetch(`${API_BASE}/api/fit-questionnaire/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      throw new Error('Failed to submit questionnaire');
    }

    // Track email submission
    onTrackEvent?.('questionnaire_email_submitted', {
      score: result.score,
      tier: result.tier,
      consentGiven: consent,
    });
  }, [result, answers, onTrackEvent]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // Initial state - show intro
  if (!hasStarted) {
    return (
      <section id="fit-questionnaire" className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            {/* Section header */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <ClipboardCheck className="w-8 h-8 text-primary" />
            </div>

            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Wondering how well SignalTrue fits your organization?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Take this 2-minute assessment to see if SignalTrue is the right fit. 
              No email needed until you see your results.
            </p>

            <Button
              variant="hero"
              size="xl"
              onClick={start}
              className="min-w-[200px]"
            >
              Start Assessment
              <ArrowRight className="w-5 h-5" />
            </Button>

            <p className="mt-4 text-sm text-muted-foreground">
              10 quick questions • Takes about 2 minutes
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="fit-questionnaire" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section header - compact during questions */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">
            Fit Assessment
          </p>
          <h2 className="text-2xl font-display font-bold">
            {isComplete ? 'Your Results' : 'Is SignalTrue right for you?'}
          </h2>
        </div>

        {/* Question or Results */}
        {!isComplete && currentQuestion ? (
          <QuestionStep
            question={currentQuestion}
            currentStep={currentStep}
            totalSteps={totalSteps}
            onSelect={selectAnswer}
            onBack={goBack}
            selectedValue={answers.find(a => a.questionId === currentQuestion.id)?.value}
          />
        ) : result ? (
          <ResultsScreen
            result={result}
            answers={answers}
            onReset={handleReset}
            onSubmitEmail={handleSubmitEmail}
          />
        ) : null}
      </div>
    </section>
  );
};

export default FitQuestionnaire;
