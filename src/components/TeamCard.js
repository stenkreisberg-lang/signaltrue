import React, { useState } from 'react';
import TimelineModal from './TimelineModal';
function DriverModal({ team, baseline, onClose, dark }) {
  const [drivers, setDrivers] = useState(team.driverWeights || {});
  const [seasonality, setSeasonality] = useState(team.seasonalityFlags || {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const last = team.bdiHistory && team.bdiHistory.length > 1 ? team.bdiHistory[1] : null;
  const current = team.bdiHistory && team.bdiHistory.length > 0 ? team.bdiHistory[0] : null;
  // Compute deltas for each driver
  const deltas = last && current ? Object.keys(drivers).map(key => ({
    key,
    prev: last.driverWeights?.[key] ?? null,
    curr: current.driverWeights?.[key] ?? null,
    delta: (current.driverWeights?.[key] ?? 0) - (last.driverWeights?.[key] ?? 0)
  })) : [];

  // Handler for editing driver weights
  const handleDriverChange = (key, value) => {
    setDrivers({ ...drivers, [key]: value });
  };
  // Handler for toggling seasonality
  const handleSeasonalityToggle = (key) => {
    setSeasonality({ ...seasonality, [key]: !seasonality[key] });
  };
  // Save changes to backend
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${team._id}/drivers`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ driverWeights: drivers, seasonalityFlags: seasonality })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save');
      }
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Responsive modal styles
  const modalOuterStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
  };
  const modalInnerStyle = {
    background: dark ? '#1f2937' : '#fff',
    color: dark ? '#f3f4f6' : '#111827',
    borderRadius: 16,
    padding: '24px 16px',
    minWidth: '90vw',
    maxWidth: 420,
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    margin: '0 8px',
    position: 'relative',
    top: 0,
    left: 0,
  };
  // Use media query for mobile
  const isMobile = window.innerWidth < 600;
  if (isMobile) {
    modalInnerStyle.minWidth = '96vw';
    modalInnerStyle.maxWidth = '98vw';
    modalInnerStyle.padding = '16px 4px';
    modalInnerStyle.fontSize = '15px';
  }
  const inputStyle = {
    width: isMobile ? 48 : 60,
    marginLeft: 8,
    fontSize: isMobile ? 15 : 16,
    padding: isMobile ? '4px 6px' : '6px 8px',
    borderRadius: 6,
    border: `1px solid ${dark ? '#4b5563' : '#d1d5db'}`,
    background: dark ? '#374151' : '#f3f4f6',
    color: dark ? '#d1d5db' : '#374151',
  };
  const buttonStyle = {
    marginLeft: 8,
    padding: isMobile ? '2px 8px' : '2px 10px',
    borderRadius: 6,
    background: dark ? '#374151' : '#f3f4f6',
    color: dark ? '#d1d5db' : '#374151',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: isMobile ? 15 : 16,
  };
  const saveButtonStyle = {
    marginTop: 8,
    padding: isMobile ? '8px 10px' : '8px 16px',
    borderRadius: 8,
    background: 'linear-gradient(135deg,#10b981,#60a5fa)',
    color: 'white',
    border: 'none',
    fontSize: isMobile ? 15 : 14,
    fontWeight: 500,
    cursor: 'pointer',
  };
  const closeButtonStyle = {
    marginTop: 8,
    padding: isMobile ? '8px 10px' : '8px 16px',
    borderRadius: 8,
    background: dark ? '#374151' : '#f3f4f6',
    color: dark ? '#d1d5db' : '#4b5563',
    border: `1px solid ${dark ? '#4b5563' : '#d1d5db'}`,
    fontSize: isMobile ? 15 : 14,
    fontWeight: 500,
    cursor: 'pointer',
  };
  const flexButtonsStyle = {
    display: isMobile ? 'block' : 'flex',
    gap: isMobile ? 0 : 12,
    width: '100%',
    marginTop: isMobile ? 12 : 0,
  };
  return (
    <div style={modalOuterStyle}>
      <div style={modalInnerStyle}>
        <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight:700, marginBottom:12 }}>Driver Decomposition</h2>
        <div style={{ marginBottom:18 }}>
          <strong>Edit Weights:</strong>
          <ul style={{ margin:'8px 0 0 0', padding:0, listStyle:'none' }}>
            {Object.keys(drivers).length === 0 && <li style={{color:'#9ca3af'}}>No driver weights set</li>}
            {Object.entries(drivers).map(([k,v]) => (
              <li key={k} style={{marginBottom:6}}>
                {k}: <input type="number" value={v} step="0.01" min="0" style={inputStyle} onChange={e => handleDriverChange(k, parseFloat(e.target.value))} />
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginBottom:18 }}>
          <strong>Edit Seasonality:</strong>
          <ul style={{ margin:'8px 0 0 0', padding:0, listStyle:'none' }}>
            {Object.keys(seasonality).length === 0 && <li style={{color:'#9ca3af'}}>No seasonality flags</li>}
            {Object.entries(seasonality).map(([k,v]) => (
              <li key={k} style={{marginBottom:6}}>
                {k}: <button onClick={() => handleSeasonalityToggle(k)} style={{...buttonStyle, background:v?'#10b981':'#d1d5db', color:v?'white':(dark?'#d1d5db':'#374151')}}>{v ? 'On' : 'Off'}</button>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginBottom:18 }}>
          <strong>What Changed (vs last):</strong>
          <ul style={{ margin:'8px 0 0 0', padding:0, listStyle:'none' }}>
            {deltas.length === 0 && <li style={{color:'#9ca3af'}}>No previous snapshot</li>}
            {deltas.map(d => (
              <li key={d.key}>{d.key}: {d.prev} → {d.curr} <span style={{color:d.delta>0?'#10b981':d.delta<0?'#ef4444':'#6b7280',fontWeight:600}}>({d.delta>0?'+':''}{d.delta})</span></li>
            ))}
          </ul>
        </div>
        {error && <div style={{color:'#ef4444',marginBottom:8}}>{error}</div>}
        <div style={flexButtonsStyle}>
          <button onClick={onClose} disabled={saving} style={closeButtonStyle}>Close</button>
          <button onClick={handleSave} disabled={saving} style={saveButtonStyle}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function TeamCard({ team, baseline, onAnalyze, dark }) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showDriver, setShowDriver] = useState(false);
  const zoneConfig = {
    Recovery: { 
      color: '#86efac', 
      bg: dark ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.1))' : 'linear-gradient(135deg, #d1fae5, #a7f3d0)'
    },
    Stable: { 
      color: '#93c5fd', 
      bg: dark ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1))' : 'linear-gradient(135deg, #dbeafe, #bfdbfe)'
    },
    Watch: { 
      color: '#fde68a', 
      bg: dark ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(251, 191, 36, 0.1))' : 'linear-gradient(135deg, #fef3c7, #fde68a)'
    },
    Surge: { 
      color: '#fca5a5', 
      bg: dark ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.1))' : 'linear-gradient(135deg, #fee2e2, #fecaca)'
    }
  };

  const config = zoneConfig[team.zone] || zoneConfig.Stable;
  const trendArrow = team.trend > 0 ? '↑' : team.trend < 0 ? '↓' : '→';
  const trendColor = team.trend > 0 ? '#10b981' : team.trend < 0 ? '#ef4444' : '#6b7280';

  const cardStyle = {
    background: config.bg,
    backgroundColor: dark ? '#1f2937' : '#ffffff',
    color: dark ? '#f3f4f6' : '#111827',
    padding: '20px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    minHeight: '180px'
  };

  const circleStyle = {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: config.color,
    boxShadow: `0 0 8px ${config.color}60`,
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };

  return (
    <>
      {showTimeline && (
        <TimelineModal 
          team={team} 
          baseline={baseline}
          onClose={() => setShowTimeline(false)} 
          dark={dark} 
        />
      )}
      {showDriver && (
        <DriverModal 
          team={team}
          baseline={baseline}
          onClose={() => setShowDriver(false)}
          dark={dark}
        />
      )}
      <div 
        style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{team.name}</h3>
          <p style={{ fontSize: '14px', color: dark ? '#9ca3af' : '#6b7280' }}>
            BDI <span style={{ fontWeight: '600' }}>{team.bdi}</span>
          </p>
          {baseline && (
            <p style={{ 
              fontSize: '12px', 
              color: baseline.percentChange <= 0 ? '#10b981' : '#ef4444',
              marginTop: '4px',
              fontWeight: '500'
            }}>
              {baseline.percentChange <= 0 ? '↓' : '↑'} {Math.abs(baseline.percentChange).toFixed(1)}% vs baseline • {baseline.daysSinceBaseline}d
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ 
            fontSize: '12px', 
            padding: '4px 8px', 
            borderRadius: '12px', 
            backgroundColor: dark ? '#374151' : 'rgba(255,255,255,0.8)',
            color: dark ? '#d1d5db' : '#374151'
          }}>
            {team.zone}
          </span>
          <div style={circleStyle} />
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: '16px', 
        paddingTop: '12px', 
        borderTop: `1px solid ${dark ? '#374151' : '#e5e7eb'}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: trendColor }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{trendArrow}</span>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>{Math.abs(team.trend)}%</span>
          </div>
          {team.favorite && <span style={{ fontSize: '18px' }}>⭐</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowTimeline(true)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: dark ? '#374151' : '#f3f4f6',
              color: dark ? '#d1d5db' : '#4b5563',
              border: `1px solid ${dark ? '#4b5563' : '#d1d5db'}`,
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark ? '#4b5563' : '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = dark ? '#374151' : '#f3f4f6';
            }}
          >
            📊 Timeline
          </button>
          <button 
            onClick={() => setShowDriver(true)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #10b981, #60a5fa)',
              color: 'white',
              border: 'none',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              marginLeft: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #2563eb)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #60a5fa)'}
          >
            🧮 Drivers
          </button>
          <button 
            onClick={() => onAnalyze(team._id)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #6366f1, #8b5cf6)'}
          >
            Analyze
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
