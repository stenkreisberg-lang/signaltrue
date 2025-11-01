import React, { useState, useEffect } from 'react';

function TeamMembers() {
  const [members, setMembers] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', password: '', role: 'viewer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/team-members', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch team members');

      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/team-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newMember),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add member');
      }

      // Reset form and refresh list
      setNewMember({ name: '', email: '', password: '', role: 'viewer' });
      setShowAddForm(false);
      fetchMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/team-members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete member');
      }

      fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'viewer' : 'admin';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/team-members/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update member');
      }

      fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Team Members</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={styles.addButton}
          >
            {showAddForm ? 'Cancel' : '+ Add Member'}
          </button>
        )}
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      {showAddForm && isAdmin && (
        <form onSubmit={handleAddMember} style={styles.form}>
          <h3 style={styles.formTitle}>Add New Member</h3>
          <div style={styles.formGrid}>
            <input
              type="text"
              placeholder="Full Name"
              value={newMember.name}
              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              required
              style={styles.input}
            />
            <input
              type="email"
              placeholder="Email"
              value={newMember.email}
              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
              required
              style={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              value={newMember.password}
              onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
              required
              minLength={6}
              style={styles.input}
            />
            <select
              value={newMember.role}
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              style={styles.input}
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button type="submit" disabled={loading} style={styles.submitButton}>
            {loading ? 'Adding...' : 'Add Member'}
          </button>
        </form>
      )}

      <div style={styles.membersList}>
        {members.map((member) => (
          <div key={member._id} style={styles.memberCard}>
            <div style={styles.memberInfo}>
              <div style={styles.memberName}>{member.name}</div>
              <div style={styles.memberEmail}>{member.email}</div>
            </div>
            <div style={styles.memberActions}>
              <span
                style={{
                  ...styles.badge,
                  ...(member.role === 'admin' ? styles.badgeAdmin : styles.badgeViewer),
                }}
              >
                {member.role}
              </span>
              {isAdmin && (
                <>
                  <button
                    onClick={() => handleToggleRole(member._id, member.role)}
                    style={styles.actionButton}
                    title={`Change to ${member.role === 'admin' ? 'viewer' : 'admin'}`}
                  >
                    🔄
                  </button>
                  <button
                    onClick={() => handleDeleteMember(member._id)}
                    style={{ ...styles.actionButton, ...styles.deleteButton }}
                    title="Remove member"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div style={styles.emptyState}>
            <p>No team members found</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    marginTop: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    color: '#1a1a1a',
  },
  addButton: {
    padding: '0.5rem 1rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  form: {
    background: '#f9fafb',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  formTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    color: '#374151',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
    marginBottom: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '1rem',
    outline: 'none',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    width: '100%',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  memberCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '0.25rem',
  },
  memberEmail: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  memberActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  badgeAdmin: {
    background: '#dbeafe',
    color: '#1e40af',
  },
  badgeViewer: {
    background: '#e5e7eb',
    color: '#374151',
  },
  actionButton: {
    padding: '0.375rem',
    background: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'background 0.2s',
  },
  deleteButton: {
    borderColor: '#fca5a5',
  },
  emptyState: {
    padding: '3rem',
    textAlign: 'center',
    color: '#6b7280',
  },
};

export default TeamMembers;
