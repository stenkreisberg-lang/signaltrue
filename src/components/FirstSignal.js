/**
 * First Signal Component
 * "Moment of Unease" — Mandatory first screen after integration connect
 * Cannot be skipped. Forces user to confront drift immediately.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function FirstSignal() {
  const navigate = useNavigate();
  const [signal, setSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFirstSignal();
  }, []);

  const fetchFirstSignal = async () => {
    try {
      const response = await api.get('/first-signal');
      const data = response.data;

      if (data.alreadyShown) {
        // Already shown this signal, redirect to Risk Feed
        navigate('/app/signals');
        return;
      }

      if (!data.signal) {
        // No drift detected, proceed to dashboard
        console.log('[FirstSignal] No drift detected, redirecting to dashboard');
        navigate('/dashboard');
        return;
      }

      setSignal(data.signal);
    } catch (err) {
      console.error('[FirstSignal] Error fetching signal:', err);
      setError('Unable to load signal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action) => {
    try {
      const response = await api.post('/first-signal/acknowledge', { action });
      const data = response.data;

      // Navigate based on user choice
      if (action === 'see-why') {
        navigate('/app/signals');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[FirstSignal] Error acknowledging signal:', err);
      setError('Failed to save your response. Please try again.');
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Analyzing your team's patterns...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.errorTitle}>Unable to Load Signal</h1>
          <p style={styles.errorText}>{error}</p>
          <button
            style={styles.primaryButton}
            onClick={() => navigate('/dashboard')}
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!signal) {
    return null; // Will redirect
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.severityBadge(signal.severity)}>
            {signal.severity}
          </div>
          <h1 style={styles.title}>Something is drifting.</h1>
        </div>

        {/* Main Statement */}
        <div style={styles.statementBox}>
          <p style={styles.statement}>{signal.statement}</p>
        </div>

        {/* Context */}
        <div style={styles.contextBox}>
          <p style={styles.context}>{signal.context}</p>
        </div>

        {/* Metric Details (subtle) */}
        <div style={styles.details}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Baseline:</span>
            <span style={styles.detailValue}>{signal.baseline.toFixed(1)}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Current:</span>
            <span style={styles.detailValue}>{signal.value.toFixed(1)}</span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Change:</span>
            <span style={{...styles.detailValue, color: '#dc2626', fontWeight: 600}}>
              +{signal.delta}%
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div style={styles.actions}>
          <button
            style={styles.primaryButton}
            onClick={() => handleAction('see-why')}
          >
            See why this matters
          </button>
          <button
            style={styles.secondaryButton}
            onClick={() => handleAction('continue-to-dashboard')}
          >
            Continue to dashboard
          </button>
        </div>

        {/* Footer Note */}
        <p style={styles.footerNote}>
          This is an early warning signal. Taking action now prevents larger problems later.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '2rem',
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    padding: '3rem',
    maxWidth: '600px',
    width: '100%',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  loadingCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '3rem',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 1.5rem',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '1rem',
    margin: 0,
  },
  header: {
    marginBottom: '2rem',
  },
  severityBadge: (severity) => ({
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '1rem',
    backgroundColor: severity === 'CRITICAL' ? '#fee2e2' : '#fef3c7',
    color: severity === 'CRITICAL' ? '#991b1b' : '#92400e',
  }),
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    lineHeight: 1.2,
  },
  statementBox: {
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  statement: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    lineHeight: 1.5,
  },
  contextBox: {
    borderLeft: '4px solid #f59e0b',
    paddingLeft: '1rem',
    marginBottom: '2rem',
  },
  context: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0,
    lineHeight: 1.6,
  },
  details: {
    background: '#fafafa',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '2rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  detailLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  detailValue: {
    fontSize: '0.875rem',
    color: '#111827',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  secondaryButton: {
    background: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem 2rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  },
  footerNote: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    textAlign: 'center',
    margin: 0,
    fontStyle: 'italic',
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '1rem',
  },
  errorText: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '2rem',
  },
};

// Add keyframe animation for spinner
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
