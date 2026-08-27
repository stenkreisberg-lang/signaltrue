import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';

const apply = process.argv.includes('--apply');
const now = new Date();
const repairs = [];
const pausedOrgIds = new Set();

if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

function missingPermissions(error) {
  const marker = 'missing application permissions:';
  const message = String(error || '');
  const markerIndex = message.toLowerCase().indexOf(marker);
  return markerIndex >= 0
    ? message
        .slice(markerIndex + marker.length)
        .replace(/\.\s*$/, '')
        .split(',')
        .map((permission) => permission.trim())
        .filter(Boolean)
    : [];
}

async function pauseBrokenConnection(orgId, integrationType, message) {
  pausedOrgIds.add(String(orgId));
  repairs.push({ orgId: String(orgId), integrationType, action: 'pause', message });
  if (!apply) return;
  await Organization.findByIdAndUpdate(orgId, {
    $set: {
      'integrations.microsoft.sync.enabled': false,
      'integrations.microsoft.sync.lastStatus': 'error',
      'integrations.microsoft.sync.error': message,
    },
  });
  await IntegrationConnection.findOneAndUpdate(
    { orgId, integrationType },
    {
      $set: {
        status: 'error',
        statusMessage: message,
        statusUpdatedAt: now,
        'sync.enabled': false,
        'sync.lastSyncStatus': 'failed',
        'sync.lastSyncMessage': message,
      },
    },
    { upsert: true }
  );
}

async function resetUnverifiedBackfill(org, integrationType, permissions) {
  const message = `Backfill requires Microsoft administrator consent for: ${permissions.join(', ')}`;
  repairs.push({
    orgId: String(org._id),
    organization: org.name,
    integrationType,
    action: 'reset_unverified_backfill',
    permissions,
  });
  if (!apply) return;
  await IntegrationConnection.findOneAndUpdate(
    { orgId: org._id, integrationType },
    {
      $set: {
        status: 'needs_admin',
        statusMessage: message,
        statusUpdatedAt: now,
        'sync.backfillComplete': false,
        'sync.backfillCompletedAt': null,
        'sync.backfillProgress': 0,
        'sync.lastSyncMessage': message,
      },
    },
    { upsert: true }
  );
}

await mongoose.connect(process.env.MONGO_URI);
try {
  const expiredOrganizations = await Organization.find({
    'integrations.microsoft.sync.error': {
      $regex: /AADSTS700082|refresh token has expired|authorization expired/i,
    },
  })
    .select('_id name integrations.microsoft.scope')
    .lean();
  for (const org of expiredOrganizations) {
    const type =
      org.integrations?.microsoft?.scope === 'teams' ? 'microsoft-teams' : 'microsoft-outlook';
    await pauseBrokenConnection(
      org._id,
      type,
      'Microsoft authorization expired. Reconnect Microsoft to resume synchronization.'
    );
  }

  // This is the known seed/test organization shown in production logs. Its
  // tenant is not a valid customer tenant, so recurring sync must stay paused.
  const invalidSeedOrg = await Organization.findById('698384fa7b38d0dd0589fec9')
    .select('_id name integrations.microsoft.accessToken')
    .lean();
  if (invalidSeedOrg?.integrations?.microsoft?.accessToken) {
    await pauseBrokenConnection(
      invalidSeedOrg._id,
      'microsoft-teams',
      'Microsoft synchronization is paused for this test organization because its tenant is invalid.'
    );
  }

  const unverifiedOrganizations = await Organization.find({
    'integrations.microsoft.accessToken': { $exists: true, $ne: null },
    'integrations.microsoft.applicationConsentVerifiedAt': { $exists: false },
    'integrations.microsoft.applicationConsentLastError': { $exists: true, $ne: null },
  })
    .select('_id name integrations.microsoft.applicationConsentLastError')
    .lean();

  for (const org of unverifiedOrganizations) {
    if (pausedOrgIds.has(String(org._id))) continue;
    const missing = missingPermissions(org.integrations?.microsoft?.applicationConsentLastError);
    const missingTeams = missing.filter((permission) =>
      [
        'Team.ReadBasic.All',
        'Channel.ReadBasic.All',
        'ChannelMessage.Read.All',
        'User.Read.All',
      ].includes(permission)
    );
    if (missingTeams.length > 0) {
      await resetUnverifiedBackfill(org, 'microsoft-teams', missingTeams);
    }
    if (missing.includes('Calendars.Read')) {
      await resetUnverifiedBackfill(org, 'microsoft-outlook', ['Calendars.Read']);
    }
  }

  console.log(JSON.stringify({ apply, repairs }, null, 2));
} finally {
  await mongoose.disconnect();
}
