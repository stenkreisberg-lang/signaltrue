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
import { adminTranslator } from '../utils/adminLanguage';
import ITAdminInvitationManager from './ITAdminInvitationManager';

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
  },
  'microsoft-teams': {
    name: 'Microsoft Teams',
    icon: MessageSquare,
    color: 'bg-teal-700',
    description: 'Track Teams collaboration metadata',
  },
  slack: {
    name: 'Slack',
    icon: MessageSquare,
    color: 'bg-teal-700',
    description: 'Track Slack collaboration metadata',
  },
  'google-calendar': {
    name: 'Google Calendar',
    icon: Video,
    color: 'bg-teal-700',
    description: 'Track calendar and meeting metadata',
  },
  'google-chat': {
    name: 'Google Chat',
    icon: MessageSquare,
    color: 'bg-teal-700',
    description: 'Track Chat collaboration metadata',
  },
  jira: {
    name: 'Jira',
    icon: LayoutGrid,
    color: 'bg-teal-700',
    description: 'Track project and task management',
  },
  asana: {
    name: 'Asana',
    icon: LayoutGrid,
    color: 'bg-teal-700',
    description: 'Track project and task management',
  },
  gmail: {
    name: 'Gmail',
    icon: Mail,
    color: 'bg-teal-700',
    description: 'Analyze email patterns and after-hours activity',
  },
  meet: {
    name: 'Google Meet',
    icon: Video,
    color: 'bg-teal-700',
    description: 'Track meeting load and recovery time',
  },
  notion: {
    name: 'Notion',
    icon: FileText,
    color: 'bg-teal-700',
    description: 'Monitor documentation and decision patterns',
  },
  hubspot: {
    name: 'HubSpot',
    icon: Briefcase,
    color: 'bg-teal-700',
    description: 'Track CRM activity and external pressure',
  },
  pipedrive: {
    name: 'Pipedrive',
    icon: Briefcase,
    color: 'bg-teal-700',
    description: 'Track CRM activity and external pressure',
  },
};

