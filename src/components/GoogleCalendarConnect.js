import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const GoogleCalendarConnect = ({ integrations }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const googleConnected = integrations?.connected?.google || false;
    setIsConnected(googleConnected);
    if (googleConnected) {
      setUserEmail(integrations.details?.google?.email || '');
    }
  }, [integrations]);

  const handleConnect = () => {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = `https://signaltrue-backend.onrender.com/api/auth/google?token=${token}`;
    } else {
      alert('You must be logged in to connect your calendar.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/integrations/google/disconnect');
      setIsConnected(false);
      setUserEmail('');
      alert('Google Calendar disconnected. The dashboard will update on the next refresh.');
    } catch (error) {
      console.error('Failed to disconnect Google Calendar', error);
      alert('Could not disconnect Google Calendar. Please try again.');
    }
  };

  return (
    <>
      <div style={styles.cardIcon}>📅</div>
      <h3 style={styles.cardTitle}>Connect Calendar {isConnected && <span style={styles.badgeConnected}>Connected</span>}</h3>
      
      {isConnected ? (
        <>
          <p style={styles.detailLine}>Account: {userEmail}</p>
          <p style={styles.cardText}>
            Your Google Calendar is connected.
          </p>
          <button style={styles.disconnectBtn} onClick={handleDisconnect}>Disconnect</button>
        </>
      ) : (
        <>
          <p style={styles.cardText}>
            Analyze meeting load and focus time patterns
          </p>
          <button style={styles.cardButton} onClick={handleConnect}>
            Connect Google Calendar
          </button>
        </>
      )}
    </>
  );
};

// Styles copied from Dashboard.js for consistency
const styles = {
  cardIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '0.5rem',
  },
  cardText: {
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: '1.6',
  },
  cardButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
  },
  badgeConnected: {
    marginLeft: 8,
    fontSize: 12,
    padding: '2px 8px',
    background: '#DCFCE7',
    color: '#166534',
    borderRadius: 999
  },
  detailLine: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 10
  },
  disconnectBtn: {
    marginTop: 10,
    background: 'transparent',
    color: '#EF4444',
    border: '1px solid #FCA5A5',
    borderRadius: 8,
    padding: '0.5rem 0.75rem',
    fontWeight: 600,
    cursor: 'pointer'
  },
};

export default GoogleCalendarConnect;
