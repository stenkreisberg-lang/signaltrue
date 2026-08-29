import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  clearStoredSession,
  getAuthenticatedContext,
  SESSION_INVALIDATED_EVENT,
} from '../utils/authContext';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const [sessionState, setSessionState] = useState(token ? 'checking' : 'missing');

  useEffect(() => {
    const handleInvalidSession = () => setSessionState('invalid');
    window.addEventListener(SESSION_INVALIDATED_EVENT, handleInvalidSession);
    return () => window.removeEventListener(SESSION_INVALIDATED_EVENT, handleInvalidSession);
  }, []);

  useEffect(() => {
    let active = true;

    if (!token) {
      setSessionState('missing');
      return () => {
        active = false;
      };
    }

    setSessionState('checking');
    getAuthenticatedContext()
      .then(() => {
        if (active) setSessionState('valid');
      })
      .catch(() => {
        clearStoredSession();
        if (active) setSessionState('invalid');
      });

    return () => {
      active = false;
    };
  }, [token]);

  if (sessionState === 'missing' || sessionState === 'invalid') {
    return <Navigate to="/login" replace />;
  }

  if (sessionState === 'checking') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-slate-50 text-caption font-semibold text-slate-600"
        role="status"
        aria-live="polite"
      >
        Checking your session…
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;
