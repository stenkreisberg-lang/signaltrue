import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface Team {
  _id: string;
  name: string;
  memberCount: number;
  metadata?: {
    function?: string;
    sizeBand?: string;
  };
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  teamId: string;
}

/**
 * TeamManagement - HR Admin component to:
 * - Create/edit/delete teams
 * - View team members
 * - Move users between teams
 * - Remove users from organization
 */
const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamFunction, setNewTeamFunction] = useState('Other');
  const [moveUserModal, setMoveUserModal] = useState<{ user: User | null; currentTeamId: string | null }>({ user: null, currentTeamId: null });
  const [selectedTargetTeam, setSelectedTargetTeam] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const response = await api.get('/team-management/organization');
      setTeams(response.data);
      
      // Auto-select first team if none selected
      if (!selectedTeam && response.data.length > 0) {
        selectTeam(response.data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const selectTeam = async (team: Team) => {
    try {
      setSelectedTeam(team);
      const response = await api.get(`/team-management/${team._id}`);
      setTeamMembers(response.data.members || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load team members');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    try {
      setError('');
      const response = await api.post('/team-management', {
        name: newTeamName,
        function: newTeamFunction
      });

      setSuccess('Team created successfully!');
      setNewTeamName('');
      setNewTeamFunction('Other');
      setShowCreateForm(false);
      
      setTimeout(() => setSuccess(''), 3000);
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create team');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!window.confirm('Are you sure you want to delete this team? All members must be moved to other teams first.')) {
      return;
    }

    try {
      setError('');
      await api.delete(`/team-management/${teamId}`);
      
      setSuccess('Team deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      setSelectedTeam(null);
      setTeamMembers([]);
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete team');
    }
  };

  const handleMoveUser = async (userId: string, userName: string, currentTeamId: string) => {
    const user = teamMembers.find(m => m._id === userId);
    if (!user) return;
    
    setMoveUserModal({ user, currentTeamId });
    setSelectedTargetTeam('');
  };

  const executeMoveUser = async () => {
    if (!moveUserModal.user || !selectedTargetTeam) return;

    try {
      setError('');
      await api.put(`/team-management/${selectedTargetTeam}/members/${moveUserModal.user._id}`);
      
      setSuccess('User moved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Close modal
      setMoveUserModal({ user: null, currentTeamId: null });
      setSelectedTargetTeam('');
      
      // Refresh team members
      if (selectedTeam) {
        selectTeam(selectedTeam);
      }
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to move user');
    }
  };

  const handleRemoveUser = async (userId: string, teamId: string) => {
    if (!window.confirm('Are you sure you want to remove this user from the organization entirely? This cannot be undone.')) {
      return;
    }

    try {
      setError('');
      await api.delete(`/team-management/${teamId}/members/${userId}`);
      
      setSuccess('User removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Refresh team members
      if (selectedTeam) {
        selectTeam(selectedTeam);
      }
      await loadTeams();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove user');
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading teams...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Team Management</h2>
          <p style={styles.subtitle}>Create teams, assign members, and manage your organization structure</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={styles.createButton}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create Team'}
        </button>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={styles.successBanner}>
          ✅ {success}
        </div>
      )}

      {showCreateForm && (
        <div style={styles.createForm}>
          <h3 style={styles.formTitle}>Create New Team</h3>
          <form onSubmit={handleCreateTeam}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Team Name *</label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g., Engineering, Sales, Marketing"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Function</label>
              <select
                value={newTeamFunction}
                onChange={(e) => setNewTeamFunction(e.target.value)}
                style={styles.select}
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Marketing">Marketing</option>
                <option value="Sales">Sales</option>
                <option value="Support">Support</option>
                <option value="Operations">Operations</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <button type="submit" style={styles.submitButton}>
              Create Team
            </button>
          </form>
        </div>
      )}

      <div style={styles.mainContent}>
        {/* Teams List */}
        <div style={styles.teamsList}>
          <h3 style={styles.sectionTitle}>Teams ({teams.length})</h3>
          {teams.map((team) => (
            <div
              key={team._id}
              style={{
                ...styles.teamCard,
                ...(selectedTeam?._id === team._id ? styles.teamCardActive : {}),
              }}
              onClick={() => selectTeam(team)}
            >
              <div>
                <div style={styles.teamName}>{team.name}</div>
                <div style={styles.teamMeta}>
                  {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                  {team.metadata?.function && ` • ${team.metadata.function}`}
                </div>
              </div>
              {team.memberCount === 0 && teams.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTeam(team._id);
                  }}
                  style={styles.deleteTeamButton}
                  title="Delete team"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}

          {teams.length === 0 && (
            <div style={styles.emptyState}>
              <p>No teams yet. Create your first team to get started!</p>
            </div>
          )}
        </div>

        {/* Team Members */}
        <div style={styles.membersPanel}>
          {selectedTeam ? (
            <>
              <div style={styles.membersPanelHeader}>
                <h3 style={styles.sectionTitle}>{selectedTeam.name} Members</h3>
                <span style={styles.memberCount}>{teamMembers.length} total</span>
              </div>

              <div style={styles.membersList}>
                {teamMembers.map((member) => (
                  <div key={member._id} style={styles.memberCard}>
                    <div style={styles.memberInfo}>
                      <div style={styles.memberName}>{member.name}</div>
                      <div style={styles.memberEmail}>{member.email}</div>
                    </div>

                    <div style={styles.memberActions}>
                      <span style={styles.roleBadge}>{member.role}</span>
                      <button
                        onClick={() => handleMoveUser(member._id, member.name, selectedTeam._id)}
                        style={styles.actionButton}
                        title="Move to another team"
                      >
                        ↔️ Move
                      </button>
                      <button
                        onClick={() => handleRemoveUser(member._id, selectedTeam._id)}
                        style={styles.removeButton}
                        title="Remove from organization"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                ))}

                {teamMembers.length === 0 && (
                  <div style={styles.emptyState}>
                    <p>No members in this team yet. Invite users or move them from other teams.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={styles.emptyState}>
              <p>Select a team to view and manage members</p>
            </div>
          )}
        </div>
      </div>

      <div style={styles.helpBox}>
        <p style={styles.helpText}>
          <strong>💡 Tip:</strong> Create teams based on your organization structure (departments, squads, etc.).
          Each team will have their own dashboard showing only their collaboration signals and health metrics.
        </p>
      </div>

      {/* Move User Modal */}
      {moveUserModal.user && (
        <div style={styles.modalOverlay} onClick={() => setMoveUserModal({ user: null, currentTeamId: null })}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Move {moveUserModal.user.name}</h3>
            <p style={styles.modalText}>
              Select the team to move <strong>{moveUserModal.user.email}</strong> to:
            </p>

            <select
              value={selectedTargetTeam}
              onChange={(e) => setSelectedTargetTeam(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Select Team --</option>
              {teams
                .filter(t => t._id !== moveUserModal.currentTeamId)
                .map(team => (
                  <option key={team._id} value={team._id}>
                    {team.name} ({team.memberCount} members)
                  </option>
                ))}
            </select>

            <div style={styles.modalActions}>
              <button
                onClick={() => setMoveUserModal({ user: null, currentTeamId: null })}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={executeMoveUser}
                disabled={!selectedTargetTeam}
                style={{
                  ...styles.submitButton,
                  opacity: selectedTargetTeam ? 1 : 0.5,
                  cursor: selectedTargetTeam ? 'pointer' : 'not-allowed'
                }}
              >
                Move User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '1400px',
    margin: '2rem auto',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: 0,
  },
  createButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  errorBanner: {
    background: '#fee2e2',
    color: '#991b1b',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontWeight: '500',
  },
  successBanner: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontWeight: '500',
  },
  createForm: {
    background: '#f9fafb',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '2rem',
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 0,
    marginBottom: '1rem',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    background: 'white',
  },
  submitButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '350px 1fr',
    gap: '2rem',
    marginBottom: '2rem',
  },
  teamsList: {
    borderRight: '1px solid #e5e7eb',
    paddingRight: '2rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 0,
    marginBottom: '1rem',
  },
  teamCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '0.75rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  teamCardActive: {
    borderColor: '#6366f1',
    background: '#f0f9ff',
  },
  teamName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.25rem',
  },
  teamMeta: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  deleteTeamButton: {
    padding: '0.5rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.25rem',
    opacity: 0.6,
    transition: 'opacity 0.2s',
  },
  membersPanel: {
    paddingLeft: '1rem',
  },
  membersPanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  memberCount: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  membersList: {
    maxHeight: '600px',
    overflowY: 'auto',
  },
  memberCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '0.75rem',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '0.25rem',
  },
  memberEmail: {
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  memberActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  roleBadge: {
    padding: '0.25rem 0.75rem',
    background: '#f3f4f6',
    color: '#374151',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actionButton: {
    padding: '0.5rem 0.75rem',
    background: 'white',
    color: '#6366f1',
    border: '1px solid #6366f1',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  removeButton: {
    padding: '0.5rem 0.75rem',
    background: 'white',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  emptyState: {
    padding: '3rem 2rem',
    textAlign: 'center',
    color: '#6b7280',
    background: '#f9fafb',
    borderRadius: '8px',
    border: '1px dashed #d1d5db',
  },
  loadingContainer: {
    padding: '3rem',
    textAlign: 'center',
    color: '#6b7280',
  },
  helpBox: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '1rem',
    marginTop: '2rem',
  },
  helpText: {
    fontSize: '0.875rem',
    color: '#0c4a6e',
    margin: 0,
    lineHeight: '1.5',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 0,
    marginBottom: '1rem',
  },
  modalText: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  cancelButton: {
    flex: 1,
    padding: '0.75rem 1.5rem',
    background: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
  },
};

export default TeamManagement;
