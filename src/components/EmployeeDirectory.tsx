import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Trash2, Upload } from 'lucide-react';
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
  activityEventCount?: number;
  lastMeasuredActivityAt?: string | null;
  measuredSourceTypes?: string[];
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
  directorySyncedUsers?: number;
  unclaimedUsers?: number;
  activeUsers: number;
  unassignedUsers: number;
  assignedUsers?: number;
  measuredUsers?: number;
  lastSlackSync?: string;
  lastGoogleSync?: string;
  lastMicrosoftSync?: string;
  slackConnected: boolean;
  googleConnected: boolean;
  microsoftConnected: boolean;
}

interface TeamMappingSuggestion {
  _id: string;
  suggestedTeamName: string;
  suggestedFunction: string;
  confidence: number;
  reason: string;
  sourceType: 'directory' | 'public_website' | 'title_inference' | 'ai_title_inference';
  userId: Employee;
}

interface EnrichmentStatus {
  websiteUrl: string;
  linkedinUrl: string;
  unassignedCount: number;
  enrichment?: {
    status?: 'not_started' | 'pending_review' | 'completed' | 'failed';
    lastAnalyzedAt?: string;
    lastError?: string;
    lastPagesScanned?: number;
    lastPeopleFound?: number;
    lastEmployeesConsidered?: number;
    lastAutoApplied?: number;
    lastPendingReview?: number;
    lastUnmatched?: number;
  };
  suggestions: TeamMappingSuggestion[];
  reportSettings?: ReportSettings;
}

interface EnrichmentSummary {
  pagesScanned: number;
  peopleFound: number;
  employeesConsidered: number;
  suggestionsCreated: number;
  autoApplied: number;
  skipped: number;
  pendingReview: number;
  unmatched: number;
}

interface ReportSettings {
  timezone: string;
  workdayStart: string;
  workdayEnd: string;
  loadedHourlyCost: number | null;
  currency: string;
}

interface HrRosterStats {
  sourceFilename?: string | null;
  rowsProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  teamsCreated: number;
  skippedRows: Array<{ rowNumber: number; email: string | null; reason: string }>;
}

interface ApiError {
  response?: {
    status?: number;
    data?: { message?: string };
  };
}

const apiErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiError | undefined)?.response?.data?.message || fallback;

