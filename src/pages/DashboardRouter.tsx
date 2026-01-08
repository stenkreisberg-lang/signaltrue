import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

// Import the different dashboard views
import Dashboard from '../components/Dashboard';
import { HRAdminOnboarding, ITAdminOnboarding } from '../components/onboarding';

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
    canConfigureIntegrations?: boolean;
    mustCompleteIntegrations?: boolean;
    canInviteUsers?: boolean;
    canDoEverything?: boolean;
    nextStep?: string;
  };
  slackConnected: boolean;
  googleChatConnected: boolean;
  chatConnected: boolean;
  calendarConnected: boolean;
  integrationsComplete: boolean;
}

/**
 * DashboardRouter - Routes users to appropriate dashboard based on role and onboarding status
 * 
 * Flow:
 * - HR Admin (first user):
 *   - If no integrations: Show "Invite IT Admin" onboarding screen
 *   - If integrations complete: Show full dashboard with data
 * 
 * - IT Admin:
 *   - If no integrations: Show integration setup wizard
 *   - If integrations complete: Show confirmation screen, link to dashboard
 * 
 * - Admin/Master Admin:
 *   - Always show full dashboard
 */
const DashboardRouter: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOnboardingStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await api.get('/onboarding/status');
        setStatus(response.data);
      } catch (err: any) {
        console.error('Onboarding status error:', err);
        setError(err.response?.data?.message || 'Failed to load dashboard');
        
        // If unauthorized, redirect to login
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOnboardingStatus();
  }, [navigate]);

  // Check if user is arriving from integration setup
  const onboardingParam = searchParams.get('onboarding');

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Unable to load dashboard</h2>
        <p style={styles.errorMessage}>{error}</p>
        <button onClick={() => navigate('/login')} style={styles.button}>
          Back to Login
        </button>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // Route based on role and onboarding status
  const { role, requirements, integrationsComplete } = status;

  // HR Admin Flow
  if (role === 'hr_admin') {
    // If integrations are not complete, show onboarding prompt
    if (!integrationsComplete) {
      return <HRAdminOnboarding status={status} />;
    }
    
    // Integrations complete - show full dashboard
    return <Dashboard />;
  }

  // IT Admin Flow
  if (role === 'it_admin') {
    // If arriving from invitation acceptance, force to integrations setup
    if (onboardingParam === 'integrations' || !integrationsComplete) {
      return <ITAdminOnboarding status={status} />;
    }
    
    // Integrations complete - show success screen with link to dashboard
    return <Dashboard />;
  }

  // Admin, Master Admin, or other roles - full access
  return <Dashboard />;
};

const styles: { [key: string]: React.CSSProperties } = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f9fafb',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #6366f1',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '1rem',
    color: '#6b7280',
    fontSize: '1rem',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '2rem',
    textAlign: 'center',
    background: '#f9fafb',
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: '0.5rem',
  },
  errorMessage: {
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
  },
};

export default DashboardRouter;
