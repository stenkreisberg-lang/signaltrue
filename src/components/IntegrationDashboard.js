import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Settings,
  TrendingUp,
  BarChart3,
  Mail,
  MessageSquare,
  Video,
  FileText,
  Briefcase,
  LayoutGrid,
} from 'lucide-react';

/**
 * Integration Dashboard Component
 *
 * Displays connected integrations status, coverage,
 * and allows connecting new data sources.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8081';

const CORE_OAUTH_START_PATHS = {
  'microsoft-outlook': '/api/integrations/microsoft/oauth/start?scope=outlook',
  'microsoft-teams': '/api/integrations/microsoft/oauth/start?scope=teams',
  slack: '/api/integrations/slack/oauth/start',
  'google-calendar': '/api/integrations/google/oauth/start?scope=calendar',
  'google-chat': '/api/integrations/google-chat/oauth/start',
};

// Integration definitions with icons and descriptions
const INTEGRATIONS = {
  'microsoft-outlook': {
    name: 'Microsoft Outlook',
    icon: Mail,
    color: 'bg-teal-700',
    description: 'Track calendar and meeting metadata',
    signals: ['Meeting load', 'Calendar gaps', 'After-hours coordination'],
  },
  'microsoft-teams': {
    name: 'Microsoft Teams',
    icon: MessageSquare,
    color: 'bg-teal-700',
    description: 'Track Teams collaboration metadata',
    signals: ['Collaboration load', 'After-hours messaging', 'Channel activity'],
  },
  slack: {
    name: 'Slack',
    icon: MessageSquare,
    color: 'bg-teal-700',
    description: 'Track Slack collaboration metadata',
    signals: ['Collaboration load', 'After-hours messaging', 'Channel activity'],
  },
  'google-calendar': {
    name: 'Google Calendar',
    icon: Video,
    color: 'bg-teal-700',
    description: 'Track calendar and meeting metadata',
    signals: ['Meeting load', 'Calendar gaps', 'After-hours coordination'],
  },
  'google-chat': {
    name: 'Google Chat',
    icon: MessageSquare,
    color: 'bg-teal-700',
    description: 'Track Chat collaboration metadata',
    signals: ['Collaboration load', 'After-hours messaging', 'Space activity'],
  },
  jira: {
    name: 'Jira',
    icon: LayoutGrid,
    color: 'bg-teal-700',
    description: 'Track project and task management',
    signals: ['Execution stagnation', 'Rework spiral', 'WIP overload'],
  },
  asana: {
    name: 'Asana',
    icon: LayoutGrid,
    color: 'bg-teal-700',
    description: 'Track project and task management',
    signals: ['Execution stagnation', 'Rework spiral', 'WIP overload'],
  },
  gmail: {
    name: 'Gmail',
    icon: Mail,
    color: 'bg-teal-700',
    description: 'Analyze email patterns and after-hours activity',
    signals: ['Boundary erosion', 'Response drift'],
  },
  meet: {
    name: 'Google Meet',
    icon: Video,
    color: 'bg-teal-700',
    description: 'Track meeting load and recovery time',
    signals: ['Meeting fatigue', 'Recovery collapse', 'Panic coordination'],
  },
  notion: {
    name: 'Notion',
    icon: FileText,
    color: 'bg-teal-700',
    description: 'Monitor documentation and decision patterns',
    signals: ['Decision churn', 'Documentation decay'],
  },
  hubspot: {
    name: 'HubSpot',
    icon: Briefcase,
    color: 'bg-teal-700',
    description: 'Track CRM activity and external pressure',
    signals: ['External pressure injection', 'Escalation cascade'],
  },
  pipedrive: {
    name: 'Pipedrive',
    icon: Briefcase,
    color: 'bg-teal-700',
    description: 'Track CRM activity and external pressure',
    signals: ['External pressure injection', 'Escalation cascade'],
  },
};

export default function IntegrationDashboard({ orgId: _orgId, onIntegrationChange }) {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [showConnectModal, setShowConnectModal] = useState(null);
  const [setup, setSetup] = useState(null);
  const [healthIssues, setHealthIssues] = useState([]);
  const [googleWorkspace, setGoogleWorkspace] = useState(null);
  const [googleAdminEmail, setGoogleAdminEmail] = useState('');
  const [verifyingGoogle, setVerifyingGoogle] = useState(false);

  // Fetch integration status
  const fetchIntegrations = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/integration-dashboard/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch integrations');

      const data = await res.json();
      setSetup(data.setup || null);
      setHealthIssues(data.healthIssues || []);
      setIntegrations(
        (data.integrations || []).map((integration) => ({
          ...integration,
          source: integration.type,
          connected: ['connected', 'measuring', 'needs_admin', 'error'].includes(
            integration.status
          ),
          coverage: integration.coverage?.percent || 0,
          eventCount: integration.coverage?.events || 0,
          signals_enabled: integration.whatWeMeasure?.length || 0,
          last_sync: integration.lastSync,
          sync_status: integration.lastSyncStatus,
          sync_error: integration.statusMessage,
        }))
      );
      const googleRes = await fetch(`${API_BASE}/api/integrations/google-workspace/admin-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (googleRes.ok) {
        const googleData = await googleRes.json();
        setGoogleWorkspace(googleData);
        setGoogleAdminEmail(googleData.delegatedAdminEmail || '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyGoogleWorkspace = async () => {
    setVerifyingGoogle(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/integrations/google-workspace/admin-verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegatedAdminEmail: googleAdminEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Workspace verification failed');
      await fetchIntegrations();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyingGoogle(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Start OAuth flow
  const connectIntegration = async (source) => {
    const token = localStorage.getItem('token');
    const coreOauthPath = CORE_OAUTH_START_PATHS[source];
    if (coreOauthPath) {
      const separator = coreOauthPath.includes('?') ? '&' : '?';
      window.location.href = `${API_BASE}${coreOauthPath}${separator}token=${encodeURIComponent(token || '')}`;
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/integrations-v2/${source}/oauth/start?format=json`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.authorizationUrl) throw new Error(data.message || 'Connection failed');
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setError(err.message);
    }
  };

  // Trigger manual sync
  const triggerSync = async (source) => {
    setSyncing((prev) => ({ ...prev, [source]: true }));

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/integration-dashboard/${source}/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Sync failed');

      // Refresh after a delay
      setTimeout(() => {
        fetchIntegrations();
        setSyncing((prev) => ({ ...prev, [source]: false }));
      }, 2000);
    } catch (err) {
      console.error('Sync error:', err);
      setSyncing((prev) => ({ ...prev, [source]: false }));
    }
  };

  // Disconnect integration
  const disconnectIntegration = async (source) => {
    if (
      !window.confirm(
        `Disconnect ${INTEGRATIONS[source]?.name || source}? This will stop data sync.`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_BASE}/api/integrations-v2/${source}/disconnect`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Disconnect failed');

      fetchIntegrations();
      onIntegrationChange?.();
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  // Calculate overall data quality score
  const calculateDataQuality = () => {
    const connected = integrations.filter((i) => i.connected);
    if (connected.length === 0) return 0;

    const avgCoverage = connected.reduce((sum, i) => sum + (i.coverage || 0), 0) / connected.length;
    const sourceScore = Math.min(100, connected.length * 15);

    return Math.round((avgCoverage + sourceScore) / 2);
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <RefreshCw className="w-8 h-8 text-teal-700 animate-spin" />
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.connected).length;
  const measuringCount = integrations.filter((i) => i.status === 'measuring').length;
  const needsAdminCount = integrations.filter((i) => i.status === 'needs_admin').length;
  const dataQuality = calculateDataQuality();

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Data source status is temporarily unavailable. {error}
        </div>
      )}
      {healthIssues.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-950">Data source attention required</h3>
          <ul className="mt-2 space-y-1 text-sm text-red-900">
            {healthIssues.map((issue) => (
              <li key={issue.key}>
                • {issue.source}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {setup && !setup.readiness?.setupComplete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-950">Complete data readiness</h3>
          <p className="mt-1 text-sm text-amber-900">
            {needsAdminCount > 0
              ? `${needsAdminCount} source${needsAdminCount === 1 ? '' : 's'} still require administrator consent.`
              : connectedCount === 0
                ? 'Connect a data source to begin.'
                : measuringCount === 0
                  ? 'Sources are authorized, but no activity events have arrived yet.'
                  : 'Activity is arriving. Finish employee mapping, timezone confirmation, and team setup before reports are released.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-amber-900">
            <span>Directory: {setup.directory?.directorySyncedUsers || 0} synced</span>
            <span>•</span>
            <span>Activity: {setup.activity?.totalEvents || 0} events</span>
            <span>•</span>
            <span>Report-ready teams: {setup.teams?.ready || 0}</span>
          </div>
        </div>
      )}
      {googleWorkspace && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="font-semibold text-slate-950">Google Workspace company-wide access</h3>
              <p className="mt-1 text-sm text-slate-600">
                A normal Google sign-in only covers one user. A Workspace administrator must add
                SignalTrue under Security → API controls → Domain-wide delegation, then verify it
                here.
              </p>
              {googleWorkspace.serviceAccountClientId && (
                <p className="mt-2 text-xs text-slate-600">
                  Client ID: <code>{googleWorkspace.serviceAccountClientId}</code>
                </p>
              )}
              <p className="mt-1 break-all text-xs text-slate-500">
                Scopes: {(googleWorkspace.requiredScopes || []).join(', ')}
              </p>
            </div>
            {googleWorkspace.verifiedAt ? (
              <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm font-medium text-teal-800">
                Company-wide access verified
              </div>
            ) : (
              <div className="flex min-w-[300px] flex-col gap-2">
                <input
                  type="email"
                  value={googleAdminEmail}
                  onChange={(event) => setGoogleAdminEmail(event.target.value)}
                  placeholder="workspace-admin@company.com"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  onClick={verifyGoogleWorkspace}
                  disabled={verifyingGoogle || !googleWorkspace.serviceAccountConfigured}
                  className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {verifyingGoogle ? 'Verifying…' : 'Verify company-wide access'}
                </button>
                {!googleWorkspace.serviceAccountConfigured && (
                  <p className="text-xs text-amber-700">
                    SignalTrue service account configuration is required first.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{connectedCount}</p>
              <p className="text-sm text-gray-500">Authorized sources</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dataQuality}%</p>
              <p className="text-sm text-gray-500">Data Quality</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {integrations.reduce((sum, i) => sum + (i.signals_enabled || 0), 0)}
              </p>
              <p className="text-sm text-gray-500">Signals Enabled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(INTEGRATIONS).map(([source, config]) => {
          const integration = integrations.find((i) => i.source === source);
          const connected = integration?.connected || false;
          const needsAdmin = integration?.status === 'needs_admin';
          const Icon = config.icon;

          return (
            <div
              key={source}
              className={`bg-white rounded-xl border ${
                connected ? 'border-teal-200' : 'border-gray-200'
              } overflow-hidden`}
            >
              {/* Header */}
              <div className="px-4 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg ${config.color} flex items-center justify-center`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </div>

                {needsAdmin ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : connected ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                {connected ? (
                  <>
                    <div
                      className={`mb-4 rounded-lg px-3 py-2 text-xs ${
                        needsAdmin
                          ? 'bg-amber-50 text-amber-800'
                          : integration.status === 'measuring'
                            ? 'bg-teal-50 text-teal-800'
                            : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {needsAdmin
                        ? integration.statusMessage || 'Administrator consent is still required.'
                        : integration.status === 'measuring'
                          ? `Measuring from ${integration.eventCount || 0} activity events.`
                          : integration.statusMessage ||
                            'Authorized; waiting for the first activity sync.'}
                    </div>
                    {/* Status */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Coverage</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{ width: `${integration.coverage || 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {integration.coverage || 0}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Last Sync</p>
                        <p className="text-sm text-gray-700">
                          {integration.last_sync ? formatTimeAgo(integration.last_sync) : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Sync Status */}
                    {integration.sync_status === 'error' && (
                      <div className="mb-4 p-2 bg-red-50 rounded-lg flex items-center gap-2 text-xs text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Sync error: {integration.sync_error}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => triggerSync(source)}
                        disabled={syncing[source]}
                        className="flex-1 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing[source] ? 'animate-spin' : ''}`} />
                        {syncing[source] ? 'Syncing...' : 'Sync Now'}
                      </button>

                      <button
                        onClick={() => setShowConnectModal(source)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Signals that would be enabled */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Enables these signals:</p>
                      <div className="flex flex-wrap gap-1">
                        {config.signals.map((signal, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {signal}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Connect Button */}
                    <button
                      onClick={() => connectIntegration(source)}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      Connect {config.name}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Quality Tips */}
      {dataQuality < 70 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h4 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Improve Your Data Quality
          </h4>
          <ul className="space-y-2 text-sm text-slate-600">
            {connectedCount < 3 && (
              <li>• Connect more integrations to enable comprehensive signals</li>
            )}
            {integrations.some((i) => i.connected && i.coverage < 70) && (
              <li>• Map more users in connected integrations to improve coverage</li>
            )}
            {!integrations.find((i) => i.source === 'jira' || i.source === 'asana')?.connected && (
              <li>• Connect Jira or Asana to enable execution metrics</li>
            )}
            {!integrations.find((i) => i.source === 'gmail')?.connected && (
              <li>• Connect Gmail to detect after-hours patterns</li>
            )}
          </ul>
        </div>
      )}

      {/* Settings Modal */}
      {showConnectModal && (
        <IntegrationSettingsModal
          source={showConnectModal}
          integration={integrations.find((i) => i.source === showConnectModal)}
          onClose={() => setShowConnectModal(null)}
          onDisconnect={() => disconnectIntegration(showConnectModal)}
        />
      )}
    </div>
  );
}

// Settings Modal Component
function IntegrationSettingsModal({ source, integration, onClose, onDisconnect }) {
  const config = INTEGRATIONS[source];
  const Icon = config?.icon || Link2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div
          className={`px-6 py-4 ${config?.color || 'bg-gray-500'} bg-opacity-10 flex items-center gap-3`}
        >
          <div
            className={`w-10 h-10 rounded-lg ${config?.color || 'bg-gray-500'} flex items-center justify-center`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{config?.name || source} Settings</h3>
            <p className="text-sm text-gray-500">Manage integration connection</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connection Status
            </label>
            <div className="flex items-center gap-2">
              {integration?.connected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-700">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-500">Not connected</span>
                </>
              )}
            </div>
          </div>

          {integration?.connected && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User Coverage
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${integration.coverage || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {integration.coverage || 0}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {integration.mapped_users || 0} of {integration.total_users || 0} users mapped
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Sync</label>
                <p className="text-sm text-gray-600">
                  {integration.last_sync
                    ? new Date(integration.last_sync).toLocaleString()
                    : 'Never'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between rounded-b-lg">
          {integration?.connected ? (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility function
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
