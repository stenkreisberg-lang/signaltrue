import { useEffect, useCallback } from 'react';
import { Activity, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuestionnaire } from '../components/FitQuestionnaire/useQuestionnaire';
import QuestionStep from '../components/FitQuestionnaire/QuestionStep';
import ResultsScreen from '../components/FitQuestionnaire/ResultsScreen';
import { QuestionnaireSubmission } from '../components/FitQuestionnaire/types';

// API base URL - use proxy in dev, full URL in production
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://signaltrue-backend.onrender.com' 
  : '';

// Analytics tracking function
const trackEvent = (eventName: string, data?: Record<string, unknown>) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SelfCheck Analytics] ${eventName}`, data);
  }
  
  // Track event - can be connected to analytics provider
  // window.analytics?.track(eventName, data);
  
  // Also send to backend for internal tracking
  try {
    fetch(`${API_BASE}/api/fit-questionnaire/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, data, timestamp: new Date().toISOString() }),
    }).catch(() => {}); // Silent fail for tracking
  } catch {
    // Silent fail for tracking
  }
};

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
    trackEvent('self_check_viewed');
    if (!hasStarted) {
      start();
      trackEvent('self_check_started');
    }
  }, []);

  // Track questionnaire completed
  useEffect(() => {
    if (isComplete && result) {
      trackEvent('self_check_completed', {
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
    trackEvent('self_check_email_submitted', {
      score: result.score,
      tier: result.tier,
      consentGiven: consent,
    });
  }, [result, answers]);

  const handleReset = useCallback(() => {
    reset();
    start();
    trackEvent('self_check_started');
  }, [reset, start]);

  return (
    <div className="fixed inset-0 z-50 bg-background min-h-screen">
      {/* Minimal header - logo and close only, no nav */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center border-b border-border/50">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-semibold text-foreground">
            SignalTrue
          </span>
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
