import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

interface OnboardingStatus {
  role: string;
  orgId: string | null;
  orgSlug: string | null;
  orgName: string | null;
  isFirstUser: boolean;
  requirements: {
    canConfigureIntegrations?: boolean;
    mustCompleteIntegrations?: boolean;
    nextStep?: string;
  };
  slackConnected: boolean;
  googleChatConnected: boolean;
  chatConnected: boolean;
  calendarConnected: boolean;
  integrationsComplete: boolean;
}

interface Props {
  status: OnboardingStatus;
}

/**
 * ITAdminOnboarding - Integration setup wizard for IT admins
 * 
 * Guides IT admin through connecting:
 * 1. Slack or Google Chat (required)
 * 2. Google Calendar or Outlook (required)
 * 
 * Shows real-time connection status and completion progress
 */
const ITAdminOnboarding: React.FC<Props> = ({ status: initialStatus }) => {
  const [status, setStatus] = useState(initialStatus);
  const [integrations, setIntegrations] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntegrationStatus();
  }, []);

  const loadIntegrationStatus = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      const query = userData?.orgId ? `?orgId=${userData.orgId}` : '';
      
      const res = await api.get('/integrations/status' + query);
      if (res.status === 200) {
        setIntegrations(res.data);
      }

      // Also refresh onboarding status
      const statusRes = await api.get('/onboarding/status');
      setStatus(statusRes.data);
    } catch (error) {
      console.error('Failed to load integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const openOAuth = (provider: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Authentication error. Please log in again.');
      return;
    }

    const oauth = integrations?.oauth?.[provider];
    if (oauth) {
      const url = `${api.defaults.baseURL}${oauth}?token=${token}`;
      window.location.href = url;
    } else {
      alert(`OAuth URL not configured for ${provider}`);
    }
  };

  const { chatConnected, calendarConnected, integrationsComplete } = status;
  const progress = (
    (chatConnected ? 50 : 0) + 
    (calendarConnected ? 50 : 0)
  );

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div style={styles.logo}>SignalTrue</div>
          </Link>
          <div style={styles.navRight}>
            <span style={styles.userName}>{status.orgName || 'Your Organization'}</span>
          </div>
        </div>
      </nav>

      <div style={styles.content}>
        <div style={styles.setupCard}>
          {!integrationsComplete ? (
            <>
              <div style={styles.iconContainer}>
                <span style={styles.icon}>🔧</span>
              </div>
              
              <h1 style={styles.title}>Integration Setup</h1>
              <p style={styles.subtitle}>
                Connect your collaboration tools to start analyzing team health signals
              </p>

              {/* Progress Bar */}
              <div style={styles.progressContainer}>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: `${progress}%` }} />
                </div>
                <span style={styles.progressText}>{progress}% Complete</span>
              </div>

              <div style={styles.divider} />

              {/* Step 1: Chat Platform */}
              <div style={styles.stepContainer}>
                <div style={styles.stepHeader}>
                  <div style={styles.stepNumber}>1</div>
                  <div>
                    <h2 style={styles.stepTitle}>Connect Chat Platform</h2>
                    <p style={styles.stepDescription}>
                      Choose Slack or Google Chat to analyze team communication patterns
                    </p>
                  </div>
                  {chatConnected && <span style={styles.checkmark}>✓</span>}
                </div>

                <div style={styles.integrationGrid}>
                  <button
                    onClick={() => openOAuth('slack')}
                    style={{
                      ...styles.integrationButton,
                      ...(status.slackConnected ? styles.connectedButton : {}),
                    }}
                    disabled={loading}
                  >
                    <span style={styles.integrationIcon}>💬</span>
                    <div>
                      <div style={styles.integrationName}>Slack</div>
                      <div style={styles.integrationStatus}>
                        {status.slackConnected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => openOAuth('googleChat')}
                    style={{
                      ...styles.integrationButton,
                      ...(status.googleChatConnected ? styles.connectedButton : {}),
                    }}
                    disabled={loading}
                  >
                    <span style={styles.integrationIcon}>💬</span>
                    <div>
                      <div style={styles.integrationName}>Google Chat</div>
                      <div style={styles.integrationStatus}>
                        {status.googleChatConnected ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Calendar */}
              <div style={styles.stepContainer}>
                <div style={styles.stepHeader}>
                  <div style={styles.stepNumber}>2</div>
                  <div>
                    <h2 style={styles.stepTitle}>Connect Calendar</h2>
                    <p style={styles.stepDescription}>
                      Choose Google Calendar or Outlook to track meeting patterns and focus time
                    </p>
                  </div>
                  {calendarConnected && <span style={styles.checkmark}>✓</span>}
                </div>

                <div style={styles.integrationGrid}>
                  <button
                    onClick={() => openOAuth('calendar')}
                    style={{
                      ...styles.integrationButton,
                      ...(integrations?.connections?.googleCalendar ? styles.connectedButton : {}),
                    }}
                    disabled={loading}
                  >
                    <span style={styles.integrationIcon}>📅</span>
                    <div>
                      <div style={styles.integrationName}>Google Calendar</div>
                      <div style={styles.integrationStatus}>
                        {integrations?.connections?.googleCalendar ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => openOAuth('outlook')}
                    style={{
                      ...styles.integrationButton,
                      ...(integrations?.connections?.outlook ? styles.connectedButton : {}),
                    }}
                    disabled={loading}
                  >
                    <span style={styles.integrationIcon}>📧</span>
                    <div>
                      <div style={styles.integrationName}>Outlook Calendar</div>
                      <div style={styles.integrationStatus}>
                        {integrations?.connections?.outlook ? 'Connected' : 'Not connected'}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div style={styles.helpBox}>
                <p style={styles.helpText}>
                  <strong>🔒 Privacy First:</strong> All integrations use read-only permissions.
                  Data is analyzed at the team level only - individual messages are never stored or read by humans.
                </p>
              </div>
            </>
          ) : (
            // Success State
            <>
              <div style={styles.iconContainer}>
                <span style={styles.successIcon}>🎉</span>
              </div>
              
              <h1 style={styles.title}>Setup Complete!</h1>
              <p style={styles.subtitle}>
                All integrations are connected. SignalTrue is now analyzing team signals.
              </p>

              <div style={styles.successBox}>
                <div style={styles.successItem}>
                  <span style={styles.successCheckmark}>✓</span>
                  <span>
                    {status.slackConnected ? 'Slack' : 'Google Chat'} connected
                  </span>
                </div>
                <div style={styles.successItem}>
                  <span style={styles.successCheckmark}>✓</span>
                  <span>Calendar connected</span>
                </div>
                <div style={styles.successItem}>
                  <span style={styles.successCheckmark}>✓</span>
                  <span>First analysis running in background</span>
                </div>
              </div>

              <div style={styles.divider} />

              <p style={styles.description}>
                The HR admin who invited you can now view team health insights.
                Your job here is done! 
              </p>

              <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <button style={styles.primaryButton}>
                  View Dashboard
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
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
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  setupCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '3rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
  iconContainer: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  icon: {
    fontSize: '4rem',
  },
  successIcon: {
    fontSize: '4rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '1.125rem',
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: '2rem',
  },
  progressContainer: {
    marginBottom: '2rem',
  },
  progressBar: {
    width: '100%',
    height: '12px',
    background: '#e5e7eb',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '600',
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '2rem 0',
  },
  stepContainer: {
    marginBottom: '2rem',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  stepNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '1.125rem',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
  },
  stepDescription: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0.25rem 0 0 0',
  },
  checkmark: {
    fontSize: '1.5rem',
    color: '#10b981',
    marginLeft: 'auto',
  },
  integrationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginLeft: '48px',
  },
  integrationButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'left',
  },
  connectedButton: {
    borderColor: '#10b981',
    background: '#ecfdf5',
  },
  integrationIcon: {
    fontSize: '2rem',
  },
  integrationName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
  },
  integrationStatus: {
    fontSize: '0.75rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  helpBox: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '2rem',
  },
  helpText: {
    fontSize: '0.875rem',
    color: '#0c4a6e',
    margin: 0,
    lineHeight: '1.5',
  },
  successBox: {
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  successItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.75rem',
    fontSize: '1rem',
    color: '#065f46',
    fontWeight: '500',
  },
  successCheckmark: {
    fontSize: '1.25rem',
    color: '#10b981',
  },
  description: {
    fontSize: '1rem',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '1.5rem',
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
};

export default ITAdminOnboarding;
