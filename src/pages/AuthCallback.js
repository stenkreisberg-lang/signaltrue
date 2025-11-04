import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { API_BASE } from '../utils/api';

export default function AuthCallback() {
  const { provider } = useParams();
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    if (!provider || !code) return;

    // Where to send the browser to complete token exchange
    let target = '';
    const currentRedirect = `${window.location.origin}/auth/${provider}/callback`;
    // Safety: if API_BASE still points to localhost in prod for any reason, override to Render
    const apiBase = (API_BASE.includes('localhost') && window.location.hostname !== 'localhost')
      ? 'https://signaltrue-backend.onrender.com'
      : API_BASE;

    if (provider === 'slack') {
      target = `${apiBase}/api/integrations/slack/oauth/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}&redirect_uri=${encodeURIComponent(currentRedirect)}`;
    } else if (provider === 'google') {
      target = `${apiBase}/api/integrations/google/oauth/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
    } else if (provider === 'outlook' || provider === 'microsoft') {
      target = `${apiBase}/api/integrations/microsoft/oauth/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
    }

    if (target) {
      // Navigate so backend can exchange code and then redirect back to app
      window.location.replace(target);
    }
  }, [provider, params]);

  return (
    <div style={{padding: 24}}>
      <h2>Completing {(useParams().provider || 'integration').toString()} connection…</h2>
      <p>Please wait a moment. If you are not redirected automatically, you can safely close this tab and return to SignalTrue.</p>
      {/* Debug hint if API_BASE appears localhost while on production domain */}
      {API_BASE.includes('localhost') && window.location.hostname !== 'localhost' && (
        <div style={{marginTop:12,color:'#b45309',background:'#fffbeb',border:'1px solid #f59e0b',padding:12,borderRadius:8}}>
          Heads up: detected localhost API base in production. Using fallback backend URL automatically.
        </div>
      )}
    </div>
  );
}
