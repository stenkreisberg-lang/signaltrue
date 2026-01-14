import React, { useState, useEffect } from 'react';
import { AssessmentForm } from './AssessmentForm';
import { AssessmentResults } from './AssessmentResults';
import { AssessmentInputs, AssessmentResult, AssessmentSession } from './types';
import { calculateAssessmentResult } from './costCalculator';

// API base URL
const API_BASE = process.env.NODE_ENV === 'production' 
  ? 'https://signaltrue-backend.onrender.com' 
  : '';

// Session storage key
const SESSION_KEY = 'signaltrue_assessment_session';

interface WorkloadAssessmentProps {
  onTrackEvent?: (event: string, data?: Record<string, unknown>) => void;
}

// Generate session ID
const generateSessionId = () => `assessment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Save session to localStorage (for AI Chat context)
const saveSession = (session: AssessmentSession) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    // Also dispatch custom event for ChatWidget to pick up
    window.dispatchEvent(new CustomEvent('assessment-session-update', { detail: session }));
  } catch (e) {
    console.error('Failed to save assessment session:', e);
  }
};

// Get current session
export const getAssessmentSession = (): AssessmentSession | null => {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      // Check if session is still valid (24 hours)
      if (new Date(session.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000) {
        return session;
      }
    }
  } catch (e) {
    console.error('Failed to get assessment session:', e);
  }
  return null;
};

export const WorkloadAssessment: React.FC<WorkloadAssessmentProps> = ({ onTrackEvent }) => {
  const [sessionId] = useState(() => generateSessionId());
  const [inputs, setInputs] = useState<AssessmentInputs | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [wastePercent, setWastePercent] = useState(0.25);

  // Track assessment started on mount
  useEffect(() => {
    onTrackEvent?.('assessment_started', { sessionId });
  }, []);

  const handleFormSubmit = (formInputs: AssessmentInputs) => {
    setInputs(formInputs);
    const calculatedResult = calculateAssessmentResult(formInputs, wastePercent);
    setResult(calculatedResult);

    // Save session for AI Chat
    const session: AssessmentSession = {
      sessionId,
      completed: true,
      result: calculatedResult,
      inputs: formInputs,
      timestamp: new Date(),
    };
    saveSession(session);

    onTrackEvent?.('assessment_completed', {
      sessionId,
      riskLevel: calculatedResult.riskScore.level,
      riskScore: calculatedResult.riskScore.total,
    });

    // Scroll to results
    setTimeout(() => {
      document.getElementById('assessment-results')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleEmailSubmit = async (email: string, consent: boolean) => {
    if (!result || !inputs) return;

    // Send to backend
    const response = await fetch(`${API_BASE}/api/assessment/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        sessionId,
        result,
        inputs,
        consentGiven: consent,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit assessment');
    }

    // Track email submission
    onTrackEvent?.('email_submitted', {
      sessionId,
      riskLevel: result.riskScore.level,
    });
  };

  const handleReset = () => {
    setInputs(null);
    setResult(null);
    
    // Scroll back to form
    setTimeout(() => {
      document.getElementById('assessment-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Form */}
      {!result && (
        <div id="assessment-form">
          <AssessmentForm 
            onSubmit={handleFormSubmit} 
            onTrackEvent={onTrackEvent}
          />
        </div>
      )}

      {/* Results */}
      {result && inputs && (
        <div id="assessment-results">
          <AssessmentResults
            result={result}
            inputs={inputs}
            onSubmitEmail={handleEmailSubmit}
            onReset={handleReset}
            onTrackEvent={onTrackEvent}
          />
        </div>
      )}
    </div>
  );
};

export default WorkloadAssessment;
