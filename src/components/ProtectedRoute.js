import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  clearStoredSession,
  getAuthenticatedContext,
  SESSION_INVALIDATED_EVENT,
} from '../utils/authContext';

function ProtectedRoute({ children, allowedRoles }) {
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
      .then(({ user }) => {
        if (!active) return;
        if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
          setSessionState('forbidden');
          return;
        }
        setSessionState('valid');
      })
      .catch(() => {
        clearStoredSession();
        if (active) setSessionState('invalid');
      });

    return () => {
      active = false;
    };
  }, [token, allowedRoles]);

  if (sessionState === 'missing' || sessionState === 'invalid') {
    return <Navigate to="/login" replace />;
  }

  if (sessionState === 'forbidden') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md rounded-container border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">HR access required</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This SignalTrue workspace is available to authorised HR and organisation administrators.
          </p>
          <a
            className="mt-6 inline-block text-sm font-semibold text-slate-900 underline"
            href="/dashboard"
          >
            Return to dashboard
          </a>
        </div>
      </div>
    );
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
