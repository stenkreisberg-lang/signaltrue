import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
const KEY = 'signaltrue_manager_invite_token';
export default function ManagerInvitation() {
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
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
        <p className="text-xs font-bold tracking-widest text-blue-700">
          SIGNALTRUE · MANAGER INTELLIGENCE
        </p>
        <h1 className="mt-4 text-2xl font-extrabold">Your team insights invitation</h1>
        {!localStorage.getItem('token') ? (
          <div className="mt-4">
            <p>
              You must sign in using the exact company account invited by HR before any team data
              becomes available.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              Sign in to verify identity
            </Link>
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
