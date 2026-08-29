import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Activity } from 'lucide-react';

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [validating, setValidating] = useState(true);
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link - no token provided');
      setValidating(false);
      return;
    }
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8081';
    fetch(`${apiUrl}/api/onboarding/invitations/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Invitation is invalid or expired');
        setInvitationData(data);
        setName(data.name || '');
      })
      .catch((validationError) => setError(validationError.message))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      setError('Invalid invitation link');
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8081';
      const response = await fetch(`${apiUrl}/api/onboarding/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to accept invitation');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('orgId', data.user.orgId);
      if (data.user.teamId) {
        localStorage.setItem('teamId', data.user.teamId);
      }

      // Redirect based on role
      if (data.user.role === 'it_admin') {
        // IT admin goes to integrations setup
        navigate('/dashboard?onboarding=integrations');
      } else if (data.user.role === 'hr_admin') {
        // HR admin goes to main dashboard
        navigate('/dashboard');
      } else {
        // Default to dashboard
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-control bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-lead font-display font-bold">SignalTrue</span>
        </Link>

        {/* Accept Invitation Form */}
        <div className="bg-card border border-border rounded-control p-8 shadow-lg">
          <h1 className="text-lead font-bold mb-2">Accept Your Invitation</h1>
          <p className="text-muted-foreground mb-6">
            {invitationData
              ? `Join ${invitationData.organizationName} as ${String(invitationData.role).replace('_', ' ')}`
              : validating
                ? 'Checking your invitation…'
                : 'Set up your account to get started'}
          </p>

          {invitationData && (
            <div className="mb-4 rounded-control border border-border bg-muted/40 p-3 text-caption">
              <div className="font-medium">{invitationData.email}</div>
              <div className="text-muted-foreground">
                This invitation is only valid for the account above.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-control text-destructive text-caption">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-caption font-medium mb-2">Full Name</label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-caption font-medium mb-2">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-caption font-medium mb-2">Confirm Password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || validating || !token || !invitationData}
            >
              {loading ? 'Creating Account...' : 'Accept Invitation'}
            </Button>
          </form>

          <p className="mt-6 text-center text-caption text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;
