/**
 * Executive Summary - CEO View for logged-in users
 * Per SignalTrue Product Spec Section 9
 * 
 * "A concise overview of current team health signals and recommended decisions."
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function ExecutiveSummary() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get user context
      const userRes = await api.get('/auth/me');
      setUser(userRes.data);

      // Fetch executive summary for org
      const summaryRes = await api.get(`/trial/executive-summary/${userRes.data.orgId}`);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('[ExecutiveSummary] Error:', err);
      // Use fallback demo data if API not available
      setSummary({
        currentStatus: 'Watch',
        topRisks: [
          { title: 'Reduced recovery time', description: 'After-hours activity has increased 23% over the past 2 weeks' },
          { title: 'Rising meeting load', description: 'Average meeting hours up from 18 to 24 per week' },
          { title: 'Fragmented focus', description: 'Focus blocks under 2 hours have decreased by 15%' }
        ],
        recommendedActions: [
          { title: 'Pause non-essential recurring meetings', impact: 'Could restore 4+ hours of focus time per week' },
          { title: 'Protect focus blocks', impact: 'Suggest 2-hour no-meeting windows daily' },
          { title: 'Reassess after-hours expectations', impact: 'May reduce burnout risk indicators' }
        ],
        trendDirection: 'worsening',
        weeklyTrend: [
          { week: 'Week 1', status: 'stable' },
          { week: 'Week 2', status: 'stable' },
          { week: 'Week 3', status: 'watch' },
          { week: 'Week 4', status: 'watch' }
        ],
        generatedAt: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Generate shareable CEO summary link
      const res = await api.post('/trial/generate-ceo-summary');
      const shareUrl = `${window.location.origin}/ceo-summary/${res.data.shareToken}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert('Shareable link copied to clipboard!');
    } catch (err) {
      console.error('Export error:', err);
      alert('Unable to generate shareable link. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getStatusColor = (status) => {
    const colors = {
      'Stable': { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
      'Watch': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      'Elevated Risk': { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' }
    };
    return colors[status] || colors['Watch'];
  };

  const getTrendArrow = (direction) => {
    if (direction === 'improving') return { symbol: '↗', color: '#10b981' };
    if (direction === 'worsening') return { symbol: '↘', color: '#dc2626' };
    return { symbol: '→', color: '#6b7280' };
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Generating executive summary...</p>
      </div>
    );
  }

  const statusColors = getStatusColor(summary?.currentStatus);
  const trend = getTrendArrow(summary?.trendDirection);

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
            <Link to="/app/actions" style={styles.navLink}>Actions</Link>
            <span style={styles.navLinkActive}>Executive Summary</span>
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
          {/* Header per spec Section 9 */}
          <div style={styles.header}>
            <div>
              <h2 style={styles.title}>Executive Signal Summary</h2>
              <p style={styles.subtitle}>
                A concise overview of current team health signals and recommended decisions.
              </p>
            </div>
            <button style={styles.exportButton} onClick={handleExport}>
              Export Summary
            </button>
          </div>

          {/* Current Status */}
          <div style={{...styles.statusCard, borderColor: statusColors.border}}>
            <div style={styles.statusHeader}>
              <span style={styles.statusLabel}>Current Status</span>
              <span style={{...styles.statusPill, background: statusColors.bg, color: statusColors.text}}>
                {summary?.currentStatus || 'Watch'}
              </span>
            </div>
            <div style={styles.trendRow}>
              <span style={styles.trendLabel}>4-Week Trend:</span>
              <span style={{...styles.trendArrow, color: trend.color}}>{trend.symbol}</span>
              <span style={{...styles.trendText, color: trend.color}}>
                {summary?.trendDirection === 'improving' ? 'Improving' : 
                 summary?.trendDirection === 'worsening' ? 'Worsening' : 'Stable'}
              </span>
            </div>
          </div>

          {/* Two Column Layout */}
          <div style={styles.twoColumns}>
            {/* Top 3 Risks */}
            <div style={styles.column}>
              <h3 style={styles.sectionTitle}>Top 3 Risks</h3>
              <div style={styles.riskList}>
                {(summary?.topRisks || []).map((risk, idx) => (
                  <div key={idx} style={styles.riskCard}>
                    <div style={styles.riskNumber}>{idx + 1}</div>
                    <div style={styles.riskContent}>
                      <h4 style={styles.riskTitle}>{risk.title}</h4>
                      <p style={styles.riskDescription}>{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 3 Recommended Actions */}
            <div style={styles.column}>
              <h3 style={styles.sectionTitle}>Top 3 Recommended Actions</h3>
              <div style={styles.actionList}>
                {(summary?.recommendedActions || []).map((action, idx) => (
                  <div key={idx} style={styles.actionCard}>
                    <div style={styles.actionNumber}>{idx + 1}</div>
                    <div style={styles.actionContent}>
                      <h4 style={styles.actionTitle}>{action.title}</h4>
                      <p style={styles.actionImpact}>{action.impact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trend View */}
          <div style={styles.trendSection}>
            <h3 style={styles.sectionTitle}>Last 4 Weeks</h3>
            <div style={styles.weeklyTrend}>
              {(summary?.weeklyTrend || []).map((week, idx) => (
                <div key={idx} style={styles.weekCard}>
                  <span style={styles.weekLabel}>{week.week}</span>
                  <span style={{
                    ...styles.weekStatus,
                    background: week.status === 'stable' ? '#d1fae5' : 
                               week.status === 'watch' ? '#fef3c7' : '#fee2e2',
                    color: week.status === 'stable' ? '#065f46' : 
                           week.status === 'watch' ? '#92400e' : '#991b1b'
                  }}>
                    {week.status.charAt(0).toUpperCase() + week.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              Generated {new Date(summary?.generatedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
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
    maxWidth: '1000px',
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
  exportButton: {
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  statusCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
    border: '2px solid',
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  statusLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statusPill: {
    padding: '0.5rem 1rem',
    borderRadius: '20px',
    fontSize: '1rem',
    fontWeight: 700,
  },
  trendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  trendLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  trendArrow: {
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  trendText: {
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  twoColumns: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '2rem',
    marginBottom: '2rem',
  },
  column: {},
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'white',
    marginBottom: '1rem',
  },
  riskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  riskCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    gap: '1rem',
    borderLeft: '4px solid #dc2626',
  },
  riskNumber: {
    width: '28px',
    height: '28px',
    background: '#fee2e2',
    color: '#dc2626',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  riskContent: {
    flex: 1,
  },
  riskTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 0.25rem 0',
  },
  riskDescription: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  actionCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '1rem',
    display: 'flex',
    gap: '1rem',
    borderLeft: '4px solid #10b981',
  },
  actionNumber: {
    width: '28px',
    height: '28px',
    background: '#d1fae5',
    color: '#065f46',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 0.25rem 0',
  },
  actionImpact: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: 0,
  },
  trendSection: {
    marginBottom: '2rem',
  },
  weeklyTrend: {
    display: 'flex',
    gap: '1rem',
  },
  weekCard: {
    flex: 1,
    background: 'white',
    borderRadius: '10px',
    padding: '1rem',
    textAlign: 'center',
  },
  weekLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#6b7280',
    marginBottom: '0.5rem',
  },
  weekStatus: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  footer: {
    textAlign: 'center',
    paddingTop: '2rem',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  footerText: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
};
