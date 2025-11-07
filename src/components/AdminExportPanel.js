import React, { useEffect, useState } from 'react';
import { API_BASE } from '../utils/api';

export default function AdminExportPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin-export/users`, { headers: { 'Authorization': `Bearer ${token}` } });
      setUsers(await res.json());
      setLoading(false);
    }
    fetchUsers();
  }, []);

  return (
    <div style={{ margin: '24px 0', background: '#f9fafb', borderRadius: 8, padding: 16 }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 12 }}>Admin Controls & Data Export</h3>
      <a href={`${API_BASE}/api/admin-export/users/export`} target="_blank" rel="noopener noreferrer" style={{ marginRight: 16 }}>Export Users (CSV)</a>
      <a href={`${API_BASE}/api/admin-export/teams/export`} target="_blank" rel="noopener noreferrer">Export Teams (CSV)</a>
      <div style={{ marginTop: 16 }}>
        <b>All Users:</b>
        {loading ? <div>Loading...</div> : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {users.map(u => <li key={u._id}>{u.email} ({u.role})</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}
