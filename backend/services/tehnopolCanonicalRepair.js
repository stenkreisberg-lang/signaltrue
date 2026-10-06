import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';

export const TEHNOPOL_CANONICAL_ORG_ID = '6a509c2e85ba56cdc945b3c7';
export const TEHNOPOL_DUPLICATE_ORG_ID = '6aaa75e4f457f5b1015dd4d7';

export async function repairTehnopolCanonicalOrganization() {
  const [canonical, duplicate] = await Promise.all([
    Organization.findById(TEHNOPOL_CANONICAL_ORG_ID),
    Organization.findById(TEHNOPOL_DUPLICATE_ORG_ID),
  ]);

  if (!canonical || !duplicate) {
    console.warn('[TehnopolRepair] canonical or duplicate org not found; no mutation applied');
    return { applied: false, reason: 'missing_org' };
  }

  const canonicalDomain = String(canonical.domain || '').toLowerCase();
  const duplicateDomain = String(duplicate.domain || '').toLowerCase();
  const canonicalTenant = canonical.integrations?.microsoft?.tenantId || null;
  const duplicateTenant = duplicate.integrations?.microsoft?.tenantId || null;

  if (
    canonicalDomain !== 'tehnopol.ee' ||
    duplicateDomain !== 'tehnopol.ee' ||
    !canonicalTenant ||
    canonicalTenant !== duplicateTenant
  ) {
    console.error('[TehnopolRepair] guard failed; duplicate was NOT retired', {
      canonicalDomain,
      duplicateDomain,
      sameTenant: Boolean(canonicalTenant && canonicalTenant === duplicateTenant),
    });
    return { applied: false, reason: 'guard_failed' };
  }

  await Organization.findByIdAndUpdate(TEHNOPOL_CANONICAL_ORG_ID, {
    $set: {
      lifecycleStatus: 'active',
      'integrations.microsoft.sync.enabled': true,
    },
  });

  await Organization.findByIdAndUpdate(TEHNOPOL_DUPLICATE_ORG_ID, {
    $set: {
      lifecycleStatus: 'retired',
      'integrations.microsoft.sync.enabled': false,
      'integrations.slack.sync.enabled': false,
      'integrations.google.sync.enabled': false,
      'integrations.googleChat.sync.enabled': false,
    },
  });

  const connectionResult = await IntegrationConnection.updateMany(
    { orgId: TEHNOPOL_DUPLICATE_ORG_ID },
    {
      $set: {
        status: 'disconnected',
        statusMessage: 'Retired duplicate Tehnopol organization; canonical org is 6a509c2e85ba56cdc945b3c7',
        statusUpdatedAt: new Date(),
        'sync.enabled': false,
      },
    }
  );

  console.log('[TehnopolRepair] canonicalized', {
    canonicalOrgId: TEHNOPOL_CANONICAL_ORG_ID,
    retiredDuplicateOrgId: TEHNOPOL_DUPLICATE_ORG_ID,
    disabledConnections: connectionResult.modifiedCount || 0,
  });

  return {
    applied: true,
    canonicalOrgId: TEHNOPOL_CANONICAL_ORG_ID,
    retiredDuplicateOrgId: TEHNOPOL_DUPLICATE_ORG_ID,
    disabledConnections: connectionResult.modifiedCount || 0,
  };
}
