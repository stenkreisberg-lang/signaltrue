import { WebClient } from '@slack/web-api';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import WorkEvent from '../models/workEvent.js';
import {
  classifyEmployeeCandidate,
  classifyUserDirectoryRecord,
  normalizeDirectoryString,
} from '../utils/employeeIdentity.js';
import { normalizeWorkEmailDomain } from '../utils/organizationIdentity.js';
import { getMicrosoftAppToken } from './tokenService.js';
import { fetchGraphCollection } from './coreIntegrationAdapters.js';

const ORG_ADMIN_ROLES = ['admin', 'hr_admin', 'org_admin', 'super_admin', 'master_admin'];

// The organization's own work-email domain. Only people at this domain are the
// organization's employees; guests and outsourced/external accounts (e.g. an
// outsourced IT admin on another company's domain) are never tracked.
export function resolveOrgWorkDomain(org) {
  const domain = org?.domain?.toLowerCase().replace(/^@/, '').trim();
  return domain || null;
}

function emailMatchesOrgDomain(email, orgDomain) {
  if (!orgDomain) return true;
  return normalizeWorkEmailDomain(email) === orgDomain;
}

// Prefer a plain first.last@domain address as the surviving account when the
// same person has more than one mailbox (e.g. a numbered or prefixed alias).
function isCanonicalLocalPart(email) {
  const local = String(email || '')
    .toLowerCase()
    .split('@')[0];
  return /^[a-zõäöüšž]+\.[a-zõäöüšž]+$/.test(local);
}

// Choose which of several accounts for the same person to keep: most work
// activity first, then the cleanest address, then the oldest record.
function pickCanonicalUser(users, eventCounts) {
  return [...users].sort((a, b) => {
    const eventDelta =
      (eventCounts.get(String(b._id)) || 0) - (eventCounts.get(String(a._id)) || 0);
    if (eventDelta !== 0) return eventDelta;
    const canonicalDelta =
      Number(isCanonicalLocalPart(b.email)) - Number(isCanonicalLocalPart(a.email));
    if (canonicalDelta !== 0) return canonicalDelta;
    const createdDelta = new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    if (createdDelta !== 0) return createdDelta;
    return String(a.email || '').localeCompare(String(b.email || ''));
  })[0];
}

/**
 * Collapse duplicate accounts for the same real person into one.
 *
 * Two enabled directory accounts that resolve to the same first name + surname
 * are treated as one person: the canonical account is kept, the duplicates'
 * work events are reassigned to it, and the duplicate records are removed. This
 * is intentionally conservative — it only merges exact normalized name matches.
 */
export async function mergeDuplicateEmployees(orgId, options = {}) {
  const { dryRun = false, protectedUserId = null } = options;
  const org = await Organization.findById(orgId);
  const minimumTeamSize = Math.max(5, org?.settings?.minTeamSize ?? 5);
  const orgDomain = resolveOrgWorkDomain(org);

  const users = await User.find({ orgId, isMasterAdmin: { $ne: true } });
  const byName = new Map();
  for (const user of users) {
    const classification = classifyUserDirectoryRecord(user);
    if (!classification.ok) continue;
    if (!emailMatchesOrgDomain(user.email, orgDomain)) continue;
    const key = `${classification.firstName}\u0000${classification.lastName}`.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(user);
  }

  const merges = [];
  let removed = 0;
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const ids = group.map((u) => u._id);
    const counts = await WorkEvent.aggregate([
      { $match: { orgId, actorUserId: { $in: ids } } },
      { $group: { _id: '$actorUserId', count: { $sum: 1 } } },
    ]);
    const eventCounts = new Map(counts.map((row) => [String(row._id), row.count]));

    let canonical = pickCanonicalUser(group, eventCounts);
    // Never remove the account the requester is acting from.
    if (protectedUserId && group.some((u) => String(u._id) === String(protectedUserId))) {
      canonical = group.find((u) => String(u._id) === String(protectedUserId));
    }
    const duplicates = group.filter((u) => String(u._id) !== String(canonical._id));
    if (duplicates.length === 0) continue;

    merges.push({
      name: canonical.name,
      keep: canonical.email,
      merged: duplicates.map((u) => u.email),
    });
    removed += duplicates.length;

    if (!dryRun) {
      const duplicateIds = duplicates.map((u) => u._id);
      await Promise.all([
        WorkEvent.updateMany(
          { orgId, actorUserId: { $in: duplicateIds } },
          { $set: { actorUserId: canonical._id } }
        ),
        WorkEvent.updateMany(
          { orgId, targetUserId: { $in: duplicateIds } },
          { $set: { targetUserId: canonical._id } }
        ),
      ]);
      await User.deleteMany({ _id: { $in: duplicateIds }, orgId });
    }
  }

  if (!dryRun && removed > 0) {
    await refreshTeamSizes(orgId, minimumTeamSize);
  }

  return {
    success: true,
    dryRun,
    removed: dryRun ? 0 : removed,
    wouldRemove: removed,
    merges,
  };
}

