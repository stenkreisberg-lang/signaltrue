import { useState, useCallback } from 'react';
import { QuestionnaireAnswer, QuestionnaireResult } from './types';
import { questions, calculateResult } from './questionnaireData';

interface UseQuestionnaireReturn {
  currentStep: number;
  totalSteps: number;
  currentQuestion: typeof questions[0] | null;
  answers: QuestionnaireAnswer[];
  result: QuestionnaireResult | null;
  isComplete: boolean;
  hasStarted: boolean;
  selectAnswer: (value: string, score: number) => void;
  goBack: () => void;
  reset: () => void;
  start: () => void;
  progress: number;
}

export function useQuestionnaire(): UseQuestionnaireReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswer[]>([]);
  const [result, setResult] = useState<QuestionnaireResult | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const totalSteps = questions.length;
  const isComplete = currentStep >= totalSteps;
  const currentQuestion = !isComplete ? questions[currentStep] : null;
  const progress = Math.round((currentStep / totalSteps) * 100);

  const start = useCallback(() => {
    setHasStarted(true);
  }, []);

  const selectAnswer = useCallback((value: string, score: number) => {
    if (!currentQuestion) return;

    // Mark as started on first answer
    if (!hasStarted) {
      setHasStarted(true);
    }

    const newAnswer: QuestionnaireAnswer = {
      questionId: currentQuestion.id,
      value,
      score,
    };

    // Update or add answer
    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === currentQuestion.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });

    // Move to next question or calculate result
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Calculate final result
      const totalScore = [...answers, newAnswer].reduce((sum, a) => sum + a.score, 0);
      setResult(calculateResult(totalScore));
      setCurrentStep(totalSteps);
    }
  }, [currentQuestion, currentStep, totalSteps, answers, hasStarted]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      // Clear result if going back from completion
      if (isComplete) {
        setResult(null);
      }
    }
  }, [currentStep, isComplete]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setAnswers([]);
    setResult(null);
    setHasStarted(false);
  }, []);

  return {
    currentStep,
    totalSteps,
    currentQuestion,
    answers,
    result,
    isComplete,
    hasStarted,
    start,
    selectAnswer,
    goBack,
    reset,
    progress,
  };
}
