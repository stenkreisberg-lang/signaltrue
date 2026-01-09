import React, { useState, useEffect } from 'react';
import api from '../utils/api';

interface Employee {
  _id: string;
  name: string;
  email: string;
  accountStatus: 'pending' | 'active' | 'inactive';
  source: string;
  role: string;
  teamId?: string;
  teamName?: string;
  profile?: {
    avatar?: string;
    title?: string;
    department?: string;
    phone?: string;
  };
  createdAt: string;
}

interface Team {
  _id: string;
  name: string;
  metadata?: {
    function?: string;
  };
}

interface SyncStatus {
  totalUsers: number;
  pendingUsers: number;
  activeUsers: number;
  unassignedUsers: number;
  lastSlackSync?: string;
  lastGoogleSync?: string;
  slackConnected: boolean;
  googleConnected: boolean;
}

const EmployeeDirectory: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned' | 'pending' | 'active'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignTeamId, setBulkAssignTeamId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees and teams (always available)
      const [employeesRes, teamsRes] = await Promise.all([
        api.get('/api/team-members').catch(() => ({ data: [] })),
        api.get('/api/team-management/organization').catch(() => ({ data: [] }))
      ]);

      // Try to fetch sync status (may not be available on all backends)
      let syncRes;
      try {
        syncRes = await api.get('/api/employee-sync/status');
      } catch (error) {
        console.log('Sync status endpoint not available yet');
        syncRes = { data: {
          totalUsers: 0,
          pendingUsers: 0,
          activeUsers: 0,
          unassignedUsers: 0,
          slackConnected: false,
          googleConnected: false
        }};
      }

      // Enrich employees with team names
      const employeesWithTeams = employeesRes.data.map((emp: Employee) => {
        const team = teamsRes.data.find((t: Team) => t._id === emp.teamId);
        return {
          ...emp,
          teamName: team?.name || 'Unassigned'
        };
      });

      setEmployees(employeesWithTeams);
      setTeams(teamsRes.data);
      setSyncStatus(syncRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      showError('Failed to load employee directory');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (source: 'slack' | 'google') => {
    try {
      setSyncing(true);
      const response = await api.post(`/api/employee-sync/${source}`);
      
      if (response.data.success) {
        const stats = response.data.stats;
        showSuccess(
          `Synced ${source === 'slack' ? 'Slack' : 'Google'} employees: ` +
          `${stats.created} created, ${stats.updated} updated, ${stats.inactivated || 0} inactivated`
        );
        await fetchData();
      } else {
        showError(response.data.message || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      if (error.response?.status === 404) {
        showError('Employee sync feature not yet deployed to production backend');
      } else {
        showError(error.response?.data?.message || 'Failed to sync employees');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleAssignToTeam = async (employeeId: string, teamId: string) => {
    try {
      await api.put(`/api/team-management/${teamId}/members/${employeeId}`);
      showSuccess('Employee assigned to team successfully');
      await fetchData();
    } catch (error: any) {
      console.error('Assign error:', error);
      showError(error.response?.data?.message || 'Failed to assign employee');
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignTeamId || selectedEmployees.size === 0) {
      showError('Please select a team and at least one employee');
      return;
    }

    try {
      const promises = Array.from(selectedEmployees).map(employeeId =>
        api.put(`/api/team-management/${bulkAssignTeamId}/members/${employeeId}`)
      );

      await Promise.all(promises);
      showSuccess(`Successfully assigned ${selectedEmployees.size} employees to team`);
      setSelectedEmployees(new Set());
      setShowBulkAssign(false);
      setBulkAssignTeamId('');
      await fetchData();
    } catch (error: any) {
      console.error('Bulk assign error:', error);
      showError(error.response?.data?.message || 'Failed to assign employees');
    }
  };

  const toggleSelectEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
    } else {
      newSelected.add(employeeId);
    }
    setSelectedEmployees(newSelected);
  };

  const selectAll = () => {
    const filtered = getFilteredEmployees();
    setSelectedEmployees(new Set(filtered.map(e => e._id)));
  };

  const deselectAll = () => {
    setSelectedEmployees(new Set());
  };

  const getFilteredEmployees = () => {
    let filtered = employees;

    // Apply filter
    if (filter === 'assigned') {
      filtered = filtered.filter(e => e.teamName && e.teamName !== 'Unassigned');
    } else if (filter === 'unassigned') {
      filtered = filtered.filter(e => !e.teamName || e.teamName === 'Unassigned');
    } else if (filter === 'pending') {
      filtered = filtered.filter(e => e.accountStatus === 'pending');
    } else if (filter === 'active') {
      filtered = filtered.filter(e => e.accountStatus === 'active');
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term) ||
        (e.profile?.title && e.profile.title.toLowerCase().includes(term)) ||
        (e.profile?.department && e.profile.department.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800'
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const icons: { [key: string]: string } = {
      slack: '💬',
      google_workspace: '📧',
      google_chat: '📧',
      manual: '✋',
      invitation: '✉️'
    };
    return (
      <span className="text-sm text-gray-600">
        {icons[source] || '•'} {source.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading employee directory...</div>
      </div>
    );
  }

  const filteredEmployees = getFilteredEmployees();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Directory</h1>
        <p className="text-gray-600">Manage synced employees and assign them to teams</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Sync Status Card */}
      {syncStatus && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Sync Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="text-3xl font-bold text-blue-600">{syncStatus.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Employees</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600">{syncStatus.pendingUsers}</div>
              <div className="text-sm text-gray-600">Pending (Not Claimed)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{syncStatus.activeUsers}</div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">{syncStatus.unassignedUsers}</div>
              <div className="text-sm text-gray-600">Unassigned</div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex flex-wrap gap-4">
              {syncStatus.slackConnected && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium text-gray-700 mb-1">Slack Integration</div>
                  <div className="text-xs text-gray-500">
                    Last synced: {formatDate(syncStatus.lastSlackSync)}
                  </div>
                  <button
                    onClick={() => handleSync('slack')}
                    disabled={syncing}
                    className="mt-2 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}

              {syncStatus.googleConnected && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm font-medium text-gray-700 mb-1">Google Workspace</div>
                  <div className="text-xs text-gray-500">
                    Last synced: {formatDate(syncStatus.lastGoogleSync)}
                  </div>
                  <button
                    onClick={() => handleSync('google')}
                    disabled={syncing}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}

              {!syncStatus.slackConnected && !syncStatus.googleConnected && (
                <div className="text-sm text-gray-600">
                  No integrations connected. Connect Slack or Google to sync employees automatically.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Search by name, email, title, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'unassigned' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unassigned
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedEmployees.size > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedEmployees.size} selected
            </span>
            <button
              onClick={() => setShowBulkAssign(!showBulkAssign)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Assign to Team
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Deselect All
            </button>
          </div>
        )}

        {showBulkAssign && selectedEmployees.size > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign {selectedEmployees.size} employee(s) to:
            </label>
            <div className="flex gap-2">
              <select
                value={bulkAssignTeamId}
                onChange={(e) => setBulkAssignTeamId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a team...</option>
                {teams.map(team => (
                  <option key={team._id} value={team._id}>
                    {team.name} {team.metadata?.function ? `(${team.metadata.function})` : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkAssign}
                disabled={!bulkAssignTeamId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
              <button
                onClick={() => setShowBulkAssign(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <span>Showing {filteredEmployees.length} of {employees.length} employees</span>
          {filteredEmployees.length > 0 && (
            <button
              onClick={selectAll}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All {filteredEmployees.length}
            </button>
          )}
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? 'No employees match your search.' : 'No employees found. Connect Slack or Google to sync employees.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredEmployees.length > 0 && filteredEmployees.every(e => selectedEmployees.has(e._id))}
                      onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.has(employee._id)}
                        onChange={() => toggleSelectEmployee(employee._id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        {employee.profile?.avatar ? (
                          <img
                            src={employee.profile.avatar}
                            alt={employee.name}
                            className="w-10 h-10 rounded-full mr-3"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                            <span className="text-blue-600 font-semibold">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{employee.profile?.title || '—'}</div>
                      {employee.profile?.department && (
                        <div className="text-xs text-gray-500">{employee.profile.department}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{employee.teamName || 'Unassigned'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(employee.accountStatus)}
                    </td>
                    <td className="px-4 py-3">
                      {getSourceBadge(employee.source)}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignToTeam(employee._id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                        defaultValue=""
                      >
                        <option value="">Assign to team...</option>
                        {teams
                          .filter(team => team._id !== employee.teamId)
                          .map(team => (
                            <option key={team._id} value={team._id}>
                              {team.name}
                            </option>
                          ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDirectory;