export default function IntegrationDashboard({
  orgId: _orgId,
  onIntegrationChange,
  userRole,
  locale = 'en',
}) {
  const t = adminTranslator(locale);
  const [statusAvailable, setStatusAvailable] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState({});
  const [showConnectModal, setShowConnectModal] = useState(null);
  const [setup, setSetup] = useState(null);
  const [healthIssues, setHealthIssues] = useState([]);
  const [microsoftCompanyAccess, setMicrosoftCompanyAccess] = useState(null);
  const [microsoftDiagnostics, setMicrosoftDiagnostics] = useState(null);
  const [verifyingMicrosoft, setVerifyingMicrosoft] = useState(false);
  const [notice, setNotice] = useState(null);
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
      if (!Array.isArray(data.integrations)) throw new Error('Source status is unavailable.');
      setStatusAvailable(true);
      setSetup(data.setup || null);
      setHealthIssues(data.healthIssues || []);
      setMicrosoftCompanyAccess(data.microsoftCompanyAccess || null);
      setMicrosoftDiagnostics(data.microsoftDiagnostics || null);
      setIntegrations(
        (data.integrations || []).map((integration) => ({
          ...integration,
          source: integration.type,
          connected: ['connected', 'measuring'].includes(integration.status),
          coverageDetails: integration.coverage || {},
          coverage: integration.coverage?.total > 0 ? integration.coverage.percent : null,
          eventCount: integration.coverage?.events ?? null,
          last_sync: integration.lastSync,
          sync_status: integration.lastSyncStatus,
          sync_error: integration.statusMessage,
        }))
      );
      const googleRes = await fetch(`${API_BASE}/api/integrations/google-workspace/admin-status`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (googleRes?.ok) {
        const googleData = await googleRes.json();
        setGoogleWorkspace(googleData);
        setGoogleAdminEmail(googleData.delegatedAdminEmail || '');
      }
    } catch (err) {
      setStatusAvailable(false);
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

  const grantMicrosoftCompanyAccess = () => {
    const token = localStorage.getItem('token');
    window.location.href = `${API_BASE}/api/integrations/microsoft/admin-consent/start?returnTo=integrations&token=${encodeURIComponent(token || '')}`;
  };

  const verifyMicrosoftCompanyAccess = async () => {
    setVerifyingMicrosoft(true);
    setError(null);
    setNotice(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/integrations/microsoft/admin-consent/verify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Microsoft verification failed');
      setNotice('Microsoft company-wide access is verified. The 60-day backfill has started.');
      await fetchIntegrations();
    } catch (err) {
      setError(err.message);
      await fetchIntegrations();
    } finally {
      setVerifyingMicrosoft(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const consent = params.get('microsoftConsent');
    const identity = params.get('microsoftIdentity');
    if (identity === 'connected') {
      setNotice(
        'Microsoft identity and tenant are linked. Company-wide Outlook and Teams access still requires the application-permission step below.'
      );
    } else if (consent === 'verified') {
      setNotice('Microsoft company-wide access is verified. The 60-day backfill has started.');
    } else if (consent === 'verification-failed') {
      setError(
        'Microsoft accepted the consent flow, but SignalTrue could not verify one or more Microsoft data sources. Review the source status below for the safe technical reason.'
      );
    } else if (consent) {
      setError('Microsoft company-wide consent was not granted.');
    }
    if (consent || identity) {
      window.history.replaceState({}, document.title, '/integrations');
    }
  }, []);

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
      if (!res.ok || !data.authorizationUrl)
        throw new Error(data.message || t('Connection failed'));
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
      console.error(t('Sync error:'), err);
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

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <RefreshCw className="w-8 h-8 text-teal-700 animate-spin" />
      </div>
    );
  }

  if (!statusAvailable) {
    return (
      <div className="app-panel" role="alert">
        <p>
          {t(
            'Source status could not be loaded. Refresh to retry. This does not mean sources are disconnected.'
          )}
        </p>
        <button type="button" className="mt-3 underline" onClick={fetchIntegrations}>
          {t('Recheck status')}
        </button>
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.connected).length;
  const measuringCount = integrations.filter((i) => i.measurementStatus?.verified === true).length;
  const needsAdminCount = integrations.filter((i) => i.status === 'needs_admin').length;

  const microsoftRequiredRoles = microsoftCompanyAccess?.requiredRoles || [];
  const microsoftGrantedRoles = microsoftCompanyAccess?.grantedRoles || [];
  const microsoftMissingRoles =
    microsoftCompanyAccess?.missingRoles ||
    microsoftRequiredRoles.filter((role) => !microsoftGrantedRoles.includes(role));
  const microsoftStatus = microsoftCompanyAccess?.status || 'disconnected';
  const microsoftNeedsAdmin = Boolean(microsoftCompanyAccess?.requiresAdminConsent);

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-container border border-amber-200 bg-amber-50 px-4 py-3 text-caption text-amber-800">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-container border border-teal-200 bg-teal-50 px-4 py-3 text-caption text-teal-800">
          {notice}
        </div>
      )}
      {healthIssues.length > 0 && (
        <div className="rounded-container border border-red-200 bg-red-50 p-5">
          <h3 className="font-semibold text-red-950">{t('Data source attention required')}</h3>
          <ul className="mt-2 space-y-1 text-caption text-red-900">
            {healthIssues.map((issue) => (
              <li key={issue.key}>
                • {issue.source}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      {setup && !setup.readiness?.setupComplete && (
        <div className="rounded-container border border-amber-200 bg-amber-50 p-5">
          <h3 className="font-semibold text-amber-950">{t('Complete data readiness')}</h3>
          <p className="mt-1 text-caption text-amber-900">
            {needsAdminCount > 0
              ? `${needsAdminCount} source${needsAdminCount === 1 ? '' : 's'} still require administrator consent.`
              : connectedCount === 0
                ? t('Connect a data source to begin.')
                : measuringCount === 0
                  ? t('Recent source events still need verification.')
                  : t(
                      'Activity is arriving. Finish employee mapping, timezone confirmation, and team setup before reports are released.'
                    )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-caption text-amber-900">
            <span>
              {t('Directory:')} {setup.directory?.directorySyncedUsers ?? t('Unavailable')}{' '}
              {t('synced')}
            </span>
            <span>•</span>
            <span>
              {t('Activity:')} {setup.activity?.totalEvents ?? t('Unavailable')} {t('events')}
            </span>
            <span>•</span>
            <span>
              {t('Report-ready teams:')} {setup.teams?.ready ?? t('Unavailable')}
            </span>
          </div>
        </div>
      )}
      <ITAdminInvitationManager role={userRole} />
      {microsoftCompanyAccess?.connected && (
        <div className="rounded-container border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="font-semibold text-slate-950">{t('Microsoft company-wide access')}</h3>
              <p className="mt-1 text-caption text-slate-600">
                {t(
                  "Microsoft sign-in only identifies the administrator and tenant. Outlook and Teams become connected only after a tenant administrator grants application permissions and SignalTrue's live Graph checks pass."
                )}
              </p>
              <p className="mt-2 break-all text-caption text-slate-500">
                {t('Required application permissions:')} {microsoftRequiredRoles.join(', ')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-caption">
                {['outlook', 'teams'].map((source) => {
                  const sourceState = microsoftCompanyAccess.sources?.[source];
                  const sourceStatus = sourceState?.status || 'needs_admin';
                  const verified = sourceStatus === 'connected';
                  return (
                    <span key={source} className="flex flex-col gap-1">
                      <span
                        className={`rounded-control px-2 py-1 ${
                          verified
                            ? 'bg-teal-50 text-teal-800'
                            : sourceStatus === 'error'
                              ? 'bg-red-50 text-red-800'
                              : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {source === 'outlook' ? 'Outlook' : 'Teams'}:{' '}
                        {t(sourceStatus.replace(/_/g, ' '))}
                      </span>
                      {!verified && sourceState?.statusMessage && (
                        <span className="max-w-sm text-slate-600">{sourceState.statusMessage}</span>
                      )}
                    </span>
                  );
                })}
              </div>
              {microsoftCompanyAccess.lastCheckedAt && microsoftNeedsAdmin && (
                <div className="mt-2 space-y-1 text-caption">
                  <p className="text-slate-600">
                    {t('Granted application permissions:')}{' '}
                    {microsoftGrantedRoles.length > 0
                      ? microsoftGrantedRoles.join(', ')
                      : t('none detected')}
                  </p>
                  {microsoftMissingRoles.length > 0 && (
                    <p className="font-medium text-amber-700">
                      {t('Still missing:')}
                      {microsoftMissingRoles.join(', ')}
                    </p>
                  )}
                </div>
              )}
              {microsoftCompanyAccess.statusMessage && microsoftStatus !== 'connected' && (
                <p className="mt-2 text-caption text-amber-700">
                  {microsoftCompanyAccess.statusMessage}
                </p>
              )}
            </div>
            {microsoftStatus === 'connected' ? (
              <div className="rounded-control bg-teal-50 px-3 py-2 text-caption font-medium text-teal-800">
                {t('Company-wide access verified')}
              </div>
            ) : microsoftNeedsAdmin ? (
              <div className="flex min-w-[300px] flex-col gap-2">
                <button
                  onClick={grantMicrosoftCompanyAccess}
                  disabled={!microsoftCompanyAccess.configured}
                  className="rounded-control bg-teal-700 px-4 py-2 text-caption font-medium text-white disabled:opacity-50"
                >
                  {t('Grant company-wide access')}
                </button>
                <button
                  onClick={verifyMicrosoftCompanyAccess}
                  disabled={verifyingMicrosoft || !microsoftCompanyAccess.configured}
                  className="rounded-control bg-teal-50 px-4 py-2 text-caption font-medium text-teal-800 disabled:opacity-50"
                >
                  {verifyingMicrosoft
                    ? t('Verifying with Microsoft…')
                    : t('Already granted? Verify')}
                </button>
                {!microsoftCompanyAccess.configured && (
                  <p className="text-caption text-amber-700">
                    {t('SignalTrue Microsoft application configuration is required first.')}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-w-[300px] flex-col gap-2">
                <button
                  onClick={verifyMicrosoftCompanyAccess}
                  disabled={verifyingMicrosoft || !microsoftCompanyAccess.configured}
                  className="rounded-control bg-teal-700 px-4 py-2 text-caption font-medium text-white disabled:opacity-50"
                >
                  {verifyingMicrosoft ? t('Checking sources…') : t('Retry Microsoft verification')}
                </button>
                <p className="text-caption text-slate-600">
                  {t(
                    'Application permissions are already present. Re-granting administrator consent is not required unless a missing role is listed.'
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {microsoftDiagnostics && (
        <MicrosoftDiagnosticsPanel
          locale={locale}
          diagnostics={microsoftDiagnostics}
          onRefresh={fetchIntegrations}
        />
      )}
      {googleWorkspace && (
        <div className="rounded-container border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <h3 className="font-semibold text-slate-950">
                {t('Google Workspace company-wide access')}
              </h3>
              <p className="mt-1 text-caption text-slate-600">
                {t(
                  'A normal Google sign-in only covers one user. A Workspace administrator must add SignalTrue under Security → API controls → Domain-wide delegation, then verify it here.'
                )}
              </p>
              {googleWorkspace.serviceAccountClientId && (
                <p className="mt-2 text-caption text-slate-600">
                  {t('Client ID:')}
                  <code>{googleWorkspace.serviceAccountClientId}</code>
                </p>
              )}
              <p className="mt-1 break-all text-caption text-slate-500">
                {t('Scopes:')}
                {(googleWorkspace.requiredScopes || []).join(', ')}
              </p>
            </div>
            {googleWorkspace.verifiedAt ? (
              <div className="rounded-control bg-teal-50 px-3 py-2 text-caption font-medium text-teal-800">
                {t('Company-wide access verified')}
              </div>
            ) : (
              <div className="flex min-w-[300px] flex-col gap-2">
                <input
                  type="email"
                  value={googleAdminEmail}
                  onChange={(event) => setGoogleAdminEmail(event.target.value)}
                  placeholder="workspace-admin@company.com"
                  className="rounded-control border border-slate-300 px-3 py-2 text-caption"
                />
                <button
                  onClick={verifyGoogleWorkspace}
                  disabled={verifyingGoogle || !googleWorkspace.serviceAccountConfigured}
                  className="rounded-control bg-teal-700 px-4 py-2 text-caption font-medium text-white disabled:opacity-50"
                >
                  {verifyingGoogle ? t('Verifying…') : t('Verify company-wide access')}
                </button>
                {!googleWorkspace.serviceAccountConfigured && (
                  <p className="text-caption text-amber-700">
                    {t('SignalTrue service account configuration is required first.')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-control border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-teal-50 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="text-lead font-bold text-gray-900">{connectedCount}</p>
              <p className="text-caption text-gray-500">{t('Authorized sources')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-control border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-teal-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="text-lead font-bold text-gray-900">{measuringCount}</p>
              <p className="text-caption text-gray-500">{t('Sources with verified events')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-control border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-control bg-teal-50 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <p className="text-lead font-bold text-gray-900">{needsAdminCount}</p>
              <p className="text-caption text-gray-500">{t('Awaiting administrator consent')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(INTEGRATIONS).map(([source, config]) => {
          const integration = integrations.find((i) => i.source === source);
          const connected = integration?.connected || false;
          const present = Boolean(integration && integration.status !== 'disconnected');
          const needsAdmin = integration?.status === 'needs_admin';
          const hasError = integration?.status === 'error';
          const Icon = config.icon;

          return (
            <div
              key={source}
              className={`bg-white rounded-container border ${
                connected ? 'border-teal-200' : present ? 'border-amber-200' : 'border-gray-200'
              } overflow-hidden`}
            >
              {/* Header */}
              <div className="px-4 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-control ${config.color} flex items-center justify-center`}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{config.name}</h3>
                    <p className="text-caption text-gray-500">{t(config.description)}</p>
                  </div>
                </div>

                {needsAdmin || hasError ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : connected ? (
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-300" />
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                {present ? (
                  <>
                    <div
                      className={`mb-4 rounded-control px-3 py-2 text-caption ${
                        needsAdmin || hasError
                          ? 'bg-amber-50 text-amber-800'
                          : integration.status === 'measuring'
                            ? 'bg-teal-50 text-teal-800'
                            : 'bg-slate-50 text-slate-700'
                      }`}
                    >
                      {needsAdmin
                        ? integration.statusMessage || t('Administrator consent is still required.')
                        : hasError
                          ? integration.statusMessage ||
                            t('Permissions are present, but this source could not be verified.')
                          : integration.status === 'measuring'
                            ? Number.isFinite(integration.eventCount)
                              ? t('Events reported by the source') + ': ' + integration.eventCount
                              : t('Source event count unavailable')
                            : integration.statusMessage ||
                              t('Authorized; waiting for the first activity sync.')}
                    </div>
                    {/* Status */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <p className="text-caption text-gray-500">{t('Coverage')}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{
                                width: Number.isFinite(integration.coverage)
                                  ? integration.coverage + '%'
                                  : 0,
                              }}
                            />
                          </div>
                          <span className="text-caption font-medium text-gray-700">
                            {Number.isFinite(integration.coverage)
                              ? integration.coverage + '%'
                              : t('Unavailable')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-caption text-gray-500">{t('Last Sync')}</p>
                        <p className="text-caption text-gray-700">
                          {integration.last_sync
                            ? formatTimeAgo(integration.last_sync, locale)
                            : t('Never')}
                        </p>
                      </div>
                    </div>

                    {/* Sync Status */}
                    {integration.sync_status === 'error' && (
                      <div className="mb-4 p-2 bg-red-50 rounded-control flex items-center gap-2 text-caption text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        <span>
                          {t('Sync error:')} {integration.sync_error}
                        </span>
                      </div>
                    )}

                    {source === 'microsoft-outlook' &&
                      (integration.coverageDetails?.unavailable > 0 ||
                        integration.coverageDetails?.failed > 0) && (
                        <div className="mb-4 rounded-control bg-amber-50 p-2 text-caption text-amber-800">
                          {integration.coverageDetails.unavailable || 0} Microsoft accounts have no
                          accessible Exchange Online mailbox
                          {integration.coverageDetails.failed > 0
                            ? `; ${integration.coverageDetails.failed} additional mailbox checks failed`
                            : ''}
                          . These accounts are excluded from calendar coverage.
                        </div>
                      )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {source.startsWith('microsoft-') && needsAdmin ? (
                        <button
                          onClick={grantMicrosoftCompanyAccess}
                          className="flex-1 px-3 py-2 text-caption font-medium text-white bg-teal-700 rounded-control hover:bg-teal-800 transition-colors"
                        >
                          {t('Grant / verify company-wide access')}
                        </button>
                      ) : source.startsWith('microsoft-') && hasError ? (
                        <button
                          onClick={verifyMicrosoftCompanyAccess}
                          disabled={verifyingMicrosoft}
                          className="flex-1 px-3 py-2 text-caption font-medium text-white bg-teal-700 rounded-control hover:bg-teal-800 transition-colors disabled:opacity-50"
                        >
                          {verifyingMicrosoft ? t('Verifying…') : t('Retry verification')}
                        </button>
                      ) : (
                        <button
                          onClick={() => triggerSync(source)}
                          disabled={syncing[source] || !connected}
                          className="flex-1 px-3 py-2 text-caption font-medium text-teal-700 bg-teal-50 rounded-control hover:bg-teal-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${syncing[source] ? 'animate-spin' : ''}`}
                          />
                          {syncing[source] ? t('Syncing...') : t('Sync Now')}
                        </button>
                      )}

                      <button
                        onClick={() => setShowConnectModal(source)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-control transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Signals that would be enabled */}
                    {/* Connect Button */}
                    <button
                      onClick={() => connectIntegration(source)}
                      className="w-full px-4 py-2 text-caption font-medium text-white bg-teal-700 rounded-control hover:bg-teal-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Link2 className="w-4 h-4" />
                      {t('Connect')}
                      {config.name}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings Modal */}
      {showConnectModal && (
        <IntegrationSettingsModal
          locale={locale}
          source={showConnectModal}
          integration={integrations.find((i) => i.source === showConnectModal)}
          onClose={() => setShowConnectModal(null)}
          onDisconnect={() => disconnectIntegration(showConnectModal)}
        />
      )}
    </div>
  );
}

function MicrosoftDiagnosticsPanel({ diagnostics, onRefresh, locale }) {
  const t = adminTranslator(locale);
  const format = locale === 'et' ? 'et-EE' : 'en-GB';
  const sources = Object.values(diagnostics.sources || {});
  const date = (value) => (value ? new Date(value).toLocaleString(format) : t('Not recorded'));
  const number = (value) =>
    Number.isFinite(value) ? value.toLocaleString(format) : t('Unavailable');
  return (
    <section className="rounded-container border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="app-eyebrow">{t('Microsoft 365 ingestion audit')}</p>
          <h3 className="mt-1 text-lead font-bold text-slate-950">
            {t('Where Outlook and Teams data stands')}
          </h3>
          <p className="mt-2 max-w-3xl text-caption leading-6 text-slate-600">
            {t(
              'This audit separates tenant consent, source sync, event arrival, and employee mapping. A green connection alone does not mean the source is report-ready.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-control border border-slate-300 bg-white px-3 py-2 text-caption font-semibold text-slate-700"
        >
          {t('Recheck status')}
        </button>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {sources.map((source) => (
          <article key={source.source} className="rounded-container border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-900">{t(source.label)}</h4>
                <p className="mt-1 text-caption text-slate-500">
                  {t('Status:')} {t(String(source.status).replace(/_/g, ' '))}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-caption font-bold ${source.status === 'connected' ? 'bg-teal-50 text-teal-800' : source.status === 'error' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}
              >
                {t(String(source.status).replace(/_/g, ' '))}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-caption">
              <DiagnosticStat
                label={t('Last successful sync')}
                value={date(source.lastSuccessfulSync)}
              />
              <DiagnosticStat
                label={t('Latest event received')}
                value={date(source.latestEventReceived)}
              />
              <DiagnosticStat label={t('Last sync event count')} value={number(source.fetched)} />
              <DiagnosticStat
                label={t('Stored events in seven days')}
                value={number(source.evidenceQueryFailed ? null : source.storedEvents7d)}
              />
              <DiagnosticStat label={t('Reported rejections')} value={number(source.rejected)} />
              <DiagnosticStat
                label={t('Mapped people')}
                value={`${number(source.mappedUsers)} / ${number(source.totalUsers)}`}
              />
              {source.source === 'teams' && (
                <DiagnosticStat
                  label={t('Teams read / skipped')}
                  value={`${number(source.teamsRead)} / ${number(source.teamsSkipped)}`}
                />
              )}
              {source.source === 'outlook' && (
                <DiagnosticStat
                  label={t('Mailboxes unavailable / failed')}
                  value={`${number(source.unavailableUsers)} / ${number(source.failedUsers)}`}
                />
              )}
            </dl>
            {source.missingRequirements?.length > 0 && (
              <div className="mt-4 rounded-control bg-amber-50 p-3 text-caption text-amber-950">
                <strong>{t('Missing or blocked:')}</strong>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {source.missingRequirements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-4 border-l-4 border-teal-600 pl-3 text-caption leading-5 text-slate-700">
              <strong>{t('Next action:')}</strong> {t(source.nextAction)}
            </p>
            {source.lastSyncMessage && (
              <p className="mt-2 text-caption text-slate-500">
                {t('Latest sync note:')}
                {source.lastSyncMessage}
              </p>
            )}
          </article>
        ))}
      </div>
      <details className="mt-4 rounded-control border border-slate-200 p-3 text-caption">
        <summary className="cursor-pointer font-semibold text-slate-700">
          {t('Permissions inspected')}
        </summary>
        <p className="mt-2 text-slate-600">
          {t('Granted application roles:')}{' '}
          {diagnostics.grantedRoles?.length
            ? diagnostics.grantedRoles.join(', ')
            : t('none recorded')}
        </p>
      </details>
    </section>
  );
}

function DiagnosticStat({ label, value }) {
  return (
    <div className="rounded-control bg-slate-50 p-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

// Settings Modal Component
function IntegrationSettingsModal({ source, integration, onClose, onDisconnect, locale }) {
  const t = adminTranslator(locale);
  const config = INTEGRATIONS[source];
  const Icon = config?.icon || Link2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-control shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div
          className={`px-6 py-4 ${config?.color || 'bg-gray-500'} bg-opacity-10 flex items-center gap-3`}
        >
          <div
            className={`w-10 h-10 rounded-control ${config?.color || 'bg-gray-500'} flex items-center justify-center`}
          >
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {config?.name || source} {t('Settings')}
            </h3>
            <p className="text-caption text-gray-500">{t('Manage integration connection')}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-caption font-medium text-gray-700 mb-1">
              {t('Connection Status')}
            </label>
            <div className="flex items-center gap-2">
              {integration?.connected ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-green-700">{t('Connected')}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-500">{t('Not connected')}</span>
                </>
              )}
            </div>
          </div>

          {integration?.connected && (
            <>
              <div>
                <label className="block text-caption font-medium text-gray-700 mb-1">
                  {t('User Coverage')}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{
                        width: Number.isFinite(integration.coverage)
                          ? integration.coverage + '%'
                          : 0,
                      }}
                    />
                  </div>
                  <span className="text-caption font-medium text-gray-700">
                    {Number.isFinite(integration.coverage)
                      ? integration.coverage + '%'
                      : t('Unavailable')}
                  </span>
                </div>
                <p className="text-caption text-gray-500 mt-1">
                  {Number.isFinite(integration.coverageDetails?.mapped) &&
                  integration.coverageDetails?.total > 0
                    ? integration.coverageDetails.mapped +
                      '/' +
                      integration.coverageDetails.total +
                      ' ' +
                      t('mapped people')
                    : t('Employee coverage unavailable')}
                </p>
              </div>

              <div>
                <label className="block text-caption font-medium text-gray-700 mb-1">
                  {t('Last Sync')}
                </label>
                <p className="text-caption text-gray-600">
                  {integration.last_sync
                    ? new Date(integration.last_sync).toLocaleString()
                    : t('Never')}
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
              className="px-4 py-2 text-caption font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-control transition-colors"
            >
              {t('Disconnect')}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-caption font-medium text-gray-700 bg-white border border-gray-300 rounded-control hover:bg-gray-50 transition-colors"
          >
            {t('Close')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Utility function
function formatTimeAgo(dateString, locale) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (minutes < 60) return relative.format(-minutes, 'minute');
  if (hours < 24) return relative.format(-hours, 'hour');
  return relative.format(-days, 'day');
}
