import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GoogleCalendarConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/calendar/events', {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    window.location.href = '/auth/google';
  };

  return (
    <div>
      <h2>Connect Calendar</h2>
      <p>Analyze meeting load and focus time patterns</p>
      {isConnected ? (
        <div>
          <p style={{ color: 'green' }}>Connected</p>
          <button onClick={() => {
            // Placeholder for disconnect logic
            setIsConnected(false); 
            alert('Disconnect logic not implemented yet.');
          }}>Disconnect</button>
          <h3>Upcoming Events:</h3>
          <ul>
            {events.map(event => (
              <li key={event.id}>{event.summary} ({new Date(event.start.dateTime).toLocaleString()})</li>
            ))}
          </ul>
        </div>
      ) : (
        <button onClick={handleConnect}>Connect Google Calendar</button>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;
