import React, { useState, useEffect, useCallback } from 'react';
import DriftAlerts from './DriftAlerts';
import PlaybookRecommendations from './PlaybookRecommendations';
import OneOnOneTimeline from './OneOnOneTimeline';
import BenchmarkComparison from './BenchmarkComparison';
import AdminExportPanel from './AdminExportPanel';
import GoogleCalendarConnect from './GoogleCalendarConnect';
import GoogleChatConnect from './GoogleChatConnect';
import LoopClosingDashboard from './LoopClosingDashboard';
import BDIDashboard from './BDIDashboard';
import TeamManagement from './TeamManagement';
import EmployeeDirectory from './EmployeeDirectory';
import ImmediateInsightsPanel from './ImmediateInsightsPanel';
import { TrialBanner } from './TrialBanner';
import { PaywallBanner } from './PaywallOverlay';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

// New Feature Components (February 2026)
import { OARScoreWidget } from './features/OARScoreWidget';
import { ROIDashboardBanner } from './features/ROIDashboardBanner';
import { GoalTracker } from './features/GoalTracker';
import { NotificationBell } from './features/NotificationBell';
import { RecoveryJourneyTimeline } from './features/RecoveryJourneyTimeline';

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [integrations, setIntegrations] = useState(null);
  const [showHelp, setShowHelp] = useState(null); // 'slack' | 'calendar' | 'outlook' | 'teams' | null
  const [toast, setToast] = useState(null);
  const [confirmProvider, setConfirmProvider] = useState(null);
  const [showImmediateInsights, setShowImmediateInsights] = useState(false);
  const [connectedProvider, setConnectedProvider] = useState(null);

  const loadIntegrationStatus = useCallback(async () => {
    try {
      // Use user's orgId for integrations status
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const query = userData?.orgId ? `?orgId=${userData.orgId}` : '';
      const res = await api.get('/integrations/status' + query);
      if (res.status === 200) {
        const data = res.data;
        setIntegrations(data);
        setToast({ type: 'success', message: 'Connection status updated.' });
        setTimeout(() => setToast(null), 2500);
      }
    } catch (e) {
      setToast({ type: 'error', message: 'Could not refresh status.' });
      setTimeout(() => setToast(null), 3000);
    }
  }, []);

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
    const searchParams = new URLSearchParams(window.location.search);
    // Check for OAuth callback messages
    const integrationStatus = searchParams.get('integrationStatus');
    const msg = searchParams.get('msg');
    const connected = searchParams.get('connected');

    if (integrationStatus) {
      // Show toast with the result
      if (integrationStatus === 'success') {
        setToast({ type: 'success', message: msg || 'Integration connected successfully!' });
      } else {
        setToast({ type: 'error', message: msg || 'Integration failed. Please try again.' });
      }
      setTimeout(() => setToast(null), 5000);

      // Clean up URL
      window.history.replaceState({}, document.title, '/dashboard');
    }

    // Check if coming back from OAuth with a newly connected provider
    if (connected) {
      // Map the connected param to a provider name
      let provider = connected;
      if (connected.startsWith('google-')) provider = 'google';
      if (connected.startsWith('microsoft-')) provider = 'microsoft';

      setConnectedProvider(provider);
      setShowImmediateInsights(true);
      setToast({
        type: 'success',
        message: `${connected.replace('-', ' ')} connected successfully!`,
      });
      setTimeout(() => setToast(null), 3000);

      // Clean up URL
      window.history.replaceState({}, document.title, '/dashboard');
    }

    // Always reload if coming back from an OAuth flow (Google or Slack)
    if (searchParams.has('integrationStatus') || searchParams.has('connected')) {
      loadIntegrationStatus();
    }

    // Also run on initial mount
    loadIntegrationStatus();
  }, [loadIntegrationStatus]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const openOrGuide = (provider) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication error. Please log in again.');
      return;
    }

    const oauth = integrations?.oauth?.[provider];
    if (oauth) {
      // For OAuth redirects, we need the full backend URL (not relative)
      const backendUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
      // Ensure oauth path includes /api prefix
      const oauthPath = oauth.startsWith('/api') ? oauth : `/api${oauth}`;
      // Handle URLs that may already have query params
      const separator = oauthPath.includes('?') ? '&' : '?';
      const url = `${backendUrl}${oauthPath}${separator}token=${token}`;
      window.location.href = url;
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
        setToast({
          type: 'success',
          message: `${provider[0].toUpperCase() + provider.slice(1)} disconnected.`,
        });
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
            <NotificationBell userId={user?._id} />
            <span style={styles.userName}>{user?.name || user?.email}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div style={styles.content}>
        {/* Immediate Insights Panel (shown after OAuth connect) */}
        {showImmediateInsights && (
          <ImmediateInsightsPanel
            connectedProvider={connectedProvider}
            onClose={() => setShowImmediateInsights(false)}
          />
        )}

        {/* Trial Status Banner */}
        <TrialBanner className="mb-6" />

        {/* Paywall Banner (shown when trial expired) */}
        <PaywallBanner className="mb-6" />

        {/* ROI Savings Banner - shows estimated savings */}
        {user?.orgId && (
          <ROIDashboardBanner orgId={user.orgId} onViewDetails={() => navigate('/roi-settings')} />
        )}

        {/* New Feature Widgets Grid */}
        {user?.orgId && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '24px',
              marginBottom: '24px',
            }}
          >
            {/* OAR Score Widget */}
            <OARScoreWidget orgId={user.orgId} showHistory={true} />

            {/* Goal Tracking */}
            <GoalTracker orgId={user.orgId} userId={user._id} maxGoals={3} />
          </div>
        )}

        {/* Engagement Change Alerts (Drift Explainability) */}
        {teamId && (
          <>
            <BDIDashboard teamId={teamId} orgId={user?.orgId} />
            <LoopClosingDashboard teamId={teamId} />
            <DriftAlerts teamId={teamId} />
            <PlaybookRecommendations teamId={teamId} />
            <OneOnOneTimeline teamId={teamId} userId={user?._id} />
            <BenchmarkComparison teamId={teamId} orgId={user?.orgId} />

            {/* Recovery Journey Timeline */}
            <div style={{ marginTop: '24px' }}>
              <RecoveryJourneyTimeline orgId={user?.orgId} maxEvents={5} showNarrative={true} />
            </div>
          </>
        )}

        {/* Admin/HR Controls & Data Export */}
        {['admin', 'hr_admin', 'master_admin'].includes(user?.role) && <AdminExportPanel />}

        {/* Employee Directory for HR/Admin */}
        {['admin', 'hr_admin', 'master_admin'].includes(user?.role) && <EmployeeDirectory />}

        {/* Team Management for HR/Admin */}
        {['admin', 'hr_admin', 'master_admin'].includes(user?.role) && <TeamManagement />}

        {/* Admin onboarding shortcut */}
        {['admin', 'hr_admin', 'master_admin'].includes(user?.role) && (
          <div
            style={{
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: 12,
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ color: '#4338CA', fontWeight: 600 }}>New: Guided Admin Onboarding</div>
            <Link
              to="/admin/onboarding"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 8,
                padding: '0.5rem 0.75rem',
                fontWeight: 700,
              }}
            >
              Open
            </Link>
          </div>
        )}
        <div style={styles.hero}>
          <h1 style={styles.title}>Welcome to SignalTrue</h1>
          <p style={styles.subtitle}>Let's get you set up to start tracking team health</p>
        </div>

        <div style={styles.cardsGrid}>
          <div style={styles.card}>
            <div style={styles.cardIcon}>🔗</div>
            <h3 style={styles.cardTitle}>
              Connect Slack{' '}
              {integrations?.connected?.slack && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            {integrations?.connected?.slack && integrations?.details?.slack && (
              <p style={styles.detailLine}>
                Workspace: {integrations.details.slack.teamName || 'Unknown'}
              </p>
            )}
            <p style={styles.cardText}>
              Import your team's communication patterns and sentiment data
            </p>
            {!integrations?.connected?.slack ? (
              <button style={styles.cardButton} onClick={() => openOrGuide('slack')}>
                Connect Workspace
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('slack')}>
                Disconnect
              </button>
            )}
          </div>

          <div style={styles.card}>
            <GoogleCalendarConnect integrations={integrations} />
          </div>

          <div style={styles.card}>
            <GoogleChatConnect integrations={integrations} />
          </div>

          {/* Jira Integration */}
          <div style={styles.card}>
            <div style={{ position: 'relative' }}>
              <div style={styles.cardIcon}>🎯</div>
              <button
                style={styles.infoButton}
                onClick={() => setShowHelp('jira')}
                title="What does this measure?"
              >
                ?
              </button>
            </div>
            <h3 style={styles.cardTitle}>
              Connect Jira{' '}
              {integrations?.connected?.jira && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            <p style={styles.cardText}>
              Track sprint velocity, issue cycle times, and execution blockers
            </p>
            {!integrations?.connected?.jira ? (
              <button
                style={styles.cardButton}
                onClick={() => (window.location.href = '/api/integrations/jira/oauth/start')}
              >
                Connect Jira
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('jira')}>
                Disconnect
              </button>
            )}
          </div>

          {/* Asana Integration */}
          <div style={styles.card}>
            <div style={{ position: 'relative' }}>
              <div style={styles.cardIcon}>✅</div>
              <button
                style={styles.infoButton}
                onClick={() => setShowHelp('asana')}
                title="What does this measure?"
              >
                ?
              </button>
            </div>
            <h3 style={styles.cardTitle}>
              Connect Asana{' '}
              {integrations?.connected?.asana && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            <p style={styles.cardText}>
              Analyze task completion rates, overdue items, and workload balance
            </p>
            {!integrations?.connected?.asana ? (
              <button
                style={styles.cardButton}
                onClick={() => (window.location.href = '/api/integrations/asana/oauth/start')}
              >
                Connect Asana
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('asana')}>
                Disconnect
              </button>
            )}
          </div>

          {/* Notion Integration */}
          <div style={styles.card}>
            <div style={{ position: 'relative' }}>
              <div style={styles.cardIcon}>📝</div>
              <button
                style={styles.infoButton}
                onClick={() => setShowHelp('notion')}
                title="What does this measure?"
              >
                ?
              </button>
            </div>
            <h3 style={styles.cardTitle}>
              Connect Notion{' '}
              {integrations?.connected?.notion && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            <p style={styles.cardText}>
              Monitor documentation activity, page staleness, and collaboration gaps
            </p>
            {!integrations?.connected?.notion ? (
              <button
                style={styles.cardButton}
                onClick={() => (window.location.href = '/api/integrations/notion/oauth/start')}
              >
                Connect Notion
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('notion')}>
                Disconnect
              </button>
            )}
          </div>

          {/* HubSpot Integration */}
          <div style={styles.card}>
            <div style={{ position: 'relative' }}>
              <div style={styles.cardIcon}>🧡</div>
              <button
                style={styles.infoButton}
                onClick={() => setShowHelp('hubspot')}
                title="What does this measure?"
              >
                ?
              </button>
            </div>
            <h3 style={styles.cardTitle}>
              Connect HubSpot{' '}
              {integrations?.connected?.hubspot && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            <p style={styles.cardText}>
              Track deal velocity, CRM activity patterns, and sales team capacity
            </p>
            {!integrations?.connected?.hubspot ? (
              <button
                style={styles.cardButton}
                onClick={() => (window.location.href = '/api/integrations/hubspot/oauth/start')}
              >
                Connect HubSpot
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('hubspot')}>
                Disconnect
              </button>
            )}
          </div>

          {/* Pipedrive Integration */}
          <div style={styles.card}>
            <div style={{ position: 'relative' }}>
              <div style={styles.cardIcon}>💰</div>
              <button
                style={styles.infoButton}
                onClick={() => setShowHelp('pipedrive')}
                title="What does this measure?"
              >
                ?
              </button>
            </div>
            <h3 style={styles.cardTitle}>
              Connect Pipedrive{' '}
              {integrations?.connected?.pipedrive && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            <p style={styles.cardText}>
              Analyze deal stages, activity patterns, and pipeline conversion rates
            </p>
            {!integrations?.connected?.pipedrive ? (
              <button
                style={styles.cardButton}
                onClick={() => (window.location.href = '/api/integrations/pipedrive/oauth/start')}
              >
                Connect Pipedrive
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('pipedrive')}>
                Disconnect
              </button>
            )}
          </div>

          {/* Outlook Integration */}
          <div style={styles.card}>
            <div style={{ position: 'relative' }}>
              <div style={styles.cardIcon}>📧</div>
              <button
                style={styles.infoButton}
                onClick={() => setShowHelp('outlook')}
                title="What does this measure?"
              >
                ?
              </button>
            </div>
            <h3 style={styles.cardTitle}>
              Connect Outlook{' '}
              {integrations?.connected?.outlook && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            <p style={styles.cardText}>
              Analyze Outlook/Exchange calendar and email metadata for trends
            </p>
            {!integrations?.connected?.outlook ? (
              <button style={styles.cardButton} onClick={() => openOrGuide('outlook')}>
                Connect Outlook Account
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('microsoft')}>
                Disconnect
              </button>
            )}
          </div>

          {/* Microsoft Teams Integration */}
          <div style={styles.card}>
            <div style={{ position: 'relative' }}>
              <div style={styles.cardIcon}>💼</div>
              <button
                style={styles.infoButton}
                onClick={() => setShowHelp('teams')}
                title="What does this measure?"
              >
                ?
              </button>
            </div>
            <h3 style={styles.cardTitle}>
              Connect Microsoft Teams{' '}
              {integrations?.connected?.teams && (
                <span style={styles.badgeConnected}>Connected</span>
              )}
            </h3>
            <p style={styles.cardText}>
              Import Teams collaboration patterns to enrich communication insights
            </p>
            {!integrations?.connected?.teams ? (
              <button style={styles.cardButton} onClick={() => openOrGuide('teams')}>
                Connect Teams Workspace
              </button>
            ) : (
              <button style={styles.disconnectBtn} onClick={() => setConfirmProvider('microsoft')}>
                Disconnect
              </button>
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
            Contact us at{' '}
            <a href="mailto:support@signaltrue.ai" style={styles.link}>
              support@signaltrue.ai
            </a>
          </p>
        </div>

        {showHelp && (
          <div style={styles.modalOverlay} onClick={() => setShowHelp(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>
                {showHelp === 'slack' && 'How to connect Slack'}
                {showHelp === 'calendar' && 'How to connect Google Calendar'}
                {showHelp === 'outlook' && 'How to connect Outlook'}
                {showHelp === 'teams' && 'How to connect Microsoft Teams'}
                {showHelp === 'jira' && 'What Jira Measures'}
                {showHelp === 'asana' && 'What Asana Measures'}
                {showHelp === 'notion' && 'What Notion Measures'}
                {showHelp === 'hubspot' && 'What HubSpot Measures'}
                {showHelp === 'pipedrive' && 'What Pipedrive Measures'}
              </h3>
              {showHelp === 'slack' && (
                <ol style={styles.helpList}>
                  <li>Ask your workspace admin to install the SignalTrue Slack App.</li>
                  <li>
                    Approve read-only scopes to analyze public channel activity and sentiment.
                  </li>
                  <li>
                    After authorization, you'll be redirected back here and your first sync will
                    start.
                  </li>
                </ol>
              )}
              {showHelp === 'calendar' && (
                <ol style={styles.helpList}>
                  <li>Choose your work account when prompted by Google.</li>
                  <li>
                    Approve read-only calendar access so we can compute meeting and focus-time
                    trends.
                  </li>
                  <li>
                    After authorization, you'll return here and we’ll begin the first analysis.
                  </li>
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
                  <li>
                    Approve read-only permissions to analyze channel participation and activity.
                  </li>
                  <li>After authorization, you'll return here and your first sync will start.</li>
                </ol>
              )}
              {showHelp === 'jira' && (
                <div>
                  <p style={{ marginBottom: 12, color: '#374151' }}>
                    Jira integration analyzes your project management data to detect execution
                    friction.
                  </p>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>📊 Metrics we measure:</p>
                  <ul style={styles.helpList}>
                    <li>
                      <strong>Issue cycle time</strong> — How long issues stay in each status
                    </li>
                    <li>
                      <strong>Sprint velocity</strong> — Story points completed vs committed
                    </li>
                    <li>
                      <strong>Blocker frequency</strong> — How often issues get blocked
                    </li>
                    <li>
                      <strong>Backlog health</strong> — Age and size of unresolved issues
                    </li>
                  </ul>
                  <p style={{ fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
                    🚨 Signals we detect:
                  </p>
                  <ul style={styles.helpList}>
                    <li>Execution drag — velocity declining despite stable effort</li>
                    <li>Coordination strain — too many dependencies and handoffs</li>
                    <li>Scope creep — expanding work mid-sprint</li>
                  </ul>
                </div>
              )}
              {showHelp === 'asana' && (
                <div>
                  <p style={{ marginBottom: 12, color: '#374151' }}>
                    Asana integration tracks task flow and workload distribution across your team.
                  </p>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>📊 Metrics we measure:</p>
                  <ul style={styles.helpList}>
                    <li>
                      <strong>Task completion rate</strong> — Completed vs created tasks
                    </li>
                    <li>
                      <strong>Overdue items</strong> — Tasks past their due date
                    </li>
                    <li>
                      <strong>Workload distribution</strong> — Tasks per team member
                    </li>
                    <li>
                      <strong>Project progress</strong> — Milestone completion trends
                    </li>
                  </ul>
                  <p style={{ fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
                    🚨 Signals we detect:
                  </p>
                  <ul style={styles.helpList}>
                    <li>Load imbalance — uneven task distribution</li>
                    <li>Recovery erosion — growing backlog of overdue items</li>
                    <li>Planning drift — frequent due date changes</li>
                  </ul>
                </div>
              )}
              {showHelp === 'notion' && (
                <div>
                  <p style={{ marginBottom: 12, color: '#374151' }}>
                    Notion integration monitors documentation activity and knowledge sharing
                    patterns.
                  </p>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>📊 Metrics we measure:</p>
                  <ul style={styles.helpList}>
                    <li>
                      <strong>Page activity</strong> — Creates, edits, and views over time
                    </li>
                    <li>
                      <strong>Staleness</strong> — Pages not updated in 30+ days
                    </li>
                    <li>
                      <strong>Collaboration</strong> — Multi-author activity patterns
                    </li>
                    <li>
                      <strong>Database usage</strong> — Active vs dormant databases
                    </li>
                  </ul>
                  <p style={{ fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
                    🚨 Signals we detect:
                  </p>
                  <ul style={styles.helpList}>
                    <li>Knowledge silos — documentation concentrated in few people</li>
                    <li>Stale documentation — critical docs becoming outdated</li>
                    <li>Collaboration gaps — teams not sharing knowledge</li>
                  </ul>
                </div>
              )}
              {showHelp === 'hubspot' && (
                <div>
                  <p style={{ marginBottom: 12, color: '#374151' }}>
                    HubSpot integration analyzes CRM activity and sales team performance patterns.
                  </p>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>📊 Metrics we measure:</p>
                  <ul style={styles.helpList}>
                    <li>
                      <strong>Deal velocity</strong> — Time from creation to close
                    </li>
                    <li>
                      <strong>Activity volume</strong> — Calls, emails, meetings logged
                    </li>
                    <li>
                      <strong>Pipeline movement</strong> — Stage progression rates
                    </li>
                    <li>
                      <strong>Contact engagement</strong> — Response and touch patterns
                    </li>
                  </ul>
                  <p style={{ fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
                    🚨 Signals we detect:
                  </p>
                  <ul style={styles.helpList}>
                    <li>Sales execution drag — deals stalling in pipeline</li>
                    <li>Team capacity strain — activity levels vs quota</li>
                    <li>Customer risk — engagement drop-offs</li>
                  </ul>
                </div>
              )}
              {showHelp === 'pipedrive' && (
                <div>
                  <p style={{ marginBottom: 12, color: '#374151' }}>
                    Pipedrive integration tracks sales pipeline health and activity patterns.
                  </p>
                  <p style={{ fontWeight: 600, marginBottom: 8 }}>📊 Metrics we measure:</p>
                  <ul style={styles.helpList}>
                    <li>
                      <strong>Deal stages</strong> — Time in each pipeline stage
                    </li>
                    <li>
                      <strong>Activity patterns</strong> — Calls, emails, meetings per deal
                    </li>
                    <li>
                      <strong>Conversion rates</strong> — Stage-to-stage progression
                    </li>
                    <li>
                      <strong>Win/loss analysis</strong> — Deal outcome patterns
                    </li>
                  </ul>
                  <p style={{ fontWeight: 600, marginBottom: 8, marginTop: 16 }}>
                    🚨 Signals we detect:
                  </p>
                  <ul style={styles.helpList}>
                    <li>Revenue friction — slowing deal velocity</li>
                    <li>Pipeline health — conversion rate trends</li>
                    <li>Rep capacity — activity levels and workload</li>
                  </ul>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button style={styles.secondaryBtn} onClick={() => setShowHelp(null)}>
                  Close
                </button>
                {showHelp === 'slack' && integrations?.oauth?.slack && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('slack')}>
                    Continue to Slack
                  </button>
                )}
                {showHelp === 'calendar' && integrations?.oauth?.calendar && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('calendar')}>
                    Continue to Google
                  </button>
                )}
                {showHelp === 'outlook' && integrations?.oauth?.outlook && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('outlook')}>
                    Continue to Microsoft
                  </button>
                )}
                {showHelp === 'teams' && integrations?.oauth?.teams && (
                  <button style={styles.primaryBtn} onClick={() => openOrGuide('teams')}>
                    Continue to Microsoft
                  </button>
                )}
              </div>
              {!integrations?.oauth?.slack && showHelp === 'slack' && (
                <p style={styles.smallNote}>
                  Admin note: set SLACK_CLIENT_ID/SECRET on the backend to enable one‑click Slack
                  OAuth.
                </p>
              )}
              {!integrations?.oauth?.calendar && showHelp === 'calendar' && (
                <p style={styles.smallNote}>
                  Admin note: set GOOGLE_CLIENT_ID/SECRET on the backend to enable one‑click Google
                  OAuth.
                </p>
              )}
              {!integrations?.oauth?.outlook && showHelp === 'outlook' && (
                <p style={styles.smallNote}>
                  Admin note: set MS_APP_CLIENT_ID/SECRET on the backend to enable one‑click
                  Microsoft OAuth.
                </p>
              )}
              {!integrations?.oauth?.teams && showHelp === 'teams' && (
                <p style={styles.smallNote}>
                  Admin note: set MS_APP_CLIENT_ID/SECRET on the backend to enable one‑click
                  Microsoft OAuth.
                </p>
              )}
            </div>
          </div>
        )}

        {toast && (
          <div
            style={{
              position: 'fixed',
              right: 16,
              bottom: 16,
              background: toast.type === 'error' ? '#FEE2E2' : '#ECFDF5',
              color: toast.type === 'error' ? '#991B1B' : '#065F46',
              border: '1px solid',
              borderColor: toast.type === 'error' ? '#FCA5A5' : '#6EE7B7',
              padding: '0.75rem 1rem',
              borderRadius: 8,
              boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            }}
          >
            {toast.message}
          </div>
        )}

        {confirmProvider && (
          <div style={styles.modalOverlay} onClick={() => setConfirmProvider(null)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>Disconnect integration</h3>
              <p style={{ color: '#374151' }}>
                Are you sure you want to disconnect{' '}
                {confirmProvider === 'google'
                  ? 'Google'
                  : confirmProvider === 'microsoft'
                    ? 'Microsoft'
                    : 'Slack'}
                ? You can reconnect anytime.
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'flex-end' }}>
                <button style={styles.secondaryBtn} onClick={() => setConfirmProvider(null)}>
                  Cancel
                </button>
                <button
                  style={{
                    ...styles.primaryBtn,
                    background: 'linear-gradient(135deg, #ef4444, #f97316)',
                  }}
                  onClick={() => {
                    const p = confirmProvider;
                    setConfirmProvider(null);
                    disconnect(p);
                  }}
                >
                  Disconnect
                </button>
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
    color: '#374151',
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
    color: '#374151',
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
    color: '#374151',
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
    position: 'fixed',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: 12,
    padding: '1.5rem',
    width: 'min(520px, 92vw)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
  },
  helpList: { color: '#4b5563', lineHeight: 1.6, paddingLeft: '1.2rem' },
  secondaryBtn: {
    padding: '0.6rem 1rem',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    background: 'white',
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '0.6rem 1rem',
    border: 'none',
    borderRadius: 8,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    cursor: 'pointer',
  },
  smallNote: { color: '#4b5563', fontSize: 12, marginTop: 12 },
  badgeConnected: {
    marginLeft: 8,
    fontSize: 12,
    padding: '2px 8px',
    background: '#DCFCE7',
    color: '#166534',
    borderRadius: 999,
  },
  detailLine: { color: '#4b5563', fontSize: 13, marginTop: 6, marginBottom: 10 },
  disconnectBtn: {
    marginTop: 10,
    background: 'transparent',
    color: '#EF4444',
    border: '1px solid #FCA5A5',
    borderRadius: 8,
    padding: '0.5rem 0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  infoButton: {
    position: 'absolute',
    top: 0,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#E0E7FF',
    color: '#4F46E5',
    border: 'none',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.25rem',
    color: '#374151',
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
