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

const ORG_ADMIN_ROLES = ['admin', 'hr_admin', 'org_admin', 'super_admin', 'master_admin'];

export function normalizeDepartmentName(value) {
  return normalizeDirectoryString(value);
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
    syncStats.skippedCandidates.push({ email: email || null, reason });
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
    { $match: { orgId } },
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
  const { protectedUserId = null, dryRun = false } = options;
  const org = await Organization.findById(orgId);
  const minimumTeamSize = Math.max(5, org?.settings?.minTeamSize ?? 5);
  const users = await User.find({ orgId, isMasterAdmin: { $ne: true } });
  const activeOrgAdminCount = users.filter(
    (user) => ORG_ADMIN_ROLES.includes(user.role) && user.accountStatus !== 'inactive'
  ).length;

  const invalidUsers = [];
  const protectedUsers = [];
  const normalizedUsers = [];

  for (const user of users) {
    const classification = classifyUserDirectoryRecord(user);
    if (classification.ok) {
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
        reason: isLastActiveOrgAdmin ? 'last_active_org_admin' : classification.reason,
      });
      continue;
    }

    invalidUsers.push({
      id: user._id,
      email: user.email,
      name: user.name,
      reason: classification.reason,
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
    if (!org || !org.integrations?.googleChat?.accessToken) {
      throw new Error('Google Workspace integration not found or not connected');
    }

    // Note: This requires Google Directory API (Admin SDK)
    // You'll need to add the scope: https://www.googleapis.com/auth/admin.directory.user.readonly
    // For now, we'll implement the basic structure

    const [{ google }, { decryptString }] = await Promise.all([
      import('googleapis'),
      import('../utils/crypto.js'),
    ]);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: decryptString(org.integrations.googleChat.accessToken),
      refresh_token: decryptString(org.integrations.googleChat.refreshToken),
    });

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

  const totalUsers = await User.countDocuments({ orgId });
  const pendingUsers = await User.countDocuments({ orgId, accountStatus: 'pending' });
  const activeUsers = await User.countDocuments({ orgId, accountStatus: 'active' });
  const unassignedUsers = await User.countDocuments({
    orgId,
    teamId: await Team.findOne({ orgId, name: 'Unassigned' }).then((t) => t?._id),
  });

  return {
    totalUsers,
    pendingUsers,
    activeUsers,
    unassignedUsers,
    lastSlackSync: org.integrations?.slack?.lastEmployeeSync,
    lastGoogleSync: org.integrations?.googleChat?.lastEmployeeSync,
    lastMicrosoftSync: org.integrations?.microsoft?.lastEmployeeSync,
    slackConnected: !!org.integrations?.slack?.accessToken,
    googleConnected: !!org.integrations?.googleChat?.accessToken,
    microsoftConnected: !!org.integrations?.microsoft?.accessToken,
  };
}

/**
 * Sync employees from Microsoft 365 / Entra ID
 * Uses Microsoft Graph API /users endpoint (requires User.Read.All scope)
 * Called after Microsoft OAuth is completed
 */
export async function syncEmployeesFromMicrosoft(orgId, accessTokenOverride = null) {
  try {
    console.log('[EmployeeSync] Starting Microsoft employee sync for org:', orgId);

    const org = await Organization.findById(orgId);
    if (!org) {
      throw new Error('Organization not found');
    }

    let accessToken = accessTokenOverride;
    if (!accessToken) {
      const { decryptString } = await import('../utils/crypto.js');
      if (!org.integrations?.microsoft?.accessToken) {
        throw new Error('Microsoft integration not found or not connected');
      }
      accessToken = decryptString(org.integrations.microsoft.accessToken);
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

    // Fetch users from Microsoft Graph (with pagination)
    let allMsUsers = [];
    let nextLink =
      'https://graph.microsoft.com/v1.0/users?$top=100&$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,accountEnabled,userType,employeeType';

    while (nextLink) {
      const response = await fetch(nextLink, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errBody = await response.text();
        // If 403 Forbidden, the User.Read.All scope isn't granted yet
        if (response.status === 403) {
          console.warn(
            '[EmployeeSync] Microsoft User.Read.All not granted. Employee list unavailable.'
          );
          console.warn('[EmployeeSync] User needs to re-authorize with the updated OAuth scopes.');
          return {
            success: false,
            needsReauth: true,
            message:
              'User.Read.All permission not granted. Please disconnect and reconnect Microsoft to grant employee listing permission.',
            stats: syncStats,
          };
        }
        throw new Error(`Microsoft Graph /users failed: ${response.status} ${errBody}`);
      }

      const data = await response.json();
      const users = data.value || [];
      allMsUsers.push(...users);
      nextLink = data['@odata.nextLink'] || null;
    }

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

    const validatedMsUsers = [];
    for (const msUser of domainFilteredUsers) {
      const identity = classifyEmployeeCandidate({
        email: msUser.mail || msUser.userPrincipalName,
        firstName: msUser.givenName,
        lastName: msUser.surname,
        displayName: msUser.displayName,
        jobTitle: msUser.jobTitle,
        department: msUser.department,
        accountEnabled: msUser.accountEnabled,
        userType: msUser.userType,
        employeeType: msUser.employeeType,
      });

      if (!identity.ok) {
        trackSkippedCandidate(syncStats, msUser.mail || msUser.userPrincipalName, identity.reason);
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
          console.log(`[EmployeeSync] Created new user from Microsoft: ${email}`);
        }
      } catch (error) {
        console.error(
          `[EmployeeSync] Error processing MS user ${msUser.mail || msUser.userPrincipalName}:`,
          error.message
        );
        syncStats.errors.push({
          email: msUser.mail || msUser.userPrincipalName,
          error: error.message,
        });
      }
    }

    // Update last sync timestamp
    await Organization.findByIdAndUpdate(orgId, {
      $set: { 'integrations.microsoft.lastEmployeeSync': new Date() },
    });
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
      stats: syncStats,
      eventRemap,
    };
  } catch (error) {
    console.error('[EmployeeSync] Microsoft sync failed:', error);
    throw error;
  }
}
