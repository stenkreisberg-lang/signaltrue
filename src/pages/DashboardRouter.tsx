import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

// Import the different dashboard views
import Dashboard from '../components/Dashboard';
import { HRAdminOnboarding, ITAdminOnboarding } from '../components/onboarding';

// ── Payment result banner ──────────────────────────────────────────────────────
const PaymentBanner: React.FC<{ result: 'success' | 'cancelled'; onDismiss: () => void }> = ({
  result,
  onDismiss,
}) => {
  const isSuccess = result === 'success';
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isSuccess ? '#065f46' : '#7f1d1d',
        color: '#fff',
        fontSize: '0.9rem',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <span>
        {isSuccess
          ? '✅ Subscription activated — welcome to SignalTrue! Your account is now live.'
          : '⚠️ Checkout was cancelled. You can subscribe any time from Settings → Billing.'}
      </span>
      <button
        onClick={onDismiss}
        style={{
          marginLeft: 24,
          background: 'none',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '1.1rem',
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

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
  teamsConnected: boolean;
  chatConnected: boolean;
  calendarConnected: boolean;
  integrationsComplete: boolean;
}

// ── Impersonation banner ───────────────────────────────────────────────────────
const ImpersonationBanner: React.FC = () => {
  const navigate = useNavigate();
  const orgName = localStorage.getItem('impersonation_org') || 'unknown org';
  const userStr = localStorage.getItem('user');
  const email = userStr ? JSON.parse(userStr).email : '';

  const handleReturn = () => {
    const originalToken = localStorage.getItem('impersonation_token');
    if (originalToken) {
      localStorage.setItem('token', originalToken);
    }
    localStorage.removeItem('impersonation_token');
    localStorage.removeItem('impersonation_org');
    localStorage.removeItem('user');
    navigate('/superadmin');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#b45309',
        color: '#fff',
        fontSize: '0.875rem',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      }}
    >
      <span>
        🔑 Viewing as <strong>{orgName}</strong> admin{email ? ` (${email})` : ''} — Superadmin
        impersonation active
      </span>
      <button
        onClick={handleReturn}
        style={{
          marginLeft: 24,
          background: '#fff',
          border: 'none',
          color: '#b45309',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 700,
          padding: '4px 12px',
          borderRadius: '4px',
        }}
      >
        ← Return to Superadmin
      </button>
    </div>
  );
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isImpersonating = !!localStorage.getItem('impersonation_token');

  // Payment result from Stripe redirect
  const paymentParam = searchParams.get('payment') as 'success' | 'cancelled' | null;
  const [paymentBanner, setPaymentBanner] = useState<'success' | 'cancelled' | null>(paymentParam);

  // Remove the query param from the URL without navigating
  useEffect(() => {
    if (paymentParam) {
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const setupParam = searchParams.get('setup');

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
    // If user clicked "Set Up Myself", show dashboard with integrations
    if (setupParam === 'true') {
      return (
        <>
          {isImpersonating && <ImpersonationBanner />}
          {isImpersonating && <div style={{ height: 44 }} />}
          <PaymentBanner result={paymentBanner!} onDismiss={() => setPaymentBanner(null)} />
          {paymentBanner && <div style={{ height: 52 }} />}
          <Dashboard />
        </>
      );
    }

    // If integrations are not complete, show onboarding prompt
    if (!integrationsComplete) {
      return <HRAdminOnboarding status={status} />;
    }

    // Integrations complete - show full dashboard
    return (
      <>
        {isImpersonating && <ImpersonationBanner />}
        {isImpersonating && <div style={{ height: 44 }} />}
        {paymentBanner && (
          <PaymentBanner result={paymentBanner} onDismiss={() => setPaymentBanner(null)} />
        )}
        {paymentBanner && <div style={{ height: 52 }} />}
        <Dashboard />
      </>
    );
  }

  // IT Admin Flow
  if (role === 'it_admin') {
    // If arriving from invitation acceptance, force to integrations setup
    if (onboardingParam === 'integrations' || !integrationsComplete) {
      return <ITAdminOnboarding status={status} />;
    }

    // Integrations complete - show success screen with link to dashboard
    return (
      <>
        {isImpersonating && <ImpersonationBanner />}
        {isImpersonating && <div style={{ height: 44 }} />}
        <Dashboard />
      </>
    );
  }

  // Admin, Master Admin, or other roles - full access
  return (
    <>
      {isImpersonating && <ImpersonationBanner />}
      {isImpersonating && <div style={{ height: 44 }} />}
      {paymentBanner && (
        <PaymentBanner result={paymentBanner} onDismiss={() => setPaymentBanner(null)} />
      )}
      {paymentBanner && <div style={{ height: 52 }} />}
      <Dashboard />
    </>
  );
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
