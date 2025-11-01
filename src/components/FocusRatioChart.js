import React, { useState, useEffect } from 'react';

export default function FocusRatioChart({ teamId, dark }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8080/api/focus/team/${teamId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Focus ratio fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) fetchData();
  }, [teamId]);

  if (loading) return <div style={{ color: dark ? '#9ca3af' : '#6b7280' }}>Loading focus data...</div>;
  if (!data) return null;

  const containerStyle = {
    background: dark ? '#1f2937' : '#ffffff',
    color: dark ? '#f3f4f6' : '#111827',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '16px'
  };

  const ratio = data.current.ratio;
  const ratioColor = ratio >= 2 ? '#10b981' : ratio >= 1 ? '#f59e0b' : '#ef4444';

  return (
    <div style={containerStyle}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>⏱️ Focus-to-Meeting Ratio</h3>
      <div style={{ display: 'flex', gap: '24px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: dark ? '#9ca3af' : '#6b7280' }}>Focus Hours</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{data.current.focusHours}h</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: dark ? '#9ca3af' : '#6b7280' }}>Meeting Hours</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{data.current.meetingHours}h</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: dark ? '#9ca3af' : '#6b7280' }}>Ratio</div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: ratioColor }}>{ratio || 'N/A'}</div>
        </div>
      </div>
      <div style={{ fontSize: '13px', color: dark ? '#d1d5db' : '#4b5563', fontStyle: 'italic' }}>
        {data.recommendation}
      </div>
      {data.historical && data.historical.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Last 12 Weeks Trend</div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '60px' }}>
            {data.historical.map((h, i) => (
              <div key={i} style={{ 
                flex: 1, 
                background: h.ratio >= 1.5 ? '#10b981' : h.ratio >= 1 ? '#f59e0b' : '#ef4444',
                height: `${Math.min(100, h.ratio * 30)}%`,
                borderRadius: '4px 4px 0 0'
              }} title={`${new Date(h.date).toLocaleDateString()}: ${h.ratio.toFixed(2)}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
