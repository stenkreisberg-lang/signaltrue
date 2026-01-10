import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Manager Effectiveness Dashboard
 * Shows all managers ranked by effectiveness score
 * Identifies managers needing coaching
 */
export default function ManagerEffectivenessDashboard({ orgId }) {
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState([]);
  const [filter, setFilter] = useState('all'); // all, excellent, good, needs-improvement, critical

  useEffect(() => {
    if (!orgId) return;
    fetchManagers();
  }, [orgId]);

  const fetchManagers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/intelligence/managers/${orgId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setManagers(response.data.managers || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching manager effectiveness:', error);
      setLoading(false);
    }
  };

  const filteredManagers = managers.filter(m => {
    if (filter === 'all') return true;
    return m.effectivenessLevel === filter;
  });

  const excellentCount = managers.filter(m => m.effectivenessLevel === 'excellent').length;
  const goodCount = managers.filter(m => m.effectivenessLevel === 'good').length;
  const needsImprovementCount = managers.filter(m => m.effectivenessLevel === 'needs-improvement').length;
  const criticalCount = managers.filter(m => m.effectivenessLevel === 'critical').length;

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p style={styles.loadingText}>Loading manager effectiveness data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Manager Effectiveness Dashboard</h2>
          <p style={styles.subtitle}>
            Behavioral outcomes-based quality scores (no surveys required)
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.stats}>
        <div style={{ ...styles.statCard, ...styles.statExcellent }}>
          <div style={styles.statLabel}>Excellent</div>
          <div style={styles.statValue}>{excellentCount}</div>
          <div style={styles.statSubtext}>80-100 score</div>
        </div>
        <div style={{ ...styles.statCard, ...styles.statGood }}>
          <div style={styles.statLabel}>Good</div>
          <div style={styles.statValue}>{goodCount}</div>
          <div style={styles.statSubtext}>65-79 score</div>
        </div>
        <div style={{ ...styles.statCard, ...styles.statNeeds }}>
          <div style={styles.statLabel}>Needs Improvement</div>
          <div style={styles.statValue}>{needsImprovementCount}</div>
          <div style={styles.statSubtext}>45-64 score</div>
        </div>
        <div style={{ ...styles.statCard, ...styles.statCritical }}>
          <div style={styles.statLabel}>Critical</div>
          <div style={styles.statValue}>{criticalCount}</div>
          <div style={styles.statSubtext}>&lt;45 score</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilter('all')}
          style={filter === 'all' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          All ({managers.length})
        </button>
        <button
          onClick={() => setFilter('excellent')}
          style={filter === 'excellent' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          Excellent ({excellentCount})
        </button>
        <button
          onClick={() => setFilter('good')}
          style={filter === 'good' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          Good ({goodCount})
        </button>
        <button
          onClick={() => setFilter('needs-improvement')}
          style={filter === 'needs-improvement' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          Needs Improvement ({needsImprovementCount})
        </button>
        <button
          onClick={() => setFilter('critical')}
          style={filter === 'critical' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          Critical ({criticalCount})
        </button>
      </div>

      {/* Manager Cards */}
      <div style={styles.managerList}>
        {filteredManagers.length === 0 ? (
          <div style={styles.noData}>
            <p>No managers in this category.</p>
          </div>
        ) : (
          filteredManagers
            .sort((a, b) => b.effectivenessScore - a.effectivenessScore)
            .map(manager => (
              <div key={manager._id} style={styles.managerCard}>
                <div style={styles.managerHeader}>
                  <div style={styles.managerInfo}>
                    <div style={styles.name}>
                      {manager.managerId?.name || 'Unknown Manager'}
                    </div>
                    <div style={styles.team}>
                      {manager.teamId?.name || 'Unknown Team'}
                    </div>
                  </div>
                  <div style={styles.scoreBadge}>
                    <div style={getEffectivenessBadgeStyle(manager.effectivenessLevel)}>
                      {manager.effectivenessLevel}
                    </div>
                    <div style={styles.score}>{manager.effectivenessScore}/100</div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={styles.metricsGrid}>
                  {/* Calendar Metrics */}
                  {manager.calendarMetrics && (
                    <div style={styles.metricSection}>
                      <div style={styles.metricTitle}>📅 Calendar Quality</div>
                      <div style={styles.metricItem}>
                        <span>1:1 Consistency:</span>
                        <span>{manager.calendarMetrics.oneOnOneConsistency}%</span>
                      </div>
                      <div style={styles.metricItem}>
                        <span>Meeting Load:</span>
                        <span>{manager.calendarMetrics.meetingLoadPerTeamMember?.toFixed(1)}h/week</span>
                      </div>
                    </div>
                  )}

                  {/* Slack Metrics */}
                  {manager.slackMetrics && (
                    <div style={styles.metricSection}>
                      <div style={styles.metricTitle}>💬 Communication</div>
                      <div style={styles.metricItem}>
                        <span>Response Time:</span>
                        <span>{manager.slackMetrics.avgResponseTime?.toFixed(1)}h</span>
                      </div>
                      <div style={styles.metricItem}>
                        <span>Recognition Rate:</span>
                        <span>{manager.slackMetrics.recognitionRate || 0}/month</span>
                      </div>
                    </div>
                  )}

                  {/* Team Outcomes */}
                  {manager.teamOutcomes && (
                    <div style={styles.metricSection}>
                      <div style={styles.metricTitle}>📊 Team Outcomes</div>
                      <div style={styles.metricItem}>
                        <span>Team Health Trend:</span>
                        <span style={getTrendStyle(manager.teamOutcomes.teamHealthTrend)}>
                          {manager.teamOutcomes.teamHealthTrend > 0 ? '+' : ''}{manager.teamOutcomes.teamHealthTrend?.toFixed(1)}%
                        </span>
                      </div>
                      <div style={styles.metricItem}>
                        <span>Team Retention:</span>
                        <span>{manager.teamOutcomes.teamRetention?.toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Strengths */}
                {manager.strengths && manager.strengths.length > 0 && (
                  <div style={styles.strengthsSection}>
                    <div style={styles.sectionTitle}>✅ Strengths</div>
                    <div style={styles.tagList}>
                      {manager.strengths.slice(0, 3).map((strength, idx) => (
                        <span key={idx} style={styles.strengthTag}>
                          {strength.area} ({strength.score}/100)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvement Areas */}
                {manager.improvementAreas && manager.improvementAreas.length > 0 && (
                  <div style={styles.improvementSection}>
                    <div style={styles.sectionTitle}>⚠️ Improvement Areas</div>
                    {manager.improvementAreas.slice(0, 3).map((area, idx) => (
                      <div key={idx} style={styles.improvementItem}>
                        <div style={styles.improvementHeader}>
                          <span style={styles.improvementArea}>{area.area}</span>
                          <span style={styles.improvementScore}>{area.score}/100</span>
                        </div>
                        <div style={styles.improvementDesc}>{area.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.actions}>
                  <button style={styles.btnPrimary}>
                    Schedule Coaching Session
                  </button>
                  <button style={styles.btnSecondary}>
                    View Detailed Report
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function getEffectivenessBadgeStyle(level) {
  const base = { ...styles.badge };
  
  if (level === 'excellent') {
    return { ...base, background: '#10b981', color: 'white' };
  } else if (level === 'good') {
    return { ...base, background: '#3b82f6', color: 'white' };
  } else if (level === 'needs-improvement') {
    return { ...base, background: '#f59e0b', color: 'white' };
  } else {
    return { ...base, background: '#dc2626', color: 'white' };
  }
}

function getTrendStyle(trend) {
  if (trend > 0) {
    return { color: '#10b981', fontWeight: '600' };
  } else if (trend < 0) {
    return { color: '#dc2626', fontWeight: '600' };
  }
  return { color: '#94a3b8', fontWeight: '600' };
}

const styles = {
  container: {
    padding: '2rem',
    background: '#0f172a',
    minHeight: '100vh',
    color: '#e2e8f0',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#94a3b8',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: '#1e293b',
    borderRadius: '8px',
    padding: '1.5rem',
    border: '1px solid #334155',
  },
  statExcellent: {
    borderLeft: '4px solid #10b981',
  },
  statGood: {
    borderLeft: '4px solid #3b82f6',
  },
  statNeeds: {
    borderLeft: '4px solid #f59e0b',
  },
  statCritical: {
    borderLeft: '4px solid #dc2626',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  statValue: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: 'white',
    marginBottom: '0.25rem',
  },
  statSubtext: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  filters: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '0.5rem 1rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  filterActive: {
    background: '#3b82f6',
    borderColor: '#3b82f6',
    color: 'white',
  },
  managerList: {
    display: 'grid',
    gap: '1.5rem',
  },
  managerCard: {
    background: '#1e293b',
    borderRadius: '8px',
    padding: '1.5rem',
    border: '1px solid #334155',
  },
  managerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  managerInfo: {
    flex: 1,
  },
  name: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'white',
    marginBottom: '0.25rem',
  },
  team: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  scoreBadge: {
    textAlign: 'right',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: '0.25rem',
  },
  score: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  metricSection: {
    background: '#0f172a',
    borderRadius: '6px',
    padding: '1rem',
  },
  metricTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '0.75rem',
  },
  metricItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
    color: '#e2e8f0',
  },
  strengthsSection: {
    marginBottom: '1rem',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  strengthTag: {
    background: '#065f46',
    padding: '0.25rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    color: '#d1fae5',
  },
  improvementSection: {
    marginBottom: '1rem',
  },
  improvementItem: {
    background: '#0f172a',
    borderRadius: '6px',
    padding: '0.75rem',
    marginBottom: '0.5rem',
  },
  improvementHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.25rem',
  },
  improvementArea: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#f59e0b',
  },
  improvementScore: {
    fontSize: '0.875rem',
    color: '#94a3b8',
  },
  improvementDesc: {
    fontSize: '0.8rem',
    color: '#cbd5e1',
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    padding: '0.5rem 1rem',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  btnSecondary: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    border: '1px solid #334155',
    borderRadius: '6px',
    color: '#e2e8f0',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  loading: {
    padding: '4rem',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: '1rem',
    color: '#64748b',
  },
  noData: {
    padding: '3rem',
    textAlign: 'center',
    color: '#64748b',
  },
};
