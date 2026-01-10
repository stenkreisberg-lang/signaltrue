import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

/**
 * Attrition Risk Dashboard
 * Shows high-risk employees with predicted exit windows
 * Privacy: HR/Admin only - shows names and risk details
 */
export default function AttritionRiskDashboard({ orgId }) {
  const [loading, setLoading] = useState(true);
  const [individuals, setIndividuals] = useState([]);
  const [filter, setFilter] = useState('all'); // all, critical, high, medium

  useEffect(() => {
    if (!orgId) return;
    fetchAttritionRisks();
  }, [orgId]);

  const fetchAttritionRisks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/intelligence/attrition/org/${orgId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIndividuals(response.data.individuals || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching attrition risks:', error);
      setLoading(false);
    }
  };

  const filteredIndividuals = individuals.filter(ind => {
    if (filter === 'all') return true;
    if (filter === 'critical') return ind.riskScore >= 80;
    if (filter === 'high') return ind.riskScore >= 60 && ind.riskScore < 80;
    if (filter === 'medium') return ind.riskScore >= 40 && ind.riskScore < 60;
    return true;
  });

  const criticalCount = individuals.filter(i => i.riskScore >= 80).length;
  const highCount = individuals.filter(i => i.riskScore >= 60 && i.riskScore < 80).length;
  const mediumCount = individuals.filter(i => i.riskScore >= 40 && i.riskScore < 60).length;

  if (loading) {
    return (
      <div style={styles.loading}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p style={styles.loadingText}>Loading attrition risk data...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Attrition Risk Dashboard</h2>
          <p style={styles.subtitle}>
            Predictive flight risk based on behavioral patterns (Slack + Calendar)
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.stats}>
        <div style={{ ...styles.statCard, ...styles.statCritical }}>
          <div style={styles.statLabel}>Critical Risk</div>
          <div style={styles.statValue}>{criticalCount}</div>
          <div style={styles.statSubtext}>≥80% risk score</div>
        </div>
        <div style={{ ...styles.statCard, ...styles.statHigh }}>
          <div style={styles.statLabel}>High Risk</div>
          <div style={styles.statValue}>{highCount}</div>
          <div style={styles.statSubtext}>60-79% risk score</div>
        </div>
        <div style={{ ...styles.statCard, ...styles.statMedium }}>
          <div style={styles.statLabel}>Medium Risk</div>
          <div style={styles.statValue}>{mediumCount}</div>
          <div style={styles.statSubtext}>40-59% risk score</div>
        </div>
        <div style={{ ...styles.statCard, ...styles.statTotal }}>
          <div style={styles.statLabel}>Total Monitored</div>
          <div style={styles.statValue}>{individuals.length}</div>
          <div style={styles.statSubtext}>All risk levels</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilter('all')}
          style={filter === 'all' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          All ({individuals.length})
        </button>
        <button
          onClick={() => setFilter('critical')}
          style={filter === 'critical' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          Critical ({criticalCount})
        </button>
        <button
          onClick={() => setFilter('high')}
          style={filter === 'high' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          High ({highCount})
        </button>
        <button
          onClick={() => setFilter('medium')}
          style={filter === 'medium' ? { ...styles.filterBtn, ...styles.filterActive } : styles.filterBtn}
        >
          Medium ({mediumCount})
        </button>
      </div>

      {/* Individual Risk Cards */}
      <div style={styles.riskList}>
        {filteredIndividuals.length === 0 ? (
          <div style={styles.noData}>
            <p>No individuals in this risk category.</p>
          </div>
        ) : (
          filteredIndividuals
            .sort((a, b) => b.riskScore - a.riskScore)
            .map(individual => (
              <div key={individual._id} style={styles.riskCard}>
                <div style={styles.riskHeader}>
                  <div style={styles.riskInfo}>
                    <div style={styles.name}>
                      {individual.userId?.name || 'Unknown User'}
                    </div>
                    <div style={styles.team}>
                      {individual.teamId?.name || 'Unknown Team'}
                    </div>
                  </div>
                  <div style={styles.riskBadge}>
                    <div style={getRiskBadgeStyle(individual.riskScore)}>
                      {individual.riskLevel}
                    </div>
                    <div style={styles.riskScore}>{individual.riskScore}/100</div>
                  </div>
                </div>

                <div style={styles.riskDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Predicted Exit Window:</span>
                    <span style={styles.detailValue}>{individual.exitWindow}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Confidence:</span>
                    <span style={styles.detailValue}>{individual.confidence}</span>
                  </div>
                </div>

                {/* Behavioral Signals */}
                {individual.behavioralIndicators && individual.behavioralIndicators.length > 0 && (
                  <div style={styles.signals}>
                    <div style={styles.signalsTitle}>Behavioral Signals:</div>
                    {individual.behavioralIndicators.slice(0, 3).map((signal, idx) => (
                      <div key={idx} style={styles.signal}>
                        <span style={styles.signalIcon}>•</span>
                        <span style={styles.signalText}>
                          {signal.signal}: {signal.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={styles.actions}>
                  <button style={styles.btnPrimary}>
                    Schedule Retention Conversation
                  </button>
                  <button style={styles.btnSecondary}>
                    View Full Report
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}

function getRiskBadgeStyle(score) {
  const base = { ...styles.badge };
  
  if (score >= 80) {
    return { ...base, background: '#dc2626', color: 'white' };
  } else if (score >= 60) {
    return { ...base, background: '#ea580c', color: 'white' };
  } else if (score >= 40) {
    return { ...base, background: '#f59e0b', color: 'white' };
  } else {
    return { ...base, background: '#10b981', color: 'white' };
  }
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
  statCritical: {
    borderLeft: '4px solid #dc2626',
  },
  statHigh: {
    borderLeft: '4px solid #ea580c',
  },
  statMedium: {
    borderLeft: '4px solid #f59e0b',
  },
  statTotal: {
    borderLeft: '4px solid #3b82f6',
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
  riskList: {
    display: 'grid',
    gap: '1rem',
  },
  riskCard: {
    background: '#1e293b',
    borderRadius: '8px',
    padding: '1.5rem',
    border: '1px solid #334155',
  },
  riskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  riskInfo: {
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
  riskBadge: {
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
  riskScore: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: 'white',
  },
  riskDetails: {
    background: '#0f172a',
    borderRadius: '6px',
    padding: '1rem',
    marginBottom: '1rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
  detailValue: {
    color: 'white',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  signals: {
    marginBottom: '1rem',
  },
  signalsTitle: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  signal: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: '0.25rem',
  },
  signalIcon: {
    color: '#f59e0b',
    marginRight: '0.5rem',
  },
  signalText: {
    fontSize: '0.875rem',
    color: '#e2e8f0',
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