const EmployeeDirectory: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState<
    'all' | 'assigned' | 'unassigned' | 'synced' | 'measured' | 'claimed'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAssignTeamId, setBulkAssignTeamId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [enrichment, setEnrichment] = useState<EnrichmentStatus | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [analyzingWebsite, setAnalyzingWebsite] = useState(false);
  const [enrichmentNotice, setEnrichmentNotice] = useState<{
    type: 'progress' | 'success' | 'error';
    text: string;
  } | null>(null);
  const [reviewingSuggestions, setReviewingSuggestions] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [savingReportSettings, setSavingReportSettings] = useState(false);
  const [cleaningDirectory, setCleaningDirectory] = useState(false);
  const [rosterFile, setRosterFile] = useState<File | null>(null);
  const [importingRoster, setImportingRoster] = useState(false);
  const [rosterStats, setRosterStats] = useState<HrRosterStats | null>(null);
  const [deletingEmployeeIds, setDeletingEmployeeIds] = useState<Set<string>>(new Set());
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    timezone: 'UTC',
    workdayStart: '09:00',
    workdayEnd: '17:00',
    loadedHourlyCost: null,
    currency: 'EUR',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch employees and teams (always available)
      const [employeesRes, teamsRes, enrichmentRes] = await Promise.all([
        api.get('/team-members').catch(() => ({ data: [] })),
        api.get('/team-management/organization').catch(() => ({ data: [] })),
        api.get('/team-enrichment').catch(() => ({ data: null })),
      ]);

      // Try to fetch sync status (may not be available on all backends)
      let syncRes;
      try {
        syncRes = await api.get('/employee-sync/status');
      } catch {
        syncRes = {
          data: {
            totalUsers: 0,
            pendingUsers: 0,
            activeUsers: 0,
            unassignedUsers: 0,
            assignedUsers: 0,
            measuredUsers: 0,
            slackConnected: false,
            googleConnected: false,
            microsoftConnected: false,
          },
        };
      }

      // Enrich employees with team names
      const employeesWithTeams = employeesRes.data.map((emp: Employee) => {
        const team = teamsRes.data.find((t: Team) => t._id === emp.teamId);
        return {
          ...emp,
          teamName: team?.name || 'Unassigned',
        };
      });

      setEmployees(employeesWithTeams);
      setTeams(teamsRes.data);
      setSyncStatus(syncRes.data);
      if (enrichmentRes.data) {
        setEnrichment(enrichmentRes.data);
        setWebsiteUrl(enrichmentRes.data.websiteUrl || '');
        setLinkedinUrl(enrichmentRes.data.linkedinUrl || '');
        if (enrichmentRes.data.reportSettings) {
          setReportSettings(enrichmentRes.data.reportSettings);
        }
        setSelectedSuggestions(
          new Set(
            enrichmentRes.data.suggestions.map(
              (suggestion: TeamMappingSuggestion) => suggestion._id
            )
          )
        );
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load employee directory');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [filter, searchTerm]);

  const handleSync = async (source: 'slack' | 'google' | 'microsoft') => {
    try {
      setSyncing(true);
      const response = await api.post(`/employee-sync/${source}`);

      if (response.data.success) {
        const stats = response.data.stats;
        const sourceLabel =
          source === 'slack' ? 'Slack' : source === 'google' ? 'Google' : 'Microsoft';
        showSuccess(
          `Synced ${sourceLabel} employees: ` +
            `${stats.created} created, ${stats.updated} updated, ${stats.inactivated || 0} inactivated`
        );
        await fetchData();
      } else {
        showError(response.data.message || 'Sync failed');
      }
    } catch (error: unknown) {
      console.error('Sync error:', error);
      if ((error as ApiError).response?.status === 404) {
        showError('Employee sync feature not yet deployed to production backend');
      } else {
        showError(apiErrorMessage(error, 'Failed to sync employees'));
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleAssignToTeam = async (employeeId: string, teamId: string) => {
    try {
      await api.put(`/team-management/${teamId}/members/${employeeId}`);
      showSuccess('Employee assigned to team successfully');
      await fetchData();
    } catch (error: unknown) {
      console.error('Assign error:', error);
      showError(apiErrorMessage(error, 'Failed to assign employee'));
    }
  };

  const markEmployeesDeleting = (employeeIds: string[], isDeleting: boolean) => {
    setDeletingEmployeeIds((current) => {
      const next = new Set(current);
      employeeIds.forEach((employeeId) => {
        if (isDeleting) next.add(employeeId);
        else next.delete(employeeId);
      });
      return next;
    });
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (
      !window.confirm(
        `Delete ${employee.name}'s profile from SignalTrue? This removes the profile from teams and reporting.`
      )
    ) {
      return;
    }

    try {
      markEmployeesDeleting([employee._id], true);
      await api.delete(`/team-members/${employee._id}`);
      setSelectedEmployees((current) => {
        const next = new Set(current);
        next.delete(employee._id);
        return next;
      });
      showSuccess(`${employee.name} deleted from employee directory`);
      await fetchData();
    } catch (error: unknown) {
      console.error('Delete employee error:', error);
      showError(apiErrorMessage(error, 'Failed to delete employee profile'));
    } finally {
      markEmployeesDeleting([employee._id], false);
    }
  };

  const handleBulkDelete = async () => {
    const employeesToDelete = employees.filter((employee) => selectedEmployees.has(employee._id));
    if (employeesToDelete.length === 0) {
      showError('Select at least one employee profile to delete');
      return;
    }

    const previewNames = employeesToDelete
      .slice(0, 3)
      .map((employee) => employee.name)
      .join(', ');
    const remainingCount = employeesToDelete.length - 3;
    const preview =
      remainingCount > 0 ? `${previewNames} and ${remainingCount} more` : previewNames;

    if (
      !window.confirm(
        `Delete ${employeesToDelete.length} selected employee ${
          employeesToDelete.length === 1 ? 'profile' : 'profiles'
        } from SignalTrue? ${preview} will be removed from teams and reporting.`
      )
    ) {
      return;
    }

    const employeeIds = employeesToDelete.map((employee) => employee._id);
    try {
      markEmployeesDeleting(employeeIds, true);
      const results = await Promise.allSettled(
        employeeIds.map((employeeId) => api.delete(`/team-members/${employeeId}`))
      );
      const deletedIds = employeeIds.filter((_, index) => results[index].status === 'fulfilled');
      const failed = employeeIds.length - deletedIds.length;

      setSelectedEmployees((current) => {
        const next = new Set(current);
        deletedIds.forEach((employeeId) => next.delete(employeeId));
        return next;
      });

      if (failed > 0) {
        const firstFailure = results.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected'
        );
        showError(
          `${deletedIds.length} deleted; ${failed} could not be deleted. ${apiErrorMessage(
            firstFailure?.reason,
            'Please try again.'
          )}`
        );
      } else {
        showSuccess(`${deletedIds.length} employee profile(s) deleted from the directory`);
        setShowBulkAssign(false);
      }

      await fetchData();
    } finally {
      markEmployeesDeleting(employeeIds, false);
    }
  };

  const handleBulkAssign = async (teamIdParam?: string) => {
    const teamId = teamIdParam || bulkAssignTeamId;
    if (!teamId || selectedEmployees.size === 0) {
      showError('Please select a team and at least one employee');
      return;
    }

    try {
      const promises = Array.from(selectedEmployees).map((employeeId) =>
        api.put(`/team-management/${teamId}/members/${employeeId}`)
      );

      await Promise.all(promises);
      showSuccess(`Successfully assigned ${selectedEmployees.size} employees to team`);
      setSelectedEmployees(new Set());
      setShowBulkAssign(false);
      setBulkAssignTeamId('');
      await fetchData();
    } catch (error: unknown) {
      console.error('Bulk assign error:', error);
      showError(apiErrorMessage(error, 'Failed to assign employees'));
    }
  };

  const cleanupInvalidEmployees = async () => {
    try {
      setCleaningDirectory(true);
      const response = await api.post('/employee-sync/cleanup-invalid');
      showSuccess(response.data.message);
      await fetchData();
    } catch (error: unknown) {
      showError(apiErrorMessage(error, 'Failed to clean employee directory'));
    } finally {
      setCleaningDirectory(false);
    }
  };

  const importHrRoster = async () => {
    if (!rosterFile) {
      showError('Choose an HR roster file first');
      return;
    }

    try {
      setImportingRoster(true);
      const formData = new FormData();
      formData.append('file', rosterFile);
      const response = await api.post('/employee-sync/hr-roster', formData, { timeout: 120000 });
      setRosterStats(response.data.stats);
      setRosterFile(null);
      showSuccess(response.data.message);
      await fetchData();
    } catch (error: unknown) {
      showError(apiErrorMessage(error, 'Failed to import HR roster'));
    } finally {
      setImportingRoster(false);
    }
  };

  const analyzeCompanyWebsite = async () => {
    try {
      setAnalyzingWebsite(true);
      setEnrichmentNotice({
        type: 'progress',
        text: 'Scanning public Team, People, About, and Leadership pages. This can take up to a minute.',
      });
      const response = await api.post(
        '/team-enrichment/analyze',
        {
          websiteUrl: websiteUrl.trim() || undefined,
          linkedinUrl: linkedinUrl.trim() || undefined,
        },
        { timeout: 120000 }
      );
      const summary = response.data.summary as EnrichmentSummary;
      setEnrichmentNotice({
        type: 'success',
        text: `Scan complete: ${summary.pagesScanned} pages and ${summary.peopleFound} public profiles checked. ${summary.autoApplied} automatically assigned, ${summary.pendingReview} need review, and ${summary.unmatched} remain unmatched.`,
      });
      await fetchData();
    } catch (error: unknown) {
      const message = apiErrorMessage(
        error,
        (error as { code?: string }).code === 'ECONNABORTED'
          ? 'The website scan timed out. Please try again.'
          : 'Failed to analyze the company website'
      );
      setEnrichmentNotice({ type: 'error', text: message });
    } finally {
      setAnalyzingWebsite(false);
    }
  };

  const reviewTeamSuggestions = async (decision: 'apply' | 'reject') => {
    if (selectedSuggestions.size === 0) {
      showError('Select at least one team suggestion');
      return;
    }
    try {
      setReviewingSuggestions(true);
      const response = await api.post(`/team-enrichment/${decision}`, {
        suggestionIds: Array.from(selectedSuggestions),
      });
      showSuccess(response.data.message);
      await fetchData();
    } catch (error: unknown) {
      showError(apiErrorMessage(error, `Failed to ${decision} team suggestions`));
    } finally {
      setReviewingSuggestions(false);
    }
  };

  const saveReportSettings = async () => {
    try {
      setSavingReportSettings(true);
      const response = await api.put('/team-enrichment/report-settings', reportSettings);
      showSuccess(response.data.message);
    } catch (error: unknown) {
      showError(apiErrorMessage(error, 'Failed to update report assumptions'));
    } finally {
      setSavingReportSettings(false);
    }
  };

  const toggleSuggestion = (suggestionId: string) => {
    setSelectedSuggestions((current) => {
      const next = new Set(current);
      if (next.has(suggestionId)) next.delete(suggestionId);
      else next.add(suggestionId);
      return next;
    });
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

  const selectAll = (employeesToSelect = getFilteredEmployees()) => {
    setSelectedEmployees(new Set(employeesToSelect.map((e) => e._id)));
  };

  const deselectAll = () => {
    setSelectedEmployees(new Set());
  };

  const getFilteredEmployees = () => {
    let filtered = employees;

    // Apply filter
    if (filter === 'assigned') {
      filtered = filtered.filter((e) => e.teamName && e.teamName !== 'Unassigned');
    } else if (filter === 'unassigned') {
      filtered = filtered.filter((e) => !e.teamName || e.teamName === 'Unassigned');
    } else if (filter === 'synced') {
      filtered = filtered.filter((e) => isDirectorySyncedEmployee(e));
    } else if (filter === 'measured') {
      filtered = filtered.filter((e) => (e.activityEventCount || 0) > 0);
    } else if (filter === 'claimed') {
      filtered = filtered.filter((e) => e.accountStatus === 'active');
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(term) ||
          e.email.toLowerCase().includes(term) ||
          (e.profile?.title && e.profile.title.toLowerCase().includes(term)) ||
          (e.profile?.department && e.profile.department.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const isDirectorySyncedEmployee = (employee: Employee) =>
    employee.accountStatus === 'pending' && !['manual', 'invitation'].includes(employee.source);

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
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const statusPill = (label: string, className: string, title?: string) => (
    <span
      title={title}
      className={`inline-flex rounded-full px-2 py-1 text-caption font-semibold ${className}`}
    >
      {label}
    </span>
  );

  const getDirectoryBadge = (employee: Employee) =>
    isDirectorySyncedEmployee(employee) || employee.source !== 'manual'
      ? statusPill('Synced', 'bg-blue-100 text-blue-800')
      : statusPill('Manual', 'bg-slate-100 text-slate-700');

  const getActivityBadge = (employee: Employee) => {
    const count = employee.activityEventCount || 0;
    if (count > 0) {
      const sources = employee.measuredSourceTypes?.length
        ? employee.measuredSourceTypes.join(', ')
        : 'measured metadata';
      return statusPill(
        'Measured',
        'bg-green-100 text-green-800',
        `${count} event(s) in the last 90 days from ${sources}`
      );
    }
    return statusPill('No activity yet', 'bg-slate-100 text-slate-600');
  };

  const getLoginBadge = (employee: Employee) =>
    employee.accountStatus === 'active'
      ? statusPill('Claimed', 'bg-green-100 text-green-800')
      : employee.accountStatus === 'pending'
        ? statusPill('Unclaimed', 'bg-yellow-100 text-yellow-800')
        : statusPill('Inactive', 'bg-gray-100 text-gray-800');

  const getSourceBadge = (source: string) => {
    const icons: { [key: string]: string } = {
      slack: '💬',
      google_workspace: '📧',
      google_chat: '📧',
      microsoft: 'M365',
      hr_import: 'HR',
      manual: '✋',
      invitation: '✉️',
    };
    return (
      <span className="text-caption text-gray-600">
        {icons[source] || '•'} {source.replace('_', ' ')}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-body text-gray-600">Loading employee directory...</div>
      </div>
    );
  }

  const filteredEmployees = getFilteredEmployees();
  const pageSize = 50;
  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-section font-bold text-gray-900 mb-2">Employee Directory</h1>
        <p className="text-gray-600">Manage synced employees and assign them to teams</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-control text-green-800">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-control text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Sync Status Card */}
      {syncStatus && (
        <div className="bg-white rounded-control shadow p-6 mb-6">
          <h2 className="text-lead font-semibold mb-4">Sync Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div>
              <div className="text-section font-bold text-blue-600">{syncStatus.totalUsers}</div>
              <div className="text-caption text-gray-600">Total Employees</div>
            </div>
            <div>
              <div className="text-section font-bold text-blue-600">
                {syncStatus.directorySyncedUsers ?? syncStatus.pendingUsers}
              </div>
              <div className="text-caption text-gray-600">Directory Synced</div>
            </div>
            <div>
              <div className="text-section font-bold text-teal-600">
                {syncStatus.assignedUsers ?? syncStatus.totalUsers - syncStatus.unassignedUsers}
              </div>
              <div className="text-caption text-gray-600">Team Assigned</div>
            </div>
            <div>
              <div className="text-section font-bold text-green-600">
                {syncStatus.measuredUsers ?? 0}
              </div>
              <div className="text-caption text-gray-600">Measured Activity</div>
            </div>
            <div>
              <div className="text-section font-bold text-indigo-600">{syncStatus.activeUsers}</div>
              <div className="text-caption text-gray-600">Claimed Logins</div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex flex-wrap gap-4">
              {syncStatus.slackConnected && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-caption font-medium text-gray-700 mb-1">
                    Slack Integration
                  </div>
                  <div className="text-caption text-gray-500">
                    Last synced: {formatDate(syncStatus.lastSlackSync)}
                  </div>
                  <button
                    onClick={() => handleSync('slack')}
                    disabled={syncing}
                    className="mt-2 px-3 py-1 bg-purple-600 text-white text-caption rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}

              {syncStatus.googleConnected && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-caption font-medium text-gray-700 mb-1">
                    Google Workspace
                  </div>
                  <div className="text-caption text-gray-500">
                    Last synced: {formatDate(syncStatus.lastGoogleSync)}
                  </div>
                  <button
                    onClick={() => handleSync('google')}
                    disabled={syncing}
                    className="mt-2 px-3 py-1 bg-blue-600 text-white text-caption rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}

              {syncStatus.microsoftConnected && (
                <div className="flex-1 min-w-[200px]">
                  <div className="text-caption font-medium text-gray-700 mb-1">Microsoft 365</div>
                  <div className="text-caption text-gray-500">
                    Last synced: {formatDate(syncStatus.lastMicrosoftSync)}
                  </div>
                  <button
                    onClick={() => handleSync('microsoft')}
                    disabled={syncing}
                    className="mt-2 px-3 py-1 bg-indigo-600 text-white text-caption rounded hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {syncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}

              {!syncStatus.slackConnected &&
                !syncStatus.googleConnected &&
                !syncStatus.microsoftConnected && (
                  <div className="text-caption text-gray-600">
                    No integrations connected. Connect Slack, Google, or Microsoft to sync employees
                    automatically.
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-control shadow p-6 mb-6 border border-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lead font-semibold text-gray-900">Employee source controls</h2>
            <p className="text-caption text-gray-600 mt-1 max-w-3xl">
              Directory entries must have first name, surname, and work email. Bots, rooms,
              resources, and shared mailboxes are blocked from employee lists and team assignment.
            </p>
          </div>
          <button
            onClick={cleanupInvalidEmployees}
            disabled={cleaningDirectory}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-caption font-medium rounded-control hover:bg-slate-800 disabled:opacity-50"
          >
            <ShieldCheck size={16} aria-hidden="true" />
            {cleaningDirectory ? 'Cleaning...' : 'Clean current list'}
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-200">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="text-caption font-medium text-gray-700">
              HR roster export
              <input
                type="file"
                accept=".csv,.xls,.xlsx,.pdf"
                disabled={importingRoster}
                onChange={(event) => setRosterFile(event.target.files?.[0] || null)}
                className="mt-1 block w-full text-caption text-gray-700 file:mr-4 file:rounded-control file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-caption file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              />
            </label>
            <button
              onClick={importHrRoster}
              disabled={importingRoster || !rosterFile}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-caption font-medium rounded-control hover:bg-blue-700 disabled:opacity-50"
            >
              <Upload size={16} aria-hidden="true" />
              {importingRoster ? 'Importing...' : 'Import roster'}
            </button>
          </div>
          <p className="mt-2 text-caption text-gray-500">
            Accepted columns include first name, surname, email, position, team, and department. PDF
            imports work best with selectable table text.
          </p>

          {rosterStats && (
            <div className="mt-4 rounded-control border border-blue-100 bg-blue-50 px-4 py-3 text-caption text-blue-900">
              <div className="font-medium">
                {rosterStats.rowsProcessed} rows processed · {rosterStats.created} created ·{' '}
                {rosterStats.updated} updated · {rosterStats.teamsCreated} teams created ·{' '}
                {rosterStats.skipped} skipped
              </div>
              {rosterStats.skippedRows.length > 0 && (
                <div className="mt-2 text-caption text-blue-800">
                  First skipped row: #{rosterStats.skippedRows[0].rowNumber},{' '}
                  {rosterStats.skippedRows[0].reason.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {enrichment && (
        <div className="bg-white rounded-control shadow p-6 mb-6">
          <h2 className="text-lead font-semibold text-gray-900">Report assumptions</h2>
          <p className="text-caption text-gray-600 mt-1 mb-4">
            Working hours apply to all teams and control local after-hours observation. Cost
            estimates appear only when you provide a loaded hourly cost; SignalTrue does not invent
            one.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-caption font-medium text-gray-700 lg:col-span-2">
              IANA timezone
              <input
                value={reportSettings.timezone}
                onChange={(event) =>
                  setReportSettings((current) => ({ ...current, timezone: event.target.value }))
                }
                placeholder="Europe/Tallinn"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-control bg-white text-gray-900"
              />
            </label>
            <label className="text-caption font-medium text-gray-700">
              Workday start
              <input
                type="time"
                value={reportSettings.workdayStart}
                onChange={(event) =>
                  setReportSettings((current) => ({ ...current, workdayStart: event.target.value }))
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-control bg-white text-gray-900"
              />
            </label>
            <label className="text-caption font-medium text-gray-700">
              Workday end
              <input
                type="time"
                value={reportSettings.workdayEnd}
                onChange={(event) =>
                  setReportSettings((current) => ({ ...current, workdayEnd: event.target.value }))
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-control bg-white text-gray-900"
              />
            </label>
            <label className="text-caption font-medium text-gray-700">
              Loaded cost / hour
              <div className="flex mt-1">
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={reportSettings.loadedHourlyCost ?? ''}
                  onChange={(event) =>
                    setReportSettings((current) => ({
                      ...current,
                      loadedHourlyCost:
                        event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                  className="min-w-0 w-full px-3 py-2 border border-gray-300 rounded-l-lg bg-white text-gray-900"
                />
                <input
                  value={reportSettings.currency}
                  maxLength={3}
                  aria-label="Currency"
                  onChange={(event) =>
                    setReportSettings((current) => ({
                      ...current,
                      currency: event.target.value.toUpperCase(),
                    }))
                  }
                  className="w-16 px-2 py-2 border border-l-0 border-gray-300 rounded-r-lg bg-gray-50 text-gray-900 uppercase"
                />
              </div>
            </label>
          </div>
          <button
            onClick={saveReportSettings}
            disabled={savingReportSettings}
            className="mt-4 px-4 py-2 bg-slate-900 text-white text-caption font-medium rounded-control hover:bg-slate-800 disabled:opacity-50"
          >
            {savingReportSettings ? 'Saving...' : 'Save report assumptions'}
          </button>
        </div>
      )}

      {/* Public team-structure recovery */}
      {enrichment && (
        <div className="bg-white rounded-control shadow p-6 mb-6 border border-blue-100">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lead font-semibold text-gray-900">
                Recover missing team structure
              </h2>
              <p className="text-caption text-gray-600 mt-1 max-w-3xl">
                SignalTrue uses directory departments first. For remaining unassigned people, it can
                scan public Team and About pages, match names and roles, and automatically apply
                high-confidence assignments. It never overwrites an existing named team; uncertain
                matches stay here for HR review.
              </p>
            </div>
            <div className="text-caption font-medium text-orange-700 bg-orange-50 px-3 py-2 rounded-control">
              {enrichment.unassignedCount} unassigned
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-caption font-medium text-gray-700">
              Company homepage
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://company.com"
                disabled={analyzingWebsite}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-control bg-white text-gray-900"
              />
            </label>
            <label className="text-caption font-medium text-gray-700">
              LinkedIn company page (reference only)
              <input
                type="url"
                value={linkedinUrl}
                onChange={(event) => setLinkedinUrl(event.target.value)}
                placeholder="https://www.linkedin.com/company/..."
                disabled={analyzingWebsite}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-control bg-white text-gray-900"
              />
            </label>
          </div>
          <p className="text-caption text-gray-500 mt-2">
            LinkedIn is not crawled. Public website text and anonymous job titles may be processed
            by the configured AI provider; employee emails and message content are not sent.
          </p>
          {enrichmentNotice && (
            <div
              aria-live="polite"
              className={`mt-4 rounded-control border px-4 py-3 text-caption ${
                enrichmentNotice.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : enrichmentNotice.type === 'success'
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-blue-200 bg-blue-50 text-blue-800'
              }`}
            >
              {enrichmentNotice.text}
            </div>
          )}
          <button
            onClick={analyzeCompanyWebsite}
            disabled={analyzingWebsite}
            className="mt-4 px-4 py-2 bg-blue-600 text-white text-caption font-medium rounded-control hover:bg-blue-700 disabled:opacity-50"
          >
            {analyzingWebsite
              ? 'Scanning and matching people...'
              : 'Scan website and assign high-confidence matches'}
          </button>

          {!enrichmentNotice && enrichment.enrichment?.lastAnalyzedAt && (
            <p className="mt-3 text-caption text-gray-500">
              Last scan {formatDate(enrichment.enrichment.lastAnalyzedAt)}:{' '}
              {enrichment.enrichment.lastPagesScanned || 0} pages,{' '}
              {enrichment.enrichment.lastPeopleFound || 0} public profiles,{' '}
              {enrichment.enrichment.lastAutoApplied || 0} automatically assigned,{' '}
              {enrichment.enrichment.lastPendingReview || 0} pending review.
            </p>
          )}

          {enrichment.suggestions.length > 0 && (
            <div className="mt-6 border-t pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">Review suggestions</h3>
                  <p className="text-caption text-gray-600">
                    Evidence is directional; approve only assignments you recognize.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => reviewTeamSuggestions('reject')}
                    disabled={reviewingSuggestions || selectedSuggestions.size === 0}
                    className="px-3 py-2 bg-gray-100 text-gray-700 text-caption rounded-control hover:bg-gray-200 disabled:opacity-50"
                  >
                    Reject selected
                  </button>
                  <button
                    onClick={() => reviewTeamSuggestions('apply')}
                    disabled={reviewingSuggestions || selectedSuggestions.size === 0}
                    className="px-3 py-2 bg-green-600 text-white text-caption rounded-control hover:bg-green-700 disabled:opacity-50"
                  >
                    Apply selected
                  </button>
                </div>
              </div>
              <div className="divide-y border rounded-control">
                {enrichment.suggestions.map((suggestion) => (
                  <label
                    key={suggestion._id}
                    className="flex gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(suggestion._id)}
                      onChange={() => toggleSuggestion(suggestion._id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{suggestion.userId.name}</span>
                        <span className="text-gray-400">to</span>
                        <span className="font-semibold text-blue-700">
                          {suggestion.suggestedTeamName}
                        </span>
                        <span className="text-caption bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                          {suggestion.confidence}% confidence
                        </span>
                      </div>
                      <p className="text-caption text-gray-600 mt-1">
                        {suggestion.userId.profile?.title || 'No job title'} · {suggestion.reason}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-control shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[250px]">
            <input
              type="text"
              placeholder="Search by name, email, title, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-control focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-control text-caption font-medium ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({employees.length})
            </button>
            <button
              onClick={() => setFilter('unassigned')}
              className={`px-4 py-2 rounded-control text-caption font-medium ${
                filter === 'unassigned'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unassigned
            </button>
            <button
              onClick={() => setFilter('synced')}
              className={`px-4 py-2 rounded-control text-caption font-medium ${
                filter === 'synced'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Synced
            </button>
            <button
              onClick={() => setFilter('measured')}
              className={`px-4 py-2 rounded-control text-caption font-medium ${
                filter === 'measured'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Measured
            </button>
            <button
              onClick={() => setFilter('claimed')}
              className={`px-4 py-2 rounded-control text-caption font-medium ${
                filter === 'claimed'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Claimed
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedEmployees.size > 0 && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4">
            <span className="text-caption font-medium text-gray-700">
              {selectedEmployees.size} selected
            </span>
            <button
              onClick={() => setShowBulkAssign(!showBulkAssign)}
              className="px-4 py-2 bg-green-600 text-white text-caption rounded hover:bg-green-700"
            >
              Assign to Team
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-caption rounded hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={Array.from(selectedEmployees).some((employeeId) =>
                deletingEmployeeIds.has(employeeId)
              )}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete Profiles
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-caption rounded hover:bg-gray-400"
            >
              Deselect All
            </button>
          </div>
        )}

        {showBulkAssign && selectedEmployees.size > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-control">
            <label className="block text-caption font-medium text-gray-700 mb-3">
              Assign {selectedEmployees.size} employee(s) to:
            </label>
            <div className="flex flex-wrap gap-2">
              {teams.map((team) => (
                <button
                  key={team._id}
                  onClick={() => {
                    setBulkAssignTeamId(team._id);
                    handleBulkAssign(team._id);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-control hover:bg-blue-700 transition-colors"
                >
                  {team.name}
                </button>
              ))}
              <button
                onClick={() => setShowBulkAssign(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-control hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center text-caption text-gray-600">
          <span>
            Showing {(currentPage - 1) * pageSize + (visibleEmployees.length ? 1 : 0)}–
            {(currentPage - 1) * pageSize + visibleEmployees.length} of {filteredEmployees.length}{' '}
            matching employees ({employees.length} total)
          </span>
          {filteredEmployees.length > 0 && (
            <button
              onClick={() => selectAll()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Select all {filteredEmployees.length} matching employees
            </button>
          )}
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white rounded-control shadow overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm
              ? 'No employees match your search.'
              : 'No employees found. Connect Slack, Google, Microsoft, or import an HR roster to sync employees.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        visibleEmployees.length > 0 &&
                        visibleEmployees.every((e) => selectedEmployees.has(e._id))
                      }
                      onChange={(e) =>
                        e.target.checked ? selectAll(visibleEmployees) : deselectAll()
                      }
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Directory
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Login
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-caption font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visibleEmployees.map((employee) => (
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
                          <div className="text-caption font-medium text-gray-900">
                            {employee.name}
                          </div>
                          <div className="text-caption text-gray-500">{employee.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-caption text-gray-900">
                        {employee.profile?.title || '—'}
                      </div>
                      {employee.profile?.department && (
                        <div className="text-caption text-gray-500">
                          {employee.profile.department}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-caption text-gray-900">
                        {employee.teamName || 'Unassigned'}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getDirectoryBadge(employee)}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {getActivityBadge(employee)}
                        {employee.lastMeasuredActivityAt && (
                          <div className="text-caption text-gray-500">
                            Last {formatDate(employee.lastMeasuredActivityAt)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">{getLoginBadge(employee)}</td>
                    <td className="px-4 py-3">{getSourceBadge(employee.source)}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[230px] items-center gap-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignToTeam(employee._id, e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="min-w-[160px] text-caption border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                          defaultValue=""
                          disabled={deletingEmployeeIds.has(employee._id)}
                        >
                          <option value="">Assign to team...</option>
                          {teams
                            .filter((team) => team._id !== employee.teamId)
                            .map((team) => (
                              <option key={team._id} value={team._id}>
                                {team.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(employee)}
                          className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded border border-red-200 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${employee.name}`}
                          title={`Delete ${employee.name}`}
                          disabled={deletingEmployeeIds.has(employee._id)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {filteredEmployees.length > pageSize && (
        <div className="mt-4 flex items-center justify-between rounded-control border border-slate-200 bg-white px-4 py-3 text-caption">
          <span className="text-slate-600">
            Page {currentPage} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDirectory;
