import React, { useState, useEffect } from 'react';

export default function ResilienceScore({ orgId, dark }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8080/api/resilience/org/${orgId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Resilience fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    if (orgId) fetchData();
  }, [orgId]);

  if (loading) return <div style={{ color: dark ? '#9ca3af' : '#6b7280' }}>Loading resilience data...</div>;
  if (!data) return null;

  const containerStyle = {
    background: dark ? '#1f2937' : '#ffffff',
    color: dark ? '#f3f4f6' : '#111827',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  };

  const scoreColor = data.organizationalResilience >= 80 ? '#10b981' : data.organizationalResilience >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🛡️ Organizational Resilience Score
        <span style={{ 
          fontSize: '32px', 
          fontWeight: '700', 
          color: scoreColor,
          marginLeft: 'auto'
        }}>
          {data.organizationalResilience}
        </span>
      </h2>

      <div style={{ fontSize: '14px', color: dark ? '#d1d5db' : '#4b5563', marginBottom: '20px' }}>
        Measures how fast your teams bounce back from stress and their BDI stability over time.
      </div>

      <div style={{ marginTop: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Team Resilience Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.teams.slice(0, 5).map(team => {
            const teamColor = team.resilienceScore >= 80 ? '#10b981' : team.resilienceScore >= 60 ? '#f59e0b' : '#ef4444';
            return (
              <div key={team.teamId} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: dark ? '#374151' : '#f3f4f6',
                padding: '12px 16px',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '15px' }}>{team.teamName}</div>
                  <div style={{ fontSize: '12px', color: dark ? '#9ca3af' : '#6b7280' }}>
                    Volatility: {team.volatility}
                  </div>
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: teamColor
                }}>
                  {team.resilienceScore}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