export function normalizeDepartmentName(value) {
  const normalized = normalizeDirectoryString(value);
  if (!normalized) return null;
  const withoutNoise = normalized
    .replace(/\b(osakond|department|dept|team|unit|division|tiim|üksus|yksus)\b/gi, ' ')
    .replace(/\b(ou|oü|ltd|llc|inc)\b/gi, ' ')
    .replace(/\s*[-–—]\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const canonical = withoutNoise || normalized;
  const compact = canonical.toLowerCase();
  if (['it', 'i t'].includes(compact)) return 'IT';
  if (['hr', 'people', 'personal'].includes(compact)) return 'HR';
  if (['ops', 'operations', 'operatsioonid'].includes(compact)) return 'Operations';
  return canonical;
}

export async function getOrCreateUnassignedTeam(orgId) {
  let unassignedTeam = await Team.findOne({ orgId, name: 'Unassigned' });
  if (!unassignedTeam) {
    unassignedTeam = new Team({
      name: 'Unassigned',
      orgId,
      metadata: {
        function: 'Other',
        sizeBand: '1-5',
      },
    });
    await unassignedTeam.save();
    console.log('[EmployeeSync] Created "Unassigned" team for org:', orgId);
  }
  return unassignedTeam;
}

function applyEmployeeIdentity(user, identity) {
  let updated = false;

  if (identity.name && user.name !== identity.name) {
    user.name = identity.name;
    updated = true;
  }
  if (identity.firstName && user.firstName !== identity.firstName) {
    user.firstName = identity.firstName;
    updated = true;
  }
  if (identity.lastName && user.lastName !== identity.lastName) {
    user.lastName = identity.lastName;
    updated = true;
  }

  return updated;
}

function trackSkippedCandidate(syncStats, email, reason) {
  syncStats.skipped++;
  syncStats.invalidSkipped = (syncStats.invalidSkipped || 0) + 1;
  if (syncStats.skippedCandidates.length < 25) {
    syncStats.skippedCandidates.push(email ? { email, reason } : { reason });
  }
}

async function mergeDuplicateDirectoryTeams(orgId, teams) {
  const canonicalByName = new Map();
  const duplicatePairs = [];

  for (const team of teams.filter((entry) => entry.metadata?.autoCreatedFromDirectory)) {
    const normalized = normalizeDepartmentName(
      team.metadata?.sourceDepartment || team.name
    )?.toLowerCase();
    if (!normalized) continue;
    const canonical = canonicalByName.get(normalized);
    if (canonical) duplicatePairs.push({ canonical, duplicate: team });
    else canonicalByName.set(normalized, team);
  }

  for (const { canonical, duplicate } of duplicatePairs) {
    await Promise.all([
      User.updateMany({ orgId, teamId: duplicate._id }, { $set: { teamId: canonical._id } }),
      WorkEvent.updateMany({ orgId, teamId: duplicate._id }, { $set: { teamId: canonical._id } }),
    ]);
    await Team.deleteOne({ _id: duplicate._id, orgId });
    console.log('[EmployeeSync] Merged duplicate normalized directory team');
  }

  return duplicatePairs.length > 0 ? Team.find({ orgId }) : teams;
}

async function buildDepartmentTeamMap(orgId, microsoftUsers, unassignedTeam) {
  let teams = await Team.find({ orgId });
  teams = await mergeDuplicateDirectoryTeams(orgId, teams);
  const byName = new Map(
    teams.map((team) => [normalizeDepartmentName(team.name)?.toLowerCase(), team])
  );
  const byDepartment = new Map(
    teams
      .filter((team) => team.metadata?.sourceDepartment)
      .map((team) => [normalizeDepartmentName(team.metadata.sourceDepartment)?.toLowerCase(), team])
  );

  const departments = [
    ...new Set(
      microsoftUsers.map((user) => normalizeDepartmentName(user.department)).filter(Boolean)
    ),
  ];

  for (const department of departments) {
    const key = department.toLowerCase();
    let team = byDepartment.get(key) || byName.get(key);
    if (!team) {
      team = await Team.create({
        name: department,
        orgId,
        isActive: true,
        metadata: {
          function: 'Other',
          sourceDepartment: department,
          autoCreatedFromDirectory: true,
        },
      });
      teams.push(team);
      byName.set(key, team);
      console.log(`[EmployeeSync] Created team from Microsoft department: ${department}`);
    }
    byDepartment.set(key, team);
  }

  return {
    teams,
    departmentTeams: byDepartment,
    unassignedTeam,
  };
}

function resolveDirectoryTeam(msUser, mapping) {
  const department = normalizeDepartmentName(msUser.department);
  return department
    ? mapping.departmentTeams.get(department.toLowerCase()) || mapping.unassignedTeam
    : mapping.unassignedTeam;
}

export async function refreshTeamSizes(orgId, minimumTeamSize) {
  const counts = await User.aggregate([
    { $match: { orgId, accountStatus: { $ne: 'inactive' } } },
    { $group: { _id: '$teamId', count: { $sum: 1 } } },
  ]);
  const countByTeam = new Map(counts.map((entry) => [String(entry._id), entry.count]));
  const teams = await Team.find({ orgId }).select('_id').lean();

  await Promise.all(
    teams.map((team) => {
      const actualSize = countByTeam.get(String(team._id)) || 0;
      return Team.findByIdAndUpdate(team._id, {
        $set: {
          isActive: true,
          'metadata.actualSize': actualSize,
          analyticsEnabled: actualSize >= minimumTeamSize,
        },
      });
    })
  );
}

/**
 * Keep historical event attribution aligned with current directory teams.
 */
export async function remapWorkEventTeams(orgId) {
  const users = await User.find({ orgId, teamId: { $ne: null } })
    .select('_id teamId')
    .lean();
  const usersByTeam = new Map();

  for (const user of users) {
    const teamId = String(user.teamId);
    if (!usersByTeam.has(teamId)) usersByTeam.set(teamId, []);
    usersByTeam.get(teamId).push(user._id);
  }

  let matched = 0;
  let modified = 0;
  for (const [teamId, userIds] of usersByTeam) {
    const result = await WorkEvent.updateMany(
      { orgId, actorUserId: { $in: userIds }, teamId: { $ne: teamId } },
      { $set: { teamId } }
    );
    matched += result.matchedCount || 0;
    modified += result.modifiedCount || 0;
  }

  return { matched, modified };
}

export async function cleanupInvalidEmployees(orgId, options = {}) {
  const { protectedUserId = null, dryRun = false, sources = null } = options;
  const org = await Organization.findById(orgId);
  const minimumTeamSize = Math.max(5, org?.settings?.minTeamSize ?? 5);
  const orgDomain = resolveOrgWorkDomain(org);
  const userQuery = { orgId, isMasterAdmin: { $ne: true } };
  if (Array.isArray(sources) && sources.length > 0) {
    userQuery.source = { $in: sources };
  }
  const users = await User.find(userQuery);
  const activeOrgAdminCount = await User.countDocuments({
    orgId,
    isMasterAdmin: { $ne: true },
    role: { $in: ORG_ADMIN_ROLES },
    accountStatus: { $ne: 'inactive' },
  });

  const invalidUsers = [];
  const protectedUsers = [];
  const normalizedUsers = [];

  for (const user of users) {
    const classification = classifyUserDirectoryRecord(user);
    const inDomain = emailMatchesOrgDomain(user.email, orgDomain);
    if (classification.ok && inDomain) {
      const changed = applyEmployeeIdentity(user, classification);
      if (changed) {
        normalizedUsers.push({
          id: user._id,
          email: user.email,
          name: classification.name,
          firstName: classification.firstName,
          lastName: classification.lastName,
        });
      }
      continue;
    }

    const reason = classification.ok ? 'outside_work_email_domain' : classification.reason;
    const isProtectedRequester = protectedUserId && String(user._id) === String(protectedUserId);
    const isLastActiveOrgAdmin =
      ORG_ADMIN_ROLES.includes(user.role) &&
      user.accountStatus !== 'inactive' &&
      activeOrgAdminCount <= 1;
    if (isProtectedRequester || isLastActiveOrgAdmin) {
      protectedUsers.push({
        id: user._id,
        email: user.email,
        name: user.name,
        reason: isLastActiveOrgAdmin ? 'last_active_org_admin' : reason,
      });
      continue;
    }

    invalidUsers.push({
      id: user._id,
      email: user.email,
      name: user.name,
      reason,
    });
  }

  if (!dryRun) {
    await Promise.all(
      normalizedUsers.map((entry) =>
        User.findByIdAndUpdate(entry.id, {
          $set: {
            name: entry.name,
            firstName: entry.firstName,
            lastName: entry.lastName,
          },
        })
      )
    );

    const invalidIds = invalidUsers.map((entry) => entry.id);
    if (invalidIds.length > 0) {
      await Promise.all([
        WorkEvent.updateMany(
          { orgId, actorUserId: { $in: invalidIds } },
          { $set: { actorUserId: null, teamId: null } }
        ),
        WorkEvent.updateMany(
          { orgId, targetUserId: { $in: invalidIds } },
          { $set: { targetUserId: null } }
        ),
      ]);
      await User.deleteMany({ _id: { $in: invalidIds }, orgId });
    }

    await refreshTeamSizes(orgId, minimumTeamSize);
  }

  const duplicates = await mergeDuplicateEmployees(orgId, { dryRun, protectedUserId });

  return {
    success: true,
    dryRun,
    evaluated: users.length,
    removed: dryRun ? 0 : invalidUsers.length,
    wouldRemove: invalidUsers.length,
    normalized: dryRun ? 0 : normalizedUsers.length,
    wouldNormalize: normalizedUsers.length,
    protected: protectedUsers.length,
    removedEmployees: invalidUsers.slice(0, 100),
    protectedEmployees: protectedUsers.slice(0, 25),
    duplicatesMerged: dryRun ? 0 : duplicates.removed,
    wouldMergeDuplicates: duplicates.wouldRemove,
    duplicates: duplicates.merges,
  };
}

/**
 * Employee Sync Service
 * Automatically syncs employees from Slack/Google Workspace after integration
 */

/**
 * Sync employees from Slack workspace
 * Called after Slack OAuth is completed
 */
export async function syncEmployeesFromSlack(orgId) {
  try {
    console.log('[EmployeeSync] Starting Slack employee sync for org:', orgId);

    const org = await Organization.findById(orgId);
    if (!org || !org.integrations?.slack?.accessToken) {
      throw new Error('Slack integration not found or not connected');
    }

    const slackClient = new WebClient(org.integrations.slack.accessToken);

    // Fetch all users from Slack workspace
    const response = await slackClient.users.list({
      limit: 1000, // Adjust if you have more than 1000 employees
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Slack users');
    }

    const slackUsers = response.members.filter(
      (member) => !member.deleted && !member.is_bot && !member.is_app_user && member.profile?.email // Must have email
    );

    console.log(`[EmployeeSync] Found ${slackUsers.length} active Slack users`);

    let syncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      invalidSkipped: 0,
      skippedCandidates: [],
      errors: [],
    };

    // Get or create a default "Unassigned" team
    const unassignedTeam = await getOrCreateUnassignedTeam(orgId);

    for (const slackUser of slackUsers) {
      try {
        const identity = classifyEmployeeCandidate({
          email: slackUser.profile.email,
          firstName: slackUser.profile.first_name,
          lastName: slackUser.profile.last_name,
          displayName:
            slackUser.profile.real_name_normalized || slackUser.profile.real_name || slackUser.name,
          name: slackUser.name,
          title: slackUser.profile.title,
          department: slackUser.profile.department,
          deleted: slackUser.deleted,
          isBot: slackUser.is_bot,
          isAppUser: slackUser.is_app_user,
        });

        if (!identity.ok) {
          trackSkippedCandidate(syncStats, slackUser.profile.email, identity.reason);
          continue;
        }

        const { email, name, firstName, lastName } = identity;

        // Check if user already exists
        let user = await User.findOne({
          $or: [{ email }, { 'externalIds.slackUserId': slackUser.id }],
        });

        if (user) {
          // Update existing user with Slack info
          let updated = applyEmployeeIdentity(user, identity);

          if (!user.externalIds?.slackUserId) {
            user.externalIds = user.externalIds || {};
            user.externalIds.slackUserId = slackUser.id;
            user.externalIds.slackTeamId = org.integrations.slack.teamId;
            updated = true;
          }

          if (user.source === 'manual' && !user.externalIds?.slackUserId) {
            user.source = 'slack';
            updated = true;
          }

          // Update profile info
          if (slackUser.profile.image_192) {
            user.profile = user.profile || {};
            user.profile.avatar = slackUser.profile.image_192;
            updated = true;
          }

          if (slackUser.profile.title) {
            user.profile = user.profile || {};
            user.profile.title = slackUser.profile.title;
            updated = true;
          }

          if (slackUser.profile.department) {
            user.profile = user.profile || {};
            user.profile.department = slackUser.profile.department;
            updated = true;
          }

          if (updated) {
            await user.save();
            syncStats.updated++;
            console.log(`[EmployeeSync] Updated user: ${email}`);
          } else {
            syncStats.skipped++;
          }
        } else {
          // Create new user (pending state - hasn't set password yet)
          const newUser = new User({
            email,
            name,
            password: Math.random().toString(36).slice(-12), // Temporary random password
            accountStatus: 'pending', // User hasn't claimed account yet
            source: 'slack',
            role: 'team_member',
            orgId,
            teamId: unassignedTeam._id,
            firstName,
            lastName,
            externalIds: {
              slackUserId: slackUser.id,
              slackTeamId: org.integrations.slack.teamId,
            },
            profile: {
              avatar: slackUser.profile.image_192,
              title: slackUser.profile.title,
              department: slackUser.profile.department,
            },
          });

          await newUser.save();
          syncStats.created++;
          console.log(`[EmployeeSync] Created new user: ${email}`);
        }
      } catch (error) {
        console.error(
          `[EmployeeSync] Error processing user ${slackUser.profile?.email}:`,
          error.message
        );
        syncStats.errors.push({
          email: slackUser.profile?.email,
          error: error.message,
        });
      }
    }

    // Mark users who are no longer in Slack as inactive
    const slackUserIds = slackUsers.map((u) => u.id);
    const inactiveResult = await User.updateMany(
      {
        orgId,
        'externalIds.slackUserId': { $exists: true, $nin: slackUserIds },
        accountStatus: { $ne: 'inactive' },
      },
      {
        $set: { accountStatus: 'inactive' },
      }
    );

    if (inactiveResult.modifiedCount > 0) {
      console.log(
        `[EmployeeSync] Marked ${inactiveResult.modifiedCount} users as inactive (left Slack workspace)`
      );
    }

    // Update organization with sync timestamp
    org.integrations.slack.lastEmployeeSync = new Date();
    await org.save();

    console.log('[EmployeeSync] Slack sync complete:', {
      created: syncStats.created,
      updated: syncStats.updated,
      skipped: syncStats.skipped,
      inactivated: inactiveResult.modifiedCount,
      errors: syncStats.errors.length,
    });

    return {
      success: true,
      stats: {
        ...syncStats,
        inactivated: inactiveResult.modifiedCount,
      },
    };
  } catch (error) {
    console.error('[EmployeeSync] Slack sync failed:', error);
    throw error;
  }
}

/**
 * Sync employees from Google Workspace
 * Called after Google Workspace OAuth is completed
 */
export async function syncEmployeesFromGoogle(orgId) {
  try {
    console.log('[EmployeeSync] Starting Google Workspace employee sync for org:', orgId);

    const org = await Organization.findById(orgId);
    const workspaceDelegated =
      !!org?.integrations?.googleWorkspace?.domainWideDelegationVerifiedAt &&
      !!org?.integrations?.googleWorkspace?.delegatedAdminEmail;
    if (!org || (!workspaceDelegated && !org.integrations?.googleChat?.accessToken)) {
      throw new Error('Google Workspace integration not found or not connected');
    }

    // Note: This requires Google Directory API (Admin SDK)
    // You'll need to add the scope: https://www.googleapis.com/auth/admin.directory.user.readonly
    // For now, we'll implement the basic structure

    const [{ google }, { decryptString }, { createGoogleWorkspaceAuth }] = await Promise.all([
      import('googleapis'),
      import('../utils/crypto.js'),
      import('./googleWorkspaceAdminService.js'),
    ]);
    let oauth2Client;
    if (workspaceDelegated) {
      oauth2Client = createGoogleWorkspaceAuth(
        org.integrations.googleWorkspace.delegatedAdminEmail,
        ['https://www.googleapis.com/auth/admin.directory.user.readonly']
      );
    } else {
      oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({
        access_token: decryptString(org.integrations.googleChat.accessToken),
        refresh_token: decryptString(org.integrations.googleChat.refreshToken),
      });
    }

    const admin = google.admin({ version: 'directory_v1', auth: oauth2Client });

    let syncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      invalidSkipped: 0,
      skippedCandidates: [],
      errors: [],
    };

    // Get or create "Unassigned" team
    const unassignedTeam = await getOrCreateUnassignedTeam(orgId);

    try {
      // Fetch all users from Google Workspace
      const response = await admin.users.list({
        customer: 'my_customer',
        maxResults: 500,
        orderBy: 'email',
      });

      const googleUsers = response.data.users || [];
      console.log(`[EmployeeSync] Found ${googleUsers.length} Google Workspace users`);

      for (const googleUser of googleUsers) {
        try {
          if (!googleUser.primaryEmail || googleUser.suspended) {
            continue;
          }

          const identity = classifyEmployeeCandidate({
            email: googleUser.primaryEmail,
            firstName: googleUser.name?.givenName,
            lastName: googleUser.name?.familyName,
            fullName: googleUser.name?.fullName,
            displayName: googleUser.name?.fullName,
            suspended: googleUser.suspended,
            isResource: googleUser.isResource,
            title: googleUser.organizations?.[0]?.title,
            department: googleUser.organizations?.[0]?.department,
          });

          if (!identity.ok) {
            trackSkippedCandidate(syncStats, googleUser.primaryEmail, identity.reason);
            continue;
          }

          const { email, name, firstName, lastName } = identity;

          // Check if user exists
          let user = await User.findOne({
            $or: [{ email }, { 'externalIds.googleUserId': googleUser.id }],
          });

          if (user) {
            // Update existing user
            let updated = applyEmployeeIdentity(user, identity);

            if (!user.externalIds?.googleUserId) {
              user.externalIds = user.externalIds || {};
              user.externalIds.googleUserId = googleUser.id;
              updated = true;
            }

            if (googleUser.thumbnailPhotoUrl) {
              user.profile = user.profile || {};
              user.profile.avatar = googleUser.thumbnailPhotoUrl;
              updated = true;
            }

            if (googleUser.organizations && googleUser.organizations[0]) {
              user.profile = user.profile || {};
              user.profile.title = googleUser.organizations[0].title;
              user.profile.department = googleUser.organizations[0].department;
              updated = true;
            }

            if (updated) {
              await user.save();
              syncStats.updated++;
            } else {
              syncStats.skipped++;
            }
          } else {
            // Create new user
            const newUser = new User({
              email,
              name,
              password: Math.random().toString(36).slice(-12),
              accountStatus: 'pending',
              source: 'google_workspace',
              role: 'team_member',
              orgId,
              teamId: unassignedTeam._id,
              firstName,
              lastName,
              externalIds: {
                googleUserId: googleUser.id,
              },
              profile: {
                avatar: googleUser.thumbnailPhotoUrl,
                title: googleUser.organizations?.[0]?.title,
                department: googleUser.organizations?.[0]?.department,
                phone: googleUser.phones?.[0]?.value,
              },
            });

            await newUser.save();
            syncStats.created++;
            console.log(`[EmployeeSync] Created new user from Google: ${email}`);
          }
        } catch (error) {
          console.error(
            `[EmployeeSync] Error processing Google user ${googleUser.primaryEmail}:`,
            error.message
          );
          syncStats.errors.push({
            email: googleUser.primaryEmail,
            error: error.message,
          });
        }
      }

      // Mark inactive users
      const googleUserIds = googleUsers.map((u) => u.id);
      const inactiveResult = await User.updateMany(
        {
          orgId,
          'externalIds.googleUserId': { $exists: true, $nin: googleUserIds },
          accountStatus: { $ne: 'inactive' },
        },
        {
          $set: { accountStatus: 'inactive' },
        }
      );

      // Update last sync timestamp
      org.integrations.googleChat = org.integrations.googleChat || {};
      org.integrations.googleChat.lastEmployeeSync = new Date();
      await org.save();

      console.log('[EmployeeSync] Google Workspace sync complete:', {
        created: syncStats.created,
        updated: syncStats.updated,
        skipped: syncStats.skipped,
        inactivated: inactiveResult.modifiedCount,
        errors: syncStats.errors.length,
      });

      return {
        success: true,
        stats: {
          ...syncStats,
          inactivated: inactiveResult.modifiedCount,
        },
      };
    } catch (apiError) {
      // If Directory API is not enabled or no permission, return partial success
      if (apiError.code === 403 || apiError.code === 404) {
        console.warn('[EmployeeSync] Google Directory API not available. Employee sync skipped.');
        console.warn(
          '[EmployeeSync] To enable: Add Admin SDK API and scope: https://www.googleapis.com/auth/admin.directory.user.readonly'
        );
        return {
          success: false,
          message: 'Google Directory API not enabled. Please enable Admin SDK.',
          stats: syncStats,
        };
      }
      throw apiError;
    }
  } catch (error) {
    console.error('[EmployeeSync] Google Workspace sync failed:', error);
    throw error;
  }
}

