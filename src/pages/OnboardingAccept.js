import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { API_BASE } from '../utils/api';

export default function OnboardingAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ name: '', password: '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) navigate('/');
  }, [token, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/onboarding/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to accept invite');
      setMsg({ type: 'success', text: 'Invitation accepted! You can now log in.' });
      localStorage.setItem('token', data.token);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (e) {
      setMsg({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, background: 'white', borderRadius: 12 }}>
      <h2>Accept Invitation</h2>
      {msg && <div style={{ marginBottom: 16, color: msg.type === 'error' ? '#991b1b' : '#065f46' }}>{msg.text}</div>}
      <form onSubmit={submit}>
        <input
          type="text"
          placeholder="Your Name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          required
          style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 6, border: '1px solid #e5e7eb' }}
        />
        <input
          type="password"
          placeholder="Set Password"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
          required
          style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 6, border: '1px solid #e5e7eb' }}
        />
        <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, borderRadius: 8, background: '#6366f1', color: 'white', border: 'none' }}>
          {loading ? 'Accepting…' : 'Accept Invitation'}
        </button>
      </form>
    </div>
  );
}
