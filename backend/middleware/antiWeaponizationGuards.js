/**
 * Anti-Weaponization Guardrails Middleware
 * 
 * Enforces the following rules:
 * 1. 5-person minimum for team aggregation
 * 2. No individual-level queries (team-level only)
 * 3. Audit trail for all data access
 * 4. Admin controls for sensitive operations
 */

import Team from '../models/team.js';
import DataAccessLog from '../models/dataAccessLog.js';

/**
 * Enforce 5-person minimum for team aggregation
 * Rejects requests for teams with fewer than 5 members
 */
export const enforce5PersonMinimum = async (req, res, next) => {
  try {
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    
    if (!teamId) {
      return res.status(400).json({ 
        message: 'Team ID required for aggregated metrics',
        guard: '5_PERSON_MINIMUM'
      });
    }

    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ 
        message: 'Team not found',
        guard: '5_PERSON_MINIMUM'
      });
    }

    const memberCount = team.members?.length || 0;
    
    if (memberCount < 5) {
      return res.status(403).json({ 
        message: 'Team must have at least 5 members for aggregated insights. This protects individual privacy.',
        currentMembers: memberCount,
        minimumRequired: 5,
        guard: '5_PERSON_MINIMUM',
        teamId: team._id,
        teamName: team.name
      });
    }

    // Attach team info to request for later use
    req.validatedTeam = team;
    next();
  } catch (error) {
    console.error('5-person minimum check failed:', error);
    res.status(500).json({ 
      message: 'Error validating team size',
      guard: '5_PERSON_MINIMUM'
    });
  }
};

/**
 * Enforce team-level queries only (no individual metrics)
 * Rejects any request attempting to query individual-level data
 */
export const enforceTeamLevelOnly = (req, res, next) => {
  // Check for userId or memberId in query params, body, or route params
  const hasUserIdParam = req.params.userId || req.params.memberId;
  const hasUserIdQuery = req.query.userId || req.query.memberId;
  const hasUserIdBody = req.body?.userId || req.body?.memberId;
  
  if (hasUserIdParam || hasUserIdQuery || hasUserIdBody) {
    return res.status(403).json({ 
      message: 'Individual-level queries are not permitted. SignalTrue provides team-level aggregated insights only.',
      guard: 'TEAM_LEVEL_ONLY',
      reason: 'Individual metrics and rankings destroy trust and are not supported by design.'
    });
  }

  // Check for individual-level aggregation flags
  if (req.query.groupBy === 'user' || req.query.groupBy === 'member' || req.query.groupBy === 'individual') {
    return res.status(403).json({ 
      message: 'Individual-level aggregation is not permitted.',
      guard: 'TEAM_LEVEL_ONLY',
      allowedGroupBy: ['team', 'department', 'organization']
    });
  }

  next();
};

/**
 * Create audit trail for data access
 * Logs who accessed what data, when, and why
 */
export const auditDataAccess = async (req, res, next) => {
  try {
    const accessLog = {
      userId: req.user?._id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
      endpoint: req.originalUrl,
      method: req.method,
      teamId: req.params.teamId || req.body?.teamId || req.query?.teamId,
      orgId: req.user?.orgId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      accessedAt: new Date(),
      queryParams: req.query,
      purpose: req.headers['x-access-purpose'] || 'dashboard_view' // Client can optionally specify purpose
    };

    // Log to database (async, don't block request)
    DataAccessLog.create(accessLog).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    next();
  } catch (error) {
    console.error('Audit logging failed:', error);
    // Don't fail the request if audit logging fails, but log the error
    next();
  }
};

/**
 * Require admin role for sensitive operations
 * Used for exports, data deletion, configuration changes
 */
export const requireAdminRole = (req, res, next) => {
  const userRole = req.user?.role;
  const allowedRoles = ['admin', 'master_admin', 'hr_admin'];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ 
      message: 'Admin privileges required for this operation',
      guard: 'ADMIN_ONLY',
      currentRole: userRole,
      requiredRoles: allowedRoles
    });
  }

  next();
};

/**
 * Validate that metrics are aggregated (not raw individual data)
 * Used for endpoints that might expose underlying data
 */
export const enforceAggregationOnly = (req, res, next) => {
  // Check if request is asking for raw/unaggregated data
  if (req.query.raw === 'true' || req.query.aggregated === 'false') {
    return res.status(403).json({ 
      message: 'Raw individual data cannot be accessed. All metrics must be aggregated.',
      guard: 'AGGREGATION_ONLY'
    });
  }

  // Ensure groupBy is specified for list endpoints
  if (req.method === 'GET' && req.path.includes('/metrics') && !req.query.groupBy) {
    // Default to team-level aggregation
    req.query.groupBy = 'team';
  }

  next();
};

/**
 * Rate limiting for sensitive endpoints
 * Prevents bulk data extraction attempts
 */
export const rateLimitSensitiveEndpoints = (req, res, next) => {
  // This is a placeholder - in production, use express-rate-limit or similar
  // For now, just add headers to indicate rate limit policy
  res.setHeader('X-RateLimit-Policy', 'team-level-only');
  res.setHeader('X-Privacy-Level', 'aggregated-5-person-minimum');
  next();
};

/**
 * Combined guardrails middleware
 * Apply all anti-weaponization checks in one call
 */
export const applyAntiWeaponizationGuards = [
  enforceTeamLevelOnly,
  enforce5PersonMinimum,
  auditDataAccess,
  enforceAggregationOnly,
  rateLimitSensitiveEndpoints
];

export default {
  enforce5PersonMinimum,
  enforceTeamLevelOnly,
  auditDataAccess,
  requireAdminRole,
  enforceAggregationOnly,
  rateLimitSensitiveEndpoints,
  applyAntiWeaponizationGuards
};