/**
 * Get sync status for an organization
 */
export async function getSyncStatus(orgId) {
  const org = await Organization.findById(orgId);
  if (!org) {
    throw new Error('Organization not found');
  }

  const activeUserQuery = { orgId, accountStatus: { $ne: 'inactive' } };
  const totalUsers = await User.countDocuments(activeUserQuery);
  const pendingUsers = await User.countDocuments({ orgId, accountStatus: 'pending' });
  const directorySyncedUsers = await User.countDocuments({
    ...activeUserQuery,
    source: { $in: ['slack', 'google_workspace', 'google_chat', 'microsoft', 'hr_import'] },
  });
  const activeUsers = await User.countDocuments({ orgId, accountStatus: 'active' });
  const unassignedTeam = await Team.findOne({ orgId, name: 'Unassigned' }).select('_id').lean();
  const unassignedUsers = unassignedTeam
    ? await User.countDocuments({
        ...activeUserQuery,
        teamId: unassignedTeam._id,
      })
    : 0;
  const assignedUsers = await User.countDocuments({
    ...activeUserQuery,
    teamId: unassignedTeam
      ? { $exists: true, $ne: null, $nin: [unassignedTeam._id] }
      : { $exists: true, $ne: null },
  });
  const measuredSince = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const measuredUserIds = await WorkEvent.distinct('actorUserId', {
    orgId: org._id,
    actorUserId: { $ne: null },
    eventType: {
      $in: ['meeting', 'message', 'email_sent', 'email_received', 'task_comment_added'],
    },
    timestamp: { $gte: measuredSince },
  });
  const measuredUsers = measuredUserIds.length
    ? await User.countDocuments({
        ...activeUserQuery,
        _id: { $in: measuredUserIds },
      })
    : 0;

  return {
    totalUsers,
    pendingUsers,
    directorySyncedUsers,
    unclaimedUsers: pendingUsers,
    activeUsers,
    unassignedUsers,
    assignedUsers,
    measuredUsers,
    lastSlackSync: org.integrations?.slack?.lastEmployeeSync,
    lastGoogleSync: org.integrations?.googleChat?.lastEmployeeSync,
    lastMicrosoftSync: org.integrations?.microsoft?.lastEmployeeSync,
    slackConnected: !!org.integrations?.slack?.accessToken,
    googleConnected: !!org.integrations?.googleChat?.accessToken,
    microsoftConnected: Boolean(
      org.integrations?.microsoft?.tenantId &&
      (org.integrations?.microsoft?.applicationConsentVerifiedAt ||
        org.integrations?.microsoft?.applicationConsentSources?.outlook?.verifiedAt ||
        org.integrations?.microsoft?.applicationConsentSources?.teams?.verifiedAt)
    ),
  };
}

