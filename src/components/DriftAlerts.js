import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function DriftAlerts({ teamId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get(`/drift-events/${teamId}`);
        setEvents(res.data);
      } catch (err) {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) fetchEvents();
  }, [teamId]);

  if (loading) return <div>Loading engagement change alerts...</div>;
  if (!events.length) return <div>No recent engagement change alerts.</div>;

  return (
    <div style={{ margin: '24px 0' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 12 }}>Engagement Change Alerts</h3>
      {events.map(ev => (
        <div key={ev._id} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
            {ev.metric} {ev.direction === 'positive' ? '↑' : '↓'} {ev.magnitude}%
          </div>
          <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
            {new Date(ev.date).toLocaleString()}
          </div>
          <div style={{ fontWeight: 500, marginBottom: 6 }}>Top Drivers:</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {ev.drivers && ev.drivers.map((d, i) => (
              <li key={i}>
                {d.metric}: {d.delta > 0 ? '+' : ''}{d.delta} ({d.direction === 'up' ? 'increase' : 'decrease'})
              </li>
            ))}
          </ul>
          {ev.recommendation && (
            <div style={{ marginTop: 8, color: '#6366f1', fontWeight: 500 }}>
              <span role="img" aria-label="tip">💡</span> {ev.recommendation}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
