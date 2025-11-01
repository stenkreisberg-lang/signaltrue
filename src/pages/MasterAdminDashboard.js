import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function MasterAdminDashboard() {
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAddOrgForm, setShowAddOrgForm] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', industry: '', size: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.isMasterAdmin) {
      navigate('/dashboard');
      return;
    }
    
    fetchOrganizations();
  }, [navigate]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/organizations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch organizations');
      const data = await response.json();
      setOrganizations(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchOrgDetails = async (orgId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch teams
      const teamsRes = await fetch(`http://localhost:8080/api/organizations/${orgId}/teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const teamsData = await teamsRes.json();
      setTeams(teamsData);

      // Fetch users
      const usersRes = await fetch(`http://localhost:8080/api/organizations/${orgId}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const usersData = await usersRes.json();
      setUsers(usersData);

      setSelectedOrg(orgId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddOrg = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOrg)
      });

      if (!response.ok) throw new Error('Failed to create organization');

      setNewOrg({ name: '', industry: '', size: '' });
      setShowAddOrgForm(false);
      fetchOrganizations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = async (orgId) => {
    if (!window.confirm('Are you sure? This will delete ALL teams and users in this organization!')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/organizations/${orgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete organization');

      setSelectedOrg(null);
      setTeams([]);
      setUsers([]);
      fetchOrganizations();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8080/api/team-members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete user');

      if (selectedOrg) {
        fetchOrgDetails(selectedOrg);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>👑 Master Admin Dashboard</h1>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          Back to Dashboard
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.layout}>
        {/* Organizations List */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <h2 style={styles.sidebarTitle}>Organizations</h2>
            <button onClick={() => setShowAddOrgForm(!showAddOrgForm)} style={styles.addButton}>
              {showAddOrgForm ? '✕' : '+ Add'}
            </button>
          </div>

          {showAddOrgForm && (
            <form onSubmit={handleAddOrg} style={styles.addForm}>
              <input
                type="text"
                placeholder="Organization Name"
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                required
                style={styles.input}
              />
              <input
                type="text"
                placeholder="Industry (required, e.g. SaaS, Healthcare)"
                value={newOrg.industry}
                onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
                required
                style={styles.input}
              />
              <select
                value={newOrg.size}
                onChange={(e) => setNewOrg({ ...newOrg, size: e.target.value })}
                style={styles.input}
              >
                <option value="">Select Size</option>
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-500">201-500 employees</option>
                <option value="500+">500+ employees</option>
              </select>
              <button type="submit" disabled={loading} style={styles.submitButton}>
                {loading ? 'Creating...' : 'Create Organization'}
              </button>
            </form>
          )}

          <div style={styles.orgList}>
            {organizations.map((org) => (
              <div
                key={org._id}
                style={{
                  ...styles.orgCard,
                  ...(selectedOrg === org._id ? styles.orgCardActive : {})
                }}
                onClick={() => fetchOrgDetails(org._id)}
              >
                <div style={styles.orgInfo}>
                  <div style={styles.orgName}>{org.name}</div>
                  <div style={styles.orgStats}>
                    {org.stats?.teams || 0} teams • {org.stats?.users || 0} users
                  </div>
                  <div style={styles.orgPlan}>{org.subscription?.plan || 'trial'}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteOrg(org._id);
                  }}
                  style={styles.deleteOrgButton}
                  title="Delete organization"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Organization Details */}
        <div style={styles.mainContent}>
          {selectedOrg ? (
            <>
              {/* Teams Section */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Teams ({teams.length})</h2>
                <div style={styles.grid}>
                  {teams.map((team) => (
                    <div key={team._id} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <h3>{team.name}</h3>
                        <span style={styles.zone}>{team.zone}</span>
                      </div>
                      <div style={styles.cardBody}>
                        <div>BDI: {team.bdi}</div>
                        <div>Trend: {team.trend > 0 ? '+' : ''}{team.trend}%</div>
                      </div>
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <div style={styles.emptyState}>No teams in this organization</div>
                  )}
                </div>
              </div>

              {/* Users Section */}
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Users ({users.length})</h2>
                <div style={styles.table}>
                  {users.map((user) => (
                    <div key={user._id} style={styles.userRow}>
                      <div style={styles.userInfo}>
                        <div style={styles.userName}>{user.name}</div>
                        <div style={styles.userEmail}>{user.email}</div>
                      </div>
                      <div style={styles.userMeta}>
                        <span style={styles.roleBadge}>{user.role}</span>
                        <span style={styles.teamName}>{user.teamId?.name || 'No team'}</span>
                        <button
                          onClick={() => handleDeleteUser(user._id)}
                          style={styles.deleteButton}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div style={styles.emptyState}>No users in this organization</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={styles.placeholder}>
              <div style={styles.placeholderIcon}>🏢</div>
              <h2>Select an organization to view details</h2>
              <p>Choose an organization from the list to manage its teams and users</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #111827, #1f2937)',
    padding: '2rem',
    color: '#e5e7eb',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  backButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  error: {
    background: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '2rem',
    minHeight: '600px',
  },
  sidebar: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem',
    height: 'fit-content',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sidebarTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
  },
  addButton: {
    padding: '0.375rem 0.75rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: '600',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1rem',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
  },
  input: {
    padding: '0.5rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '0.875rem',
  },
  submitButton: {
    padding: '0.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  orgList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  orgCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: '2px solid transparent',
  },
  orgCardActive: {
    background: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  orgStats: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  orgPlan: {
    fontSize: '0.75rem',
    color: '#fbbf24',
    textTransform: 'uppercase',
    marginTop: '0.25rem',
  },
  deleteOrgButton: {
    padding: '0.25rem 0.5rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem',
  },
  mainContent: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '2rem',
  },
  placeholder: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: '#9ca3af',
  },
  placeholderIcon: {
    fontSize: '4rem',
    marginBottom: '1rem',
  },
  section: {
    marginBottom: '3rem',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '1rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1rem',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '1rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  zone: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    background: 'rgba(99, 102, 241, 0.2)',
    color: '#a855f7',
  },
  cardBody: {
    fontSize: '0.875rem',
    color: '#9ca3af',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    marginBottom: '0.25rem',
  },
  userEmail: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
  userMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  roleBadge: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
    textTransform: 'uppercase',
  },
  teamName: {
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
  deleteButton: {
    padding: '0.25rem 0.5rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem',
  },
  emptyState: {
    padding: '2rem',
    textAlign: 'center',
    color: '#6b7280',
  },
};

export default MasterAdminDashboard;
