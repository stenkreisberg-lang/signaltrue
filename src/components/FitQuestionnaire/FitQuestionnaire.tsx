import { useEffect, useCallback, useState } from 'react';
import { ClipboardCheck, ArrowRight, X } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  
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

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const handleStart = useCallback(() => {
    setIsModalOpen(true);
    start();
  }, [start]);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    reset();
  }, [reset]);

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
    setIsModalOpen(true);
    start();
  }, [reset, start]);

  // Intro section on homepage
  const IntroSection = () => (
    <section id="fit-questionnaire" className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Section header */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
            <ClipboardCheck className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
            Are you seeing people strain early — or only when it's already too late?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            A short self-check for HR leaders who want earlier clarity, without surveys or extra work for teams.
          </p>

          <Button
            variant="hero"
            size="xl"
            onClick={handleStart}
            className="min-w-[280px]"
          >
            Take the 2-minute HR self-check
            <ArrowRight className="w-5 h-5" />
          </Button>

          <p className="mt-4 text-sm text-muted-foreground">
            10 quick questions • Takes about 2 minutes
          </p>
        </div>
      </div>
    </section>
  );

  // Full-screen modal for questionnaire (no distractions)
  const QuestionnaireModal = () => (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Minimal header with close button only */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <div className="text-sm font-medium text-muted-foreground">
          SignalTrue Self-Check
        </div>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main content - centered, focused */}
      <div className="h-full flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-2xl">
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
              onClose={handleClose}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <IntroSection />
      {isModalOpen && <QuestionnaireModal />}
    </>
  );
};

export default FitQuestionnaire;
