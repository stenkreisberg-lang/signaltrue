import React, { useState, useEffect } from 'react';
import api from '../utils/api';

/**
 * ImmediateInsightsPanel
 *
 * Shows quick stats and insights immediately after an integration connects.
 * Displays during the 30-day calibration period with industry benchmarks.
 */
export default function ImmediateInsightsPanel({ connectedProvider, onClose }) {
  const [insights, setInsights] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);

        // Fetch immediate insights
        const insightsRes = await api.get('/integrations/immediate-insights');
        if (insightsRes.status === 200) {
          setInsights(insightsRes.data);
        }

        // Fetch benchmarks
        const benchmarksRes = await api.get('/integrations/benchmarks');
        if (benchmarksRes.status === 200) {
          setBenchmarks(benchmarksRes.data);
        }
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError('Could not load insights');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [connectedProvider]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner}></div>
          <p style={styles.loadingText}>Analyzing your data...</p>
        </div>
      </div>
    );
  }

  if (error || !insights?.summary?.hasData) {
    return null; // Don't show panel if no data yet
  }

  const { summary, calibrationStatus } = insights;
  const providerInsights =
    insights.insights?.[connectedProvider] ||
    insights.insights?.slack ||
    insights.insights?.google ||
    insights.insights?.microsoft;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>✨</span>
          <h3 style={styles.title}>First Look at Your Data</h3>
        </div>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>
            ×
          </button>
        )}
      </div>

      {calibrationStatus?.inProgress && (
        <div style={styles.calibrationBanner}>
          <span style={styles.calibrationIcon}>📊</span>
          <div>
            <strong>Calibration in Progress</strong>
            <p style={styles.calibrationText}>
              {calibrationStatus.message}
              {calibrationStatus.daysRemaining &&
                ` (${calibrationStatus.daysRemaining} days remaining)`}
            </p>
          </div>
        </div>
      )}

      <div style={styles.statsGrid}>
        {/* Connected Integrations */}
        <div style={styles.statCard}>
          <div style={styles.statValue}>{summary?.integrationsConnected || 0}</div>
          <div style={styles.statLabel}>Integrations Connected</div>
        </div>

        {/* Meetings This Week */}
        {summary?.totalMeetingsThisWeek > 0 && (
          <div style={styles.statCard}>
            <div style={styles.statValue}>{summary.totalMeetingsThisWeek}</div>
            <div style={styles.statLabel}>Meetings This Week</div>
          </div>
        )}

        {/* Active Users (Slack) */}
        {summary?.totalUsers > 0 && (
          <div style={styles.statCard}>
            <div style={styles.statValue}>{summary.totalUsers}</div>
            <div style={styles.statLabel}>Team Members</div>
          </div>
        )}

        {/* Channels (Slack) */}
        {summary?.totalChannels > 0 && (
          <div style={styles.statCard}>
            <div style={styles.statValue}>{summary.totalChannels}</div>
            <div style={styles.statLabel}>Slack Channels</div>
          </div>
        )}
      </div>

      {/* Provider-specific insights */}
      {providerInsights?.message && (
        <div style={styles.insightMessage}>
          <span style={styles.checkIcon}>✓</span>
          {providerInsights.message}
        </div>
      )}

      {/* Industry Benchmark Comparison */}
      {benchmarks?.comparison?.meetingHours && (
        <div style={styles.benchmarkSection}>
          <h4 style={styles.benchmarkTitle}>
            <span style={styles.chartIcon}>📈</span>
            Industry Comparison ({benchmarks.industry})
          </h4>
          <div style={styles.benchmarkRow}>
            <span>Weekly Meeting Hours</span>
            <div style={styles.benchmarkValues}>
              <span style={styles.yourValue}>You: {benchmarks.comparison.meetingHours.yours}h</span>
              <span style={styles.industryValue}>
                Industry: {benchmarks.comparison.meetingHours.industry}h
              </span>
              <span
                style={{
                  ...styles.diffBadge,
                  backgroundColor:
                    benchmarks.comparison.meetingHours.status === 'high'
                      ? '#fef3c7'
                      : benchmarks.comparison.meetingHours.status === 'low'
                        ? '#dbeafe'
                        : '#d1fae5',
                }}
              >
                {benchmarks.comparison.meetingHours.percent > 0 ? '+' : ''}
                {benchmarks.comparison.meetingHours.percent}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* What happens next */}
      <div style={styles.nextSteps}>
        <h4 style={styles.nextStepsTitle}>What's Next?</h4>
        <ul style={styles.stepsList}>
          <li>SignalTrue is now collecting behavioral signals from your connected tools</li>
          <li>Your baseline will be established over the next 30 days</li>
          <li>You'll start seeing drift alerts and recommendations as patterns emerge</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    color: 'white',
    boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    fontSize: '28px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
  },
  closeButton: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calibrationBanner: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '20px',
  },
  calibrationIcon: {
    fontSize: '24px',
  },
  calibrationText: {
    margin: '4px 0 0 0',
    fontSize: '14px',
    opacity: 0.9,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  statCard: {
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '12px',
    padding: '16px',
    textAlign: 'center',
  },
  statValue: {
    fontSize: '32px',
    fontWeight: '700',
    lineHeight: 1,
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '12px',
    opacity: 0.9,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  insightMessage: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  checkIcon: {
    color: '#4ade80',
    fontWeight: 'bold',
  },
  benchmarkSection: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    padding: '16px',
    color: '#1e293b',
    marginBottom: '20px',
  },
  benchmarkTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chartIcon: {
    fontSize: '16px',
  },
  benchmarkRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
  },
  benchmarkValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  yourValue: {
    fontWeight: '600',
    color: '#667eea',
  },
  industryValue: {
    color: '#64748b',
  },
  diffBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
  },
  nextSteps: {
    borderTop: '1px solid rgba(255,255,255,0.2)',
    paddingTop: '16px',
  },
  nextStepsTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: '600',
    opacity: 0.9,
  },
  stepsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    lineHeight: 1.8,
    opacity: 0.9,
  },
  loadingSpinner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '12px',
    fontSize: '14px',
    opacity: 0.9,
  },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);
