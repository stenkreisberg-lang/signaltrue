import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
const KEY = 'signaltrue_manager_invite_token';
export default function ManagerInvitation() {
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [claimed, setClaimed] = useState(false);
  const [token] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const value = fragment.get('token');
    if (value) {
      sessionStorage.setItem(KEY, value);
      history.replaceState(null, '', window.location.pathname);
    }
    return value || sessionStorage.getItem(KEY) || '';
  });
  useEffect(() => {
    if (!token) {
      setError('The invitation link is missing or has expired.');
      return;
    }
    if (!localStorage.getItem('token')) return;
    let alive = true;
    api
      .post('/manager-intelligence/invitations/inspect', { token })
      .then((r) => {
        if (alive) setInvite(r.data);
      })
      .catch((e) => {
        if (alive) setError(e.response?.data?.message || 'Invitation is unavailable');
      });
    return () => {
      alive = false;
    };
  }, [token]);
  const claim = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/manager-intelligence/invitations/claim', { token, password });
      setClaimed(true);
      setPassword('');
    } catch (e) {
      setError(e.response?.data?.message || 'Account setup was unsuccessful');
    } finally {
      setBusy(false);
    }
  };
  const respond = async (accept) => {
    setBusy(true);
    setError('');
    try {
      const r = await api.post('/manager-intelligence/invitations/respond', { token, accept });
      sessionStorage.removeItem(KEY);
      if (accept) navigate('/app/manager');
      else navigate('/dashboard');
    } catch (e) {
      setError(e.response?.data?.message || 'Could not update invitation');
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto mt-16 max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold tracking-widest text-blue-700">SIGNALTRUE · TEAM ACCESS</p>
        <h1 className="mt-4 text-2xl font-extrabold">Your team insights invitation</h1>
        {!localStorage.getItem('token') ? (
          <div className="mt-4 space-y-4">
            {claimed ? (
              <p className="rounded-lg bg-green-50 p-4 text-sm">
                Your company account is ready. Sign in with your company email and the password you
                just created. Return to this invitation to accept manager access.
              </p>
            ) : (
              <>
                <p className="text-sm">
                  If you already use SignalTrue, sign in using the company account HR invited. If HR
                  imported your employee record but you have never signed in, create a password
                  below. This will not grant team access until you accept the invitation.
                </p>
                <form onSubmit={claim} className="space-y-3">
                  <label className="block text-sm font-semibold">
                    New password for your invited company account
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-2 block w-full rounded-lg border p-3"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy || password.length < 12}
                    className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-50"
                  >
                    Create my company account
                  </button>
                </form>
              </>
            )}
            <Link
              to="/login"
              className="inline-block rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Sign in with invited account
            </Link>
            <p className="text-xs text-slate-500">
              The one-time invitation remains tied to the HR-nominated email. Return to this page
              after signing in to accept the team assignment.
            </p>
          </div>
        ) : invite ? (
          <div className="mt-5 space-y-4">
            <p>
              You have been authorized to review aggregated work-pattern evidence for{' '}
              <strong>{invite.teamName}</strong>.
            </p>
            <p className="rounded-lg bg-blue-50 p-4 text-sm">
              {invite.purpose}. {invite.restrictions}. Email subscription is separate from access
              permissions.
            </p>
            <p className="text-sm text-slate-600">
              Invite expires {new Date(invite.expiresAt).toLocaleDateString('en-GB')}. Version:{' '}
              {invite.termsVersion}.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(true)}
                className="rounded-lg bg-slate-900 px-5 py-3 font-bold text-white"
              >
                Accept scoped access
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(false)}
                className="rounded-lg border border-slate-200 px-5 py-3 font-bold"
              >
                Decline
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">Verifying invitation…</p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