/**
 * Sync employees from Microsoft 365 / Entra ID
 * Uses an app-only Microsoft Graph token (requires User.Read.All application
 * permission). Delegated user tokens are never accepted by this data plane.
 */
export async function syncEmployeesFromMicrosoft(orgId, accessTokenOverride = null) {
  try {
    console.log('[EmployeeSync] Starting Microsoft employee sync for org:', orgId);

    const org = await Organization.findById(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }

    const tenantId = org.integrations?.microsoft?.tenantId;
    if (!tenantId) throw new Error('Microsoft tenant identity is not connected');

    const accessToken = accessTokenOverride || (await getMicrosoftAppToken(tenantId));
    if (!accessToken) throw new Error('Microsoft application credentials are not configured');
    const tokenParts = String(accessToken).split('.');
    if (tokenParts.length !== 3) throw new Error('Microsoft returned an invalid application token');
    let claims;
    try {
      claims = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString('utf8'));
    } catch {
      throw new Error('Microsoft returned an invalid application token');
    }
    const appRoles = Array.isArray(claims.roles) ? claims.roles : [];
    if (!appRoles.includes('User.Read.All')) {
      throw new Error('Microsoft User.Read.All application permission is not granted');
    }
    if (!claims.tid || String(claims.tid) !== String(tenantId)) {
      throw new Error('Microsoft application token belongs to a different tenant');
    }
    const tokenAppId = claims.appid || claims.azp;
    if (
      process.env.MS_APP_CLIENT_ID &&
      (!tokenAppId || String(tokenAppId) !== String(process.env.MS_APP_CLIENT_ID))
    ) {
      throw new Error('Microsoft application token belongs to a different application');
    }

    let syncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      invalidSkipped: 0,
      skippedCandidates: [],
      errors: [],
    };

    // Get or create "Unassigned" team for this org
    const unassignedTeam = await getOrCreateUnassignedTeam(orgId);

    // Fetch users from Microsoft Graph with the same bounded pagination and
    // transient retry behavior used by the activity collectors.
    const directoryUrl =
      'https://graph.microsoft.com/v1.0/users?$top=100&$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,accountEnabled,userType,employeeType';
    const allMsUsers = await fetchGraphCollection(directoryUrl, accessToken);

    // Filter to enabled users with email
    const activeUsers = allMsUsers.filter(
      (u) => u.accountEnabled !== false && (u.mail || u.userPrincipalName)
    );

    // Filter by organization's email domain (if set) to avoid importing
    // users from other companies in a shared Microsoft 365 tenant
    const orgDomain = org.domain?.toLowerCase().replace(/^@/, '');
    let domainFilteredUsers = activeUsers;
    if (orgDomain) {
      domainFilteredUsers = activeUsers.filter((u) => {
        const email = (u.mail || u.userPrincipalName || '').toLowerCase();
        return email.endsWith(`@${orgDomain}`);
      });
      console.log(
        `[EmployeeSync] Domain filter @${orgDomain}: ${activeUsers.length} → ${domainFilteredUsers.length} users`
      );
    } else {
      console.log(
        `[EmployeeSync] No org domain set — importing all ${activeUsers.length} tenant users. Set org.domain to filter.`
      );
    }

    console.log(
      `[EmployeeSync] Found ${allMsUsers.length} total MS users, ${domainFilteredUsers.length} matching org domain`
    );

    // Reconciliation is deliberately guarded: an empty or domain-mismatched
    // Graph response must not deactivate the whole directory. Once Graph has
    // returned a non-empty, domain-valid directory, users previously linked to
    // Microsoft but missing from the current active population are marked
    // inactive so they cannot continue contributing to team-level reporting.
    const canReconcileDirectory = allMsUsers.length > 0 && domainFilteredUsers.length > 0;
    const currentMicrosoftIds = new Set(domainFilteredUsers.map((user) => String(user.id)));

    const validatedMsUsers = [];
    for (const msUser of domainFilteredUsers) {
      const identity = classifyEmployeeCandidate(
        {
          email: msUser.mail || msUser.userPrincipalName,
          firstName: msUser.givenName,
          lastName: msUser.surname,
          displayName: msUser.displayName,
          jobTitle: msUser.jobTitle,
          department: msUser.department,
          accountEnabled: msUser.accountEnabled,
          userType: msUser.userType,
          employeeType: msUser.employeeType,
        },
        { requireExplicitNameParts: true }
      );

      if (!identity.ok) {
        trackSkippedCandidate(syncStats, null, identity.reason);
        continue;
      }

      validatedMsUsers.push({ ...msUser, _identity: identity });
    }

    const teamMapping = await buildDepartmentTeamMap(orgId, validatedMsUsers, unassignedTeam);
    const teamById = new Map(teamMapping.teams.map((team) => [String(team._id), team]));

    for (const msUser of validatedMsUsers) {
      try {
        const identity = msUser._identity;
        const { email, name, firstName, lastName } = identity;
        const desiredTeam = resolveDirectoryTeam(msUser, teamMapping);

        // Check if user already exists
        let user = await User.findOne({
          orgId,
          $or: [{ email }, { 'externalIds.microsoftUserId': msUser.id }],
        });

        if (user) {
          // Update existing user
          let updated = applyEmployeeIdentity(user, identity);

          if (!user.externalIds?.microsoftUserId) {
            user.externalIds = user.externalIds || {};
            user.externalIds.microsoftUserId = msUser.id;
            updated = true;
          }

          if (msUser.jobTitle && (!user.profile?.title || user.profile.title !== msUser.jobTitle)) {
            user.profile = user.profile || {};
            user.profile.title = msUser.jobTitle;
            updated = true;
          }

          if (
            msUser.department &&
            (!user.profile?.department || user.profile.department !== msUser.department)
          ) {
            user.profile = user.profile || {};
            user.profile.department = msUser.department;
            updated = true;
          }

          const currentTeam = user.teamId ? teamById.get(String(user.teamId)) : null;
          const isUnassigned = String(user.teamId || '') === String(unassignedTeam._id);
          const canFollowDirectory =
            !user.teamId ||
            isUnassigned ||
            currentTeam?.metadata?.autoCreatedFromDirectory === true;
          if (canFollowDirectory && String(user.teamId || '') !== String(desiredTeam._id)) {
            user.teamId = desiredTeam._id;
            updated = true;
          }

          // Ensure user is in this org
          if (!user.orgId || user.orgId.toString() !== orgId.toString()) {
            user.orgId = orgId;
            updated = true;
          }

          if (updated) {
            await user.save();
            syncStats.updated++;
          } else {
            syncStats.skipped++;
          }
        } else {
          // Create new user
          const newUser = new User({
            email,
            name,
            password: Math.random().toString(36).slice(-12),
            accountStatus: 'pending',
            source: 'microsoft',
            role: 'team_member',
            orgId,
            teamId: desiredTeam._id,
            firstName,
            lastName,
            externalIds: {
              microsoftUserId: msUser.id,
            },
            profile: {
              title: msUser.jobTitle || undefined,
              department: msUser.department || undefined,
              phone: msUser.mobilePhone || undefined,
              officeLocation: msUser.officeLocation || undefined,
            },
          });

          await newUser.save();
          syncStats.created++;
        }
      } catch {
        console.warn('[EmployeeSync] Could not persist one Microsoft directory user');
        syncStats.errors.push({ category: 'employee_persist_failed' });
      }
    }

    let inactivated = 0;
    if (canReconcileDirectory) {
      const missingUsers = await User.updateMany(
        {
          orgId,
          'externalIds.microsoftUserId': { $exists: true, $nin: [...currentMicrosoftIds] },
          accountStatus: { $ne: 'inactive' },
        },
        {
          $set: { accountStatus: 'inactive' },
        }
      );
      inactivated = missingUsers.modifiedCount || 0;
      if (inactivated > 0) {
        console.log(`[EmployeeSync] Marked ${inactivated} missing Microsoft users inactive`);
      }
    } else {
      console.warn(
        '[EmployeeSync] Skipped Microsoft directory reconciliation because the source population was empty or did not match the organization domain'
      );
    }

    // Update last sync timestamp
    await Organization.findByIdAndUpdate(orgId, {
      $set: { 'integrations.microsoft.lastEmployeeSync': new Date() },
    });
    const invalidCleanup = await cleanupInvalidEmployees(orgId, { sources: ['microsoft'] });
    await Team.updateMany({ orgId, isActive: { $exists: false } }, { $set: { isActive: true } });
    await refreshTeamSizes(orgId, Math.max(5, org.settings?.minTeamSize ?? 5));
    const eventRemap = await remapWorkEventTeams(orgId);

    console.log('[EmployeeSync] Microsoft sync complete:', {
      created: syncStats.created,
      updated: syncStats.updated,
      skipped: syncStats.skipped,
      errors: syncStats.errors.length,
    });

    return {
      success: true,
      stats: {
        ...syncStats,
        inactivated,
        removedInvalid: invalidCleanup.removed,
        normalizedInvalid: invalidCleanup.normalized,
      },
      invalidCleanup: {
        removed: invalidCleanup.removed,
        normalized: invalidCleanup.normalized,
        protected: invalidCleanup.protected,
        duplicatesMerged: invalidCleanup.duplicatesMerged,
      },
      reconciliation: {
        performed: canReconcileDirectory,
        inactivated,
      },
      eventRemap,
    };
  } catch (error) {
    console.error('[EmployeeSync] Microsoft sync failed:', error?.name || 'Error');
    throw error;
  }
}
