import { WebClient } from '@slack/web-api';
import User from '../models/user.js';
import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';

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
      limit: 1000 // Adjust if you have more than 1000 employees
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Slack users');
    }

    const slackUsers = response.members.filter(member => 
      !member.deleted && 
      !member.is_bot && 
      !member.is_app_user &&
      member.profile?.email // Must have email
    );

    console.log(`[EmployeeSync] Found ${slackUsers.length} active Slack users`);

    let syncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Get or create a default "Unassigned" team
    let unassignedTeam = await Team.findOne({ orgId, name: 'Unassigned' });
    if (!unassignedTeam) {
      unassignedTeam = new Team({
        name: 'Unassigned',
        orgId,
        metadata: {
          function: 'Other',
          sizeBand: '1-5'
        }
      });
      await unassignedTeam.save();
      console.log('[EmployeeSync] Created "Unassigned" team');
    }

    for (const slackUser of slackUsers) {
      try {
        const email = slackUser.profile.email.toLowerCase();
        const name = slackUser.profile.real_name || slackUser.name || email.split('@')[0];

        // Check if user already exists
        let user = await User.findOne({ 
          $or: [
            { email },
            { 'externalIds.slackUserId': slackUser.id }
          ]
        });

        if (user) {
          // Update existing user with Slack info
          let updated = false;
          
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
            externalIds: {
              slackUserId: slackUser.id,
              slackTeamId: org.integrations.slack.teamId
            },
            profile: {
              avatar: slackUser.profile.image_192,
              title: slackUser.profile.title,
              department: slackUser.profile.department
            }
          });

          await newUser.save();
          syncStats.created++;
          console.log(`[EmployeeSync] Created new user: ${email}`);
        }
      } catch (error) {
        console.error(`[EmployeeSync] Error processing user ${slackUser.profile?.email}:`, error.message);
        syncStats.errors.push({
          email: slackUser.profile?.email,
          error: error.message
        });
      }
    }

    // Mark users who are no longer in Slack as inactive
    const slackUserIds = slackUsers.map(u => u.id);
    const inactiveResult = await User.updateMany(
      {
        orgId,
        'externalIds.slackUserId': { $exists: true, $nin: slackUserIds },
        accountStatus: { $ne: 'inactive' }
      },
      {
        $set: { accountStatus: 'inactive' }
      }
    );

    if (inactiveResult.modifiedCount > 0) {
      console.log(`[EmployeeSync] Marked ${inactiveResult.modifiedCount} users as inactive (left Slack workspace)`);
    }

    // Update organization with sync timestamp
    org.integrations.slack.lastEmployeeSync = new Date();
    await org.save();

    console.log('[EmployeeSync] Slack sync complete:', {
      created: syncStats.created,
      updated: syncStats.updated,
      skipped: syncStats.skipped,
      inactivated: inactiveResult.modifiedCount,
      errors: syncStats.errors.length
    });

    return {
      success: true,
      stats: {
        ...syncStats,
        inactivated: inactiveResult.modifiedCount
      }
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
    
    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: org.integrations.googleChat.accessToken,
      refresh_token: org.integrations.googleChat.refreshToken
    });

    const admin = google.admin({ version: 'directory_v1', auth: oauth2Client });

    let syncStats = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Get or create "Unassigned" team
    let unassignedTeam = await Team.findOne({ orgId, name: 'Unassigned' });
    if (!unassignedTeam) {
      unassignedTeam = new Team({
        name: 'Unassigned',
        orgId,
        metadata: {
          function: 'Other',
          sizeBand: '1-5'
        }
      });
      await unassignedTeam.save();
    }

    try {
      // Fetch all users from Google Workspace
      const response = await admin.users.list({
        customer: 'my_customer',
        maxResults: 500,
        orderBy: 'email'
      });

      const googleUsers = response.data.users || [];
      console.log(`[EmployeeSync] Found ${googleUsers.length} Google Workspace users`);

      for (const googleUser of googleUsers) {
        try {
          if (!googleUser.primaryEmail || googleUser.suspended) {
            continue;
          }

          const email = googleUser.primaryEmail.toLowerCase();
          const name = googleUser.name?.fullName || email.split('@')[0];

          // Check if user exists
          let user = await User.findOne({
            $or: [
              { email },
              { 'externalIds.googleUserId': googleUser.id }
            ]
          });

          if (user) {
            // Update existing user
            let updated = false;

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
              externalIds: {
                googleUserId: googleUser.id
              },
              profile: {
                avatar: googleUser.thumbnailPhotoUrl,
                title: googleUser.organizations?.[0]?.title,
                department: googleUser.organizations?.[0]?.department,
                phone: googleUser.phones?.[0]?.value
              }
            });

            await newUser.save();
            syncStats.created++;
            console.log(`[EmployeeSync] Created new user from Google: ${email}`);
          }
        } catch (error) {
          console.error(`[EmployeeSync] Error processing Google user ${googleUser.primaryEmail}:`, error.message);
          syncStats.errors.push({
            email: googleUser.primaryEmail,
            error: error.message
          });
        }
      }

      // Mark inactive users
      const googleUserIds = googleUsers.map(u => u.id);
      const inactiveResult = await User.updateMany(
        {
          orgId,
          'externalIds.googleUserId': { $exists: true, $nin: googleUserIds },
          accountStatus: { $ne: 'inactive' }
        },
        {
          $set: { accountStatus: 'inactive' }
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
        errors: syncStats.errors.length
      });

      return {
        success: true,
        stats: {
          ...syncStats,
          inactivated: inactiveResult.modifiedCount
        }
      };
    } catch (apiError) {
      // If Directory API is not enabled or no permission, return partial success
      if (apiError.code === 403 || apiError.code === 404) {
        console.warn('[EmployeeSync] Google Directory API not available. Employee sync skipped.');
        console.warn('[EmployeeSync] To enable: Add Admin SDK API and scope: https://www.googleapis.com/auth/admin.directory.user.readonly');
        return {
          success: false,
          message: 'Google Directory API not enabled. Please enable Admin SDK.',
          stats: syncStats
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
    teamId: await Team.findOne({ orgId, name: 'Unassigned' }).then(t => t?._id)
  });

  return {
    totalUsers,
    pendingUsers,
    activeUsers,
    unassignedUsers,
    lastSlackSync: org.integrations?.slack?.lastEmployeeSync,
    lastGoogleSync: org.integrations?.googleChat?.lastEmployeeSync,
    slackConnected: !!org.integrations?.slack?.accessToken,
    googleConnected: !!org.integrations?.googleChat?.accessToken
  };
}
