import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

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
    const apiBase = api.defaults.baseURL;

    if (provider === 'slack') {
      target = `${apiBase}/integrations/slack/oauth/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}&redirect_uri=${encodeURIComponent(currentRedirect)}`;
    } else if (provider === 'google') {
      target = `${apiBase}/integrations/google/oauth/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
    } else if (provider === 'outlook' || provider === 'microsoft') {
      target = `${apiBase}/integrations/microsoft/oauth/callback?code=${encodeURIComponent(code)}${state ? `&state=${encodeURIComponent(state)}` : ''}`;
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
      
    </div>
  );
}
