/**
 * Role-Based Access Control Middleware
 * 
 * Checks if authenticated user has one of the required roles.
 * Must be used AFTER auth middleware.
 */

export function checkRole(allowedRoles) {
  return (req, res, next) => {
    // Ensure user is authenticated (auth middleware should run first)
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Unauthorized: Authentication required' 
      });
    }
    
    // Check if user has one of the allowed roles
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Forbidden: Insufficient permissions',
        required: allowedRoles,
        actual: userRole
      });
    }
    
    next();
  };
}

/**
 * Check if user is HR/Admin (common pattern)
 */
export function requireHRAdmin(req, res, next) {
  return checkRole(['hr_admin', 'admin', 'master_admin'])(req, res, next);
}

/**
 * Check if user is master admin only
 */
export function requireMasterAdmin(req, res, next) {
  return checkRole(['master_admin'])(req, res, next);
}

/**
 * Check if user is leadership (CEO, etc.)
 */
export function requireLeadership(req, res, next) {
  return checkRole(['ceo', 'leadership', 'master_admin'])(req, res, next);
}

export default {
  checkRole,
  requireHRAdmin,
  requireMasterAdmin,
  requireLeadership
};
