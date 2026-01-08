import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

interface OnboardingStatus {
  role: string;
  orgId: string | null;
  orgSlug: string | null;
  orgName: string | null;
  isFirstUser: boolean;
  requirements: {
    canInviteITAdmin?: boolean;
    canViewData?: boolean;
    mustInviteITAdmin?: boolean;
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
 * HRAdminOnboarding - Onboarding screen for HR admins
 * 
 * Shows two options:
 * 1. Invite IT Admin (recommended) - Send email invitation to IT admin for setup
 * 2. Set up integrations myself - Go directly to dashboard to configure
 */
const HRAdminOnboarding: React.FC<Props> = ({ status }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/onboarding/invitations', {
        email,
        name,
        role: 'it_admin',
      });

      setSuccess(true);
      setEmail('');
      setName('');
      
      // Show success message
      setTimeout(() => {
        setSuccess(false);
        setShowInviteForm(false);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

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
        <div style={styles.onboardingCard}>
          <div style={styles.iconContainer}>
            <span style={styles.icon}>👋</span>
          </div>
          
          <h1 style={styles.title}>Welcome to SignalTrue!</h1>
          <p style={styles.subtitle}>
            You're the first person from <strong>{status.orgName || 'your organization'}</strong> to join.
          </p>

          <div style={styles.divider} />

          <h2 style={styles.sectionTitle}>Next Step: Connect Your Tools</h2>
          <p style={styles.description}>
            SignalTrue analyzes your team's communication patterns to detect early signs of disengagement.
            To get started, we need to connect to your collaboration tools (Slack/Google Chat + Calendar).
          </p>

          <div style={styles.optionsContainer}>
            {/* Option 1: Invite IT Admin */}
            <div style={styles.optionCard}>
              <div style={styles.optionBadge}>Recommended</div>
              <h3 style={styles.optionTitle}>
                <span style={styles.optionIcon}>👨‍💻</span>
                Invite IT Admin
              </h3>
              <p style={styles.optionDescription}>
                Send an invitation to your IT administrator. They'll handle the integration setup
                and ensure proper permissions are configured.
              </p>
              
              {!showInviteForm ? (
                <button
                  onClick={() => setShowInviteForm(true)}
                  style={styles.primaryButton}
                >
                  Invite IT Admin
                </button>
              ) : (
                <form onSubmit={handleInvite} style={styles.inviteForm}>
                  {success && (
                    <div style={styles.successBanner}>
                      ✅ Invitation sent successfully! They'll receive an email with setup instructions.
                    </div>
                  )}
                  
                  {error && (
                    <div style={styles.errorBanner}>
                      ❌ {error}
                    </div>
                  )}

                  <input
                    type="text"
                    placeholder="IT Admin Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={styles.input}
                  />
                  
                  <input
                    type="email"
                    placeholder="IT Admin Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.input}
                  />
                  
                  <div style={styles.buttonGroup}>
                    <button
                      type="button"
                      onClick={() => setShowInviteForm(false)}
                      style={styles.secondaryButton}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      style={styles.primaryButton}
                      disabled={loading}
                    >
                      {loading ? 'Sending...' : 'Send Invitation'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Option 2: Set up myself */}
            <div style={styles.optionCard}>
              <h3 style={styles.optionTitle}>
                <span style={styles.optionIcon}>⚡</span>
                Set Up Myself
              </h3>
              <p style={styles.optionDescription}>
                You can configure the integrations yourself if you have admin access
                to your organization's Slack workspace and Google Workspace.
              </p>
              <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                <button style={styles.secondaryButton}>
                  Continue to Setup
                </button>
              </Link>
            </div>
          </div>

          <div style={styles.helpBox}>
            <p style={styles.helpText}>
              <strong>Need help?</strong> Our integrations only request read-only permissions
              and all data is anonymized at the team level. Contact{' '}
              <a href="mailto:support@signaltrue.com" style={styles.link}>
                support@signaltrue.com
              </a>{' '}
              with questions.
            </p>
          </div>
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
    maxWidth: '900px',
    margin: '0 auto',
    padding: '3rem 2rem',
  },
  onboardingCard: {
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
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '2rem 0',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.75rem',
  },
  description: {
    fontSize: '1rem',
    color: '#6b7280',
    lineHeight: '1.6',
    marginBottom: '2rem',
  },
  optionsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  optionCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    position: 'relative',
    transition: 'all 0.2s',
  },
  optionBadge: {
    position: 'absolute',
    top: '-12px',
    right: '16px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
  },
  optionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  optionIcon: {
    fontSize: '1.5rem',
  },
  optionDescription: {
    fontSize: '0.875rem',
    color: '#6b7280',
    lineHeight: '1.5',
    marginBottom: '1.5rem',
  },
  primaryButton: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
  secondaryButton: {
    width: '100%',
    padding: '0.75rem 1.5rem',
    background: 'white',
    color: '#6366f1',
    border: '2px solid #6366f1',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s',
  },
  inviteForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '0.75rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: '500',
  },
  helpBox: {
    background: '#f3f4f6',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '1.5rem',
  },
  helpText: {
    fontSize: '0.875rem',
    color: '#4b5563',
    margin: 0,
    lineHeight: '1.5',
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
    fontWeight: '500',
  },
};

export default HRAdminOnboarding;
