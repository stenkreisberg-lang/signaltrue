import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../utils/api';

const GoogleCalendarConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get('/calendar/events');
        if (res.status === 200) {
          setIsConnected(true);
          setEvents(res.data);
        }
      } catch (error) {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  const handleConnect = () => {
    const token = localStorage.getItem('token');
    if (token) {
      // Pass the token as a query parameter
      window.location.href = `https://signaltrue-backend.onrender.com/api/auth/google?token=${token}`;
    } else {
      // Handle case where user is not logged in
      alert('You must be logged in to connect your calendar.');
    }
  };

  const handleDisconnect = () => {
    // Placeholder for disconnect logic
    setIsConnected(false);
    setEvents([]);
    alert('Disconnect logic not fully implemented on the frontend yet.');
  };

  return (
    <>
      <div style={styles.cardIcon}>📅</div>
      <h3 style={styles.cardTitle}>Connect Calendar {isConnected && <span style={styles.badgeConnected}>Connected</span>}</h3>
      
      {isConnected ? (
        <>
          <p style={styles.detailLine}>Provider: Google (Calendar)</p>
          <p style={styles.cardText}>
            Your Google Calendar is connected.
          </p>
          <button style={styles.disconnectBtn} onClick={handleDisconnect}>Disconnect</button>
          {events.length > 0 && (
            <div style={{textAlign: 'left', marginTop: '1rem'}}>
              <h4 style={{margin: '0 0 0.5rem 0'}}>Upcoming Events:</h4>
              <ul style={{paddingLeft: '1.2rem', margin: 0, fontSize: '14px', color: '#6b7280'}}>
                {events.map(event => (
                  <li key={event.id}>{event.summary} ({new Date(event.start.dateTime || event.start.date).toLocaleString()})</li>
                ))}
              </ul>
            </div>
          )}
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
    cursor: 'pointer',
    width: '100%'
  },
};

export default GoogleCalendarConnect;
