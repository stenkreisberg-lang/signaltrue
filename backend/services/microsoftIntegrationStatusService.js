import {
  MICROSOFT_OUTLOOK_APPLICATION_ROLES,
  MICROSOFT_TEAMS_APPLICATION_ROLES,
  REQUIRED_MICROSOFT_APPLICATION_ROLES,
} from '../config/microsoftPermissions.js';

const SOURCE_CONFIG = {
  outlook: {
    label: 'Outlook',
    integrationType: 'microsoft-outlook',
    requiredRoles: MICROSOFT_OUTLOOK_APPLICATION_ROLES,
    probeLabels: { directory: 'Directory', calendar: 'Calendar' },
  },
  teams: {
    label: 'Teams',
    integrationType: 'microsoft-teams',
    requiredRoles: MICROSOFT_TEAMS_APPLICATION_ROLES,
    probeLabels: {
      directory: 'Directory',
      teams: 'Joined teams',
      channels: 'Channels',
      messages: 'Channel messages',
    },
  },
};

const SAFE_REASON_MESSAGES = {
  permission_granted_but_no_verifiable_user:
    'Application permissions are present, but no suitable employee account was available for a live check.',
  permission_granted_but_no_verifiable_mailbox:
    'Application permissions are present, but no suitable Exchange Online mailbox was available for a live check.',
  permission_granted_but_no_verifiable_team:
    'Application permissions are present, but no suitable Team and channel were available for a live check.',
  permission_granted_but_no_verifiable_channel:
    'Application permissions are present, but no suitable channel was available for a live check.',
  directory_probe_failed: 'The Microsoft directory probe failed.',
  calendar_probe_failed: 'The Microsoft calendar probe failed.',
  joined_teams_probe_failed: 'The Microsoft joined-teams probe failed.',
  teams_probe_failed: 'The Microsoft joined-teams probe failed.',
  channels_probe_failed: 'The Microsoft channels probe failed.',
  messages_probe_failed: 'The Microsoft channel-messages probe failed.',
  token_verification_failed:
    'The Microsoft application token could not be verified for this tenant and application.',
};

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function normalizeConnections(connections = {}) {
  if (connections instanceof Map) {
    return {
      outlook: connections.get('microsoft-outlook') || null,
      teams: connections.get('microsoft-teams') || null,
    };
  }
  if (Array.isArray(connections)) {
    return {
      outlook: connections.find((item) => item?.integrationType === 'microsoft-outlook') || null,
      teams: connections.find((item) => item?.integrationType === 'microsoft-teams') || null,
    };
  }
  return {
    outlook: connections.outlook || connections['microsoft-outlook'] || null,
    teams: connections.teams || connections['microsoft-teams'] || null,
  };
}

function normalizeReasonCode(reasonCode) {
  const value = String(reasonCode || '').trim();
  return /^[a-z][a-z0-9_]{0,79}$/.test(value) ? value : null;
}

function graphErrorCode(error) {
  const value = String(error || '');
  const match = value.match(/\(([A-Za-z][A-Za-z0-9_.-]{0,79}|HTTP [1-5][0-9]{2})\)/);
  return match?.[1] || null;
}

function safeTechnicalReason(sourceRecord, connection, config) {
  const reasonCode = normalizeReasonCode(sourceRecord?.reasonCode);
  if (reasonCode && SAFE_REASON_MESSAGES[reasonCode]) {
    return SAFE_REASON_MESSAGES[reasonCode];
  }

  const failedProbe = Object.entries(sourceRecord?.probes || {}).find(
    ([, state]) => state === 'failed'
  );
  const errorCode =
    graphErrorCode(sourceRecord?.lastError) ||
    graphErrorCode(connection?.statusMessage) ||
    graphErrorCode(connection?.sync?.lastSyncMessage);
  if (failedProbe) {
    const probeLabel = config.probeLabels[failedProbe[0]] || 'Microsoft Graph';
    return errorCode ? `${probeLabel} probe failed (${errorCode}).` : `${probeLabel} probe failed.`;
  }
  if (errorCode) return `Microsoft Graph verification failed (${errorCode}).`;
  if (reasonCode) return `Microsoft verification requires attention (${reasonCode}).`;
  return null;
}

function sourceStatusMessage(status, config, technicalReason) {
  if (status === 'connected') {
    return `Microsoft ${config.label} application access is verified.`;
  }
  if (status === 'needs_admin') {
    return 'Microsoft tenant connected. Company-wide Application permissions still require administrator consent.';
  }
  if (status === 'error') {
    const base = `Microsoft permissions are present, but SignalTrue could not verify ${config.label}.`;
    return technicalReason ? `${base} ${technicalReason}` : base;
  }
  return null;
}

