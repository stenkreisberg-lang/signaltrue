import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface Organization {
  id: string;
  name: string;
  slug?: string;
  domain?: string;
  industry?: string;
  subscription?: { plan: string; status: string };
  trial?: { isActive: boolean; phase: string; daysRemaining: number };
  pilot?: { isActive: boolean; endDate: string; months: number };
  integrations?: {
    slack: boolean;
    slackTeam?: string;
    google: boolean;
    googleChat: boolean;
    microsoft: boolean;
    microsoftScope?: string;
    jira: boolean;
    asana: boolean;
    hubspot: boolean;
    pipedrive: boolean;
    gmail: boolean;
    notion: boolean;
  };
  integrationsConnected?: number;
  userCount: number;
  teamCount: number;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  orgId?: string;
  orgName?: string;
  createdAt: string;
}

interface Stats {
  totals: { organizations: number; users: number; teams: number };
  usersByRole: Record<string, number>;
  trialPhases: Record<string, number>;
  integrations: { withSlack: number; withGoogle: number };
  recentActivity: { usersLast7Days: number; orgsLast7Days: number };
}

const SuperadminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'users'>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const checkAccess = useCallback(async () => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (user?.role !== 'master_admin') {
        setError('Access denied. Superadmin role required.');
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/stats');
      setStats(response.data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await api.get('/superadmin/organizations');
      setOrganizations(response.data.organizations);
    } catch (err: any) {
      console.error('Failed to fetch organizations:', err);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const query = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
      const response = await api.get(`/superadmin/users${query}`);
      setUsers(response.data.users);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  }, [searchQuery]);

  useEffect(() => {
    const init = async () => {
      const hasAccess = await checkAccess();
      if (!hasAccess) {
        setLoading(false);
        return;
      }

      await Promise.all([fetchStats(), fetchOrganizations(), fetchUsers()]);
      setLoading(false);
    };

    init();
  }, [checkAccess, fetchStats, fetchOrganizations, fetchUsers]);

  const handleImpersonate = async (userId: string) => {
    if (!window.confirm('This will create a temporary token to act as this user. Continue?')) {
      return;
    }

    try {
      const response = await api.post(`/superadmin/impersonate/${userId}`);
      const { token, user } = response.data;

      // Store impersonation token
      localStorage.setItem('impersonation_token', localStorage.getItem('token') || '');
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      alert(`Now impersonating ${user.email}. Refresh to see their dashboard.`);
      navigate('/dashboard');
    } catch (err: any) {
      alert('Failed to impersonate: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleGrantPilot = async (orgId: string, orgName: string) => {
    const months = window.prompt(
      `Grant pilot access to "${orgName}".\n\nEnter number of months (default: 6):`,
      '6'
    );
    if (months === null) return; // Cancelled

    const monthsNum = parseInt(months) || 6;

    if (
      !window.confirm(
        `Grant ${monthsNum}-month FREE pilot to "${orgName}"?\n\nThis will:\n• Skip trial limitations\n• Give full platform access\n• Set subscription to "pilot" plan`
      )
    ) {
      return;
    }

    try {
      await api.post(`/superadmin/organizations/${orgId}/grant-pilot`, { months: monthsNum });
      alert(`✅ ${monthsNum}-month pilot granted to "${orgName}"!`);
      await fetchOrganizations(); // Refresh the list
    } catch (err: any) {
      alert('Failed to grant pilot: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleRevokePilot = async (orgId: string, orgName: string) => {
    if (
      !window.confirm(
        `Revoke pilot access from "${orgName}"?\n\nThis will return them to normal trial/subscription flow.`
      )
    ) {
      return;
    }

    try {
      await api.post(`/superadmin/organizations/${orgId}/revoke-pilot`);
      alert(`Pilot revoked from "${orgName}".`);
      await fetchOrganizations(); // Refresh the list
    } catch (err: any) {
      alert('Failed to revoke pilot: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading superadmin dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          <h2>Access Denied</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/dashboard')} style={styles.button}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.navLeft}>
            <span style={styles.logo}>SignalTrue</span>
            <span style={styles.badge}>Superadmin</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['overview', 'organizations', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div>
            {/* Welcome Banner */}
            <div style={styles.welcomeBanner}>
              <h1 style={styles.welcomeTitle}>Welcome, Superadmin 👋</h1>
              <p style={styles.welcomeSubtitle}>
                You have full system access to manage all organizations, users, and platform
                settings.
              </p>
            </div>

            {/* Quick Actions */}
            <div style={styles.quickActions}>
              <h3 style={styles.quickActionsTitle}>Your Superadmin Capabilities</h3>
              <div style={styles.capabilitiesGrid}>
                <div style={styles.capabilityCard}>
                  <span style={styles.capabilityIcon}>🏢</span>
                  <span style={styles.capabilityText}>View & manage all organizations</span>
                </div>
                <div style={styles.capabilityCard}>
                  <span style={styles.capabilityIcon}>👥</span>
                  <span style={styles.capabilityText}>View & manage all users</span>
                </div>
                <div style={styles.capabilityCard}>
                  <span style={styles.capabilityIcon}>🔑</span>
                  <span style={styles.capabilityText}>Impersonate any user</span>
                </div>
                <div style={styles.capabilityCard}>
                  <span style={styles.capabilityIcon}>📊</span>
                  <span style={styles.capabilityText}>Access system-wide analytics</span>
                </div>
                <div style={styles.capabilityCard}>
                  <span style={styles.capabilityIcon}>⚙️</span>
                  <span style={styles.capabilityText}>Monitor integrations status</span>
                </div>
                <div style={styles.capabilityCard}>
                  <span style={styles.capabilityIcon}>🔔</span>
                  <span style={styles.capabilityText}>Track trial & subscriptions</span>
                </div>
              </div>
            </div>

            <h2 style={styles.sectionTitle}>System Overview</h2>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.totals.organizations}</div>
                <div style={styles.statLabel}>Organizations</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.totals.users}</div>
                <div style={styles.statLabel}>Users</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.totals.teams}</div>
                <div style={styles.statLabel}>Teams</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.integrations.withSlack}</div>
                <div style={styles.statLabel}>With Slack</div>
              </div>
            </div>

            <h3 style={styles.subsectionTitle}>Recent Activity (7 days)</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.recentActivity.orgsLast7Days}</div>
                <div style={styles.statLabel}>New Orgs</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statValue}>{stats.recentActivity.usersLast7Days}</div>
                <div style={styles.statLabel}>New Users</div>
              </div>
            </div>

            <h3 style={styles.subsectionTitle}>Users by Role</h3>
            <div style={styles.statsGrid}>
              {Object.entries(stats.usersByRole).map(([role, count]) => (
                <div key={role} style={styles.statCard}>
                  <div style={styles.statValue}>{count}</div>
                  <div style={styles.statLabel}>{role}</div>
                </div>
              ))}
            </div>

            {/* Recent Organizations */}
            <h3 style={styles.subsectionTitle}>Recently Joined Organizations</h3>
            <div style={styles.recentOrgsContainer}>
              {organizations.length === 0 ? (
                <p style={styles.muted}>No organizations yet. New signups will appear here.</p>
              ) : (
                organizations.slice(0, 5).map((org) => (
                  <div key={org.id} style={styles.recentOrgCard}>
                    <div style={styles.recentOrgInfo}>
                      <strong style={styles.recentOrgName}>{org.name}</strong>
                      <span style={styles.recentOrgDate}>
                        Joined {new Date(org.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={styles.recentOrgStats}>
                      <span style={styles.recentOrgStat}>👥 {org.userCount} users</span>
                      <span style={styles.recentOrgStat}>
                        {org.integrations?.slack ? '✅ Slack' : '⏳ No Slack'}
                      </span>
                      <span style={org.trial?.isActive ? styles.badgeActive : styles.badgeInactive}>
                        {org.trial?.isActive ? org.trial.phase : 'Expired'}
                      </span>
                    </div>
                  </div>
                ))
              )}
              {organizations.length > 5 && (
                <button onClick={() => setActiveTab('organizations')} style={styles.viewAllButton}>
                  View all {organizations.length} organizations →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'organizations' && (
          <div>
            <h2 style={styles.sectionTitle}>Organizations ({organizations.length})</h2>

            <div style={styles.table}>
              <div style={styles.tableHeader}>
                <span style={{ flex: 2 }}>Name</span>
                <span style={{ flex: 1 }}>Users</span>
                <span style={{ flex: 1 }}>Trial</span>
                <span style={{ flex: 1 }}>Pilot</span>
                <span style={{ flex: 2.5 }}>Integrations</span>
                <span style={{ flex: 1.5 }}>Actions</span>
              </div>
              {organizations.map((org) => (
                <div key={org.id} style={styles.tableRow}>
                  <span style={{ flex: 2 }}>
                    <strong>{org.name}</strong>
                    {org.domain && <span style={styles.muted}> ({org.domain})</span>}
                  </span>
                  <span style={{ flex: 1 }}>{org.userCount}</span>
                  <span style={{ flex: 1 }}>
                    {org.trial?.isActive ? (
                      <span style={styles.badgeActive}>{org.trial.phase}</span>
                    ) : (
                      <span style={styles.badgeInactive}>Expired</span>
                    )}
                  </span>
                  <span style={{ flex: 1 }}>
                    {org.pilot?.isActive ? (
                      <span style={{ ...styles.badgeActive, backgroundColor: '#8b5cf6' }}>
                        ✓ {org.pilot.months}mo
                      </span>
                    ) : (
                      <span style={styles.muted}>—</span>
                    )}
                  </span>
                  <span style={{ flex: 2.5, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {org.integrations?.slack && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#611f69' }}>
                        Slack
                      </span>
                    )}
                    {org.integrations?.google && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#ea4335' }}>
                        GCal
                      </span>
                    )}
                    {org.integrations?.googleChat && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#34a853' }}>
                        GChat
                      </span>
                    )}
                    {org.integrations?.microsoft && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#00a4ef' }}>
                        {org.integrations.microsoftScope === 'teams'
                          ? 'Teams'
                          : org.integrations.microsoftScope === 'outlook'
                            ? 'Outlook'
                            : 'MS'}
                      </span>
                    )}
                    {org.integrations?.jira && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#0052cc' }}>
                        Jira
                      </span>
                    )}
                    {org.integrations?.asana && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#f06a6a' }}>
                        Asana
                      </span>
                    )}
                    {org.integrations?.hubspot && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#ff7a59' }}>
                        HubSpot
                      </span>
                    )}
                    {org.integrations?.pipedrive && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#017737' }}>
                        Pipedrive
                      </span>
                    )}
                    {org.integrations?.gmail && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#d44638' }}>
                        Gmail
                      </span>
                    )}
                    {org.integrations?.notion && (
                      <span style={{ ...styles.integrationBadge, backgroundColor: '#000' }}>
                        Notion
                      </span>
                    )}
                    {!org.integrationsConnected && (
                      <span style={styles.muted}>No integrations</span>
                    )}
                  </span>
                  <span style={{ flex: 1.5, display: 'flex', gap: '8px' }}>
                    {org.pilot?.isActive ? (
                      <button
                        onClick={() => handleRevokePilot(org.id, org.name)}
                        style={{
                          ...styles.button,
                          backgroundColor: '#ef4444',
                          padding: '4px 8px',
                          fontSize: '12px',
                        }}
                      >
                        Revoke Pilot
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGrantPilot(org.id, org.name)}
                        style={{
                          ...styles.button,
                          backgroundColor: '#8b5cf6',
                          padding: '4px 8px',
                          fontSize: '12px',
                        }}
                      >
                        Grant Pilot
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <h2 style={styles.sectionTitle}>Users ({users.length})</h2>

            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />

            <div style={styles.table}>
              <div style={styles.tableHeader}>
                <span style={{ flex: 2 }}>Name</span>
                <span style={{ flex: 2 }}>Email</span>
                <span style={{ flex: 1 }}>Role</span>
                <span style={{ flex: 2 }}>Organization</span>
                <span style={{ flex: 1 }}>Actions</span>
              </div>
              {users.map((user) => (
                <div key={user.id} style={styles.tableRow}>
                  <span style={{ flex: 2 }}>{user.name || '—'}</span>
                  <span style={{ flex: 2 }}>{user.email}</span>
                  <span style={{ flex: 1 }}>
                    <span
                      style={user.role === 'master_admin' ? styles.badgeAdmin : styles.badgeRole}
                    >
                      {user.role}
                    </span>
                  </span>
                  <span style={{ flex: 2, ...styles.muted }}>{user.orgName || 'No org'}</span>
                  <span style={{ flex: 1 }}>
                    <button
                      onClick={() => handleImpersonate(user.id)}
                      style={styles.smallButton}
                      title="Login as this user"
                    >
                      Impersonate
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#fff',
  },
  welcomeBanner: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    padding: '2rem',
    borderRadius: '16px',
    marginBottom: '2rem',
  },
  welcomeTitle: {
    fontSize: '28px',
    fontWeight: 700,
    margin: 0,
    marginBottom: '8px',
  },
  welcomeSubtitle: {
    fontSize: '16px',
    opacity: 0.9,
    margin: 0,
  },
  quickActions: {
    backgroundColor: '#1a1a2e',
    padding: '1.5rem',
    borderRadius: '12px',
    marginBottom: '2rem',
  },
  quickActionsTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '1rem',
    color: 'rgba(255,255,255,0.8)',
  },
  capabilitiesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  capabilityCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  capabilityIcon: {
    fontSize: '20px',
  },
  capabilityText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.9)',
  },
  recentOrgsContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  recentOrgCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 1.5rem',
    backgroundColor: '#1a1a2e',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  recentOrgInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  recentOrgName: {
    fontSize: '16px',
    color: '#fff',
  },
  recentOrgDate: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)',
  },
  recentOrgStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  recentOrgStat: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.7)',
  },
  viewAllButton: {
    backgroundColor: 'transparent',
    border: '1px dashed rgba(99, 102, 241, 0.5)',
    color: '#6366f1',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  nav: {
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    padding: '1rem 2rem',
  },
  navContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#6366f1',
  },
  badge: {
    backgroundColor: '#ef4444',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '1rem 2rem',
    backgroundColor: '#1a1a2e',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  tab: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.6)',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  tabActive: {
    backgroundColor: '#6366f1',
    color: 'white',
  },
  content: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },
  sectionTitle: {
    fontSize: '24px',
    fontWeight: 600,
    marginBottom: '1.5rem',
  },
  subsectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginTop: '2rem',
    marginBottom: '1rem',
    color: 'rgba(255,255,255,0.8)',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '1rem',
  },
  statCard: {
    backgroundColor: '#1a1a2e',
    padding: '1.5rem',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#6366f1',
  },
  statLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.6)',
    marginTop: '4px',
  },
  table: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  tableHeader: {
    display: 'flex',
    padding: '1rem',
    backgroundColor: 'rgba(255,255,255,0.05)',
    fontWeight: 600,
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
  },
  tableRow: {
    display: 'flex',
    padding: '1rem',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    alignItems: 'center',
    fontSize: '14px',
  },
  searchInput: {
    width: '100%',
    maxWidth: '400px',
    padding: '10px 16px',
    backgroundColor: '#1a1a2e',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px',
    marginBottom: '1rem',
  },
  muted: {
    color: 'rgba(255,255,255,0.5)',
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  badgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  badgeRole: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#6366f1',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  badgeAdmin: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  },
  integrationBadge: {
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  },
  smallButton: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(99, 102, 241, 0.5)',
    color: '#6366f1',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
  },
  error: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    textAlign: 'center' as const,
  },
  button: {
    backgroundColor: '#6366f1',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '1rem',
  },
};

export default SuperadminDashboard;
