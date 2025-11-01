import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function TimelineModal({ team, baseline, onClose, dark }) {
  const [history, setHistory] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [team._id, days]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await axios.get(`/api/teams/${team._id}/history?days=${days}`);
      // Format data for Recharts (newest first, but chart shows oldest to newest)
      const formatted = res.data.reverse().map(item => ({
        date: new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        bdi: item.bdi,
        timestamp: item.timestamp
      }));
      setHistory(formatted);
    } catch (err) {
      console.error('Failed to fetch history:', err);
      setHistory([]);
    }
    setLoading(false);
  }

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out'
  };

  const modalStyle = {
    backgroundColor: dark ? '#1f2937' : '#ffffff',
    color: dark ? '#f3f4f6' : '#111827',
    borderRadius: '16px',
    padding: '32px',
    maxWidth: '900px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    position: 'relative'
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: dark ? '#9ca3af' : '#6b7280',
    lineHeight: 1,
    padding: '4px 8px'
  };

  const headerStyle = {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: `2px solid ${dark ? '#374151' : '#e5e7eb'}`
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  };

  const statsRowStyle = {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  };

  const statCardStyle = {
    flex: '1',
    minWidth: '150px',
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: dark ? '#374151' : '#f9fafb',
    border: `1px solid ${dark ? '#4b5563' : '#e5e7eb'}`
  };

  const statLabelStyle = {
    fontSize: '12px',
    color: dark ? '#9ca3af' : '#6b7280',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const statValueStyle = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: dark ? '#f3f4f6' : '#111827'
  };

  const changeColor = baseline && baseline.percentChange > 0 ? '#10b981' : baseline && baseline.percentChange < 0 ? '#ef4444' : '#6b7280';

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <button style={closeButtonStyle} onClick={onClose}>×</button>
        
        <div style={headerStyle}>
          <h2 style={titleStyle}>{team.name} Timeline</h2>
          <p style={{ fontSize: '14px', color: dark ? '#9ca3af' : '#6b7280' }}>
            Burn-Down Index history and trend analysis
          </p>
        </div>

        {baseline && (
          <div style={statsRowStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Current BDI</div>
              <div style={statValueStyle}>{team.bdi}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Baseline BDI</div>
              <div style={statValueStyle}>{baseline.baselineBdi}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Change</div>
              <div style={{ ...statValueStyle, color: changeColor }}>
                {baseline.change >= 0 ? '+' : ''}{baseline.change} ({baseline.percentChange >= 0 ? '+' : ''}{baseline.percentChange.toFixed(1)}%)
              </div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Days Since Baseline</div>
              <div style={statValueStyle}>{baseline.daysSinceBaseline}</div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', fontWeight: '500' }}>Time Range:</label>
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: dark ? '1px solid #4b5563' : '1px solid #d1d5db',
              backgroundColor: dark ? '#374151' : 'white',
              color: dark ? 'white' : '#111827',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: dark ? '#9ca3af' : '#6b7280' }}>
            Loading history...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: dark ? '#9ca3af' : '#6b7280' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <p>No historical data available yet.</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Data snapshots are created automatically during Slack refreshes.
            </p>
          </div>
        ) : (
          <div style={{ width: '100%', height: '400px', marginTop: '24px' }}>
            <ResponsiveContainer>
              <LineChart data={history} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey="date" 
                  stroke={dark ? '#9ca3af' : '#6b7280'}
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke={dark ? '#9ca3af' : '#6b7280'}
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: dark ? '#374151' : '#ffffff',
                    border: `1px solid ${dark ? '#4b5563' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    color: dark ? '#f3f4f6' : '#111827'
                  }}
                />
                <Legend />
                {baseline && (
                  <ReferenceLine 
                    y={baseline.baselineBdi} 
                    stroke="#8b5cf6" 
                    strokeDasharray="5 5" 
                    label={{ value: 'Baseline', fill: '#8b5cf6', fontSize: 12 }}
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="bdi" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="BDI Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          backgroundColor: dark ? '#374151' : '#f9fafb',
          borderRadius: '12px',
          fontSize: '14px',
          color: dark ? '#d1d5db' : '#4b5563'
        }}>
          <strong>📈 About BDI Trends:</strong> The Burn-Down Index tracks team health over time. 
          Lower scores indicate better rhythm and sustainability. Snapshots are automatically created 
          during scheduled Slack data refreshes.
        </div>
      </div>
    </div>
  );
}
