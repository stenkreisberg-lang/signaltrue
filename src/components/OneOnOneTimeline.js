import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function OneOnOneTimeline({ teamId, userId }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const token = localStorage.getItem('token');
        let url = `/oneonone?`;
        if (teamId) url += `teamId=${teamId}&`;
        if (userId) url += `userId=${userId}`;
        const res = await api.get(url);
        setList(res.data);
      } catch (err) {
        setList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchList();
  }, [teamId, userId]);

  if (loading) return <div>Loading 1:1 timeline...</div>;
  if (!list.length) return <div>No 1:1s found.</div>;

  return (
    <div style={{ margin: '24px 0' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 12 }}>1:1 Timeline & Feedback</h3>
      {list.map(one => (
        <div key={one._id} style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{new Date(one.date).toLocaleDateString()} — {one.notes}</div>
          {one.feedback && one.feedback.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {one.feedback.map((fb, i) => (
                <li key={i}><b>Feedback:</b> {fb.text} <span style={{ color: '#64748b', fontSize: 12 }}>({new Date(fb.createdAt).toLocaleString()})</span></li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
