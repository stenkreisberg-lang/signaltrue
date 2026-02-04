import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
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
    nextStep?: string;
  };
  slackConnected: boolean;
  googleChatConnected: boolean;
  teamsConnected: boolean;
  chatConnected: boolean;
  calendarConnected: boolean;
  integrationsComplete: boolean;
}

/**
 * AdminOnboarding - Standalone page for accessing onboarding wizard
 *
 * This page is accessed from the dashboard when an admin wants to:
 * - Invite an IT admin to connect integrations
 * - Set up integrations themselves
 * - Check on onboarding status
 */
const AdminOnboarding: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await api.get('/onboarding/status');
        setStatus(response.data);
      } catch (err: any) {
        console.error('Error fetching onboarding status:', err);
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError(err.response?.data?.message || 'Failed to load onboarding status');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [navigate]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading onboarding...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Error</h2>
        <p style={styles.errorText}>{error}</p>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div style={styles.errorContainer}>
        <h2 style={styles.errorTitle}>Not Found</h2>
        <p style={styles.errorText}>Could not load onboarding status</p>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Route to appropriate onboarding component based on role
  if (status.role === 'it_admin') {
    return <ITAdminOnboarding status={status} />;
  }

  // Default to HR Admin onboarding for hr_admin, admin, master_admin
  return <HRAdminOnboarding status={status} />;
};

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#111827',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(59, 130, 246, 0.3)',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    color: '#9ca3af',
    fontSize: '14px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#111827',
    padding: '24px',
  },
  errorTitle: {
    color: '#f87171',
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  errorText: {
    color: '#9ca3af',
    fontSize: '16px',
    marginBottom: '24px',
    textAlign: 'center',
  },
  backButton: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
};

export default AdminOnboarding;
