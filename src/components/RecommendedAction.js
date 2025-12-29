/**
 * Recommended Action Component
 * Shows actionable intervention for a signal with one-click tracking
 * Implements hybrid: auto-compute outcome after 14 days + require user acknowledgment
 */

import React, { useState } from 'react';
import api from '../utils/api';

export default function RecommendedAction({ signal, onActionTaken }) {
  const [takingAction, setTakingAction] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [showActions, setShowActions] = useState(false);
  const [error, setError] = useState(null);

  // Get actions from signal (assumes signal has actions array from template)
  const actions = signal.actions || [];
  const primaryAction = actions.find(a => !a.isInactionOption) || actions[0];

  const handleTakeAction = async (action) => {
    setTakingAction(true);
    setError(null);

    try {
      const response = await api.post('/interventions', {
        signalId: signal._id || signal.id,
        actionTaken: action.action,
        actionType: action.action, // Use action text as type
        expectedEffect: action.expectedEffect,
        effort: action.effort,
        timeframe: action.timeframe,
        metricBefore: signal.currentValue || signal.value
      });

      const data = response.data;

      // Notify parent component
      if (onActionTaken) {
        onActionTaken(data.intervention);
      }

      setSelectedAction({
        ...action,
        intervention: data.intervention,
        recheckDate: data.recheckDate
      });
    } catch (err) {
      console.error('[RecommendedAction] Error logging intervention:', err);
      setError('Failed to log action. Please try again.');
    } finally {
      setTakingAction(false);
    }
  };

  if (selectedAction) {
    // Action has been taken - show confirmation with recheck info
    const recheckDate = new Date(selectedAction.recheckDate);
    const daysUntilRecheck = Math.ceil((recheckDate - new Date()) / (1000 * 60 * 60 * 24));

    return (
      <div style={styles.container}>
        <div style={styles.completedHeader}>
          <span style={styles.checkmark}>✓</span>
          <h3 style={styles.completedTitle}>Action Logged</h3>
        </div>

        <div style={styles.actionSummary}>
          <p style={styles.actionText}>{selectedAction.action}</p>
          <p style={styles.expectedEffect}>
            <strong>Expected:</strong> {selectedAction.expectedEffect}
          </p>
        </div>

        <div style={styles.recheckBox}>
          <div style={styles.recheckIcon}>📅</div>
          <div>
            <p style={styles.recheckTitle}>We'll check back in {daysUntilRecheck} days</p>
            <p style={styles.recheckDate}>
              {recheckDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
            <p style={styles.recheckSubtext}>
              We'll compute the outcome automatically and ask you to confirm the results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>Recommended Action</h3>
        <span style={styles.badge}>14-day recheck</span>
      </div>

      {/* Primary Action (always shown) */}
      {primaryAction && (
        <div style={styles.actionCard}>
          <div style={styles.actionHeader}>
            <span style={styles.effortBadge(primaryAction.effort)}>
              {primaryAction.effort} effort
            </span>
            <span style={styles.timeframe}>{primaryAction.timeframe}</span>
          </div>

          <p style={styles.actionText}>{primaryAction.action}</p>

          <div style={styles.expectedBox}>
            <strong style={styles.expectedLabel}>Expected impact:</strong>
            <p style={styles.expectedText}>{primaryAction.expectedEffect}</p>
          </div>

          <button
            style={{...styles.primaryButton, opacity: takingAction ? 0.6 : 1}}
            onClick={() => handleTakeAction(primaryAction)}
            disabled={takingAction}
          >
            {takingAction ? 'Logging action...' : 'Take This Action'}
          </button>

          {!showActions && actions.length > 1 && (
            <button
              style={styles.moreButton}
              onClick={() => setShowActions(true)}
            >
              See {actions.length - 1} more option{actions.length > 2 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* All Actions (expandable) */}
      {showActions && (
        <div style={styles.allActions}>
          {actions.filter(a => a !== primaryAction).map((action, idx) => (
            <div key={idx} style={styles.alternativeCard}>
              <div style={styles.alternativeHeader}>
                <span style={styles.effortBadge(action.effort)}>{action.effort}</span>
                <span style={styles.timeframe}>{action.timeframe}</span>
              </div>
              <p style={styles.alternativeText}>{action.action}</p>
              <p style={styles.alternativeEffect}>{action.expectedEffect}</p>
              {action.isInactionOption && action.inactionCost && (
                <p style={styles.inactionWarning}>
                  ⚠️ {action.inactionCost}
                </p>
              )}
              <button
                style={styles.alternativeButton}
                onClick={() => handleTakeAction(action)}
                disabled={takingAction}
              >
                {action.isInactionOption ? 'Do Nothing (Monitor)' : 'Take This Instead'}
              </button>
            </div>
          ))}
          <button
            style={styles.collapseButton}
            onClick={() => setShowActions(false)}
          >
            Collapse options
          </button>
        </div>
      )}

      {error && (
        <div style={styles.error}>{error}</div>
      )}
    </div>
  );
}

const styles = {
  container: {
    background: '#fafafa',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginTop: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  badge: {
    background: '#dbeafe',
    color: '#1e40af',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  actionCard: {
    background: 'white',
    border: '2px solid #3b82f6',
    borderRadius: '10px',
    padding: '1.25rem',
  },
  actionHeader: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  effortBadge: (effort) => ({
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: effort === 'Low' ? '#d1fae5' : effort === 'Medium' ? '#fef3c7' : '#fee2e2',
    color: effort === 'Low' ? '#065f46' : effort === 'Medium' ? '#92400e' : '#991b1b',
  }),
  timeframe: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  actionText: {
    fontSize: '1rem',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  expectedBox: {
    background: '#f0f9ff',
    padding: '0.875rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  expectedLabel: {
    fontSize: '0.875rem',
    color: '#1e40af',
  },
  expectedText: {
    fontSize: '0.875rem',
    color: '#1f2937',
    margin: '0.5rem 0 0 0',
  },
  primaryButton: {
    width: '100%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  moreButton: {
    width: '100%',
    marginTop: '0.75rem',
    background: 'transparent',
    color: '#3b82f6',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.625rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  allActions: {
    marginTop: '1rem',
  },
  alternativeCard: {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '0.75rem',
  },
  alternativeHeader: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  alternativeText: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  alternativeEffect: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.75rem',
  },
  inactionWarning: {
    fontSize: '0.75rem',
    color: '#dc2626',
    background: '#fee2e2',
    padding: '0.5rem',
    borderRadius: '6px',
    marginBottom: '0.75rem',
  },
  alternativeButton: {
    width: '100%',
    background: 'white',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    padding: '0.625rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  collapseButton: {
    width: '100%',
    background: 'transparent',
    color: '#6b7280',
    border: 'none',
    padding: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  completedHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  checkmark: {
    fontSize: '2rem',
    color: '#10b981',
  },
  completedTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  actionSummary: {
    background: 'white',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  recheckBox: {
    background: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '10px',
    padding: '1.25rem',
    display: 'flex',
    gap: '1rem',
  },
  recheckIcon: {
    fontSize: '2rem',
  },
  recheckTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 0.25rem 0',
  },
  recheckDate: {
    fontSize: '0.875rem',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  recheckSubtext: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: 0,
  },
  error: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '0.875rem',
  },
};
