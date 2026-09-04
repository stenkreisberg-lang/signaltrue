import { useEffect, useCallback } from 'react';
import { Activity, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuestionnaire } from '../components/FitQuestionnaire/useQuestionnaire';
import QuestionStep from '../components/FitQuestionnaire/QuestionStep';
import ResultsScreen from '../components/FitQuestionnaire/ResultsScreen';
import { QuestionnaireSubmission } from '../components/FitQuestionnaire/types';
import { trackFunnelEvent } from '../lib/analytics';
import PageMeta from '../components/PageMeta';

// API base URL - use proxy in dev, full URL in production
const API_BASE =
  process.env.NODE_ENV === 'production' ? 'https://signaltrue-backend.onrender.com' : '';

const SelfCheck = () => {
  const navigate = useNavigate();

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

  // Auto-start questionnaire on mount and track page view
  useEffect(() => {
    trackFunnelEvent('self_check_viewed', { cta_location: 'self_check' });
    if (!hasStarted) {
      start();
      trackFunnelEvent('self_check_started', { cta_location: 'self_check' });
    }
  }, [hasStarted, start]);

  // Track questionnaire completed
  useEffect(() => {
    if (isComplete && result) {
      trackFunnelEvent('self_check_completed', {
        cta_location: 'self_check',
        score: result.score,
        tier: result.tier,
      });
    }
  }, [isComplete, result]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleSubmitEmail = useCallback(
    async (email: string, consent: boolean) => {
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
      trackFunnelEvent('self_check_lead_confirmed', {
        cta_location: 'self_check',
        score: result.score,
        tier: result.tier,
        consentGiven: consent,
      });
    },
    [result, answers]
  );

  const handleReset = useCallback(() => {
    reset();
    start();
    trackFunnelEvent('self_check_started', { cta_location: 'self_check_reset' });
  }, [reset, start]);

  return (
    <div className="fixed inset-0 z-50 bg-background min-h-screen">
      <PageMeta
        title="Work-pattern self-check | SignalTrue"
        description="Complete a short SignalTrue work-pattern self-check."
        path="/self-check"
      />
      {/* Minimal header - logo and close only, no nav */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center border-b border-border/50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-control bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-body font-display font-semibold text-foreground">SignalTrue</span>
        </Link>
        <button
          onClick={handleClose}
          className="p-2 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Close and return to homepage"
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
              selectedValue={answers.find((a) => a.questionId === currentQuestion.id)?.value}
            />
          ) : result ? (
            <ResultsScreen
              result={result}
              answers={answers}
              onReset={handleReset}
              onSubmitEmail={handleSubmitEmail}
              onClose={handleClose}
            />
          ) : (
            // Loading state while questionnaire initializes
            <div className="text-center">
              <div className="animate-pulse">
                <div className="w-12 h-12 rounded-full bg-primary/20 mx-auto mb-4" />
                <div className="h-6 bg-primary/10 rounded w-48 mx-auto" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelfCheck;
