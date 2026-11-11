/**
 * Distinguish connected permissions, active sync and actual measurement evidence.
 * A configured integration is NOT proof that a metric exists, and an absent
 * event stream must never be presented as a verified zero.
 */
export function deriveSourceMeasurementStatus(source = {}, diagnostic = null, now = new Date()) {
  const status = String(diagnostic?.status || source.status || 'disconnected').toLowerCase();
  if (diagnostic?.evidenceQueryFailed) {
    return { state: 'verification_error', label: 'Evidence check failed', verified: false,
      reason: 'Stored source-event verification failed. This does not mean there was no activity.' };
  }
  const missing = diagnostic?.missingPermissions || [];
  const needsAdmin = status === 'needs_admin' || missing.length > 0;
  if (needsAdmin) {
    return { state: 'needs_admin', label: 'Requires admin consent', verified: false,
      reason: missing.length ? 'Microsoft application permissions are missing.' : 'Source consent is incomplete.' };
  }
  if (status === 'disconnected' || status === 'not_connected') {
    return { state: 'disconnected', label: 'Not connected', verified: false, reason: 'No source connection.' };
  }
  if (status === 'error' || diagnostic?.lastSyncStatus === 'failed' || source.lastSyncStatus === 'failed') {
    return { state: 'sync_error', label: 'Sync error', verified: false,
      reason: 'Source synchronization has not been verified; do not treat missing activity as zero.' };
  }
  if (status !== 'connected' && status !== 'partial') {
    return { state: 'unverified', label: 'Not verified', verified: false,
      reason: 'Source measurement cannot be established from the connection status.' };
  }
  const totalUsers = diagnostic?.totalUsers ?? source.coverage?.total ?? 0;
  const mappedUsers = diagnostic?.mappedUsers ?? source.coverage?.mapped ?? 0;
  if (totalUsers > 0 && mappedUsers === 0) {
    return { state: 'unmapped', label: 'Connected, no mapped employees', verified: false,
      reason: 'Employee-to-source identity mapping is incomplete.' };
  }
  const successfulSync = diagnostic?.lastSuccessfulSync || source.lastSync || null;
  if (!successfulSync || !Number.isFinite(new Date(successfulSync).getTime())) {
    return { state: 'awaiting_sync', label: 'Awaiting verified sync', verified: false,
      reason: 'There is no recorded successful synchronization.' };
  }
  const ageMs = now.getTime() - new Date(successfulSync).getTime();
  if (ageMs > 48 * 60 * 60 * 1000) {
    return { state: 'stale', label: 'Data may be stale', verified: false,
      reason: 'Last successful synchronization is more than 48 hours old.' };
  }
  // For non-Microsoft sources the generic dashboard only confirms mapping.
  // Do not assert event coverage without a source-specific event provenance check.
  if (!diagnostic) {
    return { state: 'coverage_unverified', label: 'Connected, evidence unverified', verified: false,
      reason: 'Active mapping was reported, but stored source-event evidence was not independently checked.' };
  }
  const observed = Number(diagnostic.storedEvents7d ?? diagnostic.accepted ?? 0);
  if (!diagnostic.latestEventReceived || observed === 0) {
    return { state: 'no_observed_events', label: 'No recent stored events', verified: false,
      reason: 'No stored source events were found in the last seven days. This is not proof of zero work.' };
  }
  if (diagnostic.attributedEvents7d != null && Number(diagnostic.attributedEvents7d) === 0) {
    return { state: 'unattributed_events', label: 'Events need employee mapping', verified: false,
      reason: 'Source events exist, but none can currently be linked to a team member.' };
  }
  const evidenceTime = new Date(diagnostic.latestEventReceived).getTime();
  if (!Number.isFinite(evidenceTime) || now.getTime() - evidenceTime > 7 * 24 * 60 * 60 * 1000) {
    return { state: 'stale_evidence', label: 'No recent verified events', verified: false,
      reason: 'The stored source evidence is older than seven days; current activity is unverified.' };
  }
  if (mappedUsers === 0) {
    return { state: 'unmapped', label: 'No employees mapped', verified: false,
      reason: 'Events exist but cannot be assigned to active employee teams.' };
  }
  return { state: 'measuring', label: 'Recent stored events', verified: true,
    reason: 'Successful sync and recent stored source events with attributed employees confirmed.' };
}
