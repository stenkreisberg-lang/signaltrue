import React, { useState, useEffect } from 'react';
import DriftAlerts from './DriftAlerts';
import PlaybookRecommendations from './PlaybookRecommendations';
import OneOnOneTimeline from './OneOnOneTimeline';
import BenchmarkComparison from './BenchmarkComparison';
import AdminExportPanel from './AdminExportPanel';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [integrations, setIntegrations] = useState(null);
  const [showHelp, setShowHelp] = useState(null); // 'slack' | 'calendar' | 'outlook' | 'teams' | null
  const [toast, setToast] = useState(null);
  const [confirmProvider, setConfirmProvider] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await api.get('/auth/me');

        if (response.status !== 200) {
          throw new Error('Session expired');
        }

        const data = response.data;
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
        // Use user's orgId for integrations status
        const userStr = localStorage.getItem('user');
        const userData = userStr ? JSON.parse(userStr) : null;
        const query = userData?.orgId ? `?orgId=${userData.orgId}` : '';
        const res = await api.get('/integrations/status' + query);
        if (res.status === 200) {
          const data = res.data;
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
      window.location.href = `${api.defaults.baseURL}${oauth}`;
    } else {
      setShowHelp(provider);
    }
  };

  const disconnect = async (provider) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.post(`/integrations/${provider}/disconnect`);
      if (res.status !== 200) throw new Error('Could not disconnect');
      // Refresh status
      const meRes = await api.get('/auth/me');
      let orgId = null;
      if (meRes.status === 200) {
        const me = meRes.data;
        orgId = me?.orgId || null;
      }
      const query = orgId ? `?orgId=${encodeURIComponent(orgId)}` : '';
      const st = await api.get(`/integrations/status${query}`);
      if (st.status === 200) {
        setIntegrations(st.data);
        setToast({ type: 'success', message: `${provider[0].toUpperCase()+provider.slice(1)} disconnected.` });
        setTimeout(() => setToast(null), 2500);
      }
    } catch (e) {
      console.error(e);
      setToast({ type: 'error', message: 'Failed to disconnect. Please try again.' });
      setTimeout(() => setToast(null), 3000);
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

  // Determine teamId for DriftAlerts (if user is in a team)
  const teamId = user?.teamId || user?.team?.id || null;

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <div style={styles.logo}>SignalTrue</div>
            </Link>
          </div>
          <div style={styles.navRight}>
            <span style={styles.userName}>{user?.name || user?.email}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={styles.content}>
        {/* Engagement Change Alerts (Drift Explainability) */}
        {teamId && (
          <>
            <DriftAlerts teamId={teamId} />
            <PlaybookRecommendations teamId={teamId} />
            <OneOnOneTimeline teamId={teamId} userId={user?._id} />
            <BenchmarkComparison teamId={teamId} orgId={user?.orgId} />
          </>
        )}

        {/* Admin/HR Controls & Data Export */}
        {['admin','hr_admin','master_admin'].includes(user?.role) && (
          <AdminExportPanel />
        )}
        {/* Admin onboarding shortcut */}
        {['admin','hr_admin','master_admin'].includes(user?.role) && (
          <div style={{
            background:'#EEF2FF', border:'1px solid #C7D2FE', borderRadius:12, padding:'1rem 1.25rem',
            display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem'
          }}>
            <div style={{color:'#4338CA', fontWeight:600}}>New: Guided Admin Onboarding</div>
            <Link to="/admin/onboarding" style={{
              background:'linear-gradient(135deg, #6366f1, #8b5cf6)', color:'white', textDecoration:'none',
              borderRadius:8, padding:'0.5rem 0.75rem', fontWeight:700
            }}>Open</Link>
          </div>
        )}
        <div style={styles.hero}>
          <h1 style={styles.title}>Welcome to SignalTrue</h1>
          <p style={styles.subtitle}>
            Let's get you set up to start tracking team health
          </p>
        </div>

        <div style={styles.cardsGrid}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🔗</div>
            <h3 style={styles.cardTitle}>Connect Slack {integrations?.connected?.slack && <span style={styles.badgeConnected}>Connected</span>}</h3>
            {integrations?.connected?.slack && integrations?.details?.slack && (
              <p style={styles.detailLine}>Workspace: {integrations.details.slack.teamName || 'Unknown'} ({integrations.details.slack.teamId || '—'})</p>
            )}
            <p style={styles.cardText}>
              Import your team's communication patterns and sentiment data
            </p>
            <button style={styles.cardButton} onClick={() => openOrGuide('slack')} disabled={integrations?.connected?.slack}>
              Connect Workspace
            </button>
            {integrations?.connected?.slack && (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('slack')}>Disconnect</button>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>📅</div>
            <h3 style={styles.cardTitle}>Connect Calendar {integrations?.connected?.calendar && <span style={styles.badgeConnected}>Connected</span>}</h3>
            {integrations?.connected?.calendar && <p style={styles.detailLine}>Provider: Google (Calendar)</p>}
            <p style={styles.cardText}>
              Analyze meeting load and focus time patterns
            </p>
            <button style={styles.cardButton} onClick={() => openOrGuide('calendar')} disabled={integrations?.connected?.calendar}>
              Connect Google Calendar
            </button>
            {integrations?.connected?.calendar && (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('google')}>Disconnect</button>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>📧</div>
            <h3 style={styles.cardTitle}>Connect Outlook {integrations?.connected?.outlook && <span style={styles.badgeConnected}>Connected</span>}</h3>
            {integrations?.connected?.outlook && <p style={styles.detailLine}>Provider: Microsoft (Outlook)</p>}
            <p style={styles.cardText}>
              Analyze Outlook/Exchange calendar and email metadata for trends
            </p>
            <button style={styles.cardButton} onClick={() => openOrGuide('outlook')} disabled={integrations?.connected?.outlook}>
              Connect Outlook Account
            </button>
            {integrations?.connected?.outlook && (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('microsoft')}>Disconnect</button>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>💼</div>
            <h3 style={styles.cardTitle}>Connect Microsoft Teams {integrations?.connected?.teams && <span style={styles.badgeConnected}>Connected</span>}</h3>
            {integrations?.connected?.teams && <p style={styles.detailLine}>Provider: Microsoft (Teams)</p>}
            <p style={styles.cardText}>
              Import Teams collaboration patterns to enrich communication insights
            </p>
            <button style={styles.cardButton} onClick={() => openOrGuide('teams')} disabled={integrations?.connected?.teams}>
              Connect Teams Workspace
            </button>
            {integrations?.connected?.teams && (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('microsoft')}>Disconnect</button>
            )}
          </div>

          <div style={styles.card}>
            <div style={styles.cardIcon}>📊</div>
            <h3 style={styles.cardTitle}>View Analytics</h3>
            <p style={styles.cardText}>
              Once connected, see real-time burnout detection and insights
            </p>
            <button style={styles.cardButton} onClick={() => navigate('/team-analytics')}>
              Open Analytics Dashboard
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
              <h3 style={{marginTop:0}}>
                {showHelp === 'slack' && 'How to connect Slack'}
                {showHelp === 'calendar' && 'How to connect Google Calendar'}
                {showHelp === 'outlook' && 'How to connect Outlook'}
                {showHelp === 'teams' && 'How to connect Microsoft Teams'}
              </h3>
              {showHelp === 'slack' && (
                <ol style={styles.helpList}>
                  <li>Ask your workspace admin to install the SignalTrue Slack App.</li>
                  <li>Approve read-only scopes to analyze public channel activity and sentiment.</li>
                  <li>After authorization, you'll be redirected back here and your first sync will start.</li>
                </ol>
              )}
              {showHelp === 'calendar' && (
                <ol style={styles.helpList}>
                  <li>Choose your work account when prompted by Google.</li>
                  <li>Approve read-only calendar access so we can compute meeting and focus-time trends.</li>
                  <li>After authorization, you'll return here and we’ll begin the first analysis.</li>
                </ol>
              )}
              {showHelp === 'outlook' && (
                <ol style={styles.helpList}>
                  <li>Sign in with your Microsoft 365 work account.</li>
                  <li>Approve read-only Outlook and Calendar permissions.</li>
                  <li>After authorization, you’ll return here and your first sync will start.</li>
                </ol>
              )}
              {showHelp === 'teams' && (
                <ol style={styles.helpList}>
                  <li>Ask your tenant admin to approve the SignalTrue Teams app if required.</li>
                  <li>Approve read-only permissions to analyze channel participation and activity.</li>
                  <li>After authorization, you’ll return here and your first sync will start.</li>
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
                {showHelp === 'outlook' && integrations?.oauth?.outlook && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('outlook')}>Continue to Microsoft</button>
                )}
                {showHelp === 'teams' && integrations?.oauth?.teams && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('teams')}>Continue to Microsoft</button>
                )}
              </div>
              {!integrations?.oauth?.slack && showHelp === 'slack' && (
                <p style={styles.smallNote}>Admin note: set SLACK_CLIENT_ID/SECRET on the backend to enable one‑click Slack OAuth.</p>
              )}
              {!integrations?.oauth?.calendar && showHelp === 'calendar' && (
                <p style={styles.smallNote}>Admin note: set GOOGLE_CLIENT_ID/SECRET on the backend to enable one‑click Google OAuth.</p>
              )}
              {!integrations?.oauth?.outlook && showHelp === 'outlook' && (
                <p style={styles.smallNote}>Admin note: set MS_APP_CLIENT_ID/SECRET on the backend to enable one‑click Microsoft OAuth.</p>
              )}
              {!integrations?.oauth?.teams && showHelp === 'teams' && (
                <p style={styles.smallNote}>Admin note: set MS_APP_CLIENT_ID/SECRET on the backend to enable one‑click Microsoft OAuth.</p>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div style={{ position: 'fixed', right: 16, bottom: 16, background: toast.type==='error'?'#FEE2E2':'#ECFDF5', color: toast.type==='error'?'#991B1B':'#065F46', border: '1px solid', borderColor: toast.type==='error'?'#FCA5A5':'#6EE7B7', padding: '0.75rem 1rem', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)' }}>
            {toast.message}
          </div>
        )}

        {confirmProvider && (
          <div style={styles.modalOverlay} onClick={() => setConfirmProvider(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={{marginTop:0}}>Disconnect integration</h3>
              <p style={{ color: '#6b7280' }}>Are you sure you want to disconnect {confirmProvider === 'google' ? 'Google' : confirmProvider === 'microsoft' ? 'Microsoft' : 'Slack'}? You can reconnect anytime.</p>
              <div style={{display:'flex', gap:12, marginTop:16, justifyContent:'flex-end'}}>
                <button style={styles.secondaryBtn} onClick={() => setConfirmProvider(null)}>Cancel</button>
                <button style={{...styles.primaryBtn, background:'linear-gradient(135deg, #ef4444, #f97316)'}} onClick={() => { const p = confirmProvider; setConfirmProvider(null); disconnect(p); }}>Disconnect</button>
              </div>
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
  badgeConnected: { marginLeft: 8, fontSize: 12, padding: '2px 8px', background: '#DCFCE7', color: '#166534', borderRadius: 999 },
  detailLine: { color: '#6b7280', fontSize: 13, marginTop: 6, marginBottom: 10 },
  disconnectBtn: { marginTop: 10, background: 'transparent', color: '#EF4444', border: '1px solid #FCA5A5', borderRadius: 8, padding: '0.5rem 0.75rem', fontWeight: 600, cursor: 'pointer' },
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
// Rebuild trigger Fri Dec 12 16:23:55 EET 2025
