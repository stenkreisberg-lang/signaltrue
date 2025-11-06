import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';

// Admin onboarding flow for HR Admin and IT Admin
export default function AdminOnboarding() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [status, setStatus] = useState(null);
  const [integrations, setIntegrations] = useState(null);
  const [invite, setInvite] = useState({ email: '', role: 'it_admin' });
  const [pendingInvites, setPendingInvites] = useState([]);
  const [msg, setMsg] = useState(null);

  // Safety: ensure any API calls in this component never use localhost in prod
  const safeAPI = (API_BASE.includes('localhost') && window.location.hostname !== 'localhost')
    ? 'https://signaltrue-backend.onrender.com'
    : API_BASE;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    const load = async () => {
      try {
        const meRes = await fetch(`${safeAPI}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!meRes.ok) throw new Error('Auth required');
        const meData = await meRes.json();
        setMe(meData);

        const stRes = await fetch(`${safeAPI}/api/onboarding/status`, { headers: { Authorization: `Bearer ${token}` } });
        if (stRes.ok) setStatus(await stRes.json());

        const iRes = await fetch(`${safeAPI}/api/integrations/status${meData?.orgId ? `?orgId=${meData.orgId}` : ''}`);
        if (iRes.ok) setIntegrations(await iRes.json());

        // Try to fetch pending invites, but don't fail if backend unreachable
        try {
          const listRes = await fetch(`${safeAPI}/api/invites/pending`);
          const contentType = listRes.headers.get('content-type');
          if (listRes.ok && contentType?.includes('application/json')) {
            setPendingInvites(await listRes.json());
          }
        } catch (err) {
          console.warn('Could not load pending invites:', err);
        }
      } catch (e) {
        console.error('Load error:', e);
        navigate('/login');
      }
    };
    load();
  }, [navigate]);

  // OAuth URLs using env vars
  const SLACK_CLIENT_ID = process.env.REACT_APP_SLACK_CLIENT_ID;
  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const OUTLOOK_CLIENT_ID = process.env.REACT_APP_OUTLOOK_CLIENT_ID;
  const FRONTEND_URL = window.location.origin;

  // Safety: ensure backend URL is correct in production
  const backendUrl = (API_BASE.includes('localhost') && window.location.hostname !== 'localhost')
    ? 'https://signaltrue-backend.onrender.com'
    : API_BASE;

  const slackOAuthUrl = SLACK_CLIENT_ID
    ? `https://slack.com/oauth/v2/authorize?client_id=${SLACK_CLIENT_ID}&scope=channels:read,groups:read,users:read,chat:write,team:read&redirect_uri=${FRONTEND_URL}/auth/slack/callback`
    : null;
  // Use backend's OAuth start endpoint for proper state handling
  // Always use 'default' as orgSlug to avoid creating duplicate orgs with ObjectId slugs
  const googleOAuthUrl = GOOGLE_CLIENT_ID
    ? `${backendUrl}/api/integrations/google/oauth/start?scope=calendar&orgSlug=default`
    : null;
  const outlookOAuthUrl = OUTLOOK_CLIENT_ID
    ? `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${OUTLOOK_CLIENT_ID}&response_type=code&redirect_uri=${FRONTEND_URL}/auth/outlook/callback&scope=offline_access https://outlook.office.com/calendars.read https://outlook.office.com/mail.read https://outlook.office.com/user.read`
    : null;

  // Modal state for Slack connection
  const [showSlackModal, setShowSlackModal] = useState(false);

  const oauth = (provider) => {
    if (provider === 'slack') {
      if (!slackOAuthUrl) {
        setMsg({ type: 'error', text: 'Slack OAuth is not configured. Please set REACT_APP_SLACK_CLIENT_ID.' });
        return;
      }
      setShowSlackModal(true);
    } else if (provider === 'calendar') {
      if (!googleOAuthUrl) {
        setMsg({ type: 'error', text: 'Google OAuth is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID.' });
        return;
      }
      window.location.href = googleOAuthUrl;
    } else if (provider === 'outlook') {
      if (!outlookOAuthUrl) {
        setMsg({ type: 'error', text: 'Outlook OAuth is not configured. Please set REACT_APP_OUTLOOK_CLIENT_ID.' });
        return;
      }
      window.location.href = outlookOAuthUrl;
    }
  };

  const submitInvite = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch(`${safeAPI}/api/invites/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invite)
      });
      
      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Backend is not reachable. Please ensure the API server is running.');
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to invite');
      setMsg({ type: 'success', text: `Invite created for ${data.email} (role: ${data.role}). Token: ${data.token}` });
      // refresh list
      const listRes = await fetch(`${safeAPI}/api/invites/pending`);
      if (listRes.ok) setPendingInvites(await listRes.json());
      setInvite({ email: '', role: invite.role });
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    }
  };

  if (!me) return null;

  const isHR = ['admin','hr_admin','master_admin'].includes(me.role);
  const isIT = me.role === 'it_admin';
  const integrationsComplete = !!status?.integrationsComplete;

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>Client Admin Onboarding</h1>
        <div style={{ color: '#6b7280' }}>Signed in as {me.name || me.email} • Role: <strong>{me.role}</strong></div>
      </div>

      {/* Configuration warning if OAuth not set up */}
      {(!SLACK_CLIENT_ID || !GOOGLE_CLIENT_ID || !OUTLOOK_CLIENT_ID) && (
        <div style={{
          marginBottom: 16,
          padding: '12px 14px',
          borderRadius: 8,
          border: '1px solid #fcd34d',
          background: '#fef3c7',
          color: '#78350f'
        }}>
          ⚠️ OAuth configuration incomplete. Contact your system administrator to set up integration credentials.
        </div>
      )}

      {msg && (
        <div style={{
          marginBottom: 16,
          padding: '12px 14px',
          borderRadius: 8,
          border: '1px solid',
          borderColor: msg.type === 'error' ? '#fecaca' : '#bbf7d0',
          background: msg.type === 'error' ? '#fee2e2' : '#ecfdf5',
          color: msg.type === 'error' ? '#991b1b' : '#065f46'
        }}>{msg.text}</div>
      )}

      {/* Step 1: Integrations */}
      <section style={styles.section}>
        <h2 style={styles.h2}>1) Connect Integrations</h2>
        <p style={styles.p}>Slack is required and at least one calendar provider (Google Calendar or Microsoft Outlook).</p>
        <div style={styles.grid}>
                    <Card title={`Slack ${integrations?.connected?.slack ? '✓' : ''}`} desc="Workspace collaboration insights">
            {integrations?.connected?.slack ? (
              <div style={styles.ok}>Connected</div>
            ) : (
              <button style={styles.btn} onClick={() => oauth('slack')}>Connect Slack</button>
            )}
            {showSlackModal && (
              <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <div style={{background:'white',padding:32,borderRadius:12,maxWidth:400}}>
                  <h3 style={{marginTop:0}}>Connect Slack</h3>
                  <ol style={{margin:'12px 0',paddingLeft:20}}>
                    <li>Click "Authorize Slack Workspace".</li>
                    <li>Approve SignalTrue to access your workspace's public channels (read-only).</li>
                    <li>You'll be redirected back here automatically and the first sync will begin.</li>
                  </ol>
                  <div style={{marginBottom:12}}>Need help? Contact your IT admin.</div>
                  <button style={styles.btn} onClick={()=>{window.location.href=slackOAuthUrl}}>Authorize Slack Workspace</button>
                  <button style={{marginLeft:8,padding:'8px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#f3f4f6',color:'#374151'}} onClick={()=>setShowSlackModal(false)}>Cancel</button>
                </div>
              </div>
            )}
          </Card>
          <Card title={`Google Calendar ${integrations?.connected?.calendar ? '✓' : ''}`} desc="Meeting load & focus time">
            {integrations?.connected?.calendar ? (
              <div style={styles.ok}>Connected</div>
            ) : (
              <button style={styles.btn} onClick={() => oauth('calendar')}>Connect Google Calendar</button>
            )}
          </Card>
          <Card title={`Microsoft Outlook ${integrations?.connected?.outlook ? '✓' : ''}`} desc="Outlook calendar & email metadata">
            {integrations?.connected?.outlook ? (
              <div style={styles.ok}>Connected</div>
            ) : (
               <button style={styles.btn} onClick={() => oauth('outlook')}>Connect Outlook</button>
            )}
          </Card>
        </div>
      </section>

      {/* Step 2: Invite IT Admin (optional) */}
      {isHR && (
        <section style={styles.section}>
          <p style={styles.p}>If you prefer, invite an IT Admin to complete integrations.</p>
          <form onSubmit={submitInvite} style={styles.formRow}>
            <input type="email" placeholder="it.admin@company.com" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required style={styles.input} />
            <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })} style={styles.input}>
              <option value="it_admin">IT Admin</option>
              <option value="hr_admin">HR Admin</option>
              <option value="team_member">Team Member</option>
            </select>
            <button type="submit" style={styles.btn}>Create Invite</button>
          </form>
          {pendingInvites.length > 0 && (
            <div style={{ marginTop: 12, color: '#6b7280' }}>Pending invites: {pendingInvites.map(i => `${i.email} (${i.role})`).join(', ')}</div>
          )}
        </section>
      )}

      {/* Step 3: Team Management unlocked */}
      <section style={styles.section}>
        <h2 style={styles.h2}>3) Team Management</h2>
        {integrationsComplete ? (
          <div style={styles.successBox}>
            <div>All required integrations are connected. You can proceed to Team Management.</div>
            {isHR && (
              <button style={{...styles.btn, marginTop: 10}} onClick={() => navigate('/dashboard')}>Open Dashboard</button>
            )}
          </div>
        ) : (
          <div style={styles.blockedBox}>
            <div>Team Management is locked until Slack and one calendar provider are connected.</div>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ title, desc, children }) {
  return (
    <div style={styles.card}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ color: '#6b7280', marginBottom: 12 }}>{desc}</div>
      {children}
    </div>
  );
}

const styles = {
  wrap: { maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' },
  header: { marginBottom: 24 },
  section: { margin: '24px 0' },
  h2: { margin: '0 0 8px', fontSize: 20 },
  p: { color: '#6b7280', margin: '0 0 12px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))', gap: 16 },
  card: { background: 'white', border: '1px solid #e5e7eb', padding: 16, borderRadius: 8 },
  btn: { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' },
  ok: { display:'inline-block', padding:'6px 10px', borderRadius: 999, background:'#DCFCE7', color:'#166534', fontWeight:600 },
  formRow: { display: 'flex', gap: 8, alignItems: 'center' },
  input: { border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 12px', flex: 1 },
  successBox: { border: '1px solid #bbf7d0', background: '#ecfdf5', color: '#065f46', padding: 16, borderRadius: 8 },
  blockedBox: { border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', padding: 16, borderRadius: 8 }
};
