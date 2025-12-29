/**
 * Risk Feed - New Default Landing Page
 * Replaces dashboard-first approach with signal-first approach
 * Shows "Current Signals" ordered by severity → velocity → time unresolved
 * Max 5 signals visible at once
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RecommendedAction from '../../components/RecommendedAction';
import api from '../../utils/api';

export default function RiskFeed() {
  const navigate = useNavigate();
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [interventions, setInterventions] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Fetch user context
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);

      // Fetch current signals for user's team/org
      const signalsRes = await api.get(`/signals/org/${userRes.data.orgId}`, {
        params: {
          status: 'open,acknowledged',
          limit: 10 // Fetch more than 5 for sorting
        }
      });

      const rawSignals = signalsRes.data.signals || [];

      // Sort by: 1) Severity (CRITICAL > RISK > INFO), 2) Velocity (trend), 3) Time unresolved
      const sorted = rawSignals.sort((a, b) => {
        // Severity priority
        const severityOrder = { CRITICAL: 3, RISK: 2, INFO: 1 };
        const severityDiff = (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        if (severityDiff !== 0) return severityDiff;

        // Velocity (trend speed) - higher velocity = more urgent
        const velocityDiff = (b.trendVelocity || 0) - (a.trendVelocity || 0);
        if (velocityDiff !== 0) return velocityDiff;

        // Time unresolved (older = more urgent)
        const timeA = new Date(a.detectedAt || a.createdAt);
        const timeB = new Date(b.detectedAt || b.createdAt);
        return timeA - timeB;
      });

      // Take top 5
      const top5 = sorted.slice(0, 5);
      setSignals(top5);

      // Fetch interventions for these signals
      if (top5.length > 0) {
        const interventionRes = await api.get(`/interventions/team/${userRes.data.teamId}`, {
          params: { status: 'active,pending-recheck' }
        });
        
        const interventionMap = {};
        (interventionRes.data.interventions || []).forEach(int => {
          interventionMap[int.signalId] = int;
        });
        setInterventions(interventionMap);
      }

    } catch (err) {
      console.error('[RiskFeed] Error loading data:', err);
      setError(err.message || 'Failed to load signals');
    } finally {
      setLoading(false);
    }
  };

  const handleActionTaken = (intervention) => {
    // Update interventions state
    setInterventions(prev => ({
      ...prev,
      [intervention.signalId]: intervention
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading current signals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorCard}>
          <h2 style={styles.errorTitle}>Unable to Load Signals</h2>
          <p style={styles.errorText}>{error}</p>
          <button style={styles.retryButton} onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Nav */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.navLeft}>
            <h1 style={styles.logo}>SignalTrue</h1>
            <span style={styles.navDivider}>|</span>
            <span style={styles.navTitle}>Current Signals</span>
          </div>
          <div style={styles.navRight}>
            <Link to="/dashboard" style={styles.navLink}>
              Dashboard
            </Link>
            <Link to="/app/overview" style={styles.navLink}>
              Overview
            </Link>
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
          {/* Header */}
          <div style={styles.header}>
            <div>
              <h2 style={styles.title}>Current Signals</h2>
              <p style={styles.subtitle}>
                Early-warning signals ordered by severity and urgency. Maximum 5 shown at once.
              </p>
            </div>
            {signals.length > 0 && (
              <Link to="/app/signals" style={styles.viewAllLink}>
                View All Signals →
              </Link>
            )}
          </div>

          {/* Signals List */}
          {signals.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>✓</div>
              <h3 style={styles.emptyTitle}>No Active Signals</h3>
              <p style={styles.emptyText}>
                Your team's patterns are within normal baseline ranges. We'll alert you if drift is detected.
              </p>
              <Link to="/dashboard" style={styles.emptyButton}>
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div style={styles.signalsList}>
              {signals.map((signal, idx) => (
                <SignalCard
                  key={signal._id || signal.id || idx}
                  signal={signal}
                  intervention={interventions[signal._id || signal.id]}
                  onActionTaken={handleActionTaken}
                  rank={idx + 1}
                />
              ))}
            </div>
          )}

          {/* Footer Note */}
          {signals.length > 0 && (
            <div style={styles.footerNote}>
              <p style={styles.footerText}>
                Signals are updated every 24 hours based on team activity patterns. 
                Taking action early prevents larger problems later.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/**
 * Signal Card Component (inline for Risk Feed)
 * Shows: name, drift indicator, time detected, action status, interpretation, recommended action
 */
function SignalCard({ signal, intervention, onActionTaken, rank }) {
  const [expanded, setExpanded] = useState(rank === 1); // Auto-expand top signal

  const driftIndicator = signal.trendDirection || (signal.delta > 0 ? '↑' : signal.delta < 0 ? '↓' : '→');
  const timeSinceDetection = getTimeSince(signal.detectedAt || signal.createdAt);

  // Map old signal types to new risk signal names
  const signalTypeDisplay = getSignalTypeDisplay(signal.signalType);

  return (
    <div style={{...styles.signalCard, borderColor: getSeverityColor(signal.severity)}}>
      {/* Card Header */}
      <div style={styles.cardHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.cardLeft}>
          <span style={styles.rankBadge}>#{rank}</span>
          <div>
            <h3 style={styles.signalName}>{signalTypeDisplay}</h3>
            <div style={styles.signalMeta}>
              <span style={styles.driftIndicator(driftIndicator)}>{driftIndicator}</span>
              <span style={styles.metaText}>Detected {timeSinceDetection} ago</span>
              {intervention && (
                <span style={styles.actionStatus(intervention.status)}>
                  {getActionStatusText(intervention.status)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={styles.cardRight}>
          <span style={styles.severityBadge(signal.severity)}>
            {signal.severity}
          </span>
          <button style={styles.expandButton}>
            {expanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div style={styles.cardBody}>
          {/* Interpretation Framework */}
          {signal.interpretation && (
            <div style={styles.interpretation}>
              <div style={styles.interpretBox}>
                <h4 style={styles.interpretLabel}>What is changing</h4>
                <p style={styles.interpretText}>
                  {signal.interpretation.whatIsChanging || signal.description || 'Pattern deviation detected'}
                </p>
              </div>
              <div style={styles.interpretBox}>
                <h4 style={styles.interpretLabel}>Why it matters</h4>
                <p style={styles.interpretText}>
                  {signal.interpretation.whyItMatters || signal.consequence || 'May impact team performance'}
                </p>
              </div>
              <div style={styles.interpretBox}>
                <h4 style={styles.interpretLabel}>What breaks if ignored</h4>
                <p style={styles.interpretText}>
                  {signal.interpretation.whatBreaksIfIgnored || 'Risk compounds over time'}
                </p>
              </div>
            </div>
          )}

          {/* Metric Details */}
          {signal.currentValue !== undefined && (
            <div style={styles.metricsBox}>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Baseline:</span>
                <span style={styles.metricValue}>{signal.baselineValue?.toFixed(1) || 'N/A'}</span>
              </div>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Current:</span>
                <span style={styles.metricValue}>{signal.currentValue.toFixed(1)}</span>
              </div>
              <div style={styles.metricRow}>
                <span style={styles.metricLabel}>Change:</span>
                <span style={{...styles.metricValue, color: '#dc2626', fontWeight: 600}}>
                  {signal.delta > 0 ? '+' : ''}{signal.delta?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          )}

          {/* Recommended Action (only if no intervention taken yet) */}
          {!intervention && signal.actions && (
            <RecommendedAction
              signal={signal}
              onActionTaken={onActionTaken}
            />
          )}

          {/* Intervention Status (if action already taken) */}
          {intervention && (
            <div style={styles.interventionBox}>
              <h4 style={styles.interventionTitle}>Action Taken</h4>
              <p style={styles.interventionAction}>{intervention.actionTaken}</p>
              <p style={styles.interventionEffect}>
                <strong>Expected:</strong> {intervention.expectedEffect}
              </p>
              {intervention.status === 'pending-recheck' && intervention.outcomeDelta && (
                <div style={styles.outcomeBox}>
                  <h5 style={styles.outcomeTitle}>Outcome (14 days later)</h5>
                  <div style={styles.outcomeRow}>
                    <span>Before:</span>
                    <span>{intervention.outcomeDelta.metricBefore.toFixed(1)}</span>
                  </div>
                  <div style={styles.outcomeRow}>
                    <span>After:</span>
                    <span>{intervention.outcomeDelta.metricAfter.toFixed(1)}</span>
                  </div>
                  <div style={styles.outcomeRow}>
                    <span>Change:</span>
                    <span style={{ fontWeight: 600, color: intervention.outcomeDelta.improved ? '#10b981' : '#dc2626' }}>
                      {intervention.outcomeDelta.percentChange > 0 ? '+' : ''}{intervention.outcomeDelta.percentChange}%
                      {intervention.outcomeDelta.improved ? ' ✓' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper functions
function getTimeSince(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  return 'just now';
}

function getSeverityColor(severity) {
  const colors = {
    CRITICAL: '#dc2626',
    RISK: '#f59e0b',
    INFO: '#3b82f6'
  };
  return colors[severity] || '#6b7280';
}

function getSignalTypeDisplay(signalType) {
  const mapping = {
    'coordination-risk': 'Coordination Risk',
    'boundary-erosion': 'Boundary Erosion',
    'execution-drag': 'Execution Drag',
    'focus-erosion': 'Focus Erosion',
    'morale-volatility': 'Morale Volatility',
    'dependency-spread': 'Dependency Spread',
    'recovery-deficit': 'Recovery Deficit',
    'handoff-bottleneck': 'Handoff Bottleneck',
    // Legacy compatibility
    'meeting-load-spike': 'Coordination Risk',
    'after-hours-creep': 'Boundary Erosion',
    'response-delay-increase': 'Execution Drag',
    'sentiment-decline': 'Morale Volatility'
  };
  return mapping[signalType] || signalType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getActionStatusText(status) {
  const mapping = {
    'active': 'Action in progress',
    'pending-recheck': 'Ready for recheck',
    'completed': 'Completed',
    'abandoned': 'Abandoned'
  };
  return mapping[status] || status;
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
  errorCard: {
    margin: '2rem auto',
    maxWidth: '500px',
    background: 'white',
    padding: '2rem',
    borderRadius: '12px',
    textAlign: 'center',
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
    marginBottom: '1.5rem',
  },
  retryButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
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
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'white',
    margin: 0,
  },
  navDivider: {
    color: 'rgba(255,255,255,0.3)',
  },
  navTitle: {
    color: '#94a3b8',
    fontSize: '1rem',
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
    transition: 'color 0.2s',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
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
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  viewAllLink: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontSize: '1rem',
    fontWeight: 600,
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
  signalsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  signalCard: {
    background: 'white',
    borderRadius: '12px',
    border: '2px solid',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    cursor: 'pointer',
  },
  cardLeft: {
    display: 'flex',
    gap: '1rem',
    flex: 1,
  },
  rankBadge: {
    background: '#f3f4f6',
    color: '#6b7280',
    padding: '0.25rem 0.625rem',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 700,
  },
  signalName: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 0.5rem 0',
  },
  signalMeta: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  driftIndicator: (direction) => ({
    fontSize: '1.5rem',
    color: direction === '↑' ? '#dc2626' : direction === '↓' ? '#10b981' : '#6b7280',
  }),
  metaText: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  actionStatus: (status) => ({
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.25rem 0.625rem',
    borderRadius: '12px',
    background: status === 'completed' ? '#d1fae5' : status === 'pending-recheck' ? '#fef3c7' : '#dbeafe',
    color: status === 'completed' ? '#065f46' : status === 'pending-recheck' ? '#92400e' : '#1e40af',
  }),
  cardRight: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  severityBadge: (severity) => ({
    padding: '0.25rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    background: severity === 'CRITICAL' ? '#fee2e2' : severity === 'RISK' ? '#fef3c7' : '#dbeafe',
    color: severity === 'CRITICAL' ? '#991b1b' : severity === 'RISK' ? '#92400e' : '#1e40af',
  }),
  expandButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: '#6b7280',
    cursor: 'pointer',
    width: '32px',
    height: '32px',
  },
  cardBody: {
    padding: '0 1.5rem 1.5rem',
    borderTop: '1px solid #e5e7eb',
    paddingTop: '1.5rem',
  },
  interpretation: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  interpretBox: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
  },
  interpretLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: '0 0 0.5rem 0',
  },
  interpretText: {
    fontSize: '0.875rem',
    color: '#1f2937',
    margin: 0,
    lineHeight: 1.5,
  },
  metricsBox: {
    background: '#fafafa',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  metricRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  metricLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  metricValue: {
    fontSize: '0.875rem',
    color: '#111827',
    fontWeight: 500,
  },
  interventionBox: {
    background: '#eff6ff',
    border: '1px solid #dbeafe',
    borderRadius: '10px',
    padding: '1.25rem',
  },
  interventionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e40af',
    margin: '0 0 0.75rem 0',
  },
  interventionAction: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  interventionEffect: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '1rem',
  },
  outcomeBox: {
    background: 'white',
    padding: '1rem',
    borderRadius: '8px',
  },
  outcomeTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 0.75rem 0',
  },
  outcomeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
  },
  footerNote: {
    marginTop: '3rem',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
};
