import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function PlaybookRecommendations({ teamId }) {
  const [playbook, setPlaybook] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlaybook = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await api.get(`/playbook/${teamId}`);
        setPlaybook(res.data);
      } catch (err) {
        setPlaybook([]);
      } finally {
        setLoading(false);
      }
    };
    if (teamId) fetchPlaybook();
  }, [teamId]);

  if (loading) return <div>Loading playbook recommendations...</div>;
  if (!playbook.length) return <div>No recommendations at this time.</div>;

  return (
    <div style={{ margin: '24px 0' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 12 }}>AI Playbook & Recommendations</h3>
      {playbook.map((item, i) => (
        <div key={i} style={{ background: '#e0e7ff', border: '1px solid #a5b4fc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{item.title}</div>
          <div style={{ color: '#3730a3', fontSize: 15 }}>{item.recommendation}</div>
        </div>
      ))}
    </div>
  );
}
