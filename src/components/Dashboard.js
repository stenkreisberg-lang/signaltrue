import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [integrations, setIntegrations] = useState(null);
  const [showHelp, setShowHelp] = useState(null); // 'slack' | 'calendar' | null

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_BASE}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Session expired');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error('Fetch user error:', err);
        setError(err.message);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  useEffect(() => {
    const loadIntegrationStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/integrations/status`);
        if (res.ok) {
          const data = await res.json();
          setIntegrations(data);
        }
      } catch (e) {
        // ignore silently — onboarding can still render
      }
    };
    loadIntegrationStatus();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const openOrGuide = (provider) => {
    const oauth = integrations?.oauth?.[provider];
    if (oauth) {
      window.location.href = `${API_BASE}${oauth}`;
    } else {
      setShowHelp(provider);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/login')} style={styles.button}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.logo}>SignalTrue</div>
          <div style={styles.navRight}>
            <span style={styles.userName}>{user?.name || user?.email}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.hero}>
          <h1 style={styles.title}>Welcome to SignalTrue</h1>
          <p style={styles.subtitle}>
            Let's get you set up to start tracking team health
          </p>
        </div>

        <div style={styles.cardsGrid}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🔗</div>
            <h3 style={styles.cardTitle}>Connect Slack</h3>
            <p style={styles.cardText}>
              Import your team's communication patterns and sentiment data
            </p>
            <button style={styles.cardButton} onClick={() => openOrGuide('slack')}>
              Connect Workspace
            </button>
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>📅</div>
            <h3 style={styles.cardTitle}>Connect Calendar</h3>
            <p style={styles.cardText}>
              Analyze meeting load and focus time patterns
            </p>
            <button style={styles.cardButton} onClick={() => openOrGuide('calendar')}>
              Connect Google Calendar
            </button>
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>📊</div>
            <h3 style={styles.cardTitle}>View Analytics</h3>
            <p style={styles.cardText}>
              Once connected, see real-time burnout detection and insights
            </p>
            <button style={styles.cardButton} disabled>
              Coming Soon
            </button>
          </div>
        </div>

        <div style={styles.infoBox}>
          <h3>Need help getting started?</h3>
          <p>
            Contact us at <a href="mailto:support@signaltrue.ai" style={styles.link}>support@signaltrue.ai</a>
          </p>
        </div>

        {showHelp && (
          <div style={styles.modalOverlay} onClick={() => setShowHelp(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={{marginTop:0}}>How to connect {showHelp === 'slack' ? 'Slack' : 'Google Calendar'}</h3>
              {showHelp === 'slack' ? (
                <ol style={styles.helpList}>
                  <li>Ask your workspace admin to install the SignalTrue Slack App.</li>
                  <li>Approve read-only scopes to analyze public channel activity and sentiment.</li>
                  <li>After authorization, you'll be redirected back here and your first sync will start.</li>
                </ol>
              ) : (
                <ol style={styles.helpList}>
                  <li>Choose your work account when prompted by Google.</li>
                  <li>Approve read-only calendar access so we can compute meeting and focus-time trends.</li>
                  <li>After authorization, you'll return here and we’ll begin the first analysis.</li>
                </ol>
              )}
              <div style={{display:'flex', gap:12, marginTop:16}}>
                <button style={styles.secondaryBtn} onClick={() => setShowHelp(null)}>Close</button>
                {showHelp === 'slack' && integrations?.oauth?.slack && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('slack')}>Continue to Slack</button>
                )}
                {showHelp === 'calendar' && integrations?.oauth?.calendar && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('calendar')}>Continue to Google</button>
                )}
              </div>
              {!integrations?.oauth?.slack && showHelp === 'slack' && (
                <p style={styles.smallNote}>Admin note: set SLACK_CLIENT_ID/SECRET on the backend to enable one‑click Slack OAuth.</p>
              )}
              {!integrations?.oauth?.calendar && showHelp === 'calendar' && (
                <p style={styles.smallNote}>Admin note: set GOOGLE_CLIENT_ID/SECRET on the backend to enable one‑click Google OAuth.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb',
  },
  nav: {
    background: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '1rem 2rem',
  },
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userName: {
    color: '#6b7280',
    fontWeight: '500',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    background: 'white',
    color: '#6366f1',
    border: '1px solid #6366f1',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  content: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '3rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
    marginBottom: '3rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    border: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  cardIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem',
  },
  cardText: {
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  cardButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  infoBox: {
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '12px',
    padding: '2rem',
    textAlign: 'center',
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'fixed', left: 0, top: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    background: 'white', borderRadius: 12, padding: '1.5rem', width: 'min(520px, 92vw)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  helpList: { color: '#4b5563', lineHeight: 1.6, paddingLeft: '1.2rem' },
  secondaryBtn: { padding: '0.6rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer' },
  primaryBtn: { padding: '0.6rem 1rem', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', cursor: 'pointer' },
  smallNote: { color: '#6b7280', fontSize: 12, marginTop: 12 },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.25rem',
    color: '#6b7280',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '2rem',
    textAlign: 'center',
  },
  button: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
  },
};

export default Dashboard;
