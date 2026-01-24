/**
 * Actions - Suggested Actions page
 * Per SignalTrue Product Spec Section 8
 * 
 * "These actions are derived from observed signal patterns. 
 * They are recommendations, not mandates."
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function Actions() {
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [completedActions, setCompletedActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);

      // Fetch interventions/actions for the team
      const interventionRes = await api.get(`/interventions/team/${userRes.data.teamId}`);
      const allInterventions = interventionRes.data.interventions || [];

      // Separate active from completed
      const active = allInterventions.filter(i => 
        ['suggested', 'active', 'pending-recheck'].includes(i.status)
      );
      const completed = allInterventions.filter(i => 
        ['completed', 'resolved'].includes(i.status)
      );

      setActions(active);
      setCompletedActions(completed);

      // If no interventions, try to get recommended actions from signals
      if (active.length === 0) {
        const signalsRes = await api.get(`/signals/org/${userRes.data.orgId}`, {
          params: { status: 'open,acknowledged', limit: 5 }
        });

        const signalActions = [];
        (signalsRes.data.signals || []).forEach(signal => {
          if (signal.actions) {
            signal.actions.forEach(action => {
              signalActions.push({
                ...action,
                signalType: signal.signalType,
                signalId: signal._id,
                severity: signal.severity,
                status: 'suggested'
              });
            });
          }
        });

        setActions(signalActions.slice(0, 5));
      }

    } catch (err) {
      console.error('[Actions] Error:', err);
      // Use demo data
      setActions([
        {
          _id: '1',
          title: 'Reduce recurring meetings by 15%',
          description: 'Review and consolidate recurring meetings to free up focus time',
          whyThisHelps: 'Creates uninterrupted time and restores cognitive recovery.',
          expectedImpact: 'Focus Time Ratio +8–12% within 2 weeks.',
          suggestedOwner: 'Team Lead',
          status: 'suggested',
          severity: 'RISK'
        },
        {
          _id: '2',
          title: 'Protect 2-hour focus blocks daily',
          description: 'Block calendar time for deep work, disable notifications during focus hours',
          whyThisHelps: 'Reduces context switching and improves task completion rates.',
          expectedImpact: 'Context Switching Index -15% within 3 weeks.',
          suggestedOwner: 'Leadership',
          status: 'suggested',
          severity: 'RISK'
        },
        {
          _id: '3',
          title: 'Review after-hours communication norms',
          description: 'Establish clear expectations about responding outside work hours',
          whyThisHelps: 'Improves recovery time and reduces burnout risk indicators.',
          expectedImpact: 'After-hours activity -20% within 2 weeks.',
          suggestedOwner: 'Leadership',
          status: 'suggested',
          severity: 'INFO'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAction = async (action) => {
    try {
      await api.post('/interventions', {
        signalId: action.signalId,
        actionId: action._id,
        actionTaken: action.title,
        expectedEffect: action.expectedImpact
      });
      
      // Update local state
      setActions(prev => prev.map(a => 
        a._id === action._id ? { ...a, status: 'active' } : a
      ));
    } catch (err) {
      console.error('Error taking action:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusBadge = (status) => {
    const styles = {
      suggested: { bg: '#dbeafe', color: '#1e40af', text: 'Suggested' },
      active: { bg: '#fef3c7', color: '#92400e', text: 'In Progress' },
      'pending-recheck': { bg: '#e0e7ff', color: '#3730a3', text: 'Awaiting Results' },
      completed: { bg: '#d1fae5', color: '#065f46', text: 'Resolved' }
    };
    return styles[status] || styles.suggested;
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading suggested actions...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Nav */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.navLeft}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <h1 style={styles.logo}>SignalTrue</h1>
            </Link>
          </div>
          <div style={styles.navRight}>
            <Link to="/app/overview" style={styles.navLink}>Team Overview</Link>
            <Link to="/app/signals" style={styles.navLink}>Signals</Link>
            <Link to="/app/active-monitoring" style={styles.navLink}>Active Monitoring</Link>
            <span style={styles.navLinkActive}>Actions</span>
            <Link to="/app/executive-summary" style={styles.navLink}>Executive Summary</Link>
            <Link to="/app/privacy" style={styles.navLink}>Signal Coverage</Link>
            {user && (
              <div style={styles.userMenu}>
                <span style={styles.userName}>{user.name || user.email}</span>
                <button style={styles.logoutButton} onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.content}>
          {/* Header per spec Section 8 */}
          <div style={styles.header}>
            <div>
              <h2 style={styles.title}>Suggested Actions</h2>
              <p style={styles.subtitle}>
                These actions are derived from observed signal patterns. They are recommendations, not mandates.
              </p>
            </div>
          </div>

          {/* Actions List */}
          {actions.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>✓</div>
              <h3 style={styles.emptyTitle}>No Actions Required</h3>
              <p style={styles.emptyText}>
                Current signal patterns are within normal ranges. We'll suggest actions when early intervention could help.
              </p>
              <Link to="/app/active-monitoring" style={styles.emptyButton}>
                View Active Monitoring
              </Link>
            </div>
          ) : (
            <div style={styles.actionsList}>
              {actions.map((action, idx) => {
                const badge = getStatusBadge(action.status);
                return (
                  <div key={action._id || idx} style={styles.actionCard}>
                    <div style={styles.actionHeader}>
                      <h3 style={styles.actionTitle}>{action.title}</h3>
                      <span style={{
                        ...styles.statusBadge,
                        background: badge.bg,
                        color: badge.color
                      }}>
                        {badge.text}
                      </span>
                    </div>
                    
                    {action.description && (
                      <p style={styles.actionDescription}>{action.description}</p>
                    )}

                    <div style={styles.actionDetails}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Why this helps:</span>
                        <span style={styles.detailValue}>
                          {action.whyThisHelps || 'Addresses detected pattern deviation'}
                        </span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Expected signal impact:</span>
                        <span style={styles.detailValue}>
                          {action.expectedImpact || 'Improvement within 2 weeks'}
                        </span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Suggested owner:</span>
                        <span style={styles.detailValue}>
                          {action.suggestedOwner || 'Leadership / Team Lead'}
                        </span>
                      </div>
                    </div>

                    {action.status === 'suggested' && (
                      <div style={styles.actionFooter}>
                        <button 
                          style={styles.takeActionButton}
                          onClick={() => handleTakeAction(action)}
                        >
                          Take This Action
                        </button>
                        <button style={styles.dismissButton}>
                          Not Now
                        </button>
                      </div>
                    )}

                    {action.status === 'active' && (
                      <div style={styles.inProgressNote}>
                        <span style={styles.inProgressIcon}>⏳</span>
                        <span>Action in progress. We'll check signal changes in 14 days.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Actions */}
          {completedActions.length > 0 && (
            <div style={styles.completedSection}>
              <h3 style={styles.completedTitle}>Completed Actions</h3>
              <div style={styles.completedList}>
                {completedActions.slice(0, 3).map((action, idx) => (
                  <div key={action._id || idx} style={styles.completedCard}>
                    <span style={styles.completedCheck}>✓</span>
                    <div>
                      <p style={styles.completedAction}>{action.actionTaken || action.title}</p>
                      {action.outcomeDelta && (
                        <p style={styles.completedOutcome}>
                          Result: {action.outcomeDelta.percentChange > 0 ? '+' : ''}
                          {action.outcomeDelta.percentChange}% change
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255,255,255,0.1)',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '1rem',
    color: '#94a3b8',
    fontSize: '1rem',
  },
  nav: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'white',
    margin: 0,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  navLink: {
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  navLinkActive: {
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderBottom: '2px solid #3b82f6',
    paddingBottom: '2px',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginLeft: '1rem',
    paddingLeft: '1rem',
    borderLeft: '1px solid rgba(255,255,255,0.2)',
  },
  userName: {
    color: 'white',
    fontSize: '0.875rem',
  },
  logoutButton: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  main: {
    padding: '3rem 2rem',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'white',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#94a3b8',
    margin: 0,
  },
  emptyState: {
    background: 'white',
    borderRadius: '16px',
    padding: '4rem 2rem',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '4rem',
    color: '#10b981',
    marginBottom: '1rem',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111827',
    marginBottom: '0.5rem',
  },
  emptyText: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '2rem',
    maxWidth: '400px',
    margin: '0 auto 2rem',
  },
  emptyButton: {
    display: 'inline-block',
    background: '#3b82f6',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
  },
  actionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  actionCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    borderLeft: '4px solid #3b82f6',
  },
  actionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  actionTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
    flex: 1,
    paddingRight: '1rem',
  },
  statusBadge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  actionDescription: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1rem',
  },
  actionDetails: {
    background: '#f9fafb',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  detailRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  detailLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
    minWidth: '150px',
  },
  detailValue: {
    fontSize: '0.875rem',
    color: '#6b7280',
    flex: 1,
  },
  actionFooter: {
    display: 'flex',
    gap: '1rem',
  },
  takeActionButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  dismissButton: {
    background: 'transparent',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  inProgressNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    color: '#92400e',
    background: '#fef3c7',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
  },
  inProgressIcon: {
    fontSize: '1rem',
  },
  completedSection: {
    marginTop: '3rem',
  },
  completedTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'white',
    marginBottom: '1rem',
  },
  completedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  completedCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    gap: '1rem',
    alignItems: 'flex-start',
  },
  completedCheck: {
    width: '24px',
    height: '24px',
    background: '#10b981',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  completedAction: {
    fontSize: '0.875rem',
    color: '#e2e8f0',
    margin: '0 0 0.25rem 0',
  },
  completedOutcome: {
    fontSize: '0.75rem',
    color: '#10b981',
    margin: 0,
  },
};
