import React, { useState, useEffect } from 'react';

export default function NarrativeSummary({ orgId, dark }) {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchNarrative = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8080/api/narrative/weekly/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch narrative');
      const data = await res.json();
      setNarrative(data.narrative);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) fetchNarrative();
  }, [orgId]);

  const containerStyle = {
    background: dark ? '#1f2937' : '#ffffff',
    color: dark ? '#f3f4f6' : '#111827',
    padding: '24px',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  };

  const headingStyle = {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const narrativeStyle = {
    fontSize: '15px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    color: dark ? '#d1d5db' : '#374151'
  };

  return (
    <div style={containerStyle}>
      <h2 style={headingStyle}>
        📝 Weekly Executive Summary
        <button 
          onClick={fetchNarrative} 
          disabled={loading}
          style={{
            marginLeft: 'auto',
            padding: '6px 12px',
            borderRadius: '8px',
            background: dark ? '#374151' : '#f3f4f6',
            color: dark ? '#d1d5db' : '#4b5563',
            border: 'none',
            fontSize: '13px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Generating...' : 'Refresh'}
        </button>
      </h2>
      {error && <div style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</div>}
      {narrative ? (
        <div style={narrativeStyle}>{narrative}</div>
      ) : (
        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
          {loading ? 'Generating narrative...' : 'Click Refresh to generate weekly summary'}
        </div>
      )}
    </div>
  );
}
