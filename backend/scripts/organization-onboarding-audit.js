import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import { MicrosoftAdapter } from '../services/coreIntegrationAdapters.js';
import { syncEmployeesFromMicrosoft } from '../services/employeeSyncService.js';
import { getOrganizationReadiness } from '../services/onboardingReadinessService.js';

const args = process.argv.slice(2);
const target = args.find((value) => !value.startsWith('--'));
const apply = args.includes('--apply');
const expectedDomain = args
  .find((value) => value.startsWith('--domain='))
  ?.slice('--domain='.length)
  .toLowerCase();
const expectedTimezone =
  args.find((value) => value.startsWith('--timezone='))?.slice('--timezone='.length) ||
  'UTC';

if (!target) throw new Error('Usage: organization-onboarding-audit.js <name-or-domain> [--apply]');
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');

await mongoose.connect(process.env.MONGO_URI);
try {
  const matches = await Organization.find({
    $or: [
      { name: { $regex: target, $options: 'i' } },
      { domain: { $regex: target, $options: 'i' } },
    ],
  });
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one matching organization; found ${matches.length}`);
  }

  const org = matches[0];
  if (apply) {
    if (!expectedDomain) throw new Error('--domain is required with --apply');
    org.domain = expectedDomain;
    org.websiteUrl = `https://${expectedDomain}`;
    org.settings = org.settings || {};
    org.settings.timezone = expectedTimezone;
    org.settings.timezoneConfirmedAt = new Date();
    await org.save();

    if (org.integrations?.microsoft?.accessToken) {
      const microsoft = new MicrosoftAdapter();
      const accessToken = await microsoft.getAccessToken(org._id);
      await syncEmployeesFromMicrosoft(org._id, accessToken);
      const until = new Date();
      const since = new Date(until.getTime() - 60 * 24 * 60 * 60 * 1000);
      const syncResult = await microsoft.sync(org._id, since, until);
      if (!syncResult.success) throw new Error(`Microsoft activity sync failed: ${syncResult.error}`);
    }
  }

  const refreshed = await Organization.findById(org._id);
  const setup = await getOrganizationReadiness(refreshed);
  const microsoftUsers = await User.countDocuments({
    orgId: org._id,
    source: 'microsoft',
    'externalIds.microsoftUserId': { $exists: true, $ne: null },
  });
  const usersWithoutMicrosoftId = await User.countDocuments({
    orgId: org._id,
    source: 'microsoft',
    $or: [
      { 'externalIds.microsoftUserId': { $exists: false } },
      { 'externalIds.microsoftUserId': null },
    ],
  });
  const eventsBySource = await WorkEvent.aggregate([
    { $match: { orgId: org._id } },
    { $group: { _id: '$source', events: { $sum: 1 }, mapped: { $sum: { $cond: ['$actorUserId', 1, 0] } } } },
    { $sort: { _id: 1 } },
  ]);

  console.log(
    JSON.stringify(
      {
        applied: apply,
        organization: {
          id: String(org._id),
          name: refreshed.name,
          domain: refreshed.domain,
          websiteUrl: refreshed.websiteUrl,
          timezone: refreshed.settings?.timezone,
          timezoneConfirmed: !!refreshed.settings?.timezoneConfirmedAt,
        },
        microsoft: {
          connected: !!refreshed.integrations?.microsoft?.accessToken,
          tenantIdPresent: !!refreshed.integrations?.microsoft?.tenantId,
          applicationConsentGranted: !!refreshed.integrations?.microsoft
            ?.applicationConsentGrantedAt,
          lastEmployeeSync: refreshed.integrations?.microsoft?.lastEmployeeSync || null,
          usersWithMicrosoftId: microsoftUsers,
          usersWithoutMicrosoftId,
        },
        directory: setup.directory,
        teams: {
          ...setup.teams,
          stored: await Team.countDocuments({ orgId: org._id }),
        },
        activity: setup.activity,
        eventsBySource,
        readiness: setup.readiness,
      },
      null,
      2
    )
  );
} finally {
  await mongoose.disconnect();
}
