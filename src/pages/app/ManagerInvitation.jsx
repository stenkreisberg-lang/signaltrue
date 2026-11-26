import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
const KEY = 'signaltrue_manager_invite_token';
export default function ManagerInvitation() {
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const [language, setLanguage] = useState(() => {
    const hints = new URLSearchParams(window.location.hash.slice(1));
    const lang = hints.get('lang') || sessionStorage.getItem('signaltrue_invite_language');
    return lang === 'et' || (!lang && navigator.language.startsWith('et')) ? 'et' : 'en';
  });
  const tr = (en, et) => (language === 'et' ? et : en);
  const [password, setPassword] = useState('');
  const [claimed, setClaimed] = useState(false);
  const [token] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const value = fragment.get('token');
    if (value) {
      sessionStorage.setItem(KEY, value);
      sessionStorage.setItem('signaltrue_invite_language', language);
      history.replaceState(null, '', window.location.pathname);
    }
    return value || sessionStorage.getItem(KEY) || '';
  });
  useEffect(() => {
    if (!token) {
      return;
    }
    if (!localStorage.getItem('token')) return;
    let alive = true;
    api
      .post('/manager-intelligence/invitations/inspect', { token })
      .then((r) => {
        if (alive) {
          setInvite(r.data);
          if (r.data.locale) setLanguage(r.data.locale);
        }
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
      await api.post('/manager-intelligence/invitations/respond', { token, accept });
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem('signaltrue_invite_language');
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
          {tr('SIGNALTRUE · TEAM ACCESS', 'SIGNALTRUE · TIIMIJUHI LIGIPÄÄS')}
        </p>
        <h1 className="mt-4 text-2xl font-extrabold">
          {tr('Your team insights invitation', 'Kutse tiimi töömustrite vaatamiseks')}
        </h1>
        {!token ? (
          <p className="mt-4 text-sm text-slate-600">
            {tr(
              'This invitation link is missing. Ask HR to send a new invitation.',
              'Kutse link puudub. Palu personalijuhil saata uus kutse.'
            )}
          </p>
        ) : !localStorage.getItem('token') ? (
          <div className="mt-4 space-y-4">
            {claimed ? (
              <p className="rounded-lg bg-green-50 p-4 text-sm">
                {tr(
                  'Your company account is ready. Sign in with your company email and the password you just created. Return to this invitation to accept manager access.',
                  'Konto on valmis. Logi sisse töömeili ja äsja loodud parooliga ning kinnita kutse.'
                )}
              </p>
            ) : (
              <>
                <p className="text-sm">
                  {tr(
                    'If you already use SignalTrue, sign in using the company account HR invited. If HR imported your employee record but you have never signed in, create a password below. This will not grant team access until you accept the invitation.',
                    'Kui kasutad juba SignalTrued, logi sisse sama töömeiliga, millele kutse saadeti. Esmakordsel kasutamisel loo esmalt parool. Tiimi andmed avanevad pärast sisselogimist ja kutse kinnitamist.'
                  )}
                </p>
                <form onSubmit={claim} className="space-y-3">
                  <label className="block text-sm font-semibold">
                    {tr(
                      'New password for your invited company account',
                      'Uus parool töömeiliga seotud kontole'
                    )}
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
                    {tr('Create my company account', 'Loo konto')}
                  </button>
                </form>
              </>
            )}
            <Link
              to="/login"
              className="inline-block rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white"
            >
              {tr('Sign in with invited account', 'Logi sisse töömeiliga')}
            </Link>
            <p className="text-xs text-slate-500">
              {tr(
                'The one-time invitation remains tied to the HR-nominated email. Return to this page after signing in to accept the team assignment.',
                'Ühekordne kutse kehtib personalijuhi valitud töömeilile. Pärast sisselogimist saad kutse kinnitada.'
              )}
            </p>
          </div>
        ) : invite ? (
          <div className="mt-5 space-y-4">
            <p>
              {tr(
                'You have been invited to view aggregate work patterns for',
                'Sind kutsuti vaatama järgmise tiimi koondandmeid:'
              )}{' '}
              <strong>{invite.teamName}</strong>.
            </p>
            <p className="rounded-lg bg-blue-50 p-4 text-sm">
              {invite.purpose}. {invite.restrictions}.{' '}
              {tr(
                'Email subscription is separate from access permissions.',
                'E-posti tellimust saab eraldi muuta.'
              )}
            </p>
            <p className="text-sm text-slate-600">
              {tr('Invitation expires', 'Kutse kehtib kuni')}{' '}
              {new Date(invite.expiresAt).toLocaleDateString(language === 'et' ? 'et-EE' : 'en-GB')}
              . {tr('Terms version', 'Tingimuste versioon')}: {invite.termsVersion}.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(true)}
                className="rounded-lg bg-slate-900 px-5 py-3 font-bold text-white"
              >
                {tr('Accept scoped access', 'Võta kutse vastu')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => respond(false)}
                className="rounded-lg border border-slate-200 px-5 py-3 font-bold"
              >
                {tr('Decline', 'Keeldu kutsest')}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">
            {tr('Verifying invitation…', 'Kontrollin kutset…')}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {language === 'et'
              ? error.includes('password')
                ? 'Kontrolli parooli. Parool peab olema vähemalt 12 märki pikk.'
                : 'Kutset ei saanud kasutada. Kontrolli, kas oled õige töömeiliga sisse logitud ja kutse veel kehtib.'
              : error}
          </p>
        )}
      </div>
    </main>
  );
}