function deriveSourceState({
  microsoft,
  sourceName,
  connection,
  identityLinked,
  grantedRoles,
  rolesInspected,
}) {
  const config = SOURCE_CONFIG[sourceName];
  const sourceRecord = microsoft?.applicationConsentSources?.[sourceName] || {};
  const legacyVerified = Boolean(microsoft?.applicationConsentVerifiedAt);
  const verifiedAt =
    sourceRecord.verifiedAt || (legacyVerified ? microsoft.applicationConsentVerifiedAt : null);
  const explicitlyChecked = Boolean(
    sourceRecord.lastCheckedAt || microsoft?.applicationConsentLastCheckedAt
  );
  const recordedMissingRoles =
    explicitlyChecked && Array.isArray(sourceRecord.missingRoles)
      ? sourceRecord.missingRoles.filter((role) => config.requiredRoles.includes(role))
      : null;
  const missingRoles = unique(
    recordedMissingRoles ||
      (rolesInspected ? config.requiredRoles.filter((role) => !grantedRoles.includes(role)) : [])
  );
  const technicalReason = safeTechnicalReason(sourceRecord, connection, config);
  const persistedStatus = ['connected', 'needs_admin', 'error'].includes(sourceRecord.status)
    ? sourceRecord.status
    : null;

  let status = 'disconnected';
  if (identityLinked) {
    if (missingRoles.length > 0) {
      status = 'needs_admin';
    } else if (verifiedAt) {
      // A current synchronization failure is operationally relevant even when
      // the application permission itself was verified previously.
      status = connection?.status === 'error' ? 'error' : 'connected';
    } else if (persistedStatus === 'error') {
      status = 'error';
    } else if (persistedStatus === 'connected') {
      status = connection?.status === 'error' ? 'error' : 'connected';
    } else if (rolesInspected || explicitlyChecked || connection?.status === 'error') {
      // Roles were inspected and none are missing. Any remaining failure is a
      // Graph/data-source verification problem, never another consent request.
      status = 'error';
    } else {
      status = 'needs_admin';
    }
  }

  return {
    name: sourceName,
    integrationType: config.integrationType,
    status,
    statusMessage: sourceStatusMessage(status, config, technicalReason),
    requiredRoles: [...config.requiredRoles],
    missingRoles,
    verifiedAt: verifiedAt || null,
    lastCheckedAt: sourceRecord.lastCheckedAt || microsoft?.applicationConsentLastCheckedAt || null,
    probes: { ...(sourceRecord.probes || {}) },
    reasonCode: normalizeReasonCode(sourceRecord.reasonCode),
    technicalReason,
  };
}

/**
 * Convert persisted Microsoft identity, role, probe, and per-source connection
 * evidence into one customer-facing state. A prior OAuth token or old event is
 * never enough to call a source operational.
 */
export function deriveMicrosoftIntegrationStatus(microsoft = {}, connections = {}) {
  const normalizedConnections = normalizeConnections(connections);
  const tenantIdPresent = Boolean(microsoft?.tenantId);
  const identityLinked = Boolean(
    tenantIdPresent &&
    (microsoft?.delegatedConnectedAt ||
      microsoft?.accessToken ||
      microsoft?.applicationConsentLastCheckedAt ||
      microsoft?.applicationConsentVerifiedAt)
  );
  const grantedRoles = unique(microsoft?.applicationConsentRoles).sort();
  const rolesInspected = Boolean(
    microsoft?.applicationConsentLastCheckedAt ||
    grantedRoles.length > 0 ||
    microsoft?.applicationConsentSources?.outlook?.lastCheckedAt ||
    microsoft?.applicationConsentSources?.teams?.lastCheckedAt
  );
  const sources = {
    outlook: deriveSourceState({
      microsoft,
      sourceName: 'outlook',
      connection: normalizedConnections.outlook,
      identityLinked,
      grantedRoles,
      rolesInspected,
    }),
    teams: deriveSourceState({
      microsoft,
      sourceName: 'teams',
      connection: normalizedConnections.teams,
      identityLinked,
      grantedRoles,
      rolesInspected,
    }),
  };

  const sourceValues = Object.values(sources);
  const connectedSources = sourceValues.filter((source) => source.status === 'connected');
  const requiresAdminConsent = sourceValues.some((source) => source.status === 'needs_admin');
  let status = 'disconnected';
  if (identityLinked) {
    if (connectedSources.length === sourceValues.length) status = 'connected';
    else if (connectedSources.length > 0) status = 'partial';
    else if (requiresAdminConsent) status = 'needs_admin';
    else status = 'error';
  }

  let statusMessage = null;
  if (status === 'connected') {
    statusMessage = 'Microsoft 365 connected. Outlook and Teams are syncing.';
  } else if (status === 'needs_admin') {
    statusMessage =
      'Microsoft tenant connected. Company-wide Application permissions still require administrator consent.';
  } else if (status === 'error') {
    statusMessage =
      'Microsoft permissions are present, but SignalTrue could not verify one of the Microsoft data sources.';
  } else if (status === 'partial') {
    const connectedLabel = sources.outlook.status === 'connected' ? 'Outlook' : 'Teams';
    const attentionSource =
      sources.outlook.status === 'connected' ? sources.teams : sources.outlook;
    const attentionLabel = connectedLabel === 'Outlook' ? 'Teams' : 'Outlook';
    statusMessage =
      attentionSource.status === 'needs_admin'
        ? `${connectedLabel} connected. ${attentionLabel} still requires administrator consent.`
        : `${connectedLabel} connected. ${attentionLabel} verification requires attention.`;
  }

  const missingRoles = unique(sourceValues.flatMap((source) => source.missingRoles)).filter(
    (role) => REQUIRED_MICROSOFT_APPLICATION_ROLES.includes(role)
  );

  return {
    status,
    statusMessage,
    identityLinked,
    tenantIdPresent,
    requiresAdminConsent,
    permissionsPresent:
      (rolesInspected && missingRoles.length === 0) ||
      (sources.outlook.status === 'connected' && sources.teams.status === 'connected'),
    grantedRoles,
    requiredRoles: [...REQUIRED_MICROSOFT_APPLICATION_ROLES],
    missingRoles,
    sources,
  };
}

export function getSafeMicrosoftTechnicalReason(sourceRecord, connection, sourceName) {
  const config = SOURCE_CONFIG[sourceName];
  return config ? safeTechnicalReason(sourceRecord || {}, connection || null, config) : null;
}

export { SOURCE_CONFIG as MICROSOFT_SOURCE_STATUS_CONFIG };
