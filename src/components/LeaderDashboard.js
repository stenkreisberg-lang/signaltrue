import React, { useState, useEffect } from 'react';

export default function LeaderDashboard({ teamId, dark }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8080/api/leader/dashboard/${teamId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Leader dashboard fetch error', err);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) fetchData();
  }, [teamId]);

  if (loading) return <div style={{ color: dark ? '#9ca3af' : '#6b7280' }}>Loading leader dashboard...</div>;
  if (!data) return null;

  const containerStyle = {
    background: dark ? '#1f2937' : '#ffffff',
    color: dark ? '#f3f4f6' : '#111827',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  };

  const metricsStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  };

  const metricCardStyle = {
    background: dark ? '#374151' : '#f3f4f6',
    padding: '16px',
    borderRadius: '12px'
  };

  const statusColor = data.metrics.status === 'improving' ? '#10b981' : data.metrics.status === 'declining' ? '#ef4444' : '#f59e0b';

  return (
    <div style={containerStyle}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
        👨‍💼 Your Leadership Dashboard: {data.teamName}
      </h2>

      <div style={metricsStyle}>
        <div style={metricCardStyle}>
          <div style={{ fontSize: '12px', color: dark ? '#9ca3af' : '#6b7280', marginBottom: '4px' }}>BDI</div>
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{data.metrics.bdi}</div>
          <div style={{ fontSize: '11px', color: dark ? '#d1d5db' : '#4b5563' }}>{data.metrics.zone}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: '12px', color: dark ? '#9ca3af' : '#6b7280', marginBottom: '4px' }}>Trend</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: statusColor }}>{data.metrics.trend > 0 ? '+' : ''}{data.metrics.trend}%</div>
          <div style={{ fontSize: '11px', color: statusColor }}>{data.metrics.status}</div>
        </div>
      </div>

      {data.alerts && data.alerts.length > 0 && (
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          color: '#991b1b',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '14px'
        }}>
          🚨 {data.alerts.join(', ')}
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>Top Drivers</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {data.topDrivers.map((driver, i) => (
            <div key={i} style={{
              background: dark ? '#374151' : '#e5e7eb',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {driver.name}: <span style={{ fontWeight: '700' }}>{driver.weight}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>📋 Your Top 3 Leadership Focuses This Week</h3>
        <div style={{
          background: dark ? '#374151' : '#f9fafb',
          padding: '16px',
          borderRadius: '12px',
          fontSize: '15px',
          lineHeight: '1.7',
          whiteSpace: 'pre-wrap'
        }}>
          {data.leadershipFocuses}
        </div>
      </div>
    </div>
  );
}
