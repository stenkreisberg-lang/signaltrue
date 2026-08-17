/**
 * Retiring an organization.
 *
 * When a relationship ends, three things have to stop and one thing is worth
 * keeping:
 *
 *  - Stop contacting them. Weekly briefs otherwise keep arriving indefinitely.
 *  - Stop reaching into their systems, and stop holding the credentials that
 *    allow it. A stored OAuth token for a former customer's tenant is live
 *    access nobody has agreed to any more.
 *  - Stop holding data about identifiable people, which is what the
 *    relationship justified.
 *  - Keep the team-level aggregates. They carry no personal data and they are
 *    the only record of what normal looked like, which is what baselines and
 *    signal thresholds are calibrated against.
 *
 * All of it runs here, on our side. The customer does not need to disconnect
 * anything, revoke anything, or be contacted at all.
 */
import Organization from '../models/organizationModel.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import IntegrationConnection from '../models/integrationConnection.js';

const INTEGRATION_PATHS = [
  'integrations.microsoft',
  'integrations.googleWorkspace',
  'integrations.slack',
  'integrations.googleChat',
];

/**
 * Retire an organization.
 *
 * @param {string} orgId
 * @param {object} options
 * @param {boolean} options.dryRun    report what would change without writing
 * @param {boolean} options.keepAggregates
 *        keep team-level daily aggregates and baselines (default true).
 *        Personal records are removed either way.
 */
export async function retireOrganization(orgId, options = {}) {
  const { dryRun = false, keepAggregates = true } = options;

  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found');

  const before = {
    name: org.name,
    lifecycleStatus: org.lifecycleStatus || 'active',
    users: await User.countDocuments({ orgId }),
    workEvents: await WorkEvent.countDocuments({ orgId }),
    attributedEvents: await WorkEvent.countDocuments({ orgId, actorUserId: { $ne: null } }),
    integrationConnections: await IntegrationConnection.countDocuments({ orgId }),
    storedIntegrationCredentials: INTEGRATION_PATHS.filter(
      (p) => org.get(`${p}.accessToken`) || org.get(`${p}.refreshToken`)
    ),
    briefRecipients: org.settings?.weeklyBriefRecipients?.length || 0,
  };

  if (dryRun) {
    return {
      dryRun: true,
      before,
      wouldRemoveUsers: before.users,
      wouldDetachEventsFromPeople: before.attributedEvents,
      wouldClearCredentialsFor: before.storedIntegrationCredentials,
      wouldKeepAggregates: keepAggregates,
    };
  }

  // 1. Stop all outbound contact and scheduled work for this organization.
  const unset = {};
  for (const path of INTEGRATION_PATHS) {
    unset[`${path}.accessToken`] = 1;
    unset[`${path}.refreshToken`] = 1;
  }
  await Organization.findByIdAndUpdate(orgId, {
    $set: {
      lifecycleStatus: 'retired',
      retiredAt: new Date(),
      'settings.weeklyBriefRecipients': [],
      'settings.monthlyReportRecipients': [],
      'settings.quarterlyReportRecipients': [],
      'settings.semiAnnualReportRecipients': [],
    },
    $unset: unset,
  });

  // 2. Mark connections inactive so nothing tries to resume them.
  await IntegrationConnection.updateMany(
    { orgId },
    {
      $set: {
        status: 'disconnected',
        statusMessage: 'Organization retired; access removed',
        statusUpdatedAt: new Date(),
      },
    }
  );

  // 3. Detach activity from identifiable people, then remove the people.
  //    Events keep their team so aggregates stay meaningful, but no longer
  //    point at an individual.
  const detached = await WorkEvent.updateMany(
    { orgId, $or: [{ actorUserId: { $ne: null } }, { targetUserId: { $ne: null } }] },
    { $set: { actorUserId: null, targetUserId: null } }
  );
  const removedUsers = await User.deleteMany({ orgId, isMasterAdmin: { $ne: true } });

  // 4. Optionally drop the derived analytics too. Off by default: these are
  //    team-level only and are what baselines are calibrated from.
  let aggregatesRemoved = 0;
  if (!keepAggregates) {
    const models = [
      '../models/engagementTeamDaily.js',
      '../models/engagementBaseline.js',
      '../models/engagementStrainWeekly.js',
      '../models/integrationMetricsDaily.js',
    ];
    for (const modelPath of models) {
      const Model = (await import(modelPath)).default;
      const result = await Model.deleteMany({ orgId });
      aggregatesRemoved += result.deletedCount || 0;
    }
  }

  const after = {
    lifecycleStatus: 'retired',
    users: await User.countDocuments({ orgId }),
    workEvents: await WorkEvent.countDocuments({ orgId }),
    attributedEvents: await WorkEvent.countDocuments({ orgId, actorUserId: { $ne: null } }),
  };

  return {
    dryRun: false,
    before,
    detachedEvents: detached.modifiedCount || 0,
    removedUsers: removedUsers.deletedCount || 0,
    aggregatesRemoved,
    keptAggregates: keepAggregates,
    after,
  };
}
