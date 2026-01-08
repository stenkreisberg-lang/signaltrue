import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const GoogleChatConnect = ({ integrations }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const googleChatConnected = integrations?.connected?.googleChat || false;
    setIsConnected(googleChatConnected);
    if (googleChatConnected) {
      setUserEmail(integrations.details?.googleChat?.email || '');
    }
  }, [integrations]);

  const handleConnect = () => {
    const token = localStorage.getItem('token');
    if (token) {
      const baseUrl = api.defaults.baseURL;
      window.location.href = `${baseUrl}/auth/google-chat?token=${token}`;
    } else {
      alert('You must be logged in to connect Google Chat.');
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.post('/integrations/google-chat/disconnect');
      setIsConnected(false);
      setUserEmail('');
      alert('Google Chat disconnected. The dashboard will update on the next refresh.');
    } catch (error) {
      console.error('Failed to disconnect Google Chat', error);
      alert('Could not disconnect Google Chat. Please try again.');
    }
  };

  return (
    <>
      <div style={styles.cardIcon}>💬</div>
      <h3 style={styles.cardTitle}>Connect Google Chat {isConnected && <span style={styles.badgeConnected}>Connected</span>}</h3>
      
      {isConnected ? (
        <>
          <p style={styles.detailLine}>Account: {userEmail}</p>
          <p style={styles.cardText}>
            Your Google Chat is connected. SignalTrue will analyze message patterns, response times, 
            and detect ad-hoc meetings from Google Meet links.
          </p>
          <button onClick={handleDisconnect} style={styles.btnSecondary}>
            Disconnect Google Chat
          </button>
        </>
      ) : (
        <>
          <p style={styles.cardText}>
            Connect your Google Chat workspace to analyze:
          </p>
          <ul style={styles.featureList}>
            <li>✓ Message response times</li>
            <li>✓ After-hours activity</li>
            <li>✓ Thread depth & interruptions</li>
            <li>✓ Team sentiment analysis</li>
            <li>✓ Ad-hoc meetings from Meet links</li>
          </ul>
          <p style={styles.privacyNote}>
            🔒 We only analyze metadata and patterns. Message content is never stored.
          </p>
          <button onClick={handleConnect} style={styles.btnPrimary}>
            Connect Google Chat
          </button>
        </>
      )}
    </>
  );
};

const styles = {
  cardIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    textAlign: 'center'
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '12px',
    color: '#1e293b',
    textAlign: 'center',
    position: 'relative'
  },
  badgeConnected: {
    display: 'inline-block',
    marginLeft: '8px',
    fontSize: '12px',
    fontWeight: 'normal',
    padding: '4px 8px',
    backgroundColor: '#10b981',
    color: 'white',
    borderRadius: '4px',
    verticalAlign: 'middle'
  },
  cardText: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
    lineHeight: '1.6'
  },
  detailLine: {
    fontSize: '14px',
    color: '#475569',
    marginBottom: '8px',
    fontWeight: '500'
  },
  featureList: {
    fontSize: '14px',
    color: '#64748b',
    marginBottom: '16px',
    paddingLeft: '20px',
    lineHeight: '1.8'
  },
  privacyNote: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '16px',
    fontStyle: 'italic'
  },
  btnPrimary: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  btnSecondary: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  }
};

export default GoogleChatConnect;
